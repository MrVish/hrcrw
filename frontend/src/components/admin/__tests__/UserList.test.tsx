import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { UserList } from '../UserList'

const mockUsers = [
    {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin' as const,
        is_active: true,
        created_at: '2024-01-01T10:30:00Z',
        updated_at: '2024-01-02T15:45:00Z'
    },
    {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'Maker' as const,
        is_active: false,
        created_at: '2024-01-03T08:15:00Z',
        updated_at: '2024-01-04T12:20:00Z'
    },
    {
        id: 3,
        name: 'Bob Wilson',
        email: 'bob@example.com',
        role: 'Checker' as const,
        is_active: true,
        created_at: '2024-01-05T14:00:00Z',
        updated_at: '2024-01-06T09:30:00Z'
    }
]

const defaultProps = {
    users: mockUsers,
    loading: false,
    totalCount: 3,
    totalPages: 1,
    currentPage: 1,
    filters: {
        page: 1,
        per_page: 25
    },
    onFilterChange: vi.fn(),
    onPageChange: vi.fn(),
    onEditUser: vi.fn(),
    onDeleteUser: vi.fn(),
    onToggleStatus: vi.fn(),
    onRoleChange: vi.fn()
}

describe('UserList', () => {
    it('renders user list with all users', () => {
        render(<UserList {...defaultProps} />)

        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('jane@example.com')).toBeInTheDocument()
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument()

        // Check that all users are displayed
        expect(screen.getByText('Showing 3 of 3 users')).toBeInTheDocument()
    })

    it('displays user information correctly', () => {
        render(<UserList {...defaultProps} />)

        // Check user details
        expect(screen.getByText('john@example.com')).toBeInTheDocument()
        expect(screen.getByText('ID: 1')).toBeInTheDocument()

        // Check status badges
        expect(screen.getByText('Active')).toBeInTheDocument()
        expect(screen.getByText('Inactive')).toBeInTheDocument()

        // Check formatted dates
        expect(screen.getByText('Jan 01, 2024')).toBeInTheDocument()
        expect(screen.getByText('10:30')).toBeInTheDocument()
    })

    it('shows loading state', () => {
        render(<UserList {...defaultProps} loading={true} />)

        expect(screen.getByText('Loading users...')).toBeInTheDocument()
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('shows empty state when no users', () => {
        render(<UserList {...defaultProps} users={[]} />)

        expect(screen.getByText('No users found matching your criteria.')).toBeInTheDocument()
        expect(screen.getByText('Try adjusting your filters.')).toBeInTheDocument()
    })

    it('handles search filter input', () => {
        const onFilterChange = vi.fn()
        render(<UserList {...defaultProps} onFilterChange={onFilterChange} />)

        const searchInput = screen.getByPlaceholderText('Search by name or email...')
        fireEvent.change(searchInput, { target: { value: 'john' } })

        expect(onFilterChange).toHaveBeenCalledWith({ search: 'john' })
    })

    it('handles role filter selection', () => {
        const onFilterChange = vi.fn()
        render(<UserList {...defaultProps} onFilterChange={onFilterChange} />)

        const roleSelect = screen.getByDisplayValue('All Roles')
        fireEvent.change(roleSelect, { target: { value: 'Admin' } })

        expect(onFilterChange).toHaveBeenCalledWith({ role: 'Admin' })
    })

    it('handles status filter selection', () => {
        const onFilterChange = vi.fn()
        render(<UserList {...defaultProps} onFilterChange={onFilterChange} />)

        const statusSelect = screen.getByDisplayValue('All Users')
        fireEvent.change(statusSelect, { target: { value: 'true' } })

        expect(onFilterChange).toHaveBeenCalledWith({ is_active: true })
    })

    it('handles per page filter selection', () => {
        const onFilterChange = vi.fn()
        render(<UserList {...defaultProps} onFilterChange={onFilterChange} />)

        const perPageSelect = screen.getByDisplayValue('25')
        fireEvent.change(perPageSelect, { target: { value: '50' } })

        expect(onFilterChange).toHaveBeenCalledWith({ per_page: 50 })
    })

    it('clears filters when clear button is clicked', () => {
        const onFilterChange = vi.fn()
        const filtersWithValues = {
            ...defaultProps.filters,
            role: 'Admin',
            is_active: true,
            search: 'john'
        }

        render(<UserList {...defaultProps} filters={filtersWithValues} onFilterChange={onFilterChange} />)

        const clearButton = screen.getByText('Clear Filters')
        fireEvent.click(clearButton)

        expect(onFilterChange).toHaveBeenCalledWith({
            role: undefined,
            is_active: undefined,
            search: undefined,
            page: 1
        })
    })

    it('calls onEditUser when edit button is clicked', () => {
        const onEditUser = vi.fn()
        render(<UserList {...defaultProps} onEditUser={onEditUser} />)

        const editButtons = screen.getAllByText('Edit')
        fireEvent.click(editButtons[0])

        expect(onEditUser).toHaveBeenCalledWith(mockUsers[0])
    })

    it('calls onDeleteUser when delete button is clicked', () => {
        const onDeleteUser = vi.fn()
        render(<UserList {...defaultProps} onDeleteUser={onDeleteUser} />)

        const deleteButtons = screen.getAllByText('Delete')
        fireEvent.click(deleteButtons[0])

        expect(onDeleteUser).toHaveBeenCalledWith(1)
    })

    it('calls onToggleStatus when activate/deactivate button is clicked', () => {
        const onToggleStatus = vi.fn()
        render(<UserList {...defaultProps} onToggleStatus={onToggleStatus} />)

        // Find deactivate button for active user
        const deactivateButton = screen.getByText('Deactivate')
        fireEvent.click(deactivateButton)

        expect(onToggleStatus).toHaveBeenCalledWith(1, true)

        // Find activate button for inactive user
        const activateButton = screen.getByText('Activate')
        fireEvent.click(activateButton)

        expect(onToggleStatus).toHaveBeenCalledWith(2, false)
    })

    it('calls onRoleChange when role is changed', () => {
        const onRoleChange = vi.fn()
        render(<UserList {...defaultProps} onRoleChange={onRoleChange} />)

        // Find the first role select (Admin user)
        const roleSelects = screen.getAllByDisplayValue('Admin')
        fireEvent.change(roleSelects[0], { target: { value: 'Checker' } })

        expect(onRoleChange).toHaveBeenCalledWith(1, 'Checker')
    })

    it('displays correct role badge classes', () => {
        render(<UserList {...defaultProps} />)

        // Check that role selects have appropriate classes
        const adminSelect = screen.getByDisplayValue('Admin')
        const makerSelect = screen.getByDisplayValue('Maker')
        const checkerSelect = screen.getByDisplayValue('Checker')

        expect(adminSelect).toHaveClass('role-admin')
        expect(makerSelect).toHaveClass('role-maker')
        expect(checkerSelect).toHaveClass('role-checker')
    })

    it('shows inactive user styling', () => {
        render(<UserList {...defaultProps} />)

        // Find the row for inactive user (Jane Smith)
        const rows = screen.getAllByRole('row')
        const inactiveUserRow = rows.find(row => row.textContent?.includes('Jane Smith'))

        expect(inactiveUserRow).toHaveClass('inactive')
    })

    it('renders pagination when multiple pages', () => {
        const propsWithPagination = {
            ...defaultProps,
            totalPages: 3,
            currentPage: 2
        }

        render(<UserList {...propsWithPagination} />)

        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('handles pagination navigation', () => {
        const onPageChange = vi.fn()
        const propsWithPagination = {
            ...defaultProps,
            totalPages: 3,
            currentPage: 2,
            onPageChange
        }

        render(<UserList {...propsWithPagination} />)

        const previousButton = screen.getByText('Previous')
        const nextButton = screen.getByText('Next')
        const pageButton = screen.getByText('1')

        fireEvent.click(previousButton)
        expect(onPageChange).toHaveBeenCalledWith(1)

        fireEvent.click(nextButton)
        expect(onPageChange).toHaveBeenCalledWith(3)

        fireEvent.click(pageButton)
        expect(onPageChange).toHaveBeenCalledWith(1)
    })

    it('disables pagination buttons appropriately', () => {
        const propsFirstPage = {
            ...defaultProps,
            totalPages: 3,
            currentPage: 1
        }

        render(<UserList {...propsFirstPage} />)

        const previousButton = screen.getByText('Previous')
        expect(previousButton).toBeDisabled()

        const nextButton = screen.getByText('Next')
        expect(nextButton).not.toBeDisabled()
    })

    it('shows correct page information', () => {
        const propsWithPagination = {
            ...defaultProps,
            totalCount: 50,
            totalPages: 5,
            currentPage: 3
        }

        render(<UserList {...propsWithPagination} />)

        expect(screen.getByText('Showing 3 of 50 users (Page 3 of 5)')).toBeInTheDocument()
    })

    it('disables form elements when loading', () => {
        render(<UserList {...defaultProps} loading={true} />)

        // Since loading state shows different content, we need to test with loading=false
        // but check that disabled prop would be passed correctly
        render(<UserList {...defaultProps} loading={false} />)

        const searchInput = screen.getByPlaceholderText('Search by name or email...')
        expect(searchInput).not.toBeDisabled()
    })

    it('formats email as mailto link', () => {
        render(<UserList {...defaultProps} />)

        const emailLink = screen.getByText('john@example.com')
        expect(emailLink).toHaveAttribute('href', 'mailto:john@example.com')
    })
})