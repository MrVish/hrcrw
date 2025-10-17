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
    Tabs,
    Tab,
} from '@mui/material'
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Visibility as EyeIcon,
    Edit as EditIcon,
    CalendarToday as CalendarIcon,
    Person as UserIcon,
    Schedule as ClockIcon,
    CheckCircle,
    Cancel as XCircleIcon,
    Assignment as FileTextIcon,
    Warning as AlertTriangleIcon,
    Add as PlusIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material'
import { apiClient } from '../../services'
import { useAuth } from '../../contexts'
import type { ReviewDetail } from '../../types'
import { gradients } from '../../theme'

// Use ReviewDetail which includes client_name and other extended fields
type Review = ReviewDetail

interface ReviewFilters {
    search: string
    status: string
    client_risk_level: string
    date_range: string
}

interface ReviewListProps {
    onReviewSelect?: (review: Review) => void
    onCreateReview?: () => void
    className?: string
}

const getStatusIcon = (status: string, theme: any) => {
    switch (status.toLowerCase()) {
        case 'draft':
            return <FileTextIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
        case 'submitted':
            return <ClockIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />
        case 'under review':
        case 'under_review':
            return <EyeIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
        case 'approved':
            return <CheckCircle sx={{ fontSize: 16, color: theme.palette.success.main }} />
        case 'rejected':
            return <XCircleIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
        default:
            return <FileTextIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
    }
}

const getStatusColor = (status: string, theme: any) => {
    switch (status.toLowerCase()) {
        case 'draft':
            return theme.palette.grey[500]
        case 'submitted':
            return theme.palette.info.main
        case 'under review':
        case 'under_review':
            return theme.palette.warning.main
        case 'approved':
            return theme.palette.success.main
        case 'rejected':
            return theme.palette.error.main
        default:
            return theme.palette.grey[500]
    }
}

const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
        return 'Today'
    } else if (diffDays === 2) {
        return 'Yesterday'
    } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        })
    }
}

