import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserForm } from '../UserForm'
import { AuthContext } from '../../../contexts/AuthContext'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Maker' as const,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
}

const mockAuthContextValue = {
    user: {
        id: 2,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'Admin',
        token: 'mock-token'
    },
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
}

const defaultProps = {
    onSave: vi.fn(),
    onCancel: vi.fn()
}

const renderWithAuth = (component: React.ReactElement) => {
    return render(
        <AuthContext.Provider value={mockAuthContextValue}>
            {component}
        </AuthContext.Provider>
    )
}

describe('UserForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ id: 1, name: 'Test User' })
        })
    })

    it('renders create user form when no user provided', () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        expect(screen.getByText('Create New User')).toBeInTheDocument()
        expect(screen.getByText('Create User')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Enter full name')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
    })

    it('renders edit user form when user provided', () => {
        renderWithAuth(<UserForm {...defaultProps} user={mockUser} />)

        expect(screen.getByText('Edit User')).toBeInTheDocument()
        expect(screen.getByText('Update User')).toBeInTheDocument()
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Enter new password (optional)')).toBeInTheDocument()
    })

    it('populates form fields when editing user', () => {
        renderWithAuth(<UserForm {...defaultProps} user={mockUser} />)

        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Maker')).toBeInTheDocument()

        const activeCheckbox = screen.getByRole('checkbox', { name: 'Active User' })
        expect(activeCheckbox).toBeChecked()
    })

    it('validates required fields for new user', async () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Name is required')).toBeInTheDocument()
            expect(screen.getByText('Email is required')).toBeInTheDocument()
            expect(screen.getByText('Password is required for new users')).toBeInTheDocument()
        })

        // Should not call API when validation fails
        expect(mockFetch).not.toHaveBeenCalled()
    })

    it('validates email format', async () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        const emailInput = screen.getByPlaceholderText('Enter email address')
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
        })
    })

    it('validates password length', async () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        const passwordInput = screen.getByPlaceholderText('Enter password')
        fireEvent.change(passwordInput, { target: { value: '123' } })

        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
        })
    })

    it('validates name length', async () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        const nameInput = screen.getByPlaceholderText('Enter full name')
        fireEvent.change(nameInput, { target: { value: 'A' } })

        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument()
        })
    })

    it('clears validation errors when field is corrected', async () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        const nameInput = screen.getByPlaceholderText('Enter full name')

        // Trigger validation error
        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Name is required')).toBeInTheDocument()
        })

        // Fix the error
        fireEvent.change(nameInput, { target: { value: 'John Doe' } })

        expect(screen.queryByText('Name is required')).not.toBeInTheDocument()
    })

    it('submits create user form with valid data', async () => {
        const onSave = vi.fn()
        renderWithAuth(<UserForm {...defaultProps} onSave={onSave} />)

        // Fill form
        fireEvent.change(screen.getByPlaceholderText('Enter full name'), {
            target: { value: 'New User' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter email address'), {
            target: { value: 'newuser@example.com' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter password'), {
            target: { value: 'password123' }
        })
        fireEvent.change(screen.getByDisplayValue('Maker'), {
            target: { value: 'Checker' }
        })

        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer mock-token',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'New User',
                    email: 'newuser@example.com',
                    password: 'password123',
                    role: 'Checker',
                    is_active: true
                })
            })
        })

        expect(onSave).toHaveBeenCalled()
    })

    it('submits update user form with valid data', async () => {
        const onSave = vi.fn()
        renderWithAuth(<UserForm {...defaultProps} user={mockUser} onSave={onSave} />)

        // Update name
        const nameInput = screen.getByDisplayValue('John Doe')
        fireEvent.change(nameInput, { target: { value: 'John Updated' } })

        const submitButton = screen.getByText('Update User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer mock-token',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'John Updated',
                    email: 'john@example.com',
                    role: 'Maker',
                    is_active: true
                })
            })
        })

        expect(onSave).toHaveBeenCalled()
    })

    it('includes password in update request when provided', async () => {
        const onSave = vi.fn()
        renderWithAuth(<UserForm {...defaultProps} user={mockUser} onSave={onSave} />)

        // Add password
        const passwordInput = screen.getByPlaceholderText('Enter new password (optional)')
        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } })

        const submitButton = screen.getByText('Update User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer mock-token',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'newpassword123',
                    role: 'Maker',
                    is_active: true
                })
            })
        })
    })

    it('handles API error response', async () => {
        mockFetch.mockRejectedValueOnce(new Error('API Error'))

        renderWithAuth(<UserForm {...defaultProps} />)

        // Fill required fields
        fireEvent.change(screen.getByPlaceholderText('Enter full name'), {
            target: { value: 'Test User' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter email address'), {
            target: { value: 'test@example.com' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter password'), {
            target: { value: 'password123' }
        })

        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('API Error')).toBeInTheDocument()
        })
    })

    it('handles API error with detail message', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ detail: 'Email already exists' })
        })

        renderWithAuth(<UserForm {...defaultProps} />)

        // Fill required fields
        fireEvent.change(screen.getByPlaceholderText('Enter full name'), {
            target: { value: 'Test User' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter email address'), {
            target: { value: 'test@example.com' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter password'), {
            target: { value: 'password123' }
        })

        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Email already exists')).toBeInTheDocument()
        })
    })

    it('shows loading state during submission', async () => {
        // Mock delayed response
        mockFetch.mockImplementationOnce(() =>
            new Promise(resolve =>
                setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: 1 })
                }), 100)
            )
        )

        renderWithAuth(<UserForm {...defaultProps} />)

        // Fill required fields
        fireEvent.change(screen.getByPlaceholderText('Enter full name'), {
            target: { value: 'Test User' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter email address'), {
            target: { value: 'test@example.com' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter password'), {
            target: { value: 'password123' }
        })

        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        expect(screen.getByText('Creating...')).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByText('Create User')).toBeInTheDocument()
        })
    })

    it('calls onCancel when cancel button is clicked', () => {
        const onCancel = vi.fn()
        renderWithAuth(<UserForm {...defaultProps} onCancel={onCancel} />)

        const cancelButton = screen.getByText('Cancel')
        fireEvent.click(cancelButton)

        expect(onCancel).toHaveBeenCalled()
    })

    it('calls onCancel when close button is clicked', () => {
        const onCancel = vi.fn()
        renderWithAuth(<UserForm {...defaultProps} onCancel={onCancel} />)

        const closeButton = screen.getByText('×')
        fireEvent.click(closeButton)

        expect(onCancel).toHaveBeenCalled()
    })

    it('calls onCancel when overlay is clicked', () => {
        const onCancel = vi.fn()
        renderWithAuth(<UserForm {...defaultProps} onCancel={onCancel} />)

        const overlay = screen.getByTestId('user-form-overlay') ||
            document.querySelector('.user-form-overlay')

        if (overlay) {
            fireEvent.click(overlay)
            expect(onCancel).toHaveBeenCalled()
        }
    })

    it('does not call onCancel when modal content is clicked', () => {
        const onCancel = vi.fn()
        renderWithAuth(<UserForm {...defaultProps} onCancel={onCancel} />)

        const modal = document.querySelector('.user-form-modal')
        if (modal) {
            fireEvent.click(modal)
            expect(onCancel).not.toHaveBeenCalled()
        }
    })

    it('toggles active status checkbox', () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        const activeCheckbox = screen.getByRole('checkbox', { name: 'Active User' })
        expect(activeCheckbox).toBeChecked()

        fireEvent.click(activeCheckbox)
        expect(activeCheckbox).not.toBeChecked()

        fireEvent.click(activeCheckbox)
        expect(activeCheckbox).toBeChecked()
    })

    it('shows role descriptions in help text', () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        expect(screen.getByText(/Maker:.*Can create and submit reviews/)).toBeInTheDocument()
        expect(screen.getByText(/Checker:.*Can approve\/reject reviews/)).toBeInTheDocument()
        expect(screen.getByText(/Admin:.*Full system access including user management/)).toBeInTheDocument()
    })

    it('shows password requirements in help text', () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    })

    it('shows inactive user help text', () => {
        renderWithAuth(<UserForm {...defaultProps} />)

        expect(screen.getByText('Inactive users cannot log in to the system')).toBeInTheDocument()
    })

    it('disables form elements during loading', async () => {
        // Mock delayed response
        mockFetch.mockImplementationOnce(() =>
            new Promise(resolve =>
                setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: 1 })
                }), 100)
            )
        )

        renderWithAuth(<UserForm {...defaultProps} />)

        // Fill and submit form
        fireEvent.change(screen.getByPlaceholderText('Enter full name'), {
            target: { value: 'Test User' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter email address'), {
            target: { value: 'test@example.com' }
        })
        fireEvent.change(screen.getByPlaceholderText('Enter password'), {
            target: { value: 'password123' }
        })

        const submitButton = screen.getByText('Create User')
        fireEvent.click(submitButton)

        // Check that form elements are disabled
        expect(screen.getByPlaceholderText('Enter full name')).toBeDisabled()
        expect(screen.getByPlaceholderText('Enter email address')).toBeDisabled()
        expect(screen.getByText('Cancel')).toBeDisabled()

        await waitFor(() => {
            expect(screen.getByText('Create User')).toBeInTheDocument()
        })
    })
})