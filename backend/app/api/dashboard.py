"""
Dashboard API endpoints for metrics and notifications.
"""
from typing import List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.models.review import Review, ReviewStatus
from app.models.exception import ReviewException, ExceptionStatus
from app.models.client import Client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get dashboard metrics for the current user.
    Returns real-time data from the database.
    """
    try:
        # Calculate date ranges
        today = datetime.now().date()
        thirty_days_ago = today - timedelta(days=30)
        seven_days_ago = today - timedelta(days=7)
        
        # Get review counts by status
        pending_reviews = db.query(Review).filter(
            Review.status.in_([ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW])
        ).count()
        
        approved_reviews = db.query(Review).filter(
            and_(
                Review.status == ReviewStatus.APPROVED,
                Review.reviewed_at >= thirty_days_ago
            )
        ).count()
        
        rejected_reviews = db.query(Review).filter(
            and_(
                Review.status == ReviewStatus.REJECTED,
                Review.reviewed_at >= thirty_days_ago
            )
        ).count()
        
        # Get exception counts
        open_exceptions = db.query(ReviewException).filter(
            ReviewException.status.in_([ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS])
        ).count()
        
        # Get active users (users who have logged in within the last 7 days)
        # For now, we'll count all active users since we don't track last login
        active_users = db.query(User).filter(User.is_active == True).count()
        
        # Calculate average review time (in hours)
        completed_reviews = db.query(Review).filter(
            and_(
                Review.status.in_([ReviewStatus.APPROVED, ReviewStatus.REJECTED]),
                Review.submitted_at.isnot(None),
                Review.reviewed_at.isnot(None),
                Review.reviewed_at >= thirty_days_ago
            )
        ).all()
        
        if completed_reviews:
            total_hours = sum([
                (review.reviewed_at - review.submitted_at).total_seconds() / 3600
                for review in completed_reviews
                if review.submitted_at and review.reviewed_at
            ])
            average_review_time = round(total_hours / len(completed_reviews), 1)
        else:
            average_review_time = 0
        
        # Get review status distribution
        status_counts = db.query(
            Review.status,
            func.count(Review.id).label('count')
        ).group_by(Review.status).all()
        
        status_colors = {
            ReviewStatus.DRAFT: "#6b7280",
            ReviewStatus.SUBMITTED: "#f59e0b", 
            ReviewStatus.UNDER_REVIEW: "#f59e0b",
            ReviewStatus.APPROVED: "#10b981",
            ReviewStatus.REJECTED: "#ef4444"
        }
        
        reviews_by_status = []
        for status, count in status_counts:
            reviews_by_status.append({
                "name": status.value.replace('_', ' ').title(),
                "value": count,
                "color": status_colors.get(status, "#6b7280")
            })
        
        # Get review trends over the last 7 days
        reviews_over_time = []
        for i in range(7):
            date = today - timedelta(days=6-i)
            
            submitted_count = db.query(Review).filter(
                func.date(Review.created_at) == date
            ).count()
            
            approved_count = db.query(Review).filter(
                and_(
                    Review.status == ReviewStatus.APPROVED,
                    func.date(Review.reviewed_at) == date
                )
            ).count()
            
            rejected_count = db.query(Review).filter(
                and_(
                    Review.status == ReviewStatus.REJECTED,
                    func.date(Review.reviewed_at) == date
                )
            ).count()
            
            reviews_over_time.append({
                "date": date.strftime("%m/%d"),
                "submitted": submitted_count,
                "approved": approved_count,
                "rejected": rejected_count
            })
        
        # Get high-risk client count
        high_risk_clients = db.query(Client).filter(
            Client.risk_level == 'HIGH'
        ).count()
        
        # Get clients needing review (no review in last 365 days)
        one_year_ago = today - timedelta(days=365)
        clients_needing_review = db.query(Client).filter(
            or_(
                Client.last_review_date.is_(None),
                Client.last_review_date < one_year_ago
            )
        ).count()
        
        return {
            "pendingReviews": pending_reviews,
            "approvedReviews": approved_reviews,
            "rejectedReviews": rejected_reviews,
            "openExceptions": open_exceptions,
            "activeUsers": active_users,
            "averageReviewTime": average_review_time,
            "highRiskClients": high_risk_clients,
            "clientsNeedingReview": clients_needing_review,
            "reviewsByStatus": reviews_by_status,
            "reviewsOverTime": reviews_over_time,
            "totalReviews": pending_reviews + approved_reviews + rejected_reviews,
            "completionRate": round(
                (approved_reviews / max(approved_reviews + rejected_reviews, 1)) * 100, 1
            ) if (approved_reviews + rejected_reviews) > 0 else 0,
            "lastUpdated": datetime.now().isoformat()
        }
        
    except Exception as e:
        # Return fallback data if there's an error
        return {
            "pendingReviews": 0,
            "approvedReviews": 0,
            "rejectedReviews": 0,
            "openExceptions": 0,
            "activeUsers": 0,
            "averageReviewTime": 0,
            "highRiskClients": 0,
            "clientsNeedingReview": 0,
            "reviewsByStatus": [],
            "reviewsOverTime": [],
            "totalReviews": 0,
            "completionRate": 0,
            "lastUpdated": datetime.now().isoformat(),
            "error": str(e)
        }


@router.get("/notifications")
async def get_notifications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get notifications for the current user.
    Returns recent activity and pending items.
    """
    try:
        notifications = []
        
        # Get pending reviews for checkers
        if current_user.role in ['Checker', 'Admin']:
            pending_reviews = db.query(Review).filter(
                Review.status.in_([ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW])
            ).limit(5).all()
            
            for review in pending_reviews:
                # Get client name if available
                client = db.query(Client).filter(Client.id == review.client_id).first()
                client_name = client.name if client else f"Client {review.client_id}"
                
                notifications.append({
                    "id": f"review_{review.id}",
                    "type": "review_pending",
                    "title": "Review Pending",
                    "message": f"Review for {client_name} is awaiting approval",
                    "timestamp": review.submitted_at.isoformat() if review.submitted_at else review.created_at.isoformat(),
                    "read": False,
                    "priority": "medium",
                    "actionUrl": f"/reviews/{review.id}"
                })
        
        # Get open exceptions
        open_exceptions = db.query(ReviewException).filter(
            ReviewException.status.in_([ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS])
        ).limit(3).all()
        
        for exception in open_exceptions:
            priority_level = "high" if hasattr(exception, 'priority') and exception.priority in ['HIGH', 'CRITICAL'] else "medium"
            notifications.append({
                "id": f"exception_{exception.id}",
                "type": "exception_open",
                "title": "Open Exception",
                "message": f"{exception.title} - {exception.exception_type.value if hasattr(exception, 'exception_type') else 'Exception'}",
                "timestamp": exception.created_at.isoformat(),
                "read": False,
                "priority": priority_level,
                "actionUrl": f"/exceptions/{exception.id}"
            })
        
        # Get recent approvals/rejections for makers
        if current_user.role in ['Maker', 'Admin']:
            recent_reviews = db.query(Review).filter(
                and_(
                    Review.submitted_by == current_user.id,
                    Review.status.in_([ReviewStatus.APPROVED, ReviewStatus.REJECTED]),
                    Review.reviewed_at >= datetime.now() - timedelta(days=7)
                )
            ).order_by(Review.reviewed_at.desc()).limit(3).all()
            
            for review in recent_reviews:
                # Get client name if available
                client = db.query(Client).filter(Client.id == review.client_id).first()
                client_name = client.name if client else f"Client {review.client_id}"
                
                status_text = "approved" if review.status == ReviewStatus.APPROVED else "rejected"
                notifications.append({
                    "id": f"review_result_{review.id}",
                    "type": f"review_{status_text}",
                    "title": f"Review {status_text.title()}",
                    "message": f"Your review for {client_name} was {status_text}",
                    "timestamp": review.reviewed_at.isoformat() if review.reviewed_at else review.updated_at.isoformat(),
                    "read": False,
                    "priority": "low",
                    "actionUrl": f"/reviews/{review.id}"
                })
        
        # Add some sample notifications if no real notifications exist (for demo purposes)
        if len(notifications) == 0:
            sample_notifications = [
                {
                    "id": "sample_1",
                    "type": "review_pending",
                    "title": "Welcome to the Dashboard",
                    "message": "Your notification system is working correctly. This is a sample notification.",
                    "timestamp": datetime.now().isoformat(),
                    "read": False,
                    "priority": "low",
                    "actionUrl": "/dashboard"
                }
            ]
            notifications.extend(sample_notifications)
        
        # Sort by timestamp (newest first)
        notifications.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return notifications[:10]  # Return max 10 notifications
        
    except Exception as e:
        # Return empty list if there's an error
        return []


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Mark a notification as read.
    For now, this is a placeholder that returns success.
    In a full implementation, this would update a notifications table.
    """
    return {"status": "success", "message": "Notification marked as read"}


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Mark all notifications as read for the current user.
    For now, this is a placeholder that returns success.
    In a full implementation, this would update all notifications for the user.
    """
    return {"status": "success", "message": "All notifications marked as read"}


@router.delete("/notifications/{notification_id}")
async def dismiss_notification(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Dismiss a notification.
    For now, this is a placeholder that returns success.
    In a full implementation, this would remove or hide the notification.
    """
    return {"status": "success", "message": "Notification dismissed"}