export const ReviewList: React.FC<ReviewListProps> = ({
    onReviewSelect,
    onCreateReview,
    className = ''
}) => {
    const { user } = useAuth()
    const theme = useTheme()
    const [reviews, setReviews] = useState<Review[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<ReviewFilters>({
        search: '',
        status: '',
        client_risk_level: '',
        date_range: ''
    })
    const [showFilters, setShowFilters] = useState(false)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        fetchReviews()
    }, [])

    const fetchReviews = async () => {
        try {
            setLoading(true)
            const response = await apiClient.getReviews()

            // Use the API response directly since it now matches our types
            const transformedReviews = response.reviews.map((review: any) => ({
                ...review,
                status: review.status?.toUpperCase() || 'DRAFT', // Ensure status is uppercase
                client_name: review.client_name || 'Unknown Client',
                client_risk_level: review.client_risk_level || 'MEDIUM',
                submitter_name: review.submitter_name || 'Unknown User',
                reviewer_name: review.reviewer_name || null,
                document_count: review.document_count || 0,
                exception_count: review.exception_count || 0,
            }))

            setReviews(transformedReviews)
            setError(null)
        } catch (err) {
            setError('Failed to load reviews')
            console.error('Reviews fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleFilterChange = (key: keyof ReviewFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setPage(0)
    }

    const clearFilters = () => {
        setFilters({
            search: '',
            status: '',
            client_risk_level: '',
            date_range: ''
        })
        setStatusFilter('all')
        setPage(0)
    }

    const handleReviewClick = (review: Review) => {
        if (onReviewSelect) {
            onReviewSelect(review)
        }
    }

    const canEditReview = (review: Review) => {
        return review.status === 'DRAFT' && review.submitted_by === user?.id
    }

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    // Filter reviews based on current filters
    const filteredReviews = reviews.filter(review => {
        const matchesSearch = !filters.search ||
            (review.client_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            review.client_id.toLowerCase().includes(filters.search.toLowerCase()) ||
            review.id.toString().includes(filters.search.toLowerCase())

        const matchesStatus = statusFilter === 'all' || review.status.toLowerCase() === statusFilter.toLowerCase()
        const matchesRiskLevel = !filters.client_risk_level || review.client_risk_level === filters.client_risk_level

        return matchesSearch && matchesStatus && matchesRiskLevel
    })

    // Get paginated data
    const paginatedReviews = filteredReviews.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    )

    // Status counts for tabs
    const statusCounts = {
        all: reviews.length,
        draft: reviews.filter(r => r.status === 'DRAFT').length,
        submitted: reviews.filter(r => r.status === 'SUBMITTED').length,
        under_review: reviews.filter(r => r.status === 'UNDER_REVIEW').length,
        approved: reviews.filter(r => r.status === 'APPROVED').length,
        rejected: reviews.filter(r => r.status === 'REJECTED').length
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={60} />
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
                        onClick={fetchReviews}
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

    return (
        <Box className={className} sx={{ width: '100%' }}>
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                    {/* Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                Reviews
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {filteredReviews.length} of {reviews.length} reviews
                            </Typography>
                        </Box>
                        <Box display="flex" gap={2}>
                            {onCreateReview && (
                                <Button
                                    variant="contained"
                                    startIcon={<PlusIcon />}
                                    onClick={onCreateReview}
                                    sx={{
                                        background: gradients.primary,
                                        '&:hover': {
                                            background: gradients.primary,
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                                        },
                                    }}
                                >
                                    New Review
                                </Button>
                            )}
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
                        </Box>
                    </Box>

                    {/* Status Tabs */}
                    <Box mb={3}>
                        <Tabs
                            value={statusFilter}
                            onChange={(e, newValue) => setStatusFilter(newValue)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            <Tab label={`All (${statusCounts.all})`} value="all" />
                            <Tab label={`Draft (${statusCounts.draft})`} value="draft" />
                            <Tab label={`Submitted (${statusCounts.submitted})`} value="submitted" />
                            <Tab label={`Under Review (${statusCounts.under_review})`} value="under_review" />
                            <Tab label={`Approved (${statusCounts.approved})`} value="approved" />
                            <Tab label={`Rejected (${statusCounts.rejected})`} value="rejected" />
                        </Tabs>
                    </Box>

                    {/* Search */}
                    <Box mb={2}>
                        <TextField
                            fullWidth
                            placeholder="Search by client name, ID, or review number..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ maxWidth: 400 }}
                        />
                    </Box>

                    {/* Advanced Filters */}
                    {showFilters && (
                        <Box mb={3} p={2} sx={{ backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
                            <Grid container spacing={2} alignItems="end">
                                <Grid item xs={12} sm={6} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Risk Level</InputLabel>
                                        <Select
                                            value={filters.client_risk_level}
                                            label="Risk Level"
                                            onChange={(e) => handleFilterChange('client_risk_level', e.target.value)}
                                        >
                                            <MenuItem value="">All Risk Levels</MenuItem>
                                            <MenuItem value="HIGH">High</MenuItem>
                                            <MenuItem value="MEDIUM">Medium</MenuItem>
                                            <MenuItem value="LOW">Low</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Date Range</InputLabel>
                                        <Select
                                            value={filters.date_range}
                                            label="Date Range"
                                            onChange={(e) => handleFilterChange('date_range', e.target.value)}
                                        >
                                            <MenuItem value="">All Time</MenuItem>
                                            <MenuItem value="today">Today</MenuItem>
                                            <MenuItem value="week">Last 7 Days</MenuItem>
                                            <MenuItem value="month">This Month</MenuItem>
                                            <MenuItem value="quarter">This Quarter</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
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
                    )}

                    {/* Table */}
                    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                                    <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Documents</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Submitted By</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Updated</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedReviews.map((review) => (
                                    <TableRow
                                        key={review.id}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: theme.palette.grey[50],
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                #{review.id}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {review.client_name}
                                                </Typography>
                                                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {review.client_id}
                                                    </Typography>
                                                    <Chip
                                                        label={review.client_risk_level || 'Medium'}
                                                        size="small"
                                                        sx={{
                                                            height: 16,
                                                            fontSize: '0.6875rem',
                                                            backgroundColor: review.client_risk_level === 'HIGH' ? theme.palette.error.main :
                                                                review.client_risk_level === 'MEDIUM' ? theme.palette.warning.main :
                                                                    theme.palette.success.main,
                                                            color: 'white',
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getStatusIcon(review.status, theme)}
                                                label={review.status.replace('_', ' ')}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    borderColor: getStatusColor(review.status, theme),
                                                    color: getStatusColor(review.status, theme),
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <FileTextIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                                <Typography variant="body2">
                                                    {review.document_count || 0}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <UserIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                                <Typography variant="body2">
                                                    {review.submitter_name || `User ${review.submitted_by}`}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <CalendarIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                                <Typography variant="body2">
                                                    {formatDateShort(review.created_at)}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <CalendarIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                                <Typography variant="body2">
                                                    {formatDateShort(review.updated_at)}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" gap={1}>
                                                <IconButton
                                                    onClick={() => handleReviewClick(review)}
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
                                                {canEditReview(review) && (
                                                    <IconButton
                                                        onClick={() => handleReviewClick(review)}
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
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Empty State */}
                    {paginatedReviews.length === 0 && (
                        <Box
                            sx={{
                                p: 4,
                                textAlign: 'center',
                                color: theme.palette.grey[500],
                            }}
                        >
                            <FileTextIcon sx={{ fontSize: 64, mb: 2, color: theme.palette.grey[300] }} />
                            <Typography variant="h6" gutterBottom>
                                No reviews found
                            </Typography>
                            <Typography variant="body2" mb={2}>
                                Try adjusting your search criteria or filters
                            </Typography>
                            {onCreateReview && (
                                <Button
                                    variant="contained"
                                    startIcon={<PlusIcon />}
                                    onClick={onCreateReview}
                                    sx={{
                                        background: gradients.primary,
                                        '&:hover': {
                                            background: gradients.primary,
                                        },
                                    }}
                                >
                                    Create First Review
                                </Button>
                            )}
                        </Box>
                    )}

                    {/* Pagination */}
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={filteredReviews.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </CardContent>
            </Card>
        </Box>
    )
}