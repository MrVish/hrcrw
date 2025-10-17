import React, { useState, useEffect } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    InputAdornment,
    Button,
    Chip,
    IconButton,
    Collapse,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    useTheme,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Paper,
    Fab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tabs,
    Tab,
} from '@mui/material'
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Visibility as EyeIcon,
    Add as PlusIcon,
    CalendarToday as CalendarIcon,
    Person as UserIcon,
    Assignment as FileTextIcon,
    Refresh as RefreshIcon,
    Edit as EditIcon,
    PersonAdd as UserPlusIcon,
} from '@mui/icons-material'
import { apiClient } from '../../services'
import { useAuth } from '../../contexts'
import type { Exception } from '../../types'
import { gradients } from '../../theme'
import StatusBadge from '../common/StatusBadge'

interface ExceptionFilters {
    search: string
    status: string
    priority: string
    assigned_to: string
    type: string
}

interface ExceptionListProps {
    onExceptionSelect?: (exception: Exception) => void
    onCreateException?: () => void
    className?: string
}

export const ExceptionList: React.FC<ExceptionListProps> = ({
    onExceptionSelect,
    onCreateException,
    className = ''
}) => {
    const { user } = useAuth()
    const [exceptions, setExceptions] = useState<Exception[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<ExceptionFilters>({
        search: '',
        status: '',
        priority: '',
        assigned_to: '',
        type: ''
    })
    const [showFilters, setShowFilters] = useState(false)
    const [users, setUsers] = useState<string[]>([])
    const [assignableUsers, setAssignableUsers] = useState<any[]>([])
    const [exceptionTypes, setExceptionTypes] = useState<string[]>([])
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState(0)
    const theme = useTheme()

    useEffect(() => {
        fetchExceptions()
        fetchUsers()
        fetchAssignableUsers()
    }, [])

    const fetchExceptions = async () => {
        try {
            setLoading(true)
            const response = await apiClient.getExceptions()

            console.log('Exceptions API response:', response) // Debug log

            // The response should have an exceptions array
            const exceptionsList = response.exceptions || []

            // Normalize status values to uppercase for consistent filtering
            const normalizedExceptions = exceptionsList.map((exception: any) => ({
                ...exception,
                status: exception.status?.toUpperCase() || 'OPEN'
            }))

            setExceptions(normalizedExceptions)

            // Extract unique exception types
            const types = [...new Set(exceptionsList.map((ex: Exception) => ex.type))]
            setExceptionTypes(types.sort())

            setError(null)
        } catch (err) {
            setError('Failed to load exceptions')
            console.error('Exceptions fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchUsers = async () => {
        try {
            const users = await apiClient.getAssignableUsersList()
            const userNames = users.map((user: any) => user.name)
            setUsers(userNames.sort())
        } catch (err) {
            console.error('Users fetch error:', err)
            setUsers([])
        }
    }

    const fetchAssignableUsers = async () => {
        try {
            const users = await apiClient.getAssignableUsersList()
            setAssignableUsers(users)
        } catch (err) {
            console.error('Error fetching assignable users:', err)
            setAssignableUsers([])
            setUsers([])
        }
    }

    const handleFilterChange = (key: keyof ExceptionFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setPage(0) // Reset to first page when filters change
    }

    const clearFilters = () => {
        setFilters({
            search: '',
            status: '',
            priority: '',
            assigned_to: '',
            type: ''
        })
        setPage(0)
    }

    const handleExceptionClick = (exception: Exception) => {
        if (onExceptionSelect) {
            onExceptionSelect(exception)
        }
    }

    const handleAssignClick = (exceptionId: number) => {
        setSelectedExceptionId(exceptionId.toString())
        setShowAssignModal(true)
    }

    const handleAssignException = async (assignedTo: number) => {
        if (!selectedExceptionId) return
        try {
            await apiClient.assignException(parseInt(selectedExceptionId), assignedTo)
            setShowAssignModal(false)
            setSelectedExceptionId(null)
            await fetchExceptions()
        } catch (err: any) {
            console.error('Error assigning exception:', err)
            const errorMessage = err?.message || err?.response?.data?.detail || 'Failed to assign exception'
            setError(errorMessage)
        }
    }

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue)
        // Set status filter based on tab
        const statusMap = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
        handleFilterChange('status', statusMap[newValue])
    }

    // Filter exceptions based on current filters
    const filteredExceptions = exceptions.filter(exception => {
        const matchesSearch = !filters.search ||
            (exception.client_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            (exception.client_id || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            exception.type.toLowerCase().includes(filters.search.toLowerCase()) ||
            exception.description.toLowerCase().includes(filters.search.toLowerCase()) ||
            exception.id.toString().includes(filters.search)

        const matchesStatus = !filters.status || exception.status === filters.status
        const matchesType = !filters.type || exception.type === filters.type
        const matchesPriority = !filters.priority || exception.priority === filters.priority

        const matchesAssignedTo = !filters.assigned_to ||
            (filters.assigned_to === 'unassigned' ? !exception.assigned_to :
                (exception.assigned_to_name === filters.assigned_to || exception.assigned_user_name === filters.assigned_to))

        return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesAssignedTo
    }).sort((a, b) => {
        // Sort by priority and creation date
        const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
        const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
            (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Get paginated data
    const paginatedExceptions = filteredExceptions.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    )

    // Status counts for tabs
    const statusCounts = {
        all: exceptions.length,
        open: exceptions.filter(e => e.status === 'OPEN').length,
        in_progress: exceptions.filter(e => e.status === 'IN_PROGRESS').length,
        resolved: exceptions.filter(e => e.status === 'RESOLVED').length,
        closed: exceptions.filter(e => e.status === 'CLOSED').length
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'COMPLIANCE': return theme.palette.error.main
            case 'DOCUMENTATION': return theme.palette.warning.main
            case 'TECHNICAL': return theme.palette.info.main
            case 'OTHER': return theme.palette.grey[500]
            default: return theme.palette.grey[500]
        }
    }

    const formatDateShort = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={60} />
                <Typography sx={{ ml: 2 }}>Loading exceptions...</Typography>
            </Box>
        )
    }

    if (error) {
        return (
            <Alert
                severity="error"
                action={
                    <Button
                        color="inherit"
                        size="small"
                        onClick={fetchExceptions}
                        startIcon={<RefreshIcon />}
                    >
                        Retry
                    </Button>
                }
            >
                {error}
            </Alert>
        )
    }

    // Debug information
    console.log('ExceptionList render:', {
        exceptionsCount: exceptions.length,
        filteredCount: filteredExceptions.length,
        loading,
        error,
        filters
    })

    return (
        <Box className={className} position="relative" sx={{ width: '100%' }}>
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                    {/* Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                Exceptions
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {filteredExceptions.length} of {exceptions.length} exceptions
                            </Typography>
                        </Box>
                        <Box display="flex" gap={2}>
                            <Button
                                variant="outlined"
                                startIcon={<FilterIcon />}
                                onClick={() => setShowFilters(!showFilters)}
                                sx={{
                                    borderColor: showFilters ? theme.palette.primary.main : theme.palette.grey[300],
                                    backgroundColor: showFilters ? theme.palette.primary.main + '10' : 'transparent',
                                }}
                            >
                                Filters
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={fetchExceptions}
                                disabled={loading}
                                sx={{ mr: 1 }}
                            >
                                Refresh
                            </Button>
                            {onCreateException && (
                                <Button
                                    variant="contained"
                                    startIcon={<PlusIcon />}
                                    onClick={onCreateException}
                                    sx={{
                                        background: gradients.primary,
                                        '&:hover': {
                                            background: gradients.primary,
                                            transform: 'translateY(-1px)',
                                        },
                                    }}
                                >
                                    New Exception
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {/* Status Tabs */}
                    <Box mb={2}>
                        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                            <Tab label={`All (${statusCounts.all})`} />
                            <Tab label={`Open (${statusCounts.open})`} />
                            <Tab label={`In Progress (${statusCounts.in_progress})`} />
                            <Tab label={`Resolved (${statusCounts.resolved})`} />
                            <Tab label={`Closed (${statusCounts.closed})`} />
                        </Tabs>
                    </Box>

                    {/* Search */}
                    <Box mb={2}>
                        <TextField
                            fullWidth
                            placeholder="Search by client, type, description, or exception ID..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ maxWidth: 500 }}
                        />
                    </Box>

                    {/* Advanced Filters */}
                    <Collapse in={showFilters}>
                        <Box mb={3} p={2} sx={{ backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
                            <Grid container spacing={2} alignItems="end">
                                <Grid item xs={12} sm={6} md={2.4}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Priority</InputLabel>
                                        <Select
                                            value={filters.priority}
                                            label="Priority"
                                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                                        >
                                            <MenuItem value="">All Priorities</MenuItem>
                                            <MenuItem value="CRITICAL">Critical</MenuItem>
                                            <MenuItem value="HIGH">High</MenuItem>
                                            <MenuItem value="MEDIUM">Medium</MenuItem>
                                            <MenuItem value="LOW">Low</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6} md={2.4}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Assigned To</InputLabel>
                                        <Select
                                            value={filters.assigned_to}
                                            label="Assigned To"
                                            onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                                        >
                                            <MenuItem value="">All Assignments</MenuItem>
                                            <MenuItem value="unassigned">Unassigned</MenuItem>
                                            {users.map(userName => (
                                                <MenuItem key={userName} value={userName}>{userName}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6} md={2.4}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Exception Type</InputLabel>
                                        <Select
                                            value={filters.type}
                                            label="Exception Type"
                                            onChange={(e) => handleFilterChange('type', e.target.value)}
                                        >
                                            <MenuItem value="">All Types</MenuItem>
                                            {exceptionTypes.map(type => (
                                                <MenuItem key={type} value={type}>{type}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6} md={2.4}>
                                    <Button
                                        variant="outlined"
                                        onClick={clearFilters}
                                        size="small"
                                        fullWidth
                                    >
                                        Clear All
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>

                    {/* Table */}
                    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                                    <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Assigned To</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedExceptions.map((exception) => (
                                    <TableRow
                                        key={exception.id}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: theme.palette.grey[50],
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <FileTextIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                                <Typography variant="body2" fontWeight={600}>
                                                    #{exception.id}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {exception.client_name || 'Unknown Client'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {exception.client_id || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={exception.type}
                                                size="small"
                                                sx={{
                                                    backgroundColor: getTypeColor(exception.type),
                                                    color: 'white',
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={exception.priority}
                                                type="priority"
                                                variant="outlined"
                                                showIcon={true}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={exception.status}
                                                type="exception"
                                                variant="filled"
                                                showIcon={true}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {exception.assigned_to ? (
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <UserIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                                    <Typography variant="body2">
                                                        {exception.assigned_to_name || exception.assigned_user_name || `User ${exception.assigned_to}`}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Unassigned
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <CalendarIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                                <Typography variant="body2">
                                                    {formatDateShort(exception.created_at)}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" gap={1}>
                                                <IconButton
                                                    onClick={() => handleExceptionClick(exception)}
                                                    size="small"
                                                    sx={{
                                                        color: theme.palette.primary.main,
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.primary.main + '10',
                                                        },
                                                    }}
                                                >
                                                    <EyeIcon />
                                                </IconButton>
                                                {(exception.status === 'OPEN' || exception.status === 'IN_PROGRESS') && (
                                                    <>
                                                        <IconButton
                                                            onClick={() => handleExceptionClick(exception)}
                                                            size="small"
                                                            sx={{
                                                                color: theme.palette.warning.main,
                                                                '&:hover': {
                                                                    backgroundColor: theme.palette.warning.main + '10',
                                                                },
                                                            }}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                        {(user?.role === 'checker' || user?.role === 'admin') && (
                                                            <IconButton
                                                                onClick={() => handleAssignClick(exception.id)}
                                                                size="small"
                                                                sx={{
                                                                    color: theme.palette.info.main,
                                                                    '&:hover': {
                                                                        backgroundColor: theme.palette.info.main + '10',
                                                                    },
                                                                }}
                                                            >
                                                                <UserPlusIcon />
                                                            </IconButton>
                                                        )}
                                                    </>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={filteredExceptions.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </CardContent>
            </Card>

            {/* Floating Action Button for Create Exception */}
            {onCreateException && (
                <Fab
                    color="primary"
                    aria-label="create exception"
                    onClick={onCreateException}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        background: gradients.primary,
                        '&:hover': {
                            background: gradients.primary,
                            transform: 'scale(1.1)',
                        },
                    }}
                >
                    <PlusIcon />
                </Fab>
            )}

            {/* Assignment Modal */}
            <Dialog open={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Assign Exception to Checker</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Select a checker to assign this exception to:
                    </Typography>
                    <List>
                        {assignableUsers.filter(user => user.role === 'checker' || user.role === 'admin').length === 0 ? (
                            <ListItem>
                                <ListItemText
                                    primary="No assignable users available"
                                    secondary="Only Checkers and Admins can be assigned exceptions"
                                />
                            </ListItem>
                        ) : (
                            assignableUsers.filter(user => user.role === 'checker' || user.role === 'admin').map(user => (
                                <ListItem key={user.id} disablePadding>
                                    <ListItemButton onClick={() => handleAssignException(user.id)}>
                                        <ListItemIcon>
                                            <UserIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={user.name}
                                            secondary={`${user.role} - ${user.email}`}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))
                        )}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowAssignModal(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}