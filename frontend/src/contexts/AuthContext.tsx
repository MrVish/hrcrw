import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { User, LoginCredentials, AuthContextType } from '../types'
import { AuthService } from '../services/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for existing auth on app load
        const initAuth = async () => {
            // Clean up any invalid localStorage data first
            AuthService.cleanupInvalidAuth()

            const storedToken = AuthService.getToken()
            const storedUser = AuthService.getUser()

            if (storedToken && storedUser) {
                setToken(storedToken)
                setUser(storedUser)

                try {
                    // Verify token is still valid by fetching current user
                    const currentUser = await AuthService.getCurrentUser()
                    setUser(currentUser)
                    AuthService.setUser(currentUser)
                } catch (error) {
                    // Token is invalid, clear auth
                    AuthService.clearAuth()
                    setToken(null)
                    setUser(null)
                }
            }

            setIsLoading(false)
        }

        // Listen for auth errors from API client
        const handleAuthError = () => {
            setToken(null)
            setUser(null)
        }

        window.addEventListener('auth:error', handleAuthError)
        initAuth()

        return () => {
            window.removeEventListener('auth:error', handleAuthError)
        }
    }, [])

    const login = async (credentials: LoginCredentials): Promise<void> => {
        try {
            const response = await AuthService.login(credentials)

            setToken(response.access_token)
            setUser(response.user)

            AuthService.setToken(response.access_token)
            AuthService.setUser(response.user)
        } catch (error) {
            throw error
        }
    }

    const logout = (): void => {
        setToken(null)
        setUser(null)
        AuthService.clearAuth()
    }

    const value: AuthContextType = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isLoading,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}