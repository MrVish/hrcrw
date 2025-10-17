import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, render } from '@testing-library/react'
import { RoleGuard } from '../RoleGuard'
import { mockUser, mockAdminUser, mockCheckerUser } from '../../../test/mocks'
import React from 'react'

// Mock the auth context
const mockUseAuth = vi.fn()
vi.mock('../../../contexts', () => ({
    useAuth: () => mockUseAuth(),
}))

describe('RoleGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders children when user has allowed role', () => {
        mockUseAuth.mockReturnValue({
            user: mockAdminUser,
        })

        render(
            <RoleGuard allowedRoles={['Admin']}>
                <div>Admin Only Content</div>
            </RoleGuard>
        )

        expect(screen.getByText('Admin Only Content')).toBeInTheDocument()
    })

    it('does not render children when user lacks allowed role', () => {
        mockUseAuth.mockReturnValue({
            user: mockUser, // Maker role
        })

        render(
            <RoleGuard allowedRoles={['Admin']}>
                <div>Admin Only Content</div>
            </RoleGuard>
        )

        expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument()
    })

    it('renders children when user has one of multiple allowed roles', () => {
        mockUseAuth.mockReturnValue({
            user: mockCheckerUser,
        })

        render(
            <RoleGuard allowedRoles={['Admin', 'Checker']}>
                <div>Checker or Admin Content</div>
            </RoleGuard>
        )

        expect(screen.getByText('Checker or Admin Content')).toBeInTheDocument()
    })

    it('renders fallback when user lacks allowed role and fallback is provided', () => {
        mockUseAuth.mockReturnValue({
            user: mockUser, // Maker role
        })

        render(
            <RoleGuard
                allowedRoles={['Admin']}
                fallback={<div>Access Denied</div>}
            >
                <div>Admin Only Content</div>
            </RoleGuard>
        )

        expect(screen.getByText('Access Denied')).toBeInTheDocument()
        expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument()
    })

    it('does not render anything when user is null', () => {
        mockUseAuth.mockReturnValue({
            user: null,
        })

        render(
            <RoleGuard allowedRoles={['Admin']}>
                <div>Admin Only Content</div>
            </RoleGuard>
        )

        expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument()
    })
})