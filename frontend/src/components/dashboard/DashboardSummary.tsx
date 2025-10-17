import React, { useState, useEffect } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Avatar,
    IconButton,
    Alert,
    CircularProgress,
    Button,
    useTheme,
    alpha,
} from '@mui/material'
import {
    TrendingUp,
    Schedule as ClockIcon,
    CheckCircle,
    Warning as AlertTriangleIcon,
    People as UsersIcon,
    Assignment as FileTextIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { apiClient } from '../../services/apiClient'
import { gradients } from '../../theme'

interface DashboardMetrics {
    pendingReviews: number
    approvedReviews: number
    rejectedReviews: number
    openExceptions: number
    activeUsers: number
    averageReviewTime: number
    highRiskClients: number
    clientsNeedingReview: number
    totalReviews: number
    completionRate: number
    reviewsByStatus: Array<{ name: string; value: number; color: string }>
    reviewsOverTime: Array<{ date: string; submitted: number; approved: number; rejected: number }>
    lastUpdated: string
}

interface DashboardSummaryProps {
    className?: string
}

interface MetricCardProps {
    title: string
    value: number | string
    subtitle: string
    icon: React.ReactNode
    gradient: string
    trend?: number
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, gradient, trend }) => {
    const theme = useTheme()

    return (
        <Card
            elevation={0}
            sx={{
                height: '100%',
                minHeight: 160,
                background: 'white',
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                    borderColor: theme.palette.primary.main,
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: gradient,
                },
            }}
        >
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                    <Avatar
                        sx={{
                            width: 48,
                            height: 48,
                            background: gradient,
                            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                    >
                        {icon}
                    </Avatar>
                    {trend && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                backgroundColor: trend > 0
                                    ? alpha(theme.palette.success.main, 0.1)
                                    : alpha(theme.palette.error.main, 0.1),
                                color: trend > 0 ? theme.palette.success.main : theme.palette.error.main,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            <TrendingUp
                                sx={{
                                    fontSize: 14,
                                    mr: 0.5,
                                    transform: trend < 0 ? 'rotate(180deg)' : 'none'
                                }}
                            />
                            {Math.abs(trend)}%
                        </Box>
                    )}
                </Box>

                <Box flex={1} display="flex" flexDirection="column" justifyContent="space-between">
                    <Typography
                        variant="h4"
                        component="div"
                        fontWeight="bold"
                        color="text.primary"
                        mb={1}
                        sx={{ lineHeight: 1.2 }}
                    >
                        {value}
                    </Typography>

                    <Box>
                        <Typography variant="body2" color="text.primary" fontWeight={600} mb={0.5}>
                            {title}
                        </Typography>

                        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>
                            {subtitle}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    )
}

