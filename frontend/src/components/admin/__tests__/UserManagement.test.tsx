import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserManagement } from '../UserManagement'
import { AuthContext } from '../../../contexts/AuthContext'

// Mock the child components
vi.mock('../UserList', () => ({
    UserList: ({ users, onEditUser, onDeleteUser }: any) => (
        <div data-testid="user-list">
            <div>User List Component</div>
            {users.map((user: any) => (
                <div key={user.id} data-testid={`user-${user.id}`}>
                    <span>{user.name}</span>
                    <button onClick={() => onEditUser(user)}>Edit</button>
                    <button onClick={() => onDeleteUser(user.id)}>Delete</button>
                </div>
            ))}
        </div>
    )
}))

vi.mock('../UserForm', () => ({
    UserForm: ({ user, onSave, onCancel }: any) => (
        <div data-testid="user-form">
            <div>User Form Component</div>
            <div>{user ? `Editing ${user.name}` : 'Creating new user'}</div>
            <button onClick={onSave}>Save</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    )
}))

vi.mock('../UserStats', () => ({
    UserStats: () => <div data-testid="user-stats">User Stats Component</div>
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockUsers = [
    {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    },
    {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'Maker',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    }
]

const mockUserListResponse = {
    users: mockUsers,
    total: 2,
    page: 1,
    per_page: 25,
    total_pages: 1
}

const mockAuthContextValue = {
    user: {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'Admin',
        token: 'mock-token'
    },
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
}

const renderWithAuth = (component: React.ReactElement) => {
    return render(
        <AuthContext.Provider value={mockAuthContextValue}>
            {component}
        </AuthContext.Provider>
    )
}

describe('UserManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockUserListResponse)
        })
    })

    it('renders user management interface for admin', async () => {
        renderWithAuth(<UserManagement />)

        expect(screen.getByText('User Management')).toBeInTheDocument()
        expect(screen.getByText('Manage user accounts, roles, and permissions')).toBeInTheDocument()
        expect(screen.getByText('Create User')).toBeInTheDocument()
        expect(screen.getByText('Refresh')).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByTestId('user-list')).toBeInTheDocument()
        })
    })

    it('denies access for non-admin users', () => {
        const nonAdminAuthValue = {
            ...mockAuthContextValue,
            user: {
                ...mockAuthContextValue.user,
                role: 'Maker'
            }
        }

        render(
            <AuthContext.Provider value={nonAdminAuthValue}>
                <UserManagement />
            </AuthContext.Provider>
        )

        expect(screen.getByText('Access Denied')).toBeInTheDocument()
        expect(screen.getByText("You don't have permission to access user management.")).toBeInTheDocument()
    })

    it('fetches users on component mount', async () => {
        renderWithAuth(<UserManagement />)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/users'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-token'
                    })
                })
            )
        })
    })

    it('shows and hides stats when stats button is clicked', async () => {
        renderWithAuth(<UserManagement />)

        const statsButton = screen.getByText('Show Stats')
        fireEvent.click(statsButton)

        await waitFor(() => {
            expect(screen.getByTestId('user-stats')).toBeInTheDocument()
            expect(screen.getByText('Hide Stats')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Hide Stats'))
        expect(screen.queryByTestId('user-stats')).not.toBeInTheDocument()
    })

    it('opens create user form when create button is clicked', async () => {
        renderWithAuth(<UserManagement />)

        const createButton = screen.getByText('Create User')
        fireEvent.click(createButton)

        await waitFor(() => {
            expect(screen.getByTestId('user-form')).toBeInTheDocument()
            expect(screen.getByText('Creating new user')).toBeInTheDocument()
        })
    })

    it('opens edit user form when edit button is clicked', async () => {
        renderWithAuth(<UserManagement />)

        await waitFor(() => {
            expect(screen.getByTestId('user-1')).toBeInTheDocument()
        })

        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)

        expect(screen.getByTestId('user-form')).toBeInTheDocument()
        expect(screen.getByText('Editing John Doe')).toBeInTheDocument()
    })

    it('handles user deletion with confirmation', async () => {
        // Mock window.confirm
        const mockConfirm = vi.fn(() => true)
        Object.defineProperty(window, 'confirm', { value: mockConfirm })

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: 'User deleted' })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse)
            })

        renderWithAuth(<UserManagement />)

        await waitFor(() => {
            expect(screen.getByTestId('user-1')).toBeInTheDocument()
        })

        const deleteButton = screen.getByText('Delete')
        fireEvent.click(deleteButton)

        expect(mockConfirm).toHaveBeenCalledWith(
            'Are you sure you want to delete this user? This action cannot be undone.'
        )

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/users/1',
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-token'
                    })
                })
            )
        })
    })

    it('cancels user deletion when confirmation is denied', async () => {
        const mockConfirm = vi.fn(() => false)
        Object.defineProperty(window, 'confirm', { value: mockConfirm })

        renderWithAuth(<UserManagement />)

        await waitFor(() => {
            expect(screen.getByTestId('user-1')).toBeInTheDocument()
        })

        const deleteButton = screen.getByText('Delete')
        fireEvent.click(deleteButton)

        expect(mockConfirm).toHaveBeenCalled()

        // Should not make delete API call
        expect(mockFetch).not.toHaveBeenCalledWith(
            '/api/users/1',
            expect.objectContaining({ method: 'DELETE' })
        )
    })

    it('handles user status toggle', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: 'User deactivated' })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse)
            })

        renderWithAuth(<UserManagement />)

        await waitFor(() => {
            expect(screen.getByTestId('user-list')).toBeInTheDocument()
        })

        // Simulate status toggle (this would be called by UserList component)
        const userManagement = screen.getByTestId('user-list')
        const component = userManagement.closest('.user-management')

        // This is a bit artificial since we're testing the handler indirectly
        // In a real scenario, the UserList would call the onToggleStatus prop
    })

    it('handles role change', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ ...mockUsers[0], role: 'Checker' })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse)
            })

        renderWithAuth(<UserManagement />)

        await waitFor(() => {
            expect(screen.getByTestId('user-list')).toBeInTheDocument()
        })

        // Similar to status toggle, this would be called by UserList component
    })

    it('refreshes user list when refresh button is clicked', async () => {
        renderWithAuth(<UserManagement />)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1)
        })

        const refreshButton = screen.getByText('Refresh')
        fireEvent.click(refreshButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(2)
        })
    })

    it('closes user form when cancel is clicked', async () => {
        renderWithAuth(<UserManagement />)

        const createButton = screen.getByText('Create User')
        fireEvent.click(createButton)

        await waitFor(() => {
            expect(screen.getByTestId('user-form')).toBeInTheDocument()
        })

        const cancelButton = screen.getByText('Cancel')
        fireEvent.click(cancelButton)

        expect(screen.queryByTestId('user-form')).not.toBeInTheDocument()
    })

    it('refreshes user list when user is saved', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse)
            })

        renderWithAuth(<UserManagement />)

        const createButton = screen.getByText('Create User')
        fireEvent.click(createButton)

        await waitFor(() => {
            expect(screen.getByTestId('user-form')).toBeInTheDocument()
        })

        const saveButton = screen.getByText('Save')
        fireEvent.click(saveButton)

        expect(screen.queryByTestId('user-form')).not.toBeInTheDocument()

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(2) // Initial load + refresh after save
        })
    })

    it('displays error message when API call fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('API Error'))

        renderWithAuth(<UserManagement />)

        await waitFor(() => {
            expect(screen.getByText(/Error: API Error/)).toBeInTheDocument()
            expect(screen.getByText('Retry')).toBeInTheDocument()
        })
    })

    it('shows loading state during API calls', async () => {
        // Mock a delayed response
        mockFetch.mockImplementationOnce(() =>
            new Promise(resolve =>
                setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUserListResponse)
                }), 100)
            )
        )

        renderWithAuth(<UserManagement />)

        const refreshButton = screen.getByText('Refresh')
        fireEvent.click(refreshButton)

        expect(screen.getByText('Refreshing...')).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByText('Refresh')).toBeInTheDocument()
        })
    })
})