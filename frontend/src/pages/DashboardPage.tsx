import React from 'react'
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    useTheme,
} from '@mui/material'
import {
    Add as AddIcon,
    Assignment as ReviewIcon,
    People as PeopleIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { ModernLayout } from '../components/layout/ModernLayout'
import { RoleGuard, DashboardSummary, NotificationPanel } from '../components'
import { useAuth } from '../contexts'
import { gradients } from '../theme'

export const DashboardPage: React.FC = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const theme = useTheme()

    return (
        <ModernLayout title="Dashboard">
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    p: { xs: 2, sm: 3, md: 3, lg: 4, xl: 5 },
                }}
            >
                {/* Welcome Header */}
                <Box mb={4}>
                    <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                        Welcome back, {user?.name}!
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Here's what's happening with your compliance reviews today.
                    </Typography>
                </Box>

                <Grid container spacing={{ xs: 3, lg: 4, xl: 6 }} sx={{ width: '100%' }}>
                    {/* Main Dashboard Content */}
                    <Grid item xs={12} xl={9} lg={8} sx={{ width: '100%' }}>
                        <DashboardSummary />
                    </Grid>

                    {/* Sidebar */}
                    <Grid item xs={12} xl={3} lg={4}>
                        <Box display="flex" flexDirection="column" gap={3}>
                            {/* Notifications */}
                            <NotificationPanel />

                            {/* Quick Actions */}
                            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="bold" mb={3}>
                                        Quick Actions
                                    </Typography>

                                    <Box display="flex" flexDirection="column" gap={2}>
                                        <RoleGuard allowedRoles={['maker', 'admin']}>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                size="large"
                                                startIcon={<AddIcon />}
                                                onClick={() => navigate('/reviews/create')}
                                                sx={{
                                                    background: gradients.primary,
                                                    py: 1.5,
                                                    fontWeight: 600,
                                                    '&:hover': {
                                                        background: gradients.primary,
                                                        transform: 'translateY(-1px)',
                                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                                                    },
                                                }}
                                            >
                                                Create New Review
                                            </Button>
                                        </RoleGuard>

                                        <RoleGuard allowedRoles={['checker', 'admin']}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                size="large"
                                                startIcon={<ReviewIcon />}
                                                onClick={() => navigate('/my-tasks')}
                                                sx={{
                                                    py: 1.5,
                                                    fontWeight: 600,
                                                    borderColor: theme.palette.grey[300],
                                                    '&:hover': {
                                                        borderColor: theme.palette.primary.main,
                                                        transform: 'translateY(-1px)',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                    },
                                                }}
                                            >
                                                Review Pending Items
                                            </Button>
                                        </RoleGuard>

                                        <RoleGuard allowedRoles={['admin']}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                size="large"
                                                startIcon={<PeopleIcon />}
                                                onClick={() => navigate('/admin/users')}
                                                sx={{
                                                    py: 1.5,
                                                    fontWeight: 600,
                                                    borderColor: theme.palette.grey[300],
                                                    '&:hover': {
                                                        borderColor: theme.palette.primary.main,
                                                        transform: 'translateY(-1px)',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                    },
                                                }}
                                            >
                                                Manage Users
                                            </Button>
                                        </RoleGuard>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </ModernLayout>
    )
}