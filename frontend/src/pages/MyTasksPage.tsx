import React, { useState, useEffect } from 'react'
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    Avatar,
    IconButton,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    CircularProgress,
    Alert,
    useTheme,
    alpha,
} from '@mui/material'
import {
    Assignment as ReviewIcon,
    Warning as ExceptionIcon,
    Schedule as ClockIcon,
    TrendingUp,
    Search as SearchIcon,
    Visibility as ViewIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { ModernLayout } from '../components/layout/ModernLayout'
import { useAuth } from '../contexts'
import { apiClient } from '../services/apiClient'
import type { Review, Exception } from '../types'

interface TaskSummary {
    totalTasks: number
    pendingReviews: number
    openExceptions: number
    overdueTasks: number
    dueTodayTasks: number
    dueThisWeekTasks: number
}

interface TaskItem {
    id: number
    type: 'review' | 'exception'
    title: string
    clientName: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    status: string
    dueDate: string | null
    createdAt: string
    isOverdue: boolean
    assignedTo?: string
}

interface TabPanelProps {
    children?: React.ReactNode
    index: number
    value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`task-tabpanel-${index}`}
            aria-labelledby={`task-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    )
}

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'CRITICAL': return '#ef4444'
        case 'HIGH': return '#f97316'
        case 'MEDIUM': return '#f59e0b'
        case 'LOW': return '#10b981'
        default: return '#6b7280'
    }
}

const getStatusColor = (status: string, type: string) => {
    if (type === 'review') {
        switch (status) {
            case 'submitted': return '#f59e0b'
            case 'under_review': return '#3b82f6'
            case 'approved': return '#10b981'
            case 'rejected': return '#ef4444'
            default: return '#6b7280'
        }
    } else {
        switch (status) {
            case 'open': return '#ef4444'
            case 'in_progress': return '#f59e0b'
            case 'resolved': return '#10b981'
            case 'escalated': return '#8b5cf6'
            default: return '#6b7280'
        }
    }
}

export const MyTasksPage: React.FC = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const theme = useTheme()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [summary, setSummary] = useState<TaskSummary | null>(null)
    const [tasks, setTasks] = useState<TaskItem[]>([])
    const [filteredTasks, setFilteredTasks] = useState<TaskItem[]>([])
    const [tabValue, setTabValue] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')
    const [priorityFilter, setPriorityFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    useEffect(() => {
        fetchMyTasks()
    }, [])

    useEffect(() => {
        filterTasks()
    }, [tasks, tabValue, searchTerm, priorityFilter, statusFilter])

    const fetchMyTasks = async () => {
        try {
            setLoading(true)
            setError(null)

            // Fetch pending reviews that need to be reviewed (for checkers)
            const reviewsResponse = await apiClient.getReviews({
                status: 'submitted' as any
            })

            // Get clients to map IDs to names (with pagination if needed)
            let clientMap = new Map<string, string>()
            try {
                // Start with first page of clients
                let allClients: any[] = []
                let page = 1
                let hasMore = true

                while (hasMore && page <= 10) { // Limit to 10 pages max (1000 clients)
                    const clientsResponse = await apiClient.getClients({}, page, 100) // Use max allowed per page
                    allClients = [...allClients, ...clientsResponse.clients]

                    // Check if there are more pages
                    hasMore = clientsResponse.clients.length === 100 && clientsResponse.total > page * 100
                    page++
                }

                clientMap = new Map(allClients.map(client => [client.id, client.name]))
            } catch (clientError) {
                console.warn('Failed to fetch clients for name mapping:', clientError)
                // Continue without client names - will fall back to IDs
            }

            // Fetch exceptions assigned to user (both open and in_progress in one call)
            const exceptionsResponse = await apiClient.getExceptions({
                assigned_to: user?.id
            })

            // Filter exceptions to only include open and in_progress ones
            const activeExceptions = exceptionsResponse.exceptions.filter(
                exception => exception.status === 'open' || exception.status === 'in_progress'
            )

            // Transform reviews into unified task format
            const reviewTasks: TaskItem[] = reviewsResponse.reviews
                .filter(review => (review.status as string).toLowerCase() === 'submitted') // Only submitted reviews
                .map((review: Review) => ({
                    id: review.id,
                    type: 'review' as const,
                    title: `Client Review - ${clientMap.get(review.client_id) || review.client_id}`,
                    clientName: clientMap.get(review.client_id) || review.client_id,
                    priority: 'MEDIUM' as const, // Default priority since Review doesn't have client risk level
                    status: review.status,
                    dueDate: null, // Reviews don't have due dates in current schema
                    createdAt: review.created_at,
                    isOverdue: false,
                    assignedTo: undefined // Reviews don't have assignee names in basic Review type
                }))

            // Remove duplicates by creating a Set of unique exception IDs
            const uniqueExceptions = activeExceptions.filter((exception, index, self) =>
                index === self.findIndex(e => e.id === exception.id)
            )

            const exceptionTasks: TaskItem[] = uniqueExceptions.map((exception: Exception) => ({
                id: exception.id,
                type: 'exception' as const,
                title: exception.title || `Exception - ${exception.id}`,
                clientName: exception.client_name || clientMap.get(exception.client_id || '') || exception.client_id || 'Unknown',
                priority: exception.priority,
                status: exception.status,
                dueDate: exception.due_date,
                createdAt: exception.created_at,
                isOverdue: exception.is_overdue || false,
                assignedTo: exception.assigned_to_name || undefined
            }))

            // Combine all tasks and remove any potential duplicates
            const allTasks = [...reviewTasks, ...exceptionTasks]
            const uniqueTasks = allTasks.filter((task, index, self) =>
                index === self.findIndex(t => t.type === task.type && t.id === task.id)
            )

            setTasks(uniqueTasks)

            // Calculate summary with unique tasks
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

            const taskSummary: TaskSummary = {
                totalTasks: uniqueTasks.length,
                pendingReviews: uniqueTasks.filter(task => task.type === 'review').length,
                openExceptions: uniqueTasks.filter(task => task.type === 'exception').length,
                overdueTasks: uniqueTasks.filter(task => task.isOverdue).length,
                dueTodayTasks: uniqueTasks.filter(task => {
                    if (!task.dueDate) return false
                    const dueDate = new Date(task.dueDate)
                    return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }).length,
                dueThisWeekTasks: uniqueTasks.filter(task => {
                    if (!task.dueDate) return false
                    const dueDate = new Date(task.dueDate)
                    return dueDate >= today && dueDate < nextWeek
                }).length
            }

            setSummary(taskSummary)
        } catch (err) {
            setError('Failed to load tasks')
            console.error('Error fetching tasks:', err)
        } finally {
            setLoading(false)
        }
    }

    const filterTasks = () => {
        let filtered = tasks

        // Filter by tab
        if (tabValue === 1) {
            filtered = filtered.filter(task => task.type === 'review')
        } else if (tabValue === 2) {
            filtered = filtered.filter(task => task.type === 'exception')
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                task.clientName.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Filter by priority
        if (priorityFilter) {
            filtered = filtered.filter(task => task.priority === priorityFilter)
        }

        // Filter by status
        if (statusFilter) {
            filtered = filtered.filter(task => task.status === statusFilter)
        }

        setFilteredTasks(filtered)
    }

    const handleTaskAction = (task: TaskItem) => {
        if (task.type === 'review') {
            // Navigate to review detail page for proper maker-checker workflow
            navigate(`/reviews/${task.id}`)
        } else {
            navigate(`/exceptions/${task.id}`)
        }
    }

    if (loading) {
        return (
            <ModernLayout title="My Tasks">
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress size={60} />
                </Box>
            </ModernLayout>
        )
    }

    if (error) {
        return (
            <ModernLayout title="My Tasks">
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" size="small" onClick={fetchMyTasks} startIcon={<RefreshIcon />}>
                            Retry
                        </Button>
                    }
                >
                    {error}
                </Alert>
            </ModernLayout>
        )
    }

    return (
        <ModernLayout title="My Tasks">
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                {/* Header */}
                <Box mb={4}>
                    <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                        My Tasks
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        All pending items assigned to you
                    </Typography>
                </Box>

                {/* Summary Cards */}
                {summary && (
                    <Grid container spacing={3} mb={4}>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <Card elevation={0} sx={{
                                border: `1px solid ${theme.palette.grey[200]}`,
                                borderRadius: 2,
                                height: '100%',
                                minHeight: 120
                            }}>
                                <CardContent sx={{
                                    p: 2.5,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <Box display="flex" alignItems="center" gap={2} width="100%">
                                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                                            <ClockIcon />
                                        </Avatar>
                                        <Box flex={1}>
                                            <Typography variant="h5" fontWeight="bold">
                                                {summary.totalTasks}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                Total Tasks
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <Card elevation={0} sx={{
                                border: `1px solid ${theme.palette.grey[200]}`,
                                borderRadius: 2,
                                height: '100%',
                                minHeight: 120
                            }}>
                                <CardContent sx={{
                                    p: 2.5,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <Box display="flex" alignItems="center" gap={2} width="100%">
                                        <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }}>
                                            <ReviewIcon />
                                        </Avatar>
                                        <Box flex={1}>
                                            <Typography variant="h5" fontWeight="bold">
                                                {summary.pendingReviews}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                Pending Reviews
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <Card elevation={0} sx={{
                                border: `1px solid ${theme.palette.grey[200]}`,
                                borderRadius: 2,
                                height: '100%',
                                minHeight: 120
                            }}>
                                <CardContent sx={{
                                    p: 2.5,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <Box display="flex" alignItems="center" gap={2} width="100%">
                                        <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}>
                                            <ExceptionIcon />
                                        </Avatar>
                                        <Box flex={1}>
                                            <Typography variant="h5" fontWeight="bold">
                                                {summary.openExceptions}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                Open Exceptions
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <Card elevation={0} sx={{
                                border: `1px solid ${theme.palette.grey[200]}`,
                                borderRadius: 2,
                                height: '100%',
                                minHeight: 120
                            }}>
                                <CardContent sx={{
                                    p: 2.5,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <Box display="flex" alignItems="center" gap={2} width="100%">
                                        <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}>
                                            <TrendingUp />
                                        </Avatar>
                                        <Box flex={1}>
                                            <Typography variant="h5" fontWeight="bold">
                                                {summary.overdueTasks}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                Overdue
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <Card elevation={0} sx={{
                                border: `1px solid ${theme.palette.grey[200]}`,
                                borderRadius: 2,
                                height: '100%',
                                minHeight: 120
                            }}>
                                <CardContent sx={{
                                    p: 2.5,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <Box display="flex" alignItems="center" gap={2} width="100%">
                                        <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                                            <ClockIcon />
                                        </Avatar>
                                        <Box flex={1}>
                                            <Typography variant="h5" fontWeight="bold">
                                                {summary.dueTodayTasks}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                Due Today
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <Card elevation={0} sx={{
                                border: `1px solid ${theme.palette.grey[200]}`,
                                borderRadius: 2,
                                height: '100%',
                                minHeight: 120
                            }}>
                                <CardContent sx={{
                                    p: 2.5,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <Box display="flex" alignItems="center" gap={2} width="100%">
                                        <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}>
                                            <ClockIcon />
                                        </Avatar>
                                        <Box flex={1}>
                                            <Typography variant="h5" fontWeight="bold">
                                                {summary.dueThisWeekTasks}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                Due This Week
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {/* Filters and Search */}
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}`, mb: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    placeholder="Search tasks..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        value={priorityFilter}
                                        label="Priority"
                                        onChange={(e) => setPriorityFilter(e.target.value)}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        <MenuItem value="CRITICAL">Critical</MenuItem>
                                        <MenuItem value="HIGH">High</MenuItem>
                                        <MenuItem value="MEDIUM">Medium</MenuItem>
                                        <MenuItem value="LOW">Low</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={statusFilter}
                                        label="Status"
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        <MenuItem value="submitted">Submitted</MenuItem>
                                        <MenuItem value="under_review">Under Review</MenuItem>
                                        <MenuItem value="open">Open</MenuItem>
                                        <MenuItem value="in_progress">In Progress</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box display="flex" gap={1} justifyContent="flex-end">
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            setSearchTerm('')
                                            setPriorityFilter('')
                                            setStatusFilter('')
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={fetchMyTasks}
                                        startIcon={<RefreshIcon />}
                                    >
                                        Refresh
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                            <Tab label={`All Tasks (${tasks.length})`} />
                            <Tab label={`Reviews (${tasks.filter(t => t.type === 'review').length})`} />
                            <Tab label={`Exceptions (${tasks.filter(t => t.type === 'exception').length})`} />
                        </Tabs>
                    </Box>

                    {/* Task List */}
                    <TabPanel value={tabValue} index={0}>
                        <TaskTable tasks={filteredTasks} onTaskAction={handleTaskAction} />
                    </TabPanel>
                    <TabPanel value={tabValue} index={1}>
                        <TaskTable tasks={filteredTasks} onTaskAction={handleTaskAction} />
                    </TabPanel>
                    <TabPanel value={tabValue} index={2}>
                        <TaskTable tasks={filteredTasks} onTaskAction={handleTaskAction} />
                    </TabPanel>
                </Card>
            </Box>
        </ModernLayout>
    )
}

