import React, { useState, useEffect, useCallback } from 'react'
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Pagination,
    TextField,
    MenuItem,
    Grid2 as Grid,
    useTheme,
    alpha,
} from '@mui/material'
import {
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    Analytics as AnalyticsIcon,
    Visibility as ViewIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../services/apiClient'
import type { AuditLog, AuditFilters } from '../../services/apiClient'

interface FilterState extends AuditFilters {
    page: number
    per_page: number
    sort_by: string
    sort_order: 'asc' | 'desc'
}

export const AuditLogViewer: React.FC = () => {
    const { user } = useAuth()
    const theme = useTheme()
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [totalCount, setTotalCount] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
    const [showStats, setShowStats] = useState(false)
    const [showExport, setShowExport] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [entityTypeFilter, setEntityTypeFilter] = useState('')
    const [actionFilter, setActionFilter] = useState('')

    const [filters, setFilters] = useState<FilterState>({
        page: 1,
        per_page: 20,
        sort_by: 'created_at',
        sort_order: 'desc'
    })



    const fetchAuditLogs = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            // First test CORS
            try {
                const corsTest = await apiClient.testAuditCors()
                console.log('CORS test successful:', corsTest)
            } catch (corsErr) {
                console.error('CORS test failed:', corsErr)
            }

            // Try the simple endpoint first
            const { page, per_page } = filters
            const response = await apiClient.getAuditLogsSimple(page, per_page)

            if (response.error) {
                throw new Error(`Backend error: ${response.error}`)
            }

            console.log('Audit logs response:', response)
            setAuditLogs(response.audit_logs || [])
            setTotalCount(response.total || 0)
            setTotalPages(Math.ceil((response.total || 0) / per_page))
        } catch (err) {
            console.error('Audit API Error:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
            setAuditLogs([])
            setTotalCount(0)
            setTotalPages(1)
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => {
        fetchAuditLogs()
    }, [fetchAuditLogs])

    const handleFilterChange = (newFilters: Partial<FilterState>) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters,
            page: newFilters.page !== undefined ? newFilters.page : 1 // Reset to first page when filters change
        }))
    }

    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page }))
    }

    const handleSort = (field: string) => {
        setFilters(prev => ({
            ...prev,
            sort_by: field,
            sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc',
            page: 1
        }))
    }

    const handleLogSelect = (log: AuditLog) => {
        setSelectedLog(log)
    }

    const handleRefresh = () => {
        fetchAuditLogs()
    }

    const canExport = user?.role?.toLowerCase() === 'admin'

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATE': return 'success'
            case 'UPDATE': return 'warning'
            case 'DELETE': return 'error'
            case 'LOGIN': return 'info'
            case 'LOGOUT': return 'info'
            case 'SUBMIT': return 'primary'
            case 'APPROVE': return 'success'
            case 'REJECT': return 'error'
            case 'ASSIGN': return 'warning'
            case 'RESOLVE': return 'success'
            case 'ERROR': return 'error'
            case 'ACCESS': return 'info'
            default: return 'default'
        }
    }

    const getEntityTypeColor = (entityType: string) => {
        switch (entityType.toLowerCase()) {
            case 'review': return 'primary'
            case 'exception': return 'error'
            case 'client': return 'info'
            case 'user': return 'secondary'
            case 'document': return 'warning'
            case 'system': return 'default'
            case 'kyc_questionnaire': return 'info'
            case 'notification': return 'warning'
            default: return 'default'
        }
    }

    const filteredLogs = auditLogs.filter(log => {
        // Skip logs with errors (using type assertion for error handling)
        if ((log as any).error) {
            console.warn('Skipping malformed audit log:', log)
            return false
        }

        const matchesSearch = !searchTerm ||
            log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesEntityType = !entityTypeFilter || log.entity_type === entityTypeFilter
        const matchesAction = !actionFilter || log.action === actionFilter

        return matchesSearch && matchesEntityType && matchesAction
    })

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                    Audit Logs
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Comprehensive audit trail for compliance monitoring
                </Typography>
            </Box>

            {/* Actions Bar */}
            <Card elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.grey[200]}` }}>
                <CardContent sx={{ py: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                            <TextField
                                size="small"
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                                }}
                                sx={{ minWidth: 200 }}
                            />

                            <TextField
                                select
                                size="small"
                                label="Entity Type"
                                value={entityTypeFilter}
                                onChange={(e) => setEntityTypeFilter(e.target.value)}
                                sx={{ minWidth: 120 }}
                            >
                                <MenuItem value="">All Types</MenuItem>
                                <MenuItem value="Review">Review</MenuItem>
                                <MenuItem value="Exception">Exception</MenuItem>
                                <MenuItem value="Client">Client</MenuItem>
                                <MenuItem value="User">User</MenuItem>
                            </TextField>

                            <TextField
                                select
                                size="small"
                                label="Action"
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                sx={{ minWidth: 120 }}
                            >
                                <MenuItem value="">All Actions</MenuItem>
                                <MenuItem value="CREATE">Create</MenuItem>
                                <MenuItem value="UPDATE">Update</MenuItem>
                                <MenuItem value="DELETE">Delete</MenuItem>
                                <MenuItem value="VIEW">View</MenuItem>
                            </TextField>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1}>
                            <Button
                                variant="outlined"
                                startIcon={<AnalyticsIcon />}
                                onClick={() => setShowStats(!showStats)}
                                size="small"
                            >
                                {showStats ? 'Hide Stats' : 'Show Stats'}
                            </Button>

                            {canExport && (
                                <Button
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    onClick={() => setShowExport(!showExport)}
                                    size="small"
                                >
                                    Export
                                </Button>
                            )}

                            <Button
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                                onClick={handleRefresh}
                                disabled={loading}
                                size="small"
                            >
                                {loading ? 'Loading...' : 'Refresh'}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Stats Section */}
            {showStats && (
                <Card elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.grey[200]}` }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Audit Statistics
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 6, sm: 3 }}>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="primary" fontWeight="bold">
                                        {totalCount}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Logs
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6, sm: 3 }}>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="success.main" fontWeight="bold">
                                        {auditLogs.filter(log => log.action === 'CREATE').length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Creates
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6, sm: 3 }}>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                                        {auditLogs.filter(log => log.action === 'UPDATE').length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Updates
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6, sm: 3 }}>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="info.main" fontWeight="bold">
                                        {auditLogs.filter(log => log.action === 'VIEW').length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Views
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Error Alert */}
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 3 }}
                    action={
                        <Button color="inherit" size="small" onClick={handleRefresh}>
                            Retry
                        </Button>
                    }
                >
                    {error}
                </Alert>
            )}

            {/* Results Info */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    Showing {filteredLogs.length} of {totalCount} audit logs
                    {filters.page > 1 && ` (Page ${filters.page} of ${totalPages})`}
                </Typography>
            </Box>

            {/* Audit Logs Table */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>
                                <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Entity Type</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Entity ID</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={40} />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                            Loading audit logs...
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No audit logs found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} hover>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {log.created_at ? format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss') : 'Unknown Date'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>
                                                {log.user_name || 'Unknown User'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={log.action || 'Unknown'}
                                                color={getActionColor(log.action || '') as any}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={log.entity_type || 'Unknown'}
                                                color={getEntityTypeColor(log.entity_type || '') as any}
                                                size="small"
                                                variant="filled"
                                                sx={{
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                    color: theme.palette.primary.main
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {log.entity_id || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {log.details ? Object.keys(log.details).length : 0} properties
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => setSelectedLog(log)}
                                                sx={{ color: 'primary.main' }}
                                            >
                                                <ViewIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                {totalPages > 1 && (
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                        <Pagination
                            count={totalPages}
                            page={filters.page}
                            onChange={(_, page) => handlePageChange(page)}
                            color="primary"
                            disabled={loading}
                        />
                    </Box>
                )}
            </Card>

            {/* Log Detail Dialog */}
            {selectedLog && (
                <Card
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: { xs: '90%', sm: '80%', md: '60%' },
                        maxHeight: '80vh',
                        overflow: 'auto',
                        zIndex: 1300,
                    }}
                >
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">
                                Audit Log Details
                            </Typography>
                            <Button onClick={() => setSelectedLog(null)}>
                                Close
                            </Button>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Timestamp
                                </Typography>
                                <Typography variant="body2">
                                    {format(new Date(selectedLog.created_at), 'PPpp')}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    User
                                </Typography>
                                <Typography variant="body2">
                                    {selectedLog.user_name || 'Unknown User'}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Action
                                </Typography>
                                <Chip
                                    label={selectedLog.action}
                                    color={getActionColor(selectedLog.action) as any}
                                    size="small"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Entity
                                </Typography>
                                <Typography variant="body2">
                                    {selectedLog.entity_type} ({selectedLog.entity_id})
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Details
                                </Typography>
                                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                                    <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                                        {JSON.stringify(selectedLog.details || {}, null, 2)}
                                    </pre>
                                </Paper>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Backdrop for modal */}
            {selectedLog && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 1200,
                    }}
                    onClick={() => setSelectedLog(null)}
                />
            )}
        </Box>
    )
}