import React from 'react'
import { Navigate } from 'react-router-dom'
import { LoginForm } from '../components'
import { useAuth } from '../contexts'

export const LoginPage: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth()

    // Redirect to dashboard if already authenticated
    if (isAuthenticated && !isLoading) {
        return <Navigate to="/" replace />
    }

    return <LoginForm />
}