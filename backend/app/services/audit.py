"""
Audit service for logging system activities and compliance tracking.
"""
import csv
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Union
from io import StringIO
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func, text

from app.models.audit_log import AuditLog, AuditAction, AuditEntityType
from app.models.user import User


class AuditService:
    """Service class for audit logging operations."""
    
    def __init__(self, db: Session):
        """
        Initialize audit service.
        
        Args:
            db: Database session
        """
        self.db = db
    
    def log_action(
        self,
        user_id: int,
        entity_type: str,
        entity_id: str,
        action: str,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Log an audit action.
        
        Args:
            user_id: ID of user performing the action
            entity_type: Type of entity being acted upon (e.g., 'Client', 'Review')
            entity_id: ID of the entity
            action: Action being performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
            details: Additional details about the action
            
        Returns:
            Created audit log entry
        """
        audit_log = AuditLog(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            description=f"{action} on {entity_type} {entity_id}",
            details=details or {}
        )
        
        self.db.add(audit_log)
        self.db.flush()  # Flush to get the ID but don't commit yet
        
        return audit_log
    
    def get_audit_logs(
        self,
        user_id: Optional[int] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        per_page: int = 50
    ) -> tuple[List[AuditLog], int]:
        """
        Get audit logs with filtering and pagination.
        
        Args:
            user_id: Filter by user ID
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            action: Filter by action
            start_date: Filter by start date
            end_date: Filter by end date
            page: Page number for pagination
            per_page: Number of items per page
            
        Returns:
            Tuple of (audit logs list, total count)
        """
        query = self.db.query(AuditLog)
        
        # Apply filters
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)
        
        if action:
            query = query.filter(AuditLog.action == action)
        
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination and ordering
        offset = (page - 1) * per_page
        audit_logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(per_page).all()
        
        return audit_logs, total_count
    
    def get_entity_audit_trail(self, entity_type: str, entity_id: str) -> List[AuditLog]:
        """
        Get complete audit trail for a specific entity.
        
        Args:
            entity_type: Type of entity
            entity_id: ID of the entity
            
        Returns:
            List of audit log entries for the entity
        """
        return self.db.query(AuditLog).filter(
            and_(
                AuditLog.entity_type == entity_type,
                AuditLog.entity_id == entity_id
            )
        ).order_by(desc(AuditLog.created_at)).all()
    
    def get_user_activity(self, user_id: int, limit: int = 100) -> List[AuditLog]:
        """
        Get recent activity for a specific user.
        
        Args:
            user_id: ID of the user
            limit: Maximum number of entries to return
            
        Returns:
            List of recent audit log entries for the user
        """
        return self.db.query(AuditLog).filter(
            AuditLog.user_id == user_id
        ).order_by(desc(AuditLog.created_at)).limit(limit).all()
    
    def advanced_search_audit_logs(
        self,
        user_id: Optional[int] = None,
        entity_type: Optional[Union[str, AuditEntityType]] = None,
        entity_id: Optional[str] = None,
        action: Optional[Union[str, AuditAction]] = None,
        success_filter: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        ip_address: Optional[str] = None,
        search_text: Optional[str] = None,
        tags: Optional[List[str]] = None,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        page: int = 1,
        per_page: int = 50,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> tuple[List[AuditLog], int]:
        """
        Advanced search for audit logs with multiple filters.
        
        Args:
            user_id: Filter by user ID
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            action: Filter by action
            success_filter: Filter by success status
            start_date: Filter by start date
            end_date: Filter by end date
            ip_address: Filter by IP address
            search_text: Full-text search in description and details
            tags: Filter by tags in details
            category: Filter by category in details
            severity: Filter by severity in details
            page: Page number for pagination
            per_page: Number of items per page
            sort_by: Field to sort by
            sort_order: Sort order (asc/desc)
            
        Returns:
            Tuple of (audit logs list, total count)
        """
        query = self.db.query(AuditLog)
        
        # Apply filters
        if user_id is not None:
            query = query.filter(AuditLog.user_id == user_id)
        
        if entity_type is not None:
            if isinstance(entity_type, str):
                try:
                    entity_type = AuditEntityType(entity_type)
                except ValueError:
                    pass  # Invalid entity type, ignore filter
            if isinstance(entity_type, AuditEntityType):
                query = query.filter(AuditLog.entity_type == entity_type)
        
        if entity_id is not None:
            query = query.filter(AuditLog.entity_id == entity_id)
        
        if action is not None:
            if isinstance(action, str):
                try:
                    action = AuditAction(action)
                except ValueError:
                    pass  # Invalid action, ignore filter
            if isinstance(action, AuditAction):
                query = query.filter(AuditLog.action == action)
        
        if success_filter is not None:
            success_value = "true" if success_filter else "false"
            query = query.filter(AuditLog.success == success_value)
        
        if start_date is not None:
            query = query.filter(AuditLog.created_at >= start_date)
        
        if end_date is not None:
            query = query.filter(AuditLog.created_at <= end_date)
        
        if ip_address is not None:
            query = query.filter(AuditLog.ip_address == ip_address)
        
        if search_text is not None:
            # Full-text search in description and details
            search_pattern = f"%{search_text}%"
            query = query.filter(
                or_(
                    AuditLog.description.ilike(search_pattern),
                    AuditLog.details.astext.ilike(search_pattern)
                )
            )
        
        if tags is not None and len(tags) > 0:
            # Search for any of the provided tags in the details JSON
            tag_conditions = []
            for tag in tags:
                tag_conditions.append(
                    AuditLog.details.op('->>')('tags').op('?')(tag)
                )
            query = query.filter(or_(*tag_conditions))
        
        if category is not None:
            query = query.filter(
                AuditLog.details.op('->>')('category') == category
            )
        
        if severity is not None:
            query = query.filter(
                AuditLog.details.op('->>')('severity') == severity
            )
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        sort_column = getattr(AuditLog, sort_by, AuditLog.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)
        
        # Apply pagination
        offset = (page - 1) * per_page
        audit_logs = query.offset(offset).limit(per_page).all()
        
        return audit_logs, total_count
    
    def export_audit_logs(
        self,
        format: str = "csv",
        user_id: Optional[int] = None,
        entity_type: Optional[Union[str, AuditEntityType]] = None,
        entity_id: Optional[str] = None,
        action: Optional[Union[str, AuditAction]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_details: bool = True,
        max_records: int = 10000
    ) -> str:
        """
        Export audit logs in various formats.
        
        Args:
            format: Export format (csv, json, xml)
            user_id: Filter by user ID
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            action: Filter by action
            start_date: Filter by start date
            end_date: Filter by end date
            include_details: Include detailed information
            max_records: Maximum number of records to export
            
        Returns:
            Exported data as string
        """
        # Get audit logs with filters
        audit_logs, _ = self.advanced_search_audit_logs(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            start_date=start_date,
            end_date=end_date,
            page=1,
            per_page=max_records
        )
        
        # Prepare data for export
        export_data = []
        for log in audit_logs:
            # Get user information
            user = self.db.query(User).filter(User.id == log.user_id).first()
            
            row = {
                "id": log.id,
                "timestamp": log.created_at.isoformat(),
                "user_id": log.user_id,
                "user_name": user.name if user else None,
                "user_email": user.email if user else None,
                "user_role": user.role.value if user else None,
                "entity_type": log.entity_type.value,
                "entity_id": log.entity_id,
                "action": log.action.value,
                "description": log.description,
                "success": log.success,
                "error_message": log.error_message,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "session_id": log.session_id
            }
            
            if include_details and log.details:
                if format == "csv":
                    # Flatten details for CSV
                    for key, value in log.details.items():
                        row[f"detail_{key}"] = str(value) if value is not None else ""
                else:
                    row["details"] = log.details
            
            export_data.append(row)
        
        # Generate export based on format
        if format.lower() == "csv":
            return self._export_to_csv(export_data)
        elif format.lower() == "json":
            return self._export_to_json(export_data)
        elif format.lower() == "xml":
            return self._export_to_xml(export_data)
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def _export_to_csv(self, data: List[Dict[str, Any]]) -> str:
        """Export data to CSV format."""
        if not data:
            return ""
        
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()
    
    def _export_to_json(self, data: List[Dict[str, Any]]) -> str:
        """Export data to JSON format."""
        return json.dumps(data, indent=2, default=str)
    
    def _export_to_xml(self, data: List[Dict[str, Any]]) -> str:
        """Export data to XML format."""
        xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<audit_logs>']
        
        for record in data:
            xml_lines.append('  <audit_log>')
            for key, value in record.items():
                if value is not None:
                    # Escape XML special characters
                    escaped_value = str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    xml_lines.append(f'    <{key}>{escaped_value}</{key}>')
            xml_lines.append('  </audit_log>')
        
        xml_lines.append('</audit_logs>')
        return '\n'.join(xml_lines)
    
    def get_audit_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        group_by: str = "day"
    ) -> Dict[str, Any]:
        """
        Get comprehensive audit statistics.
        
        Args:
            start_date: Start date for statistics
            end_date: End date for statistics
            group_by: Grouping period (day, week, month)
            
        Returns:
            Dictionary with audit statistics
        """
        query = self.db.query(AuditLog)
        
        # Apply date filters
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        
        # Basic counts
        total_logs = query.count()
        successful_logs = query.filter(AuditLog.success == "true").count()
        failed_logs = query.filter(AuditLog.success == "false").count()
        
        # Top actions
        top_actions = self.db.query(
            AuditLog.action,
            func.count(AuditLog.id).label('count')
        ).group_by(AuditLog.action).order_by(desc('count')).limit(10).all()
        
        # Top users
        top_users = self.db.query(
            AuditLog.user_id,
            func.count(AuditLog.id).label('count')
        ).group_by(AuditLog.user_id).order_by(desc('count')).limit(10).all()
        
        # Top entities
        top_entities = self.db.query(
            AuditLog.entity_type,
            func.count(AuditLog.id).label('count')
        ).group_by(AuditLog.entity_type).order_by(desc('count')).limit(10).all()
        
        # Activity over time
        if group_by == "day":
            date_format = func.date(AuditLog.created_at)
        elif group_by == "week":
            date_format = func.date_trunc('week', AuditLog.created_at)
        elif group_by == "month":
            date_format = func.date_trunc('month', AuditLog.created_at)
        else:
            date_format = func.date(AuditLog.created_at)
        
        activity_over_time = self.db.query(
            date_format.label('period'),
            func.count(AuditLog.id).label('count')
        ).group_by('period').order_by('period').all()
        
        return {
            "total_logs": total_logs,
            "successful_logs": successful_logs,
            "failed_logs": failed_logs,
            "success_rate": round((successful_logs / total_logs * 100), 2) if total_logs > 0 else 0,
            "top_actions": [{"action": action.value, "count": count} for action, count in top_actions],
            "top_users": [{"user_id": user_id, "count": count} for user_id, count in top_users],
            "top_entities": [{"entity_type": entity_type.value, "count": count} for entity_type, count in top_entities],
            "activity_over_time": [{"period": str(period), "count": count} for period, count in activity_over_time]
        }
    
    def get_compliance_report(
        self,
        start_date: datetime,
        end_date: datetime,
        entity_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate a compliance report for audit logs.
        
        Args:
            start_date: Start date for the report
            end_date: End date for the report
            entity_types: Filter by specific entity types
            
        Returns:
            Dictionary with compliance report data
        """
        query = self.db.query(AuditLog).filter(
            AuditLog.created_at >= start_date,
            AuditLog.created_at <= end_date
        )
        
        if entity_types:
            entity_type_enums = []
            for et in entity_types:
                try:
                    entity_type_enums.append(AuditEntityType(et))
                except ValueError:
                    continue
            if entity_type_enums:
                query = query.filter(AuditLog.entity_type.in_(entity_type_enums))
        
        # Get all logs for the period
        logs = query.all()
        
        # Analyze compliance metrics
        total_actions = len(logs)
        user_actions = len([log for log in logs if log.user_id is not None])
        system_actions = len([log for log in logs if log.user_id is None])
        
        # Actions by type
        actions_by_type = {}
        for log in logs:
            action = log.action.value
            actions_by_type[action] = actions_by_type.get(action, 0) + 1
        
        # Failed actions analysis
        failed_actions = [log for log in logs if log.success == "false"]
        failed_by_type = {}
        for log in failed_actions:
            action = log.action.value
            failed_by_type[action] = failed_by_type.get(action, 0) + 1
        
        # User activity analysis
        user_activity = {}
        for log in logs:
            if log.user_id:
                user_activity[log.user_id] = user_activity.get(log.user_id, 0) + 1
        
        # Entity modification tracking
        entity_modifications = {}
        for log in logs:
            if log.action in [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE]:
                entity_key = f"{log.entity_type.value}:{log.entity_id}"
                if entity_key not in entity_modifications:
                    entity_modifications[entity_key] = []
                entity_modifications[entity_key].append({
                    "action": log.action.value,
                    "timestamp": log.created_at.isoformat(),
                    "user_id": log.user_id
                })
        
        return {
            "report_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "summary": {
                "total_actions": total_actions,
                "user_actions": user_actions,
                "system_actions": system_actions,
                "failed_actions": len(failed_actions),
                "success_rate": round(((total_actions - len(failed_actions)) / total_actions * 100), 2) if total_actions > 0 else 0
            },
            "actions_by_type": actions_by_type,
            "failed_actions_by_type": failed_by_type,
            "user_activity": user_activity,
            "entity_modifications": entity_modifications,
            "compliance_indicators": {
                "data_integrity": len([log for log in logs if log.action in [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE]]),
                "access_control": len([log for log in logs if log.action in [AuditAction.LOGIN, AuditAction.LOGOUT, AuditAction.ACCESS]]),
                "workflow_compliance": len([log for log in logs if log.action in [AuditAction.SUBMIT, AuditAction.APPROVE, AuditAction.REJECT]])
            }
        }
    
    def implement_retention_policy(
        self,
        retention_days: int = 2555,  # 7 years default
        archive_before_delete: bool = True
    ) -> Dict[str, int]:
        """
        Implement audit log retention policy.
        
        Args:
            retention_days: Number of days to retain logs
            archive_before_delete: Whether to archive logs before deletion
            
        Returns:
            Dictionary with retention statistics
        """
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Find logs older than retention period
        old_logs_query = self.db.query(AuditLog).filter(
            AuditLog.created_at < cutoff_date
        )
        
        old_logs_count = old_logs_query.count()
        
        if old_logs_count == 0:
            return {
                "logs_processed": 0,
                "logs_archived": 0,
                "logs_deleted": 0
            }
        
        archived_count = 0
        if archive_before_delete:
            # Export old logs to archive format
            old_logs = old_logs_query.all()
            archive_data = []
            
            for log in old_logs:
                user = self.db.query(User).filter(User.id == log.user_id).first()
                archive_data.append({
                    "id": log.id,
                    "timestamp": log.created_at.isoformat(),
                    "user_id": log.user_id,
                    "user_email": user.email if user else None,
                    "entity_type": log.entity_type.value,
                    "entity_id": log.entity_id,
                    "action": log.action.value,
                    "description": log.description,
                    "details": log.details,
                    "success": log.success,
                    "ip_address": log.ip_address
                })
            
            # Here you would typically save to an archive storage system
            # For now, we'll just count the archived logs
            archived_count = len(archive_data)
        
        # Delete old logs
        deleted_count = old_logs_query.delete()
        self.db.commit()
        
        return {
            "logs_processed": old_logs_count,
            "logs_archived": archived_count,
            "logs_deleted": deleted_count
        }
    
    def log_auto_review_creation(
        self,
        client_id: str,
        review_count: int,
        review_types: List[str],
        created_by: int
    ) -> AuditLog:
        """
        Log auto-review creation for a client.
        
        Args:
            client_id: ID of the client
            review_count: Number of reviews created
            review_types: List of review types created
            created_by: ID of the user/system creating the reviews
            
        Returns:
            Created audit log entry
        """
        return self.log_action(
            user_id=created_by,
            entity_type="Client",
            entity_id=client_id,
            action="AUTO_REVIEW_CREATION",
            details={
                "review_count": review_count,
                "review_types": review_types,
                "auto_created": True,
                "category": "auto_review"
            }
        )
    
    def log_auto_review_cleanup(
        self,
        reviews_cleaned: int,
        cutoff_date: datetime
    ) -> AuditLog:
        """
        Log auto-review cleanup operation.
        
        Args:
            reviews_cleaned: Number of reviews cleaned up
            cutoff_date: Cutoff date for cleanup
            
        Returns:
            Created audit log entry
        """
        return self.log_action(
            user_id=None,  # System action
            entity_type="System",
            entity_id="auto_review_cleanup",
            action="CLEANUP",
            details={
                "reviews_cleaned": reviews_cleaned,
                "cutoff_date": cutoff_date.isoformat(),
                "category": "auto_review",
                "operation": "cleanup"
            }
        )
    
    def log_error(
        self,
        action: str,
        details: str,
        user_id: Optional[int] = None,
        entity_type: str = "System",
        entity_id: str = "error"
    ) -> AuditLog:
        """
        Log an error event.
        
        Args:
            action: Action that caused the error
            details: Error details
            user_id: ID of the user (if applicable)
            entity_type: Type of entity
            entity_id: ID of the entity
            
        Returns:
            Created audit log entry
        """
        return self.log_action(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action="ERROR",
            details={
                "error_action": action,
                "error_details": details,
                "category": "error"
            }
        )