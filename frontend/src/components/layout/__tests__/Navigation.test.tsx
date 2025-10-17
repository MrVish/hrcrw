import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navigation } from '../Navigation'
import { mockUser, mockAdminUser, mockCheckerUser } from '../../../test/mocks'
import React from 'react'

// Mock the auth context
const mockUseAuth = vi.fn()
const mockLogout = vi.fn()

vi.mock('../../../contexts', () => ({
    useAuth: () => mockUseAuth(),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
    Link: ({ to, children, className }: any) => (
        <a href={to} className={className} data-testid={`link-${to}`}>{children}</a>
    ),
}))

describe('Navigation', () => {
    const user = userEvent.setup()

    beforeEach(() => {
        vi.clearAllMocks()
        mockUseAuth.mockReturnValue({
            user: mockUser,
            logout: mockLogout,
        })
    })

    it('renders system title and user information', () => {
        render(<Navigation />)

        expect(screen.getByText('HRCRW System')).toBeInTheDocument()
        expect(screen.getByText('Test User')).toBeInTheDocument()
        expect(screen.getByText('(Maker)')).toBeInTheDocument()
    })

    it('renders basic navigation items for all users', () => {
        render(<Navigation />)

        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Clients')).toBeInTheDocument()
        expect(screen.getByText('Reviews')).toBeInTheDocument()
        expect(screen.getByText('Exceptions')).toBeInTheDocument()
    })

    it('does not show admin-only items for regular users', () => {
        render(<Navigation />)

        expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument()
        expect(screen.queryByText('User Management')).not.toBeInTheDocument()
    })

    it('shows audit logs for checker users', () => {
        mockUseAuth.mockReturnValue({
            user: mockCheckerUser,
            logout: mockLogout,
        })

        render(<Navigation />)

        expect(screen.getByText('Audit Logs')).toBeInTheDocument()
        expect(screen.queryByText('User Management')).not.toBeInTheDocument()
    })

    it('shows all navigation items for admin users', () => {
        mockUseAuth.mockReturnValue({
            user: mockAdminUser,
            logout: mockLogout,
        })

        render(<Navigation />)

        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Clients')).toBeInTheDocument()
        expect(screen.getByText('Reviews')).toBeInTheDocument()
        expect(screen.getByText('Exceptions')).toBeInTheDocument()
        expect(screen.getByText('Audit Logs')).toBeInTheDocument()
        expect(screen.getByText('User Management')).toBeInTheDocument()
    })

    it('calls logout and navigates when logout button is clicked', async () => {
        render(<Navigation />)

        const logoutButton = screen.getByText('Logout')
        await user.click(logoutButton)

        expect(mockLogout).toHaveBeenCalledOnce()
        expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('applies active class to current route', () => {
        render(<Navigation />)

        const dashboardLink = screen.getByTestId('link-/')
        expect(dashboardLink).toHaveClass('nav-link active')
    })
})