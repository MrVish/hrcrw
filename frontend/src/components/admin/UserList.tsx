import React from 'react'
import { format } from 'date-fns'
import '../../styles/modern-table.css'

interface User {
    id: number
    name: string
    email: string
    role: 'Maker' | 'Checker' | 'Admin'
    is_active: boolean
    created_at: string
    updated_at: string
}

interface FilterState {
    role?: string
    is_active?: boolean
    search?: string
    page: number
    per_page: number
}

interface UserListProps {
    users: User[]
    loading: boolean
    totalCount: number
    totalPages: number
    currentPage: number
    filters: FilterState
    onFilterChange: (filters: Partial<FilterState>) => void
    onPageChange: (page: number) => void
    onEditUser: (user: User) => void
    onDeleteUser: (userId: number) => void
    onToggleStatus: (userId: number, currentStatus: boolean) => void
    onRoleChange: (userId: number, newRole: string) => void
}

export const UserList: React.FC<UserListProps> = ({
    users,
    loading,
    totalCount,
    totalPages,
    currentPage,
    filters,
    onFilterChange,
    onPageChange,
    onEditUser,
    onDeleteUser,
    onToggleStatus,
    onRoleChange
}) => {
    const handleInputChange = (field: keyof FilterState, value: string | boolean | number) => {
        onFilterChange({ [field]: value })
    }

    const handleClearFilters = () => {
        onFilterChange({
            role: undefined,
            is_active: undefined,
            search: undefined,
            page: 1
        })
    }

    const getRoleBadgeClass = (role: string) => {
        const roleClasses: Record<string, string> = {
            'Maker': 'role-maker',
            'Checker': 'role-checker',
            'Admin': 'role-admin'
        }
        return roleClasses[role] || 'role-default'
    }

    const hasActiveFilters = Boolean(
        filters.role ||
        filters.is_active !== undefined ||
        filters.search
    )

    if (loading) {
        return (
            <div className="user-list-loading">
                <div className="loading-spinner"></div>
                <p>Loading users...</p>
            </div>
        )
    }

    return (
        <div className="user-list">
            {/* Filters */}
            <div className="user-filters">
                <div className="filters-row">
                    <div className="filter-group">
                        <label htmlFor="search">Search</label>
                        <input
                            id="search"
                            type="text"
                            value={filters.search || ''}
                            onChange={(e) => handleInputChange('search', e.target.value)}
                            placeholder="Search by name or email..."
                            className="form-input"
                            disabled={loading}
                        />
                    </div>

                    <div className="filter-group">
                        <label htmlFor="role">Role</label>
                        <select
                            id="role"
                            value={filters.role || ''}
                            onChange={(e) => handleInputChange('role', e.target.value)}
                            className="form-select"
                            disabled={loading}
                        >
                            <option value="">All Roles</option>
                            <option value="Maker">Maker</option>
                            <option value="Checker">Checker</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="is_active">Status</label>
                        <select
                            id="is_active"
                            value={filters.is_active !== undefined ? filters.is_active.toString() : ''}
                            onChange={(e) => handleInputChange('is_active', e.target.value === '' ? undefined : e.target.value === 'true')}
                            className="form-select"
                            disabled={loading}
                        >
                            <option value="">All Users</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="per_page">Per Page</label>
                        <select
                            id="per_page"
                            value={filters.per_page}
                            onChange={(e) => handleInputChange('per_page', parseInt(e.target.value))}
                            className="form-select"
                            disabled={loading}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <div className="filter-group">
                            <button
                                onClick={handleClearFilters}
                                className="btn btn-sm btn-secondary"
                                disabled={loading}
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Info */}
            <div className="results-info">
                <span>
                    Showing {users.length} of {totalCount} users
                    {currentPage > 1 && ` (Page ${currentPage} of ${totalPages})`}
                </span>
            </div>

            {/* User Table */}
            {users.length === 0 ? (
                <div className="user-list-empty">
                    <p>No users found matching your criteria.</p>
                    <p>Try adjusting your filters.</p>
                </div>
            ) : (
                <div className="user-table-container">
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className={`user-row ${!user.is_active ? 'inactive' : ''}`}>
                                    <td className="user-name-cell">
                                        <div className="user-name">{user.name}</div>
                                        <div className="user-id">ID: {user.id}</div>
                                    </td>

                                    <td className="user-email-cell">
                                        <a href={`mailto:${user.email}`} className="user-email">
                                            {user.email}
                                        </a>
                                    </td>

                                    <td className="user-role-cell">
                                        <select
                                            value={user.role}
                                            onChange={(e) => onRoleChange(user.id, e.target.value)}
                                            className={`role-select ${getRoleBadgeClass(user.role)}`}
                                            disabled={loading}
                                        >
                                            <option value="Maker">Maker</option>
                                            <option value="Checker">Checker</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </td>

                                    <td className="user-status-cell">
                                        <div className="status-container">
                                            <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <button
                                                onClick={() => onToggleStatus(user.id, user.is_active)}
                                                className={`btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}`}
                                                disabled={loading}
                                                title={user.is_active ? 'Deactivate user' : 'Activate user'}
                                            >
                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </div>
                                    </td>

                                    <td className="user-date-cell">
                                        <div className="date">
                                            {format(new Date(user.created_at), 'MMM dd, yyyy')}
                                        </div>
                                        <div className="time">
                                            {format(new Date(user.created_at), 'HH:mm')}
                                        </div>
                                    </td>

                                    <td className="user-date-cell">
                                        <div className="date">
                                            {format(new Date(user.updated_at), 'MMM dd, yyyy')}
                                        </div>
                                        <div className="time">
                                            {format(new Date(user.updated_at), 'HH:mm')}
                                        </div>
                                    </td>

                                    <td className="user-actions-cell">
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => onEditUser(user)}
                                                className="btn btn-sm btn-secondary"
                                                disabled={loading}
                                                title="Edit user"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => onDeleteUser(user.id)}
                                                className="btn btn-sm btn-danger"
                                                disabled={loading}
                                                title="Delete user"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1 || loading}
                        className="btn btn-sm btn-secondary"
                    >
                        Previous
                    </button>

                    <div className="page-numbers">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`btn btn-sm ${pageNum === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                                    disabled={loading}
                                >
                                    {pageNum}
                                </button>
                            )
                        })}
                    </div>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages || loading}
                        className="btn btn-sm btn-secondary"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}