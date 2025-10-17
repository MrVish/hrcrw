import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface UserStatsData {
    total_users: number
    active_users: number
    inactive_users: number
    role_counts: Record<string, number>
    recent_registrations: number
}

export const UserStats: React.FC = () => {
    const { user } = useAuth()
    const [stats, setStats] = useState<UserStatsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            if (!user?.token) return

            try {
                setLoading(true)
                setError(null)

                const response = await fetch('/api/users/statistics', {
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
            <div className="user-stats-loading">
                <div className="loading-spinner"></div>
                <p>Loading user statistics...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="user-stats-error">
                <p>Error loading statistics: {error}</p>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="user-stats-empty">
                <p>No statistics available</p>
            </div>
        )
    }

    const getRoleIcon = (role: string) => {
        const icons: Record<string, string> = {
            'Maker': '✏️',
            'Checker': '✅',
            'Admin': '👑'
        }
        return icons[role] || '👤'
    }

    const getRoleColor = (role: string) => {
        const colors: Record<string, string> = {
            'Maker': '#3b82f6',
            'Checker': '#10b981',
            'Admin': '#f59e0b'
        }
        return colors[role] || '#6b7280'
    }

    const activePercentage = stats.total_users > 0
        ? Math.round((stats.active_users / stats.total_users) * 100)
        : 0

    return (
        <div className="user-stats">
            <h3>User Statistics</h3>

            {/* Summary Cards */}
            <div className="stats-summary">
                <div className="stat-card primary">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total_users.toLocaleString()}</div>
                        <div className="stat-label">Total Users</div>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active_users.toLocaleString()}</div>
                        <div className="stat-label">Active Users</div>
                        <div className="stat-percentage">{activePercentage}% of total</div>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-icon">⏸️</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.inactive_users.toLocaleString()}</div>
                        <div className="stat-label">Inactive Users</div>
                        <div className="stat-percentage">{100 - activePercentage}% of total</div>
                    </div>
                </div>

                <div className="stat-card info">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.recent_registrations.toLocaleString()}</div>
                        <div className="stat-label">New Users (30 days)</div>
                    </div>
                </div>
            </div>

            {/* Role Distribution */}
            <div className="role-distribution">
                <h4>Users by Role</h4>
                <div className="role-stats">
                    {Object.entries(stats.role_counts).map(([role, count]) => {
                        const percentage = stats.total_users > 0
                            ? Math.round((count / stats.total_users) * 100)
                            : 0

                        return (
                            <div key={role} className="role-stat">
                                <div className="role-header">
                                    <div className="role-info">
                                        <span className="role-icon">{getRoleIcon(role)}</span>
                                        <span className="role-name">{role}</span>
                                    </div>
                                    <div className="role-count">
                                        {count.toLocaleString()} ({percentage}%)
                                    </div>
                                </div>
                                <div className="role-bar">
                                    <div
                                        className="role-bar-fill"
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: getRoleColor(role)
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Activity Indicators */}
            <div className="activity-indicators">
                <div className="indicator">
                    <div className="indicator-label">System Health</div>
                    <div className={`indicator-value ${activePercentage >= 80 ? 'healthy' : activePercentage >= 60 ? 'warning' : 'critical'}`}>
                        {activePercentage >= 80 ? 'Healthy' :
                            activePercentage >= 60 ? 'Moderate' : 'Needs Attention'}
                    </div>
                    <div className="indicator-description">
                        Based on active user percentage
                    </div>
                </div>

                <div className="indicator">
                    <div className="indicator-label">Growth Trend</div>
                    <div className={`indicator-value ${stats.recent_registrations > 5 ? 'positive' : stats.recent_registrations > 0 ? 'stable' : 'negative'}`}>
                        {stats.recent_registrations > 5 ? 'Growing' :
                            stats.recent_registrations > 0 ? 'Stable' : 'Stagnant'}
                    </div>
                    <div className="indicator-description">
                        {stats.recent_registrations} new users in 30 days
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h4>Quick Actions</h4>
                <div className="action-buttons">
                    <button className="btn btn-sm btn-primary">
                        Create New User
                    </button>
                    <button className="btn btn-sm btn-secondary">
                        Export User List
                    </button>
                    <button className="btn btn-sm btn-secondary">
                        View Audit Logs
                    </button>
                </div>
            </div>
        </div>
    )
}