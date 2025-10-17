import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts'
import type { User } from '../../types'

interface ProtectedRouteProps {
    children: React.ReactNode
    requiredRoles?: Array<User['role']>
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRoles
}) => {
    const { isAuthenticated, user, isLoading } = useAuth()
    const location = useLocation()

    // Show loading while checking authentication
    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading">Loading...</div>
            </div>
        )
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Check role-based access if required roles are specified
    if (requiredRoles && user) {
        // Case-insensitive role comparison
        const userRole = user.role.toLowerCase()
        const allowedRoles = requiredRoles.map(role => role.toLowerCase())

        if (!allowedRoles.includes(userRole)) {
            return (
                <div className="access-denied">
                    <h2>Access Denied</h2>
                    <p>You don't have permission to access this page.</p>
                    <p>Required roles: {requiredRoles.join(', ')}</p>
                    <p>Your role: {user.role}</p>
                </div>
            )
        }
    }

    return <>{children}</>
}