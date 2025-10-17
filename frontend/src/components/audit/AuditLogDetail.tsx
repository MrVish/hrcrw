import React, { useState } from 'react'
import { format } from 'date-fns'

interface AuditLog {
    id: number
    user_id: number
    entity_type: string
    entity_id: string
    action: string
    created_at: string
    details: Record<string, any> | null
    user_name?: string
    user_email?: string
    user_role?: string
}

interface AuditLogDetailProps {
    log: AuditLog
    onClose: () => void
}

export const AuditLogDetail: React.FC<AuditLogDetailProps> = ({ log, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'raw'>('overview')

    const formatJsonValue = (value: any, indent = 0): React.ReactNode => {
        const indentStr = '  '.repeat(indent)

        if (value === null) return <span className="json-null">null</span>
        if (typeof value === 'boolean') return <span className="json-boolean">{value.toString()}</span>
        if (typeof value === 'number') return <span className="json-number">{value}</span>
        if (typeof value === 'string') return <span className="json-string">"{value}"</span>

        if (Array.isArray(value)) {
            if (value.length === 0) return <span className="json-array">[]</span>
            return (
                <div className="json-array">
                    <span>[</span>
                    {value.map((item, index) => (
                        <div key={index} className="json-array-item">
                            {indentStr}  {formatJsonValue(item, indent + 1)}
                            {index < value.length - 1 && ','}
                        </div>
                    ))}
                    <div>{indentStr}]</div>
                </div>
            )
        }

        if (typeof value === 'object') {
            const keys = Object.keys(value)
            if (keys.length === 0) return <span className="json-object">{'{}'}</span>
            return (
                <div className="json-object">
                    <span>{'{'}</span>
                    {keys.map((key, index) => (
                        <div key={key} className="json-object-item">
                            {indentStr}  <span className="json-key">"{key}"</span>: {formatJsonValue(value[key], indent + 1)}
                            {index < keys.length - 1 && ','}
                        </div>
                    ))}
                    <div>{indentStr}{'}'}</div>
                </div>
            )
        }

        return <span>{String(value)}</span>
    }

    const getActionDescription = (action: string, entityType: string) => {
        const descriptions: Record<string, string> = {
            'CREATE': `Created a new ${entityType.toLowerCase()}`,
            'UPDATE': `Updated ${entityType.toLowerCase()} information`,
            'DELETE': `Deleted ${entityType.toLowerCase()}`,
            'LOGIN': 'User logged into the system',
            'LOGOUT': 'User logged out of the system',
            'APPROVE': `Approved ${entityType.toLowerCase()}`,
            'REJECT': `Rejected ${entityType.toLowerCase()}`,
            'SUBMIT': `Submitted ${entityType.toLowerCase()} for review`,
            'ASSIGN': `Assigned ${entityType.toLowerCase()}`,
            'RESOLVE': `Resolved ${entityType.toLowerCase()}`
        }
        return descriptions[action] || `Performed ${action} on ${entityType.toLowerCase()}`
    }

    const extractKeyDetails = (details: Record<string, any> | null) => {
        const keyDetails: Array<{ label: string; value: any }> = []

        if (!details) return keyDetails

        if (details.description) {
            keyDetails.push({ label: 'Description', value: details.description })
        }

        if (details.ip_address) {
            keyDetails.push({ label: 'IP Address', value: details.ip_address })
        }

        if (details.user_agent) {
            keyDetails.push({ label: 'User Agent', value: details.user_agent })
        }

        if (details.changes) {
            keyDetails.push({ label: 'Changes Made', value: `${Object.keys(details.changes).length} fields modified` })
        }

        if (details.previous_values) {
            keyDetails.push({ label: 'Previous Values', value: 'Available in raw data' })
        }

        if (details.success !== undefined) {
            keyDetails.push({ label: 'Success', value: details.success ? 'Yes' : 'No' })
        }

        if (details.error_message) {
            keyDetails.push({ label: 'Error Message', value: details.error_message })
        }

        if (details.duration_ms) {
            keyDetails.push({ label: 'Duration', value: `${details.duration_ms}ms` })
        }

        return keyDetails
    }

    const keyDetails = extractKeyDetails(log.details)

    return (
        <div className="audit-detail-overlay" onClick={onClose}>
            <div className="audit-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Audit Log Details</h2>
                    <button onClick={onClose} className="close-button">×</button>
                </div>

                <div className="modal-content">
                    <div className="audit-summary">
                        <div className="summary-grid">
                            <div className="summary-item">
                                <label>ID</label>
                                <span>{log.id}</span>
                            </div>
                            <div className="summary-item">
                                <label>Timestamp</label>
                                <span>{format(new Date(log.created_at), 'PPpp')}</span>
                            </div>
                            <div className="summary-item">
                                <label>User</label>
                                <span>
                                    {log.user_name || `User ${log.user_id}`}
                                    {log.user_role && (
                                        <span className={`role-badge role-${log.user_role.toLowerCase()}`}>
                                            {log.user_role}
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="summary-item">
                                <label>Action</label>
                                <span className={`action-badge ${log.action.toLowerCase()}`}>
                                    {log.action}
                                </span>
                            </div>
                            <div className="summary-item">
                                <label>Entity</label>
                                <span>{log.entity_type}</span>
                            </div>
                            <div className="summary-item">
                                <label>Entity ID</label>
                                <code>{log.entity_id}</code>
                            </div>
                        </div>

                        <div className="action-description">
                            <p>{getActionDescription(log.action, log.entity_type)}</p>
                        </div>
                    </div>

                    <div className="detail-tabs">
                        <button
                            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
                            onClick={() => setActiveTab('details')}
                        >
                            Details
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'raw' ? 'active' : ''}`}
                            onClick={() => setActiveTab('raw')}
                        >
                            Raw Data
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'overview' && (
                            <div className="overview-tab">
                                {keyDetails.length > 0 ? (
                                    <div className="key-details">
                                        {keyDetails.map((detail, index) => (
                                            <div key={index} className="detail-item">
                                                <label>{detail.label}</label>
                                                <div className="detail-value">
                                                    {typeof detail.value === 'string' ? (
                                                        <span>{detail.value}</span>
                                                    ) : (
                                                        <pre>{JSON.stringify(detail.value, null, 2)}</pre>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-details">
                                        <p>No additional details available for this audit log entry.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'details' && (
                            <div className="details-tab">
                                {log.details && Object.keys(log.details).length > 0 ? (
                                    <div className="formatted-details">
                                        {formatJsonValue(log.details)}
                                    </div>
                                ) : (
                                    <div className="no-details">
                                        <p>No detailed information available.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'raw' && (
                            <div className="raw-tab">
                                <pre className="raw-json">
                                    {JSON.stringify(log, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}