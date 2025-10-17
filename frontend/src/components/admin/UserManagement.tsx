import React, { useState, useEffect, useCallback } from 'react'
import { UserList } from './UserList'
import { UserForm } from './UserForm'
import { UserStats } from './UserStats'
import { useAuth } from '../../contexts/AuthContext'
import './UserManagement.css'

interface User {
    id: number
    name: string
    email: string
    role: 'Maker' | 'Checker' | 'Admin'
    is_active: boolean
    created_at: string
    updated_at: string
}

interface UserListResponse {
    users: User[]
    total: number
    page: number
    per_page: number
    total_pages: number
}

interface FilterState {
    role?: string
    is_active?: boolean
    search?: string
    page: number
    per_page: number
}

export const UserManagement: React.FC = () => {
    const { user } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [totalCount, setTotalCount] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [showStats, setShowStats] = useState(false)

    const [filters, setFilters] = useState<FilterState>({
        page: 1,
        per_page: 25
    })

    const fetchUsers = useCallback(async () => {
        if (!user?.token) return

        setLoading(true)
        setError(null)

        try {
            const queryParams = new URLSearchParams()

            // Add filters to query params
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    queryParams.append(key, value.toString())
                }
            })

            const response = await fetch(`/api/users?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.statusText}`)
            }

            const data: UserListResponse = await response.json()
            setUsers(data.users)
            setTotalCount(data.total)
            setTotalPages(data.total_pages)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch users')
        } finally {
            setLoading(false)
        }
    }, [user?.token, filters])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleFilterChange = (newFilters: Partial<FilterState>) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters,
            page: newFilters.page !== undefined ? newFilters.page : 1
        }))
    }

    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page }))
    }

    const handleCreateUser = () => {
        setEditingUser(null)
        setShowCreateForm(true)
    }

    const handleEditUser = (user: User) => {
        setEditingUser(user)
        setShowCreateForm(true)
    }

    const handleUserSaved = () => {
        setShowCreateForm(false)
        setEditingUser(null)
        fetchUsers() // Refresh the list
    }

    const handleUserDeleted = async (userId: number) => {
        if (!user?.token) return

        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to delete user: ${response.statusText}`)
            }

            fetchUsers() // Refresh the list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user')
        }
    }

    const handleUserStatusToggle = async (userId: number, currentStatus: boolean) => {
        if (!user?.token) return

        const action = currentStatus ? 'deactivate' : 'activate'

        try {
            const response = await fetch(`/api/users/${userId}/${action}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to ${action} user: ${response.statusText}`)
            }

            fetchUsers() // Refresh the list
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${action} user`)
        }
    }

    const handleRoleChange = async (userId: number, newRole: string) => {
        if (!user?.token) return

        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            })

            if (!response.ok) {
                throw new Error(`Failed to update user role: ${response.statusText}`)
            }

            fetchUsers() // Refresh the list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user role')
        }
    }

    const handleRefresh = () => {
        fetchUsers()
    }

    // Check if current user is admin
    const isAdmin = user?.role === 'admin'

    if (!isAdmin) {
        return (
            <div className="user-management">
                <div className="access-denied">
                    <h2>Access Denied</h2>
                    <p>You don't have permission to access user management.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="user-management">
            <div className="user-management-header">
                <div className="header-title">
                    <h1>User Management</h1>
                    <p>Manage user accounts, roles, and permissions</p>
                </div>

                <div className="header-actions">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="btn btn-secondary"
                    >
                        {showStats ? 'Hide Stats' : 'Show Stats'}
                    </button>

                    <button
                        onClick={handleCreateUser}
                        className="btn btn-primary"
                    >
                        Create User
                    </button>

                    <button
                        onClick={handleRefresh}
                        className="btn btn-secondary"
                        disabled={loading}
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {showStats && (
                <div className="user-stats-section">
                    <UserStats />
                </div>
            )}

            {error && (
                <div className="error-message">
                    <p>Error: {error}</p>
                    <button onClick={handleRefresh} className="btn btn-sm btn-primary">
                        Retry
                    </button>
                </div>
            )}

            <div className="user-management-content">
                <UserList
                    users={users}
                    loading={loading}
                    totalCount={totalCount}
                    totalPages={totalPages}
                    currentPage={filters.page}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onPageChange={handlePageChange}
                    onEditUser={handleEditUser}
                    onDeleteUser={handleUserDeleted}
                    onToggleStatus={handleUserStatusToggle}
                    onRoleChange={handleRoleChange}
                />
            </div>

            {showCreateForm && (
                <UserForm
                    user={editingUser}
                    onSave={handleUserSaved}
                    onCancel={() => {
                        setShowCreateForm(false)
                        setEditingUser(null)
                    }}
                />
            )}
        </div>
    )
}