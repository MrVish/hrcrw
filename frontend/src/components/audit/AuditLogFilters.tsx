import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface FilterState {
    user_id?: number
    entity_type?: string
    entity_id?: string
    action?: string
    start_date?: string
    end_date?: string
    search_text?: string
    page: number
    per_page: number
    sort_by: string
    sort_order: 'asc' | 'desc'
}

interface AuditLogFiltersProps {
    filters: FilterState
    onFilterChange: (filters: Partial<FilterState>) => void
    loading: boolean
}

interface SearchSuggestion {
    field: string
    suggestions: string[]
}

export const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
    filters,
    onFilterChange,
    loading
}) => {
    const { user } = useAuth()
    const [expanded, setExpanded] = useState(false)
    const [suggestions, setSuggestions] = useState<Record<string, string[]>>({})
    const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([])

    // Fetch search suggestions
    const fetchSuggestions = async (field: string, query?: string) => {
        if (!user?.token) return

        try {
            const queryParams = new URLSearchParams({ field })
            if (query) queryParams.append('query', query)

            const response = await fetch(`/api/audit/logs/search-suggestions?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            })

            if (response.ok) {
                const data: SearchSuggestion = await response.json()
                setSuggestions(prev => ({
                    ...prev,
                    [field]: data.suggestions
                }))
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error)
        }
    }

    // Fetch users for user filter
    const fetchUsers = async () => {
        if (!user?.token) return

        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setUsers(data.users || [])
            }
        } catch (error) {
            console.error('Failed to fetch users:', error)
        }
    }

    useEffect(() => {
        // Fetch initial suggestions
        fetchSuggestions('action')
        fetchSuggestions('entity_type')
        fetchUsers()
    }, [user?.token])

    const handleInputChange = (field: keyof FilterState, value: string | number) => {
        onFilterChange({ [field]: value })
    }

    const handleClearFilters = () => {
        onFilterChange({
            user_id: undefined,
            entity_type: undefined,
            entity_id: undefined,
            action: undefined,
            start_date: undefined,
            end_date: undefined,
            search_text: undefined,
            page: 1
        })
    }

    const hasActiveFilters = Boolean(
        filters.user_id ||
        filters.entity_type ||
        filters.entity_id ||
        filters.action ||
        filters.start_date ||
        filters.end_date ||
        filters.search_text
    )

    return (
        <div className="audit-filters">
            <div className="filters-header">
                <h3>Filters</h3>
                <div className="filter-actions">
                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="btn btn-sm btn-secondary"
                            disabled={loading}
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="btn btn-sm btn-secondary"
                    >
                        {expanded ? 'Collapse' : 'Expand'}
                    </button>
                </div>
            </div>

            <div className="filters-content">
                {/* Quick Search */}
                <div className="filter-group">
                    <label htmlFor="search_text">Quick Search</label>
                    <input
                        id="search_text"
                        type="text"
                        value={filters.search_text || ''}
                        onChange={(e) => handleInputChange('search_text', e.target.value)}
                        placeholder="Search in descriptions and details..."
                        className="form-input"
                        disabled={loading}
                    />
                    <small className="help-text">
                        Search across all audit log descriptions and details
                    </small>
                </div>

                {/* Date Range */}
                <div className="filter-group">
                    <label>Date Range</label>
                    <div className="date-range">
                        <input
                            type="datetime-local"
                            value={filters.start_date || ''}
                            onChange={(e) => handleInputChange('start_date', e.target.value)}
                            className="form-input"
                            disabled={loading}
                            placeholder="Start date"
                        />
                        <span>to</span>
                        <input
                            type="datetime-local"
                            value={filters.end_date || ''}
                            onChange={(e) => handleInputChange('end_date', e.target.value)}
                            className="form-input"
                            disabled={loading}
                            placeholder="End date"
                        />
                    </div>
                </div>

                {expanded && (
                    <>
                        {/* User Filter */}
                        <div className="filter-group">
                            <label htmlFor="user_id">User</label>
                            <select
                                id="user_id"
                                value={filters.user_id || ''}
                                onChange={(e) => handleInputChange('user_id', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="form-select"
                                disabled={loading}
                            >
                                <option value="">All Users</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Entity Type Filter */}
                        <div className="filter-group">
                            <label htmlFor="entity_type">Entity Type</label>
                            <select
                                id="entity_type"
                                value={filters.entity_type || ''}
                                onChange={(e) => handleInputChange('entity_type', e.target.value)}
                                className="form-select"
                                disabled={loading}
                            >
                                <option value="">All Entity Types</option>
                                {suggestions.entity_type?.map(type => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Entity ID Filter */}
                        <div className="filter-group">
                            <label htmlFor="entity_id">Entity ID</label>
                            <input
                                id="entity_id"
                                type="text"
                                value={filters.entity_id || ''}
                                onChange={(e) => handleInputChange('entity_id', e.target.value)}
                                placeholder="Enter entity ID..."
                                className="form-input"
                                disabled={loading}
                            />
                        </div>

                        {/* Action Filter */}
                        <div className="filter-group">
                            <label htmlFor="action">Action</label>
                            <select
                                id="action"
                                value={filters.action || ''}
                                onChange={(e) => handleInputChange('action', e.target.value)}
                                className="form-select"
                                disabled={loading}
                            >
                                <option value="">All Actions</option>
                                {suggestions.action?.map(action => (
                                    <option key={action} value={action}>
                                        {action}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Results Per Page */}
                        <div className="filter-group">
                            <label htmlFor="per_page">Results Per Page</label>
                            <select
                                id="per_page"
                                value={filters.per_page}
                                onChange={(e) => handleInputChange('per_page', parseInt(e.target.value))}
                                className="form-select"
                                disabled={loading}
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </div>
                    </>
                )}
            </div>

            {hasActiveFilters && (
                <div className="active-filters">
                    <h4>Active Filters:</h4>
                    <div className="filter-tags">
                        {filters.user_id && (
                            <span className="filter-tag">
                                User: {users.find(u => u.id === filters.user_id)?.name || filters.user_id}
                                <button onClick={() => handleInputChange('user_id', undefined)}>×</button>
                            </span>
                        )}
                        {filters.entity_type && (
                            <span className="filter-tag">
                                Entity: {filters.entity_type}
                                <button onClick={() => handleInputChange('entity_type', '')}>×</button>
                            </span>
                        )}
                        {filters.entity_id && (
                            <span className="filter-tag">
                                Entity ID: {filters.entity_id}
                                <button onClick={() => handleInputChange('entity_id', '')}>×</button>
                            </span>
                        )}
                        {filters.action && (
                            <span className="filter-tag">
                                Action: {filters.action}
                                <button onClick={() => handleInputChange('action', '')}>×</button>
                            </span>
                        )}
                        {filters.start_date && (
                            <span className="filter-tag">
                                From: {new Date(filters.start_date).toLocaleDateString()}
                                <button onClick={() => handleInputChange('start_date', '')}>×</button>
                            </span>
                        )}
                        {filters.end_date && (
                            <span className="filter-tag">
                                To: {new Date(filters.end_date).toLocaleDateString()}
                                <button onClick={() => handleInputChange('end_date', '')}>×</button>
                            </span>
                        )}
                        {filters.search_text && (
                            <span className="filter-tag">
                                Search: "{filters.search_text}"
                                <button onClick={() => handleInputChange('search_text', '')}>×</button>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}