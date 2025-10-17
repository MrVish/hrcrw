import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    Home,
    Users,
    FileText,
    AlertTriangle,
    Shield,
    Settings,
    LogOut,
    User
} from 'lucide-react'
import { useAuth } from '../../contexts'
import type { User as UserType } from '../../types'

interface NavigationItem {
    path: string
    label: string
    icon: React.ComponentType<any>
    roles?: Array<UserType['role']>
}

const navigationItems: NavigationItem[] = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/clients', label: 'Clients', icon: Users },
    { path: '/reviews', label: 'Reviews', icon: FileText },
    { path: '/exceptions', label: 'Exceptions', icon: AlertTriangle },
    { path: '/audit', label: 'Audit Logs', icon: Shield, roles: ['Admin', 'Checker'] },
    { path: '/admin/users', label: 'User Management', icon: Settings, roles: ['Admin'] },
]

export const Navigation: React.FC = () => {
    const { user, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const isItemVisible = (item: NavigationItem): boolean => {
        if (!item.roles) return true
        return user ? item.roles.includes(user.role) : false
    }

    const isActiveRoute = (path: string): boolean => {
        return location.pathname === path
    }

    return (
        <nav className="navigation">
            <div className="nav-header">
                <div className="nav-brand">
                    <div className="brand-icon">
                        <Shield size={24} />
                    </div>
                    <div className="brand-text">
                        <h2>HRCRW</h2>
                        <span>Risk Management</span>
                    </div>
                </div>
            </div>

            <div className="nav-user">
                <div className="user-avatar">
                    <User size={20} />
                </div>
                <div className="user-details">
                    <span className="user-name">{user?.name}</span>
                    <span className="user-role">{user?.role}</span>
                </div>
            </div>

            <ul className="nav-menu">
                {navigationItems
                    .filter(isItemVisible)
                    .map((item) => {
                        const IconComponent = item.icon
                        return (
                            <li key={item.path} className="nav-item">
                                <Link
                                    to={item.path}
                                    className={`nav-link ${isActiveRoute(item.path) ? 'active' : ''}`}
                                >
                                    <IconComponent size={20} className="nav-icon" />
                                    <span className="nav-label">{item.label}</span>
                                </Link>
                            </li>
                        )
                    })}
            </ul>

            <div className="nav-footer">
                <button onClick={handleLogout} className="logout-button">
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    )
}