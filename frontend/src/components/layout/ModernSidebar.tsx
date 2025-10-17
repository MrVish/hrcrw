import React, { useEffect } from 'react'
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Avatar,
    Button,
} from '@mui/material'
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Assignment as ReviewIcon,
    Warning as ExceptionIcon,
    History as AuditIcon,
    AdminPanelSettings as AdminIcon,
    Logout as LogoutIcon,
    Security as SecurityIcon,
    Task as TaskIcon,
} from '@mui/icons-material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts'

interface SidebarProps {
    open: boolean
    onClose: () => void
    width: number
}

interface NavigationItem {
    label: string
    path: string
    icon: React.ReactNode
    roles?: string[]
}

const navigationItems: NavigationItem[] = [
    {
        label: 'Dashboard',
        path: '/',
        icon: <DashboardIcon />,
    },
    {
        label: 'My Tasks',
        path: '/my-tasks',
        icon: <TaskIcon />,
        roles: ['checker', 'admin'],
    },
    {
        label: 'Clients',
        path: '/clients',
        icon: <PeopleIcon />,
    },
    {
        label: 'Reviews',
        path: '/reviews',
        icon: <ReviewIcon />,
    },
    {
        label: 'Exceptions',
        path: '/exceptions',
        icon: <ExceptionIcon />,
    },
    {
        label: 'Audit Logs',
        path: '/audit',
        icon: <AuditIcon />,
        roles: ['admin', 'checker'],
    },
    {
        label: 'User Management',
        path: '/admin/users',
        icon: <AdminIcon />,
        roles: ['admin'],
    },
]

export const ModernSidebar: React.FC<SidebarProps> = ({ open, onClose, width }) => {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()

    // Clean up aria-hidden attribute when component unmounts or drawer closes
    useEffect(() => {
        return () => {
            // Cleanup function to remove aria-hidden from root
            const root = document.getElementById('root')
            if (root && root.getAttribute('aria-hidden') === 'true') {
                root.removeAttribute('aria-hidden')
            }
        }
    }, [])

    // Ensure aria-hidden is removed when drawer closes
    useEffect(() => {
        if (!open) {
            // Small delay to ensure Material-UI has finished its cleanup
            const timeoutId = setTimeout(() => {
                const root = document.getElementById('root')
                if (root && root.getAttribute('aria-hidden') === 'true') {
                    root.removeAttribute('aria-hidden')
                }
            }, 100)

            return () => clearTimeout(timeoutId)
        }
    }, [open])

    const handleNavigation = (path: string) => {
        navigate(path)
        onClose()
    }

    const handleLogout = async () => {
        try {
            await logout()
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    const isItemActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/'
        }
        return location.pathname.startsWith(path)
    }

    const canAccessItem = (item: NavigationItem) => {
        if (!item.roles) return true
        if (!user?.role) return false

        // Case-insensitive role comparison
        const userRole = user.role.toLowerCase()
        const allowedRoles = item.roles.map(role => role.toLowerCase())
        return allowedRoles.includes(userRole)
    }

    const drawerContent = (
        <Box
            sx={{
                height: '100%',
                background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                        sx={{
                            width: 48,
                            height: 48,
                            background: 'rgba(99, 102, 241, 0.2)',
                            color: '#60a5fa',
                        }}
                    >
                        <SecurityIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                            HRCRW
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                            Compliance System
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* User Info */}
            {user && (
                <Box
                    sx={{
                        p: 2,
                        mx: 2,
                        mt: 2,
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                            sx={{
                                width: 36,
                                height: 36,
                                background: 'rgba(99, 102, 241, 0.2)',
                                color: '#60a5fa',
                                fontSize: '0.875rem',
                            }}
                        >
                            {user.name?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{
                                    color: 'white',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {user.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                                {user.role}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Navigation */}
            <Box sx={{ flex: 1, py: 2 }}>
                <List sx={{ px: 1 }}>
                    {navigationItems
                        .filter(canAccessItem)
                        .map((item) => (
                            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    onClick={() => handleNavigation(item.path)}
                                    selected={isItemActive(item.path)}
                                    sx={{
                                        borderRadius: 2,
                                        mx: 1,
                                        color: '#cbd5e1',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'white',
                                            transform: 'translateX(4px)',
                                        },
                                        '&.Mui-selected': {
                                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                                            color: 'white',
                                            borderLeft: '3px solid #6366f1',
                                            '&:hover': {
                                                backgroundColor: 'rgba(99, 102, 241, 0.3)',
                                            },
                                        },
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            color: 'inherit',
                                            minWidth: 40,
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                </List>
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Button
                    fullWidth
                    onClick={handleLogout}
                    startIcon={<LogoutIcon />}
                    sx={{
                        color: '#fca5a5',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 2,
                        py: 1,
                        '&:hover': {
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                        },
                    }}
                >
                    Sign Out
                </Button>
            </Box>
        </Box>
    )

    return (
        <>
            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    width,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width,
                        boxSizing: 'border-box',
                        border: 'none',
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={open}
                onClose={onClose}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile
                    // Prevent aria-hidden from being applied to root when drawer is closed
                    disablePortal: false,
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        width,
                        boxSizing: 'border-box',
                        border: 'none',
                    },
                }}
            >
                {drawerContent}
            </Drawer>
        </>
    )
}