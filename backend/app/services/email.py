"""
Email service for sending notifications using AWS SES.
Handles template management and role-based recipient selection.
"""
import boto3
import logging
import time
from typing import List, Dict, Any, Optional
from botocore.exceptions import ClientError, BotoCoreError
from enum import Enum
from dataclasses import dataclass

from app.core.config import settings
from app.models.user import User, UserRole
from app.services.audit import AuditService


logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    """Types of notifications that can be sent."""
    REVIEW_SUBMITTED = "review_submitted"
    REVIEW_APPROVED = "review_approved"
    REVIEW_REJECTED = "review_rejected"
    EXCEPTION_CREATED = "exception_created"
    EXCEPTION_ASSIGNED = "exception_assigned"
    EXCEPTION_RESOLVED = "exception_resolved"


@dataclass
class EmailTemplate:
    """Email template configuration."""
    subject: str
    html_body: str
    text_body: str


class EmailService:
    """Service for sending email notifications using AWS SES."""
    
    def __init__(self, audit_service: Optional[AuditService] = None):
        """Initialize email service with AWS SES client."""
        self.audit_service = audit_service
        self._ses_client = None
        self._templates = self._initialize_templates()
    
    @property
    def ses_client(self):
        """Lazy initialization of SES client."""
        if self._ses_client is None:
            try:
                self._ses_client = boto3.client(
                    'ses',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
            except Exception as e:
                logger.error(f"Failed to initialize SES client: {e}")
                raise
        return self._ses_client
    
    def _initialize_templates(self) -> Dict[NotificationType, EmailTemplate]:
        """Initialize email templates for different notification types."""
        return {
            NotificationType.REVIEW_SUBMITTED: EmailTemplate(
                subject="New Review Submitted - Action Required",
                html_body="""
                <html>
                <body>
                    <h2>New Review Submitted</h2>
                    <p>Dear Checker,</p>
                    <p>A new review has been submitted and requires your attention:</p>
                    <ul>
                        <li><strong>Client:</strong> {client_name}</li>
                        <li><strong>Submitted by:</strong> {submitted_by}</li>
                        <li><strong>Review ID:</strong> {review_id}</li>
                        <li><strong>Submission Date:</strong> {submission_date}</li>
                    </ul>
                    <p>Please log in to the system to review and approve/reject this submission.</p>
                    <p>Best regards,<br>Compliance System</p>
                </body>
                </html>
                """,
                text_body="""
                New Review Submitted
                
                Dear Checker,
                
                A new review has been submitted and requires your attention:
                
                Client: {client_name}
                Submitted by: {submitted_by}
                Review ID: {review_id}
                Submission Date: {submission_date}
                
                Please log in to the system to review and approve/reject this submission.
                
                Best regards,
                Compliance System
                """
            ),
            
            NotificationType.REVIEW_APPROVED: EmailTemplate(
                subject="Review Approved - {client_name}",
                html_body="""
                <html>
                <body>
                    <h2>Review Approved</h2>
                    <p>Dear {submitted_by},</p>
                    <p>Your review has been approved:</p>
                    <ul>
                        <li><strong>Client:</strong> {client_name}</li>
                        <li><strong>Review ID:</strong> {review_id}</li>
                        <li><strong>Approved by:</strong> {approved_by}</li>
                        <li><strong>Approval Date:</strong> {approval_date}</li>
                    </ul>
                    {comments}
                    <p>Best regards,<br>Compliance System</p>
                </body>
                </html>
                """,
                text_body="""
                Review Approved
                
                Dear {submitted_by},
                
                Your review has been approved:
                
                Client: {client_name}
                Review ID: {review_id}
                Approved by: {approved_by}
                Approval Date: {approval_date}
                
                {comments}
                
                Best regards,
                Compliance System
                """
            ),
            
            NotificationType.REVIEW_REJECTED: EmailTemplate(
                subject="Review Rejected - {client_name}",
                html_body="""
                <html>
                <body>
                    <h2>Review Rejected</h2>
                    <p>Dear {submitted_by},</p>
                    <p>Your review has been rejected and requires revision:</p>
                    <ul>
                        <li><strong>Client:</strong> {client_name}</li>
                        <li><strong>Review ID:</strong> {review_id}</li>
                        <li><strong>Rejected by:</strong> {rejected_by}</li>
                        <li><strong>Rejection Date:</strong> {rejection_date}</li>
                    </ul>
                    <p><strong>Comments:</strong></p>
                    <p>{comments}</p>
                    <p>Please address the feedback and resubmit the review.</p>
                    <p>Best regards,<br>Compliance System</p>
                </body>
                </html>
                """,
                text_body="""
                Review Rejected
                
                Dear {submitted_by},
                
                Your review has been rejected and requires revision:
                
                Client: {client_name}
                Review ID: {review_id}
                Rejected by: {rejected_by}
                Rejection Date: {rejection_date}
                
                Comments:
                {comments}
                
                Please address the feedback and resubmit the review.
                
                Best regards,
                Compliance System
                """
            ),
            
            NotificationType.EXCEPTION_CREATED: EmailTemplate(
                subject="New Exception Created - {exception_type}",
                html_body="""
                <html>
                <body>
                    <h2>New Exception Created</h2>
                    <p>Dear Admin,</p>
                    <p>A new exception has been created and requires attention:</p>
                    <ul>
                        <li><strong>Exception Type:</strong> {exception_type}</li>
                        <li><strong>Exception ID:</strong> {exception_id}</li>
                        <li><strong>Related Review:</strong> {review_id}</li>
                        <li><strong>Created by:</strong> {created_by}</li>
                        <li><strong>Creation Date:</strong> {creation_date}</li>
                    </ul>
                    <p><strong>Description:</strong></p>
                    <p>{description}</p>
                    <p>Please log in to the system to assign and resolve this exception.</p>
                    <p>Best regards,<br>Compliance System</p>
                </body>
                </html>
                """,
                text_body="""
                New Exception Created
                
                Dear Admin,
                
                A new exception has been created and requires attention:
                
                Exception Type: {exception_type}
                Exception ID: {exception_id}
                Related Review: {review_id}
                Created by: {created_by}
                Creation Date: {creation_date}
                
                Description:
                {description}
                
                Please log in to the system to assign and resolve this exception.
                
                Best regards,
                Compliance System
                """
            ),
            
            NotificationType.EXCEPTION_ASSIGNED: EmailTemplate(
                subject="Exception Assigned to You - {exception_type}",
                html_body="""
                <html>
                <body>
                    <h2>Exception Assigned</h2>
                    <p>Dear {assigned_to},</p>
                    <p>An exception has been assigned to you:</p>
                    <ul>
                        <li><strong>Exception Type:</strong> {exception_type}</li>
                        <li><strong>Exception ID:</strong> {exception_id}</li>
                        <li><strong>Related Review:</strong> {review_id}</li>
                        <li><strong>Assigned by:</strong> {assigned_by}</li>
                        <li><strong>Assignment Date:</strong> {assignment_date}</li>
                    </ul>
                    <p><strong>Description:</strong></p>
                    <p>{description}</p>
                    <p>Please log in to the system to work on this exception.</p>
                    <p>Best regards,<br>Compliance System</p>
                </body>
                </html>
                """,
                text_body="""
                Exception Assigned
                
                Dear {assigned_to},
                
                An exception has been assigned to you:
                
                Exception Type: {exception_type}
                Exception ID: {exception_id}
                Related Review: {review_id}
                Assigned by: {assigned_by}
                Assignment Date: {assignment_date}
                
                Description:
                {description}
                
                Please log in to the system to work on this exception.
                
                Best regards,
                Compliance System
                """
            ),
            
            NotificationType.EXCEPTION_RESOLVED: EmailTemplate(
                subject="Exception Resolved - {exception_type}",
                html_body="""
                <html>
                <body>
                    <h2>Exception Resolved</h2>
                    <p>Dear Team,</p>
                    <p>An exception has been resolved:</p>
                    <ul>
                        <li><strong>Exception Type:</strong> {exception_type}</li>
                        <li><strong>Exception ID:</strong> {exception_id}</li>
                        <li><strong>Related Review:</strong> {review_id}</li>
                        <li><strong>Resolved by:</strong> {resolved_by}</li>
                        <li><strong>Resolution Date:</strong> {resolution_date}</li>
                    </ul>
                    <p><strong>Resolution Notes:</strong></p>
                    <p>{resolution_notes}</p>
                    <p>Best regards,<br>Compliance System</p>
                </body>
                </html>
                """,
                text_body="""
                Exception Resolved
                
                Dear Team,
                
                An exception has been resolved:
                
                Exception Type: {exception_type}
                Exception ID: {exception_id}
                Related Review: {review_id}
                Resolved by: {resolved_by}
                Resolution Date: {resolution_date}
                
                Resolution Notes:
                {resolution_notes}
                
                Best regards,
                Compliance System
                """
            )
        }
    
    def get_recipients_by_role(self, role: UserRole, db_session) -> List[str]:
        """Get email addresses of active users with specified role."""
        try:
            users = db_session.query(User).filter(
                User.role == role,
                User.is_active == True
            ).all()
            
            return [user.email for user in users if user.email]
        except Exception as e:
            logger.error(f"Failed to get recipients for role {role}: {e}")
            return []
    
    def get_recipients_by_roles(self, roles: List[UserRole], db_session) -> List[str]:
        """Get email addresses of active users with any of the specified roles."""
        try:
            users = db_session.query(User).filter(
                User.role.in_(roles),
                User.is_active == True
            ).all()
            
            return [user.email for user in users if user.email]
        except Exception as e:
            logger.error(f"Failed to get recipients for roles {roles}: {e}")
            return []
    
    def send_email(
        self,
        notification_type: NotificationType,
        recipients: List[str],
        template_data: Dict[str, Any],
        user_id: Optional[int] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ) -> bool:
        """
        Send email notification using specified template and data with retry logic.
        
        Args:
            notification_type: Type of notification to send
            recipients: List of email addresses
            template_data: Data to populate template placeholders
            user_id: ID of user triggering the notification (for audit)
            max_retries: Maximum number of retry attempts
            retry_delay: Delay between retries in seconds
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not recipients:
            logger.warning(f"No recipients specified for {notification_type}")
            return False
        
        if not settings.SES_FROM_EMAIL:
            logger.error("SES_FROM_EMAIL not configured")
            return False
        
        try:
            template = self._templates.get(notification_type)
            if not template:
                logger.error(f"No template found for {notification_type}")
                return False
            
            # Format template with provided data
            subject = template.subject.format(**template_data)
            html_body = template.html_body.format(**template_data)
            text_body = template.text_body.format(**template_data)
            
            # Handle comments formatting for approval/rejection emails
            if 'comments' in template_data and template_data['comments']:
                if notification_type == NotificationType.REVIEW_APPROVED:
                    comments_html = f"<p><strong>Comments:</strong></p><p>{template_data['comments']}</p>"
                    comments_text = f"Comments:\n{template_data['comments']}\n"
                else:
                    comments_html = template_data['comments']
                    comments_text = template_data['comments']
                
                html_body = html_body.replace('{comments}', comments_html)
                text_body = text_body.replace('{comments}', comments_text)
            else:
                html_body = html_body.replace('{comments}', '')
                text_body = text_body.replace('{comments}', '')
            
            # Attempt to send email with retry logic
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    # Send email via SES
                    response = self.ses_client.send_email(
                        Source=settings.SES_FROM_EMAIL,
                        Destination={'ToAddresses': recipients},
                        Message={
                            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                            'Body': {
                                'Html': {'Data': html_body, 'Charset': 'UTF-8'},
                                'Text': {'Data': text_body, 'Charset': 'UTF-8'}
                            }
                        }
                    )
                    
                    message_id = response.get('MessageId')
                    logger.info(f"Email sent successfully on attempt {attempt + 1}. MessageId: {message_id}")
                    
                    # Log successful delivery to audit trail
                    if self.audit_service and user_id:
                        self.audit_service.log_action(
                            user_id=user_id,
                            entity_type="notification",
                            entity_id=message_id,
                            action="email_sent",
                            details={
                                "notification_type": notification_type,
                                "recipients": recipients,
                                "subject": subject,
                                "message_id": message_id,
                                "attempt": attempt + 1,
                                "delivery_status": "success"
                            }
                        )
                    
                    return True
                    
                except (ClientError, BotoCoreError) as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger.warning(f"Email send attempt {attempt + 1} failed, retrying in {retry_delay}s: {e}")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        logger.error(f"Email send failed after {max_retries + 1} attempts: {e}")
                        break
            
            # If we get here, all attempts failed
            if last_exception:
                if isinstance(last_exception, ClientError):
                    error_code = last_exception.response['Error']['Code']
                    error_message = last_exception.response['Error']['Message']
                else:
                    error_code = "BotoCoreError"
                    error_message = str(last_exception)
                
                # Log failed delivery attempt
                if self.audit_service and user_id:
                    self.audit_service.log_action(
                        user_id=user_id,
                        entity_type="notification",
                        entity_id=None,
                        action="email_failed",
                        details={
                            "notification_type": notification_type,
                            "recipients": recipients,
                            "subject": subject,
                            "error_code": error_code,
                            "error_message": error_message,
                            "attempts": max_retries + 1,
                            "delivery_status": "failed"
                        }
                    )
            
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error sending email: {e}")
            
            # Log unexpected error
            if self.audit_service and user_id:
                self.audit_service.log_action(
                    user_id=user_id,
                    entity_type="notification",
                    entity_id=None,
                    action="email_error",
                    details={
                        "notification_type": notification_type,
                        "recipients": recipients,
                        "error_type": "unexpected_error",
                        "error_message": str(e),
                        "delivery_status": "error"
                    }
                )
            
            return False
    
    def verify_email_address(self, email: str) -> bool:
        """
        Verify an email address with SES (required for sandbox mode).
        
        Args:
            email: Email address to verify
            
        Returns:
            bool: True if verification initiated successfully
        """
        try:
            self.ses_client.verify_email_identity(EmailAddress=email)
            logger.info(f"Email verification initiated for {email}")
            return True
        except ClientError as e:
            logger.error(f"Failed to verify email {email}: {e}")
            return False
    
    def get_send_quota(self) -> Dict[str, Any]:
        """Get SES sending quota and statistics."""
        try:
            quota = self.ses_client.get_send_quota()
            statistics = self.ses_client.get_send_statistics()
            
            return {
                "max_24_hour": quota.get('Max24HourSend', 0),
                "max_send_rate": quota.get('MaxSendRate', 0),
                "sent_last_24_hours": quota.get('SentLast24Hours', 0),
                "statistics": statistics.get('SendDataPoints', [])
            }
        except ClientError as e:
            logger.error(f"Failed to get SES quota: {e}")
            return {}
    
    def check_delivery_status(self, message_id: str) -> Dict[str, Any]:
        """
        Check delivery status of a sent email.
        
        Args:
            message_id: SES message ID
            
        Returns:
            Dictionary with delivery status information
        """
        try:
            # Note: SES doesn't provide a direct API to check message status
            # This would typically be implemented using SNS notifications
            # For now, return a placeholder response
            return {
                "message_id": message_id,
                "status": "unknown",
                "note": "Delivery status tracking requires SNS configuration"
            }
        except Exception as e:
            logger.error(f"Failed to check delivery status: {e}")
            return {"error": str(e)}
    
    def get_bounce_and_complaint_notifications(self) -> Dict[str, Any]:
        """
        Get bounce and complaint notifications from SES.
        This would typically be implemented using SNS/SQS integration.
        
        Returns:
            Dictionary with bounce and complaint information
        """
        try:
            # This is a placeholder for bounce/complaint handling
            # In a production system, this would integrate with SNS/SQS
            return {
                "bounces": [],
                "complaints": [],
                "note": "Bounce/complaint tracking requires SNS/SQS configuration"
            }
        except Exception as e:
            logger.error(f"Failed to get bounce/complaint notifications: {e}")
            return {"error": str(e)}
    
    def send_email_with_tracking(
        self,
        notification_type: NotificationType,
        recipients: List[str],
        template_data: Dict[str, Any],
        user_id: Optional[int] = None,
        tracking_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email with enhanced tracking and audit logging.
        
        Args:
            notification_type: Type of notification to send
            recipients: List of email addresses
            template_data: Data to populate template placeholders
            user_id: ID of user triggering the notification (for audit)
            tracking_id: Optional tracking ID for correlation
            
        Returns:
            Dictionary with send result and tracking information
        """
        import uuid
        
        if not tracking_id:
            tracking_id = str(uuid.uuid4())
        
        # Log notification attempt
        if self.audit_service and user_id:
            self.audit_service.log_action(
                user_id=user_id,
                entity_type="notification",
                entity_id=tracking_id,
                action="email_attempt",
                details={
                    "notification_type": notification_type,
                    "recipients": recipients,
                    "tracking_id": tracking_id,
                    "template_data_keys": list(template_data.keys()),
                    "delivery_status": "attempting"
                }
            )
        
        # Send the email
        success = self.send_email(
            notification_type=notification_type,
            recipients=recipients,
            template_data=template_data,
            user_id=user_id
        )
        
        result = {
            "success": success,
            "tracking_id": tracking_id,
            "notification_type": notification_type,
            "recipients_count": len(recipients),
            "timestamp": time.time()
        }
        
        # Log final result
        if self.audit_service and user_id:
            self.audit_service.log_action(
                user_id=user_id,
                entity_type="notification",
                entity_id=tracking_id,
                action="email_result",
                details={
                    "tracking_id": tracking_id,
                    "success": success,
                    "delivery_status": "completed" if success else "failed",
                    "result": result
                }
            )
        
        return result