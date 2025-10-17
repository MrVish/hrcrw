import React from 'react'
import { format } from 'date-fns'
import '../../styles/modern-table.css'

interface AuditLog {
    id: number
    user_id: number
    entity_type: string
    entity_id: string
    action: string
    created_at: string
    details: Record<string, any>
    user_name?: string
    user_email?: string
    user_role?: string
}

interface AuditLogTableProps {
    auditLogs: AuditLog[]
    loading: boolean
    sortBy: string
    sortOrder: 'asc' | 'desc'
    onSort: (field: string) => void
    onLogSelect: (log: AuditLog) => void
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
    auditLogs,
    loading,
    sortBy,
    sortOrder,
    onSort,
    onLogSelect
}) => {
    const getSortIcon = (field: string) => {
        if (sortBy !== field) return '↕️'
        return sortOrder === 'asc' ? '↑' : '↓'
    }

    const getActionBadgeClass = (action: string) => {
        const actionClasses: Record<string, string> = {
            'CREATE': 'badge-success',
            'UPDATE': 'badge-warning',
            'DELETE': 'badge-danger',
            'LOGIN': 'badge-info',
            'LOGOUT': 'badge-secondary',
            'APPROVE': 'badge-success',
            'REJECT': 'badge-danger',
            'SUBMIT': 'badge-primary',
            'ASSIGN': 'badge-info',
            'RESOLVE': 'badge-success'
        }
        return actionClasses[action] || 'badge-secondary'
    }

    const getEntityTypeIcon = (entityType: string) => {
        const icons: Record<string, string> = {
            'User': '👤',
            'Client': '🏢',
            'Review': '📋',
            'Exception': '⚠️',
            'Document': '📄',
            'AuditLog': '📊'
        }
        return icons[entityType] || '📝'
    }

    const formatDetails = (details: Record<string, any>) => {
        if (!details || Object.keys(details).length === 0) return 'No details'

        // Show key details in a readable format
        const keyDetails = []
        if (details.description) keyDetails.push(details.description)
        if (details.changes) keyDetails.push(`${Object.keys(details.changes).length} changes`)
        if (details.ip_address) keyDetails.push(`IP: ${details.ip_address}`)
        if (details.user_agent) keyDetails.push('Browser action')

        return keyDetails.length > 0 ? keyDetails.join(' • ') : 'View details'
    }

    if (loading) {
        return (
            <div className="audit-table-loading">
                <div className="loading-spinner"></div>
                <p>Loading audit logs...</p>
            </div>
        )
    }

    if (auditLogs.length === 0) {
        return (
            <div className="audit-table-empty">
                <p>No audit logs found matching your criteria.</p>
                <p>Try adjusting your filters or date range.</p>
            </div>
        )
    }

    return (
        <div className="audit-table-container">
            <table className="audit-table">
                <thead>
                    <tr>
                        <th
                            onClick={() => onSort('created_at')}
                            className={`sortable ${sortBy === 'created_at' ? 'sorted' : ''}`}
                        >
                            Timestamp {getSortIcon('created_at')}
                        </th>
                        <th
                            onClick={() => onSort('user_name')}
                            className={`sortable ${sortBy === 'user_name' ? 'sorted' : ''}`}
                        >
                            User {getSortIcon('user_name')}
                        </th>
                        <th
                            onClick={() => onSort('action')}
                            className={`sortable ${sortBy === 'action' ? 'sorted' : ''}`}
                        >
                            Action {getSortIcon('action')}
                        </th>
                        <th
                            onClick={() => onSort('entity_type')}
                            className={`sortable ${sortBy === 'entity_type' ? 'sorted' : ''}`}
                        >
                            Entity {getSortIcon('entity_type')}
                        </th>
                        <th>Entity ID</th>
                        <th>Details</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {auditLogs.map((log) => (
                        <tr key={log.id} className="audit-row">
                            <td className="timestamp-cell">
                                <div className="timestamp">
                                    {format(new Date(log.created_at), 'MMM dd, yyyy')}
                                </div>
                                <div className="time">
                                    {format(new Date(log.created_at), 'HH:mm:ss')}
                                </div>
                            </td>

                            <td className="user-cell">
                                <div className="user-info">
                                    <div className="user-name">
                                        {log.user_name || `User ${log.user_id}`}
                                    </div>
                                    {log.user_role && (
                                        <div className="user-role">
                                            <span className={`role-badge role-${log.user_role.toLowerCase()}`}>
                                                {log.user_role}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </td>

                            <td className="action-cell">
                                <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                                    {log.action}
                                </span>
                            </td>

                            <td className="entity-cell">
                                <div className="entity-info">
                                    <span className="entity-icon">
                                        {getEntityTypeIcon(log.entity_type)}
                                    </span>
                                    <span className="entity-type">
                                        {log.entity_type}
                                    </span>
                                </div>
                            </td>

                            <td className="entity-id-cell">
                                <code className="entity-id">
                                    {log.entity_id}
                                </code>
                            </td>

                            <td className="details-cell">
                                <div className="details-preview">
                                    {formatDetails(log.details)}
                                </div>
                            </td>

                            <td className="actions-cell">
                                <button
                                    onClick={() => onLogSelect(log)}
                                    className="btn btn-sm btn-secondary"
                                    title="View full details"
                                >
                                    View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}