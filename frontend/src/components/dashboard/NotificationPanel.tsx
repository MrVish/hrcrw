import React, { useState, useEffect } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Badge,
    Button,
    Chip,
    CircularProgress,
    Alert,
    useTheme,
    alpha,
} from '@mui/material'
import {
    Notifications as BellIcon,
    CheckCircle,
    Warning as AlertTriangleIcon,
    Close as XIcon,
    Person as UserIcon,
    Assignment as FileTextIcon,
    Refresh as RefreshIcon,
    MarkEmailRead as MarkAllReadIcon,
} from '@mui/icons-material'
import { apiClient } from '../../services'
import type { Notification } from '../../types'

interface NotificationPanelProps {
    className?: string
}

const getNotificationIcon = (type: Notification['type'], theme: any) => {
    switch (type) {
        case 'review_submitted':
            return <FileTextIcon sx={{ color: theme.palette.info.main }} />
        case 'review_approved':
            return <CheckCircle sx={{ color: theme.palette.success.main }} />
        case 'review_rejected':
            return <XIcon sx={{ color: theme.palette.error.main }} />
        case 'exception_created':
            return <AlertTriangleIcon sx={{ color: theme.palette.warning.main }} />
        case 'user_assigned':
            return <UserIcon sx={{ color: theme.palette.primary.main }} />
        default:
            return <BellIcon sx={{ color: theme.palette.grey[500] }} />
    }
}

const getPriorityColor = (priority: Notification['priority'], theme: any) => {
    switch (priority) {
        case 'high':
            return theme.palette.error.main
        case 'medium':
            return theme.palette.warning.main
        case 'low':
        default:
            return theme.palette.info.main
    }
}

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ className = '' }) => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showAll, setShowAll] = useState(false)
    const theme = useTheme()

    useEffect(() => {
        fetchNotifications()
        // Set up polling for real-time updates
        const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds
        return () => clearInterval(interval)
    }, [])

    const fetchNotifications = async () => {
        try {
            setLoading(true)
            const notifications = await apiClient.getNotifications()
            setNotifications(notifications)
            setError(null)
        } catch (err) {
            setError('Failed to load notifications')
            console.error('Notifications error:', err)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (notificationId: string) => {
        try {
            await apiClient.markNotificationRead(notificationId)
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, read: true }
                        : notification
                )
            )
        } catch (err) {
            console.error('Failed to mark notification as read:', err)
        }
    }

    const markAllAsRead = async () => {
        try {
            await apiClient.markAllNotificationsRead()
            setNotifications(prev =>
                prev.map(notification => ({ ...notification, read: true }))
            )
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err)
        }
    }

    const dismissNotification = async (notificationId: string) => {
        try {
            await apiClient.dismissNotification(notificationId)
            setNotifications(prev =>
                prev.filter(notification => notification.id !== notificationId)
            )
        } catch (err) {
            console.error('Failed to dismiss notification:', err)
        }
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id)
        }
        if (notification.actionUrl) {
            window.location.href = notification.actionUrl
        }
    }

    const unreadCount = notifications.filter(n => !n.read).length
    const displayedNotifications = showAll ? notifications : notifications.slice(0, 5)

    if (loading && notifications.length === 0) {
        return (
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                <CardContent sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                        <CircularProgress />
                    </Box>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
            <CardContent sx={{ p: 0 }}>
                {/* Header */}
                <Box
                    sx={{
                        p: 3,
                        borderBottom: `1px solid ${theme.palette.grey[200]}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1}>
                        <BellIcon sx={{ color: theme.palette.grey[600] }} />
                        <Typography variant="h6" fontWeight="bold">
                            Notifications
                        </Typography>
                        {unreadCount > 0 && (
                            <Badge
                                badgeContent={unreadCount}
                                color="error"
                                sx={{
                                    '& .MuiBadge-badge': {
                                        fontSize: '0.75rem',
                                        minWidth: '20px',
                                        height: '20px',
                                    },
                                }}
                            />
                        )}
                    </Box>

                    {unreadCount > 0 && (
                        <Button
                            size="small"
                            onClick={markAllAsRead}
                            startIcon={<MarkAllReadIcon />}
                            sx={{ fontSize: '0.75rem' }}
                        >
                            Mark all read
                        </Button>
                    )}
                </Box>

                {/* Error State */}
                {error && (
                    <Box sx={{ p: 2 }}>
                        <Alert
                            severity="error"
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={fetchNotifications}
                                    startIcon={<RefreshIcon />}
                                >
                                    Retry
                                </Button>
                            }
                        >
                            {error}
                        </Alert>
                    </Box>
                )}

                {/* Notifications List */}
                <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                    {displayedNotifications.length === 0 ? (
                        <Box
                            sx={{
                                p: 4,
                                textAlign: 'center',
                                color: theme.palette.grey[500],
                            }}
                        >
                            <BellIcon sx={{ fontSize: 48, mb: 2, color: theme.palette.grey[300] }} />
                            <Typography variant="body2">No notifications</Typography>
                        </Box>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {displayedNotifications.map((notification, index) => (
                                <ListItem
                                    key={notification.id}
                                    sx={{
                                        borderBottom: index < displayedNotifications.length - 1 ? `1px solid ${theme.palette.grey[100]}` : 'none',
                                        backgroundColor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                                        cursor: 'pointer',
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.grey[500], 0.05),
                                        },
                                    }}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        {getNotificationIcon(notification.type, theme)}
                                    </ListItemIcon>

                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                                                    {notification.title}
                                                </Typography>
                                                <Chip
                                                    label={notification.priority}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.6875rem',
                                                        backgroundColor: alpha(getPriorityColor(notification.priority, theme), 0.1),
                                                        color: getPriorityColor(notification.priority, theme),
                                                    }}
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                    {notification.message}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatTimestamp(notification.timestamp)}
                                                </Typography>
                                            </Box>
                                        }
                                    />

                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                dismissNotification(notification.id)
                                            }}
                                            sx={{ color: theme.palette.grey[400] }}
                                        >
                                            <XIcon fontSize="small" />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>

                {/* Footer */}
                {notifications.length > 5 && (
                    <Box
                        sx={{
                            p: 2,
                            borderTop: `1px solid ${theme.palette.grey[200]}`,
                            textAlign: 'center',
                        }}
                    >
                        <Button
                            size="small"
                            variant="text"
                            onClick={() => setShowAll(!showAll)}
                        >
                            {showAll ? 'Show Less' : `Show All (${notifications.length})`}
                        </Button>
                    </Box>
                )}
            </CardContent>
        </Card>
    )
}