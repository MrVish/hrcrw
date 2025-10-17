import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface AuditStats {
    total_logs: number
    logs_today: number
    logs_this_week: number
    logs_this_month: number
    top_actions: Array<{ action: string; count: number }>
    top_users: Array<{ user_id: number; user_name: string; count: number }>
    top_entities: Array<{ entity_type: string; count: number }>
}

export const AuditLogStats: React.FC = () => {
    const { user } = useAuth()
    const [stats, setStats] = useState<AuditStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            if (!user?.token) return

            try {
                setLoading(true)
                setError(null)

                const response = await fetch('/api/audit/logs/statistics', {
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                })

                if (!response.ok) {
                    throw new Error(`Failed to fetch statistics: ${response.statusText}`)
                }

                const data = await response.json()
                setStats(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [user?.token])

    if (loading) {
        return (
            <div className="audit-stats-loading">
                <div className="loading-spinner"></div>
                <p>Loading statistics...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="audit-stats-error">
                <p>Error loading statistics: {error}</p>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="audit-stats-empty">
                <p>No statistics available</p>
            </div>
        )
    }

    return (
        <div className="audit-stats">
            <h3>Audit Log Statistics</h3>

            {/* Summary Cards */}
            <div className="stats-summary">
                <div className="stat-card">
                    <div className="stat-value">{stats.total_logs.toLocaleString()}</div>
                    <div className="stat-label">Total Logs</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.logs_today.toLocaleString()}</div>
                    <div className="stat-label">Today</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.logs_this_week.toLocaleString()}</div>
                    <div className="stat-label">This Week</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.logs_this_month.toLocaleString()}</div>
                    <div className="stat-label">This Month</div>
                </div>
            </div>

            {/* Charts and Lists */}
            <div className="stats-details">
                {/* Top Actions */}
                <div className="stats-section">
                    <h4>Most Frequent Actions</h4>
                    <div className="stats-list">
                        {stats.top_actions.slice(0, 5).map((item, index) => (
                            <div key={item.action} className="stats-item">
                                <div className="stats-rank">#{index + 1}</div>
                                <div className="stats-info">
                                    <div className="stats-name">{item.action}</div>
                                    <div className="stats-bar">
                                        <div
                                            className="stats-bar-fill"
                                            style={{
                                                width: `${(item.count / stats.top_actions[0].count) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="stats-count">{item.count.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Users */}
                <div className="stats-section">
                    <h4>Most Active Users</h4>
                    <div className="stats-list">
                        {stats.top_users.slice(0, 5).map((item, index) => (
                            <div key={item.user_id} className="stats-item">
                                <div className="stats-rank">#{index + 1}</div>
                                <div className="stats-info">
                                    <div className="stats-name">{item.user_name}</div>
                                    <div className="stats-bar">
                                        <div
                                            className="stats-bar-fill"
                                            style={{
                                                width: `${(item.count / stats.top_users[0].count) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="stats-count">{item.count.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Entities */}
                <div className="stats-section">
                    <h4>Most Modified Entities</h4>
                    <div className="stats-list">
                        {stats.top_entities.slice(0, 5).map((item, index) => (
                            <div key={item.entity_type} className="stats-item">
                                <div className="stats-rank">#{index + 1}</div>
                                <div className="stats-info">
                                    <div className="stats-name">{item.entity_type}</div>
                                    <div className="stats-bar">
                                        <div
                                            className="stats-bar-fill"
                                            style={{
                                                width: `${(item.count / stats.top_entities[0].count) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="stats-count">{item.count.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Activity Indicators */}
            <div className="activity-indicators">
                <div className="indicator">
                    <div className="indicator-label">Activity Level</div>
                    <div className="indicator-value">
                        {stats.logs_today > 100 ? 'High' :
                            stats.logs_today > 50 ? 'Medium' :
                                stats.logs_today > 0 ? 'Low' : 'None'}
                    </div>
                </div>

                <div className="indicator">
                    <div className="indicator-label">Growth Trend</div>
                    <div className="indicator-value">
                        {stats.logs_this_week > stats.logs_today * 7 ? 'Increasing' :
                            stats.logs_this_week < stats.logs_today * 5 ? 'Decreasing' : 'Stable'}
                    </div>
                </div>
            </div>
        </div>
    )
}