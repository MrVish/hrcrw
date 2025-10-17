import React, { useState } from 'react'
import {
    Box,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Badge,
    Avatar,
    Menu,
    MenuItem,
    Divider,
    useTheme,
    useMediaQuery,
} from '@mui/material'
import {
    Menu as MenuIcon,
    Notifications as NotificationsIcon,
    AccountCircle,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material'
import { ModernSidebar } from './ModernSidebar'
import { useAuth } from '../../contexts'

interface ModernLayoutProps {
    children: React.ReactNode
    title?: string
}

const DRAWER_WIDTH = 280

export const ModernLayout: React.FC<ModernLayoutProps> = ({ children, title = 'Dashboard' }) => {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const [mobileOpen, setMobileOpen] = useState(false)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const { user, logout } = useAuth()

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen)
    }

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleProfileMenuClose = () => {
        setAnchorEl(null)
    }

    const handleLogout = async () => {
        handleProfileMenuClose()
        try {
            await logout()
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* App Bar */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { md: `${DRAWER_WIDTH}px` },
                    backgroundColor: 'white',
                    borderBottom: `1px solid ${theme.palette.grey[200]}`,
                    color: theme.palette.text.primary,
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        {title}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Notifications */}
                        <IconButton size="large" color="inherit">
                            <Badge badgeContent={4} color="error">
                                <NotificationsIcon />
                            </Badge>
                        </IconButton>

                        {/* Profile Menu */}
                        <IconButton
                            size="large"
                            edge="end"
                            aria-label="account of current user"
                            aria-controls="profile-menu"
                            aria-haspopup="true"
                            onClick={handleProfileMenuOpen}
                            color="inherit"
                        >
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    backgroundColor: theme.palette.primary.main,
                                    fontSize: '0.875rem',
                                }}
                            >
                                {user?.name?.charAt(0).toUpperCase()}
                            </Avatar>
                        </IconButton>

                        <Menu
                            id="profile-menu"
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleProfileMenuClose}
                            onClick={handleProfileMenuClose}
                            PaperProps={{
                                elevation: 0,
                                sx: {
                                    overflow: 'visible',
                                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                    mt: 1.5,
                                    minWidth: 200,
                                    '& .MuiAvatar-root': {
                                        width: 32,
                                        height: 32,
                                        ml: -0.5,
                                        mr: 1,
                                    },
                                    '&:before': {
                                        content: '""',
                                        display: 'block',
                                        position: 'absolute',
                                        top: 0,
                                        right: 14,
                                        width: 10,
                                        height: 10,
                                        bgcolor: 'background.paper',
                                        transform: 'translateY(-50%) rotate(45deg)',
                                        zIndex: 0,
                                    },
                                },
                            }}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        >
                            <MenuItem onClick={handleProfileMenuClose}>
                                <Avatar sx={{ backgroundColor: theme.palette.primary.main }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                        {user?.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {user?.email}
                                    </Typography>
                                </Box>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleProfileMenuClose}>
                                <AccountCircle sx={{ mr: 2 }} />
                                Profile
                            </MenuItem>
                            <MenuItem onClick={handleProfileMenuClose}>
                                <SettingsIcon sx={{ mr: 2 }} />
                                Settings
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleLogout}>
                                <LogoutIcon sx={{ mr: 2 }} />
                                Sign Out
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <ModernSidebar
                open={mobileOpen}
                onClose={handleDrawerToggle}
                width={DRAWER_WIDTH}
            />

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    minHeight: '100vh',
                    backgroundColor: theme.palette.background.default,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Toolbar /> {/* Spacer for fixed AppBar */}
                <Box
                    sx={{
                        flex: 1,
                        width: '100%',
                        height: '100%',
                        overflow: 'auto',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: {
                                xs: '100%',      // Mobile: full width
                                sm: '100%',      // Tablet: full width  
                                md: '1200px',    // Desktop: centered with max width
                                lg: '1400px',    // Large desktop: wider max width
                                xl: '1600px',    // Extra large: even wider
                            },
                            mx: 'auto',
                            px: { xs: 0, md: 2, lg: 3, xl: 4 }, // Add horizontal padding on larger screens
                        }}
                    >
                        {children}
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}