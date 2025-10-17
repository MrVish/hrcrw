import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, render } from '@testing-library/react'
import { ProtectedRoute } from '../ProtectedRoute'
import { mockUser, mockAdminUser, mockCheckerUser } from '../../../test/mocks'
import React from 'react'

// Mock the auth context
const mockUseAuth = vi.fn()
vi.mock('../../../contexts', () => ({
    useAuth: () => mockUseAuth(),
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
    useLocation: () => ({ pathname: '/test' }),
}))

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('shows loading when authentication is being checked', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            user: null,
            isLoading: true,
        })

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        )

        expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('redirects to login when not authenticated', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            user: null,
            isLoading: false,
        })

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        )

        expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login')
    })

    it('renders children when authenticated', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            user: mockUser,
            isLoading: false,
        })

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        )

        expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('allows access when user has required role', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            user: mockAdminUser,
            isLoading: false,
        })

        render(
            <ProtectedRoute requiredRoles={['Admin']}>
                <div>Admin Content</div>
            </ProtectedRoute>
        )

        expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })

    it('denies access when user lacks required role', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            user: mockUser, // Maker role
            isLoading: false,
        })

        render(
            <ProtectedRoute requiredRoles={['Admin']}>
                <div>Admin Content</div>
            </ProtectedRoute>
        )

        expect(screen.getByText('Access Denied')).toBeInTheDocument()
        expect(screen.getByText("You don't have permission to access this page.")).toBeInTheDocument()
        expect(screen.getByText('Required roles: Admin')).toBeInTheDocument()
        expect(screen.getByText('Your role: Maker')).toBeInTheDocument()
    })

    it('allows access when user has one of multiple required roles', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            user: mockCheckerUser,
            isLoading: false,
        })

        render(
            <ProtectedRoute requiredRoles={['Admin', 'Checker']}>
                <div>Checker Content</div>
            </ProtectedRoute>
        )

        expect(screen.getByText('Checker Content')).toBeInTheDocument()
    })
})