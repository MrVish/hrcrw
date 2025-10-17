"""
Notification service for workflow event triggers.
Handles email notifications for review and exception workflows.
"""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.review import Review
from app.models.exception import ReviewException
from app.models.client import Client
from app.services.email import EmailService, NotificationType
from app.services.audit import AuditService


logger = logging.getLogger(__name__)


class NotificationService:
    """Service for handling workflow notifications."""
    
    def __init__(self, db: Session, email_service: Optional[EmailService] = None, audit_service: Optional[AuditService] = None, notification_queue=None):
        """
        Initialize notification service.
        
        Args:
            db: Database session
            email_service: Email service for sending notifications
            audit_service: Audit service for logging notification events
            notification_queue: Queue service for handling failed notifications
        """
        self.db = db
        self.email_service = email_service or EmailService(audit_service)
        self.audit_service = audit_service or AuditService(db)
        self.notification_queue = notification_queue
    
    def _send_notification_with_fallback(
        self,
        notification_type: NotificationType,
        recipients: List[str],
        template_data: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> bool:
        """
        Send notification with queue fallback for failures.
        
        Args:
            notification_type: Type of notification
            recipients: List of email addresses
            template_data: Template data
            user_id: User ID for audit logging
            
        Returns:
            True if sent successfully or queued for retry
        """
        try:
            # Attempt immediate delivery
            success = self.email_service.send_email(
                notification_type=notification_type,
                recipients=recipients,
                template_data=template_data,
                user_id=user_id
            )
            
            if success:
                return True
            
            # If immediate delivery failed and queue is available, enqueue for retry
            if self.notification_queue:
                try:
                    queue_id = self.notification_queue.enqueue_notification(
                        notification_type=notification_type,
                        recipients=recipients,
                        template_data=template_data,
                        user_id=user_id
                    )
                    logger.info(f"Notification queued for retry with ID {queue_id}")
                    return True
                except Exception as queue_error:
                    logger.error(f"Failed to queue notification for retry: {queue_error}")
            
            return False
            
        except Exception as e:
            logger.error(f"Error in notification sending: {e}")
            return False
    
    def notify_review_submitted(self, review_id: int, submitted_by_user_id: int) -> bool:
        """
        Send notification when a review is submitted.
        
        Args:
            review_id: ID of the submitted review
            submitted_by_user_id: ID of user who submitted the review
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            # Get review details
            review = self.db.query(Review).filter(Review.id == review_id).first()
            if not review:
                logger.error(f"Review {review_id} not found for notification")
                return False
            
            # Get client details
            client = self.db.query(Client).filter(Client.client_id == review.client_id).first()
            if not client:
                logger.error(f"Client {review.client_id} not found for review {review_id}")
                return False
            
            # Get submitter details
            submitter = self.db.query(User).filter(User.id == submitted_by_user_id).first()
            if not submitter:
                logger.error(f"Submitter {submitted_by_user_id} not found")
                return False
            
            # Get all active Checkers
            checker_emails = self.email_service.get_recipients_by_role(UserRole.CHECKER, self.db)
            
            if not checker_emails:
                logger.warning("No active Checkers found to notify")
                return False
            
            # Prepare template data
            template_data = {
                "client_name": client.name,
                "submitted_by": submitter.name,
                "review_id": review.id,
                "submission_date": review.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if review.submitted_at else "N/A"
            }
            
            # Send notification with fallback
            success = self._send_notification_with_fallback(
                notification_type=NotificationType.REVIEW_SUBMITTED,
                recipients=checker_emails,
                template_data=template_data,
                user_id=submitted_by_user_id
            )
            
            if success:
                logger.info(f"Review submission notification sent for review {review_id}")
            else:
                logger.error(f"Failed to send review submission notification for review {review_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending review submission notification: {e}")
            return False
    
    def notify_review_approved(self, review_id: int, approved_by_user_id: int, comments: Optional[str] = None) -> bool:
        """
        Send notification when a review is approved.
        
        Args:
            review_id: ID of the approved review
            approved_by_user_id: ID of user who approved the review
            comments: Optional approval comments
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            # Get review details
            review = self.db.query(Review).filter(Review.id == review_id).first()
            if not review:
                logger.error(f"Review {review_id} not found for notification")
                return False
            
            # Get client details
            client = self.db.query(Client).filter(Client.client_id == review.client_id).first()
            if not client:
                logger.error(f"Client {review.client_id} not found for review {review_id}")
                return False
            
            # Get submitter details
            submitter = self.db.query(User).filter(User.id == review.submitted_by).first()
            if not submitter:
                logger.error(f"Submitter {review.submitted_by} not found")
                return False
            
            # Get approver details
            approver = self.db.query(User).filter(User.id == approved_by_user_id).first()
            if not approver:
                logger.error(f"Approver {approved_by_user_id} not found")
                return False
            
            # Prepare template data
            template_data = {
                "submitted_by": submitter.name,
                "client_name": client.name,
                "review_id": review.id,
                "approved_by": approver.name,
                "approval_date": review.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if review.reviewed_at else "N/A",
                "comments": comments or ""
            }
            
            # Send notification to submitter with fallback
            success = self._send_notification_with_fallback(
                notification_type=NotificationType.REVIEW_APPROVED,
                recipients=[submitter.email] if submitter.email else [],
                template_data=template_data,
                user_id=approved_by_user_id
            )
            
            if success:
                logger.info(f"Review approval notification sent for review {review_id}")
            else:
                logger.error(f"Failed to send review approval notification for review {review_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending review approval notification: {e}")
            return False
    
    def notify_review_rejected(self, review_id: int, rejected_by_user_id: int, rejection_reason: str, comments: Optional[str] = None) -> bool:
        """
        Send notification when a review is rejected.
        
        Args:
            review_id: ID of the rejected review
            rejected_by_user_id: ID of user who rejected the review
            rejection_reason: Reason for rejection
            comments: Optional additional comments
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            # Get review details
            review = self.db.query(Review).filter(Review.id == review_id).first()
            if not review:
                logger.error(f"Review {review_id} not found for notification")
                return False
            
            # Get client details
            client = self.db.query(Client).filter(Client.client_id == review.client_id).first()
            if not client:
                logger.error(f"Client {review.client_id} not found for review {review_id}")
                return False
            
            # Get submitter details
            submitter = self.db.query(User).filter(User.id == review.submitted_by).first()
            if not submitter:
                logger.error(f"Submitter {review.submitted_by} not found")
                return False
            
            # Get rejector details
            rejector = self.db.query(User).filter(User.id == rejected_by_user_id).first()
            if not rejector:
                logger.error(f"Rejector {rejected_by_user_id} not found")
                return False
            
            # Combine rejection reason and comments
            full_comments = rejection_reason
            if comments:
                full_comments += f"\n\nAdditional Comments: {comments}"
            
            # Prepare template data
            template_data = {
                "submitted_by": submitter.name,
                "client_name": client.name,
                "review_id": review.id,
                "rejected_by": rejector.name,
                "rejection_date": review.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if review.reviewed_at else "N/A",
                "comments": full_comments
            }
            
            # Send notification to submitter with fallback
            success = self._send_notification_with_fallback(
                notification_type=NotificationType.REVIEW_REJECTED,
                recipients=[submitter.email] if submitter.email else [],
                template_data=template_data,
                user_id=rejected_by_user_id
            )
            
            if success:
                logger.info(f"Review rejection notification sent for review {review_id}")
            else:
                logger.error(f"Failed to send review rejection notification for review {review_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending review rejection notification: {e}")
            return False
    
    def notify_exception_created(self, exception_id: int, created_by_user_id: int) -> bool:
        """
        Send notification when an exception is created.
        
        Args:
            exception_id: ID of the created exception
            created_by_user_id: ID of user who created the exception
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            # Get exception details
            exception = self.db.query(Exception).filter(Exception.id == exception_id).first()
            if not exception:
                logger.error(f"Exception {exception_id} not found for notification")
                return False
            
            # Get creator details
            creator = self.db.query(User).filter(User.id == created_by_user_id).first()
            if not creator:
                logger.error(f"Creator {created_by_user_id} not found")
                return False
            
            # Get all active Admins
            admin_emails = self.email_service.get_recipients_by_role(UserRole.ADMIN, self.db)
            
            if not admin_emails:
                logger.warning("No active Admins found to notify")
                return False
            
            # Prepare template data
            template_data = {
                "exception_type": exception.type.value,
                "exception_id": exception.id,
                "review_id": exception.review_id,
                "created_by": creator.name,
                "creation_date": exception.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "description": exception.description
            }
            
            # Send notification with fallback
            success = self._send_notification_with_fallback(
                notification_type=NotificationType.EXCEPTION_CREATED,
                recipients=admin_emails,
                template_data=template_data,
                user_id=created_by_user_id
            )
            
            if success:
                logger.info(f"Exception creation notification sent for exception {exception_id}")
            else:
                logger.error(f"Failed to send exception creation notification for exception {exception_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending exception creation notification: {e}")
            return False
    
    def notify_exception_assigned(self, exception_id: int, assigned_to_user_id: int, assigned_by_user_id: int) -> bool:
        """
        Send notification when an exception is assigned.
        
        Args:
            exception_id: ID of the assigned exception
            assigned_to_user_id: ID of user the exception is assigned to
            assigned_by_user_id: ID of user who made the assignment
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            # Get exception details
            exception = self.db.query(Exception).filter(Exception.id == exception_id).first()
            if not exception:
                logger.error(f"Exception {exception_id} not found for notification")
                return False
            
            # Get assigned user details
            assigned_user = self.db.query(User).filter(User.id == assigned_to_user_id).first()
            if not assigned_user:
                logger.error(f"Assigned user {assigned_to_user_id} not found")
                return False
            
            # Get assigning user details
            assigning_user = self.db.query(User).filter(User.id == assigned_by_user_id).first()
            if not assigning_user:
                logger.error(f"Assigning user {assigned_by_user_id} not found")
                return False
            
            # Prepare template data
            template_data = {
                "assigned_to": assigned_user.name,
                "exception_type": exception.type.value,
                "exception_id": exception.id,
                "review_id": exception.review_id,
                "assigned_by": assigning_user.name,
                "assignment_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "description": exception.description
            }
            
            # Send notification to assigned user with fallback
            success = self._send_notification_with_fallback(
                notification_type=NotificationType.EXCEPTION_ASSIGNED,
                recipients=[assigned_user.email] if assigned_user.email else [],
                template_data=template_data,
                user_id=assigned_by_user_id
            )
            
            if success:
                logger.info(f"Exception assignment notification sent for exception {exception_id}")
            else:
                logger.error(f"Failed to send exception assignment notification for exception {exception_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending exception assignment notification: {e}")
            return False
    
    def notify_exception_resolved(self, exception_id: int, resolved_by_user_id: int, resolution_notes: str) -> bool:
        """
        Send notification when an exception is resolved.
        
        Args:
            exception_id: ID of the resolved exception
            resolved_by_user_id: ID of user who resolved the exception
            resolution_notes: Notes about the resolution
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            # Get exception details
            exception = self.db.query(Exception).filter(Exception.id == exception_id).first()
            if not exception:
                logger.error(f"Exception {exception_id} not found for notification")
                return False
            
            # Get resolver details
            resolver = self.db.query(User).filter(User.id == resolved_by_user_id).first()
            if not resolver:
                logger.error(f"Resolver {resolved_by_user_id} not found")
                return False
            
            # Get creator details for notification
            creator = self.db.query(User).filter(User.id == exception.created_by).first()
            
            # Get all active Admins and the creator
            admin_emails = self.email_service.get_recipients_by_role(UserRole.ADMIN, self.db)
            recipients = admin_emails.copy()
            
            # Add creator if they have an email and are not already in the list
            if creator and creator.email and creator.email not in recipients:
                recipients.append(creator.email)
            
            if not recipients:
                logger.warning("No recipients found for exception resolution notification")
                return False
            
            # Prepare template data
            template_data = {
                "exception_type": exception.type.value,
                "exception_id": exception.id,
                "review_id": exception.review_id,
                "resolved_by": resolver.name,
                "resolution_date": exception.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if exception.resolved_at else "N/A",
                "resolution_notes": resolution_notes
            }
            
            # Send notification with fallback
            success = self._send_notification_with_fallback(
                notification_type=NotificationType.EXCEPTION_RESOLVED,
                recipients=recipients,
                template_data=template_data,
                user_id=resolved_by_user_id
            )
            
            if success:
                logger.info(f"Exception resolution notification sent for exception {exception_id}")
            else:
                logger.error(f"Failed to send exception resolution notification for exception {exception_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending exception resolution notification: {e}")
            return False
    
    def get_notification_preferences(self, user_id: int) -> Dict[str, bool]:
        """
        Get notification preferences for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with notification preferences
        """
        # For now, return default preferences
        # In the future, this could be stored in the database
        return {
            "review_submitted": True,
            "review_approved": True,
            "review_rejected": True,
            "exception_created": True,
            "exception_assigned": True,
            "exception_resolved": True
        }
    
    def update_notification_preferences(self, user_id: int, preferences: Dict[str, bool]) -> bool:
        """
        Update notification preferences for a user.
        
        Args:
            user_id: User ID
            preferences: Dictionary with notification preferences
            
        Returns:
            bool: True if preferences updated successfully
        """
        # For now, just log the preferences
        # In the future, this could be stored in the database
        logger.info(f"Notification preferences updated for user {user_id}: {preferences}")
        return True
    
    def send_daily_summary(self, user_id: int) -> bool:
        """
        Send daily summary notification to a user.
        
        Args:
            user_id: User ID
            
        Returns:
            bool: True if summary sent successfully
        """
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or not user.email:
                return False
            
            # Get summary data based on user role
            if user.role == UserRole.CHECKER:
                # Get pending reviews for checkers
                from app.services.review import ReviewService
                review_service = ReviewService(self.db)
                pending_reviews = review_service.get_pending_reviews()
                
                summary_data = {
                    "user_name": user.name,
                    "pending_reviews_count": len(pending_reviews),
                    "date": datetime.utcnow().strftime("%Y-%m-%d")
                }
                
                # For now, use a simple template
                # In the future, create a dedicated daily summary template
                logger.info(f"Daily summary would be sent to {user.email}: {summary_data}")
                
            elif user.role == UserRole.ADMIN:
                # Get exception statistics for admins
                from app.services.exception import ExceptionService
                exception_service = ExceptionService(self.db)
                open_exceptions = exception_service.get_open_exceptions()
                overdue_exceptions = exception_service.get_overdue_exceptions()
                
                summary_data = {
                    "user_name": user.name,
                    "open_exceptions_count": len(open_exceptions),
                    "overdue_exceptions_count": len(overdue_exceptions),
                    "date": datetime.utcnow().strftime("%Y-%m-%d")
                }
                
                logger.info(f"Daily summary would be sent to {user.email}: {summary_data}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending daily summary: {e}")
            return False
    
    def send_escalation_notification(self, exception_id: int, escalated_by_user_id: int) -> bool:
        """
        Send notification when an exception is escalated.
        
        Args:
            exception_id: ID of the escalated exception
            escalated_by_user_id: ID of user who escalated the exception
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            # Get exception details
            exception = self.db.query(Exception).filter(Exception.id == exception_id).first()
            if not exception:
                logger.error(f"Exception {exception_id} not found for escalation notification")
                return False
            
            # Get all active Admins for escalation notifications
            admin_emails = self.email_service.get_recipients_by_role(UserRole.ADMIN, self.db)
            
            if not admin_emails:
                logger.warning("No active Admins found for escalation notification")
                return False
            
            # For now, use the exception created template with escalation context
            # In the future, create a dedicated escalation template
            template_data = {
                "exception_type": f"ESCALATED - {exception.type.value}",
                "exception_id": exception.id,
                "review_id": exception.review_id,
                "created_by": "System Escalation",
                "creation_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "description": f"Exception has been escalated. Original description: {exception.description}"
            }
            
            # Send notification using exception created template with fallback
            success = self._send_notification_with_fallback(
                notification_type=NotificationType.EXCEPTION_CREATED,
                recipients=admin_emails,
                template_data=template_data,
                user_id=escalated_by_user_id
            )
            
            if success:
                logger.info(f"Exception escalation notification sent for exception {exception_id}")
            else:
                logger.error(f"Failed to send exception escalation notification for exception {exception_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending exception escalation notification: {e}")
            return False