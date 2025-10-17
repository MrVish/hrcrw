import React from 'react'
import { useAuth } from '../../contexts'
import type { ReactNode } from 'react'
import type { User } from '../../types'

interface RoleGuardProps {
    children: ReactNode
    allowedRoles: Array<User['role']>
    fallback?: ReactNode
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
    children,
    allowedRoles,
    fallback = null
}) => {
    const { user } = useAuth()

    if (!user || !allowedRoles.includes(user.role)) {
        return <>{fallback}</>
    }

    return <>{children}</>
}