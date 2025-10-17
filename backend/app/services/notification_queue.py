"""
Notification queue service for handling failed notifications and retries.
"""
import logging
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.email import EmailService, NotificationType
from app.services.audit import AuditService


logger = logging.getLogger(__name__)


class NotificationQueue:
    """Service for managing notification retry queue."""
    
    def __init__(self, db: Session, email_service: Optional[EmailService] = None, audit_service: Optional[AuditService] = None):
        """
        Initialize notification queue service.
        
        Args:
            db: Database session
            email_service: Email service for sending notifications
            audit_service: Audit service for logging operations
        """
        self.db = db
        self.email_service = email_service or EmailService(audit_service)
        self.audit_service = audit_service or AuditService(db)
        self._ensure_queue_table()
    
    def _ensure_queue_table(self):
        """Ensure the notification queue table exists."""
        try:
            # Create notification queue table if it doesn't exist
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS notification_queue (
                id SERIAL PRIMARY KEY,
                notification_type VARCHAR(50) NOT NULL,
                recipients TEXT NOT NULL,
                template_data TEXT NOT NULL,
                user_id INTEGER,
                tracking_id VARCHAR(100),
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                next_retry_at TIMESTAMP,
                status VARCHAR(20) DEFAULT 'pending',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
            CREATE INDEX IF NOT EXISTS idx_notification_queue_next_retry ON notification_queue(next_retry_at);
            """
            
            self.db.execute(text(create_table_sql))
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to create notification queue table: {e}")
            self.db.rollback()
    
    def enqueue_notification(
        self,
        notification_type: NotificationType,
        recipients: List[str],
        template_data: Dict[str, Any],
        user_id: Optional[int] = None,
        tracking_id: Optional[str] = None,
        max_retries: int = 3,
        delay_minutes: int = 5
    ) -> str:
        """
        Add a notification to the retry queue.
        
        Args:
            notification_type: Type of notification
            recipients: List of email addresses
            template_data: Template data for the notification
            user_id: ID of user triggering the notification
            tracking_id: Optional tracking ID
            max_retries: Maximum number of retry attempts
            delay_minutes: Initial delay before first retry
            
        Returns:
            Queue entry ID
        """
        import uuid
        
        if not tracking_id:
            tracking_id = str(uuid.uuid4())
        
        try:
            next_retry_at = datetime.utcnow() + timedelta(minutes=delay_minutes)
            
            insert_sql = """
            INSERT INTO notification_queue 
            (notification_type, recipients, template_data, user_id, tracking_id, max_retries, next_retry_at)
            VALUES (:notification_type, :recipients, :template_data, :user_id, :tracking_id, :max_retries, :next_retry_at)
            RETURNING id
            """
            
            result = self.db.execute(text(insert_sql), {
                'notification_type': notification_type.value,
                'recipients': json.dumps(recipients),
                'template_data': json.dumps(template_data),
                'user_id': user_id,
                'tracking_id': tracking_id,
                'max_retries': max_retries,
                'next_retry_at': next_retry_at
            })
            
            queue_id = result.fetchone()[0]
            self.db.commit()
            
            logger.info(f"Notification queued with ID {queue_id}, tracking_id {tracking_id}")
            
            # Log to audit trail
            if self.audit_service and user_id:
                self.audit_service.log_action(
                    user_id=user_id,
                    entity_type="notification_queue",
                    entity_id=str(queue_id),
                    action="enqueue",
                    details={
                        "notification_type": notification_type.value,
                        "recipients_count": len(recipients),
                        "tracking_id": tracking_id,
                        "max_retries": max_retries,
                        "next_retry_at": next_retry_at.isoformat()
                    }
                )
            
            return str(queue_id)
            
        except Exception as e:
            logger.error(f"Failed to enqueue notification: {e}")
            self.db.rollback()
            raise
    
    def process_pending_notifications(self, batch_size: int = 10) -> int:
        """
        Process pending notifications in the queue.
        
        Args:
            batch_size: Maximum number of notifications to process
            
        Returns:
            Number of notifications processed
        """
        try:
            # Get pending notifications ready for retry
            select_sql = """
            SELECT id, notification_type, recipients, template_data, user_id, tracking_id, retry_count, max_retries
            FROM notification_queue
            WHERE status = 'pending' 
            AND next_retry_at <= CURRENT_TIMESTAMP
            ORDER BY created_at
            LIMIT :batch_size
            """
            
            result = self.db.execute(text(select_sql), {'batch_size': batch_size})
            notifications = result.fetchall()
            
            processed_count = 0
            
            for notification in notifications:
                queue_id = notification[0]
                notification_type = NotificationType(notification[1])
                recipients = json.loads(notification[2])
                template_data = json.loads(notification[3])
                user_id = notification[4]
                tracking_id = notification[5]
                retry_count = notification[6]
                max_retries = notification[7]
                
                try:
                    # Attempt to send the notification
                    success = self.email_service.send_email(
                        notification_type=notification_type,
                        recipients=recipients,
                        template_data=template_data,
                        user_id=user_id
                    )
                    
                    if success:
                        # Mark as completed
                        self._update_notification_status(queue_id, 'completed', None)
                        logger.info(f"Notification {queue_id} sent successfully on retry {retry_count + 1}")
                        
                        # Log success to audit trail
                        if self.audit_service and user_id:
                            self.audit_service.log_action(
                                user_id=user_id,
                                entity_type="notification_queue",
                                entity_id=str(queue_id),
                                action="retry_success",
                                details={
                                    "tracking_id": tracking_id,
                                    "retry_count": retry_count + 1,
                                    "status": "completed"
                                }
                            )
                    else:
                        # Handle retry or failure
                        if retry_count + 1 >= max_retries:
                            # Max retries reached, mark as failed
                            self._update_notification_status(queue_id, 'failed', 'Max retries exceeded')
                            logger.error(f"Notification {queue_id} failed after {max_retries} attempts")
                            
                            # Log failure to audit trail
                            if self.audit_service and user_id:
                                self.audit_service.log_action(
                                    user_id=user_id,
                                    entity_type="notification_queue",
                                    entity_id=str(queue_id),
                                    action="retry_failed",
                                    details={
                                        "tracking_id": tracking_id,
                                        "retry_count": retry_count + 1,
                                        "status": "failed",
                                        "reason": "max_retries_exceeded"
                                    }
                                )
                        else:
                            # Schedule next retry with exponential backoff
                            delay_minutes = 5 * (2 ** retry_count)  # 5, 10, 20, 40 minutes
                            next_retry_at = datetime.utcnow() + timedelta(minutes=delay_minutes)
                            
                            self._update_notification_retry(queue_id, retry_count + 1, next_retry_at)
                            logger.warning(f"Notification {queue_id} retry {retry_count + 1} failed, next retry at {next_retry_at}")
                    
                    processed_count += 1
                    
                except Exception as e:
                    logger.error(f"Error processing notification {queue_id}: {e}")
                    # Update error message but don't increment retry count for processing errors
                    self._update_notification_status(queue_id, 'error', str(e))
            
            return processed_count
            
        except Exception as e:
            logger.error(f"Error processing notification queue: {e}")
            return 0
    
    def _update_notification_status(self, queue_id: int, status: str, error_message: Optional[str]):
        """Update notification status in the queue."""
        try:
            update_sql = """
            UPDATE notification_queue 
            SET status = :status, error_message = :error_message, updated_at = CURRENT_TIMESTAMP
            WHERE id = :queue_id
            """
            
            self.db.execute(text(update_sql), {
                'status': status,
                'error_message': error_message,
                'queue_id': queue_id
            })
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to update notification status: {e}")
            self.db.rollback()
    
    def _update_notification_retry(self, queue_id: int, retry_count: int, next_retry_at: datetime):
        """Update notification retry information."""
        try:
            update_sql = """
            UPDATE notification_queue 
            SET retry_count = :retry_count, next_retry_at = :next_retry_at, updated_at = CURRENT_TIMESTAMP
            WHERE id = :queue_id
            """
            
            self.db.execute(text(update_sql), {
                'retry_count': retry_count,
                'next_retry_at': next_retry_at,
                'queue_id': queue_id
            })
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to update notification retry: {e}")
            self.db.rollback()
    
    def get_queue_statistics(self) -> Dict[str, Any]:
        """Get notification queue statistics."""
        try:
            stats_sql = """
            SELECT 
                status,
                COUNT(*) as count
            FROM notification_queue
            GROUP BY status
            """
            
            result = self.db.execute(text(stats_sql))
            status_counts = {row[0]: row[1] for row in result.fetchall()}
            
            # Get overdue notifications
            overdue_sql = """
            SELECT COUNT(*) 
            FROM notification_queue
            WHERE status = 'pending' AND next_retry_at < CURRENT_TIMESTAMP
            """
            
            overdue_result = self.db.execute(text(overdue_sql))
            overdue_count = overdue_result.fetchone()[0]
            
            return {
                "total_notifications": sum(status_counts.values()),
                "pending": status_counts.get('pending', 0),
                "completed": status_counts.get('completed', 0),
                "failed": status_counts.get('failed', 0),
                "error": status_counts.get('error', 0),
                "overdue": overdue_count
            }
            
        except Exception as e:
            logger.error(f"Failed to get queue statistics: {e}")
            return {}
    
    def cleanup_old_notifications(self, days_old: int = 30) -> int:
        """
        Clean up old completed and failed notifications.
        
        Args:
            days_old: Number of days after which to clean up notifications
            
        Returns:
            Number of notifications cleaned up
        """
        try:
            cleanup_date = datetime.utcnow() - timedelta(days=days_old)
            
            cleanup_sql = """
            DELETE FROM notification_queue
            WHERE status IN ('completed', 'failed') 
            AND updated_at < :cleanup_date
            """
            
            result = self.db.execute(text(cleanup_sql), {'cleanup_date': cleanup_date})
            deleted_count = result.rowcount
            self.db.commit()
            
            logger.info(f"Cleaned up {deleted_count} old notifications")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old notifications: {e}")
            self.db.rollback()
            return 0
    
    def retry_failed_notification(self, queue_id: int) -> bool:
        """
        Manually retry a failed notification.
        
        Args:
            queue_id: Queue entry ID
            
        Returns:
            True if retry was scheduled successfully
        """
        try:
            # Reset status to pending and schedule immediate retry
            update_sql = """
            UPDATE notification_queue 
            SET status = 'pending', 
                next_retry_at = CURRENT_TIMESTAMP,
                error_message = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :queue_id AND status IN ('failed', 'error')
            """
            
            result = self.db.execute(text(update_sql), {'queue_id': queue_id})
            
            if result.rowcount > 0:
                self.db.commit()
                logger.info(f"Notification {queue_id} scheduled for manual retry")
                return True
            else:
                logger.warning(f"Notification {queue_id} not found or not in failed/error state")
                return False
                
        except Exception as e:
            logger.error(f"Failed to retry notification {queue_id}: {e}")
            self.db.rollback()
            return False