interface TaskTableProps {
    tasks: TaskItem[]
    onTaskAction: (task: TaskItem) => void
}

const TaskTable: React.FC<TaskTableProps> = ({ tasks, onTaskAction }) => {

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getDaysUntilDue = (dueDate: string | null) => {
        if (!dueDate) return null
        const due = new Date(dueDate)
        const now = new Date()
        const diffTime = due.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    if (tasks.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    No tasks found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    You don't have any pending tasks at the moment.
                </Typography>
            </Box>
        )
    }

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Task</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tasks.map((task) => {
                        const daysUntilDue = getDaysUntilDue(task.dueDate)
                        return (
                            <TableRow key={`${task.type}-${task.id}`} hover>
                                <TableCell>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>
                                            {task.title}
                                        </Typography>
                                        {task.isOverdue && (
                                            <Chip
                                                label="Overdue"
                                                size="small"
                                                color="error"
                                                sx={{ mt: 0.5 }}
                                            />
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">
                                        {task.clientName}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        icon={task.type === 'review' ? <ReviewIcon /> : <ExceptionIcon />}
                                        label={task.type === 'review' ? 'Review' : 'Exception'}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={task.priority}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(getPriorityColor(task.priority), 0.1),
                                            color: getPriorityColor(task.priority),
                                            fontWeight: 600
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={task.status.replace('_', ' ')}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(getStatusColor(task.status, task.type), 0.1),
                                            color: getStatusColor(task.status, task.type),
                                            fontWeight: 600
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    {task.dueDate ? (
                                        <Box>
                                            <Typography variant="body2">
                                                {formatDate(task.dueDate)}
                                            </Typography>
                                            {daysUntilDue !== null && (
                                                <Typography
                                                    variant="caption"
                                                    color={daysUntilDue < 0 ? 'error' : daysUntilDue <= 1 ? 'warning.main' : 'text.secondary'}
                                                >
                                                    {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                                                        daysUntilDue === 0 ? 'Due today' :
                                                            daysUntilDue === 1 ? 'Due tomorrow' :
                                                                `${daysUntilDue} days left`}
                                                </Typography>
                                            )}
                                        </Box>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No due date
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">
                                        {formatDate(task.createdAt)}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Box display="flex" gap={1} justifyContent="flex-end">
                                        <Tooltip title="View Details">
                                            <IconButton
                                                size="small"
                                                onClick={() => onTaskAction(task)}
                                            >
                                                <ViewIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    )
}