const COLORS = {
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    exception: '#f97316'
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ className = '' }) => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const theme = useTheme()

    useEffect(() => {
        fetchDashboardMetrics()
    }, [])

    const fetchDashboardMetrics = async () => {
        try {
            setLoading(true)
            const response = await apiClient.getDashboardMetrics()
            setMetrics(response)
            setError(null)
        } catch (err) {
            setError('Failed to load dashboard metrics')
            console.error('Dashboard metrics error:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={60} />
            </Box>
        )
    }

    if (error || !metrics) {
        return (
            <Alert
                severity="error"
                action={
                    <Button
                        color="inherit"
                        size="small"
                        onClick={fetchDashboardMetrics}
                        startIcon={<RefreshIcon />}
                    >
                        Retry
                    </Button>
                }
            >
                {error || 'Failed to load dashboard data'}
            </Alert>
        )
    }

    return (
        <Box className={className} sx={{ width: '100%' }}>
            {/* KPI Cards */}
            <Grid container spacing={{ xs: 2, sm: 3, xl: 4 }} mb={4} sx={{ width: '100%' }}>
                <Grid item xs={12} sm={6} lg={4} xl={2}>
                    <MetricCard
                        title="Pending Reviews"
                        value={metrics.pendingReviews}
                        subtitle="Awaiting action"
                        icon={<ClockIcon />}
                        gradient={gradients.warning}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={4} xl={2}>
                    <MetricCard
                        title="Approved Reviews"
                        value={metrics.approvedReviews}
                        subtitle="Last 30 days"
                        icon={<CheckCircle />}
                        gradient={gradients.success}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={4} xl={2}>
                    <MetricCard
                        title="Open Exceptions"
                        value={metrics.openExceptions}
                        subtitle="Require attention"
                        icon={<AlertTriangleIcon />}
                        gradient={gradients.error}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={4} xl={2}>
                    <MetricCard
                        title="High Risk Clients"
                        value={metrics.highRiskClients}
                        subtitle="Requiring monitoring"
                        icon={<UsersIcon />}
                        gradient={gradients.error}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={4} xl={2}>
                    <MetricCard
                        title="Avg Review Time"
                        value={`${metrics.averageReviewTime}h`}
                        subtitle="Hours to complete"
                        icon={<TrendingUp />}
                        gradient={gradients.primary}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={4} xl={2}>
                    <MetricCard
                        title="Completion Rate"
                        value={`${metrics.completionRate}%`}
                        subtitle="Approval rate"
                        icon={<FileTextIcon />}
                        gradient={gradients.success}
                    />
                </Grid>
            </Grid>

            {/* Additional Metrics Row */}
            <Grid container spacing={{ xs: 2, sm: 3, xl: 4 }} mb={4} sx={{ width: '100%' }}>
                <Grid item xs={12} sm={6} lg={3}>
                    <MetricCard
                        title="Total Reviews"
                        value={metrics.totalReviews}
                        subtitle="All statuses"
                        icon={<FileTextIcon />}
                        gradient="linear-gradient(135deg, #64748b 0%, #475569 100%)"
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={3}>
                    <MetricCard
                        title="Active Users"
                        value={metrics.activeUsers}
                        subtitle="System users"
                        icon={<UsersIcon />}
                        gradient={gradients.info}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={3}>
                    <MetricCard
                        title="Clients Need Review"
                        value={metrics.clientsNeedingReview}
                        subtitle="Overdue reviews"
                        icon={<ClockIcon />}
                        gradient={gradients.warning}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={3}>
                    <MetricCard
                        title="Rejected Reviews"
                        value={metrics.rejectedReviews}
                        subtitle="Last 30 days"
                        icon={<AlertTriangleIcon />}
                        gradient={gradients.error}
                    />
                </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={{ xs: 3, xl: 4 }} sx={{ width: '100%' }}>
                {/* Review Status Distribution */}
                <Grid item xs={12} lg={6}>
                    <Card
                        elevation={0}
                        sx={{
                            border: `1px solid ${theme.palette.grey[200]}`,
                            borderRadius: 3,
                            height: '100%',
                        }}
                    >
                        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                <Typography variant="h6" fontWeight="bold">
                                    Review Status Distribution
                                </Typography>
                                <IconButton
                                    onClick={fetchDashboardMetrics}
                                    size="small"
                                    disabled={loading}
                                    sx={{ color: theme.palette.text.secondary }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Box>
                            <Box flex={1} minHeight={320}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={metrics.reviewsByStatus}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {metrics.reviewsByStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Review Trends Over Time */}
                <Grid item xs={12} lg={6}>
                    <Card
                        elevation={0}
                        sx={{
                            border: `1px solid ${theme.palette.grey[200]}`,
                            borderRadius: 3,
                            height: '100%',
                        }}
                    >
                        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                <Typography variant="h6" fontWeight="bold">
                                    Review Activity Trends (Last 7 Days)
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
                                </Typography>
                            </Box>
                            <Box flex={1} minHeight={320}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.reviewsOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grey[200]} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12 }}
                                            stroke={theme.palette.text.secondary}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12 }}
                                            stroke={theme.palette.text.secondary}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: `1px solid ${theme.palette.grey[300]}`,
                                                borderRadius: 8,
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                            }}
                                        />
                                        <Bar dataKey="submitted" fill={COLORS.pending} name="Submitted" radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="approved" fill={COLORS.approved} name="Approved" radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="rejected" fill={COLORS.rejected} name="Rejected" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    )
}