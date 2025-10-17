import React, { useState } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    InputAdornment,
    Button,
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
} from '@mui/material'
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Visibility as EyeIcon,
    CalendarToday as CalendarIcon,
    LocationOn as MapPinIcon,
    Refresh as RefreshIcon,
    AutoMode as AutoModeIcon,
    Security as SecurityIcon,
    AccountBalance as AccountBalanceIcon,
    Gavel as GavelIcon,
    Person as PersonIcon,
    Assessment as AssessmentIcon,
} from '@mui/icons-material'
import { useClients } from '../../hooks/useClients'
import { StatusBadge } from '../common/StatusBadge'
import type { Client } from '../../types'

interface ClientFilters {
    search: string
    risk_level: string
    country: string
    status: string
}

interface ClientListProps {
    onClientSelect?: (client: Client) => void
    className?: string
}

const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export const ClientList: React.FC<ClientListProps> = ({ onClientSelect, className = '' }) => {
    const {
        clients,
        total,
        loading,
        error,
        filters: clientFilters,
        pagination,
        setFilters: setClientFilters,
        setPage: setClientPage,
        refreshClients,
    } = useClients()

    const [localFilters, setLocalFilters] = useState<ClientFilters>({
        search: clientFilters.search || '',
        risk_level: clientFilters.risk_level || '',
        country: clientFilters.country || '',
        status: clientFilters.status || '',
    })
    const [showFilters, setShowFilters] = useState(false)
    const [countries, setCountries] = useState<string[]>([])
    const theme = useTheme()

    // Extract unique countries from clients for filter dropdown
    React.useEffect(() => {
        if (clients.length > 0) {
            const uniqueCountries = [...new Set(clients.map(client => client.country))]
            setCountries(uniqueCountries.sort())
        }
    }, [clients])

    const handleFilterChange = (key: keyof ClientFilters, value: string) => {
        const newFilters = { ...localFilters, [key]: value }
        setLocalFilters(newFilters)

        // Apply filters to the global state
        setClientFilters({
            search: newFilters.search || undefined,
            risk_level: newFilters.risk_level as Client['risk_level'] || undefined,
            country: newFilters.country || undefined,
            status: newFilters.status as Client['status'] || undefined,
        })
    }

    const clearFilters = () => {
        const clearedFilters = {
            search: '',
            risk_level: '',
            country: '',
            status: '',
        }
        setLocalFilters(clearedFilters)
        setClientFilters({})
    }

    const handleClientClick = (client: Client) => {
        if (onClientSelect) {
            onClientSelect(client)
        }
    }

    const handleChangePage = (_event: unknown, newPage: number) => {
        setClientPage(newPage + 1) // API uses 1-based pagination
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        // Note: This would require updating the useClients hook to support page size changes
        // For now, we'll keep the current page size
        console.log('Page size change requested:', event.target.value)
    }

    // Get review count for a client from the API response
    const getReviewCount = (client: Client) => {
        return client.review_count || 0
    }

    // Get auto-review flag icons
    const getAutoReviewIcons = (client: Client) => {
        const icons = []
        const iconStyle = { fontSize: 16, color: theme.palette.primary.main }

        if (client.auto_kyc_review) {
            icons.push(<SecurityIcon key="kyc" sx={iconStyle} titleAccess="Auto KYC Review" />)
        }
        if (client.auto_aml_review) {
            icons.push(<AccountBalanceIcon key="aml" sx={iconStyle} titleAccess="Auto AML Review" />)
        }
        if (client.auto_sanctions_review) {
            icons.push(<GavelIcon key="sanctions" sx={iconStyle} titleAccess="Auto Sanctions Review" />)
        }
        if (client.auto_pep_review) {
            icons.push(<PersonIcon key="pep" sx={iconStyle} titleAccess="Auto PEP Review" />)
        }
        if (client.auto_financial_review) {
            icons.push(<AssessmentIcon key="financial" sx={iconStyle} titleAccess="Auto Financial Review" />)
        }

        return icons
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
                        onClick={refreshClients}
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
        <Box className={className}>
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                <CardContent sx={{ p: 3 }}>
                    {/* Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                Clients
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {total} clients total
                            </Typography>
                        </Box>
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

                    {/* Search */}
                    <Box mb={2}>
                        <TextField
                            fullWidth
                            placeholder="Search by client name or ID..."
                            value={localFilters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                            sx={{ maxWidth: 400 }}
                        />
                    </Box>

                    {/* Filters */}
                    <Collapse in={showFilters}>
                        <Box mb={3} p={2} sx={{ backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
                            <Grid container spacing={2} alignItems="end">
                                <Grid item xs={12} sm={6} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Risk Level</InputLabel>
                                        <Select
                                            value={localFilters.risk_level}
                                            label="Risk Level"
                                            onChange={(e) => handleFilterChange('risk_level', e.target.value)}
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
                                        <InputLabel>Country</InputLabel>
                                        <Select
                                            value={localFilters.country}
                                            label="Country"
                                            onChange={(e) => handleFilterChange('country', e.target.value)}
                                        >
                                            <MenuItem value="">All Countries</MenuItem>
                                            {countries.map(country => (
                                                <MenuItem key={country} value={country}>{country}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            value={localFilters.status}
                                            label="Status"
                                            onChange={(e) => handleFilterChange('status', e.target.value)}
                                        >
                                            <MenuItem value="">All Statuses</MenuItem>
                                            <MenuItem value="ACTIVE">Active</MenuItem>
                                            <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                                            <MenuItem value="INACTIVE">Inactive</MenuItem>
                                            <MenuItem value="SUSPENDED">Suspended</MenuItem>
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
                    </Collapse>

                    {/* Table */}
                    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Risk Level</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Auto Reviews</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Last Review</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Reviews</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {clients.map((client) => (
                                    <TableRow
                                        key={client.client_id}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: theme.palette.grey[50],
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {client.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {client.client_id}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={client.risk_level}
                                                type="risk"
                                                variant="outlined"
                                                showIcon={true}
                                                aria-label={`Risk level: ${client.risk_level}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <MapPinIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                                <Typography variant="body2">{client.country}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={client.status}
                                                type="client"
                                                variant="outlined"
                                                showIcon={true}
                                                aria-label={`Status: ${client.status}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                {client.has_auto_review_flags ? (
                                                    <>
                                                        <AutoModeIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                                                        {getAutoReviewIcons(client)}
                                                    </>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Manual
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <CalendarIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                                <Typography variant="body2">
                                                    {formatDate(client.last_review_date)}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {getReviewCount(client)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    reviews
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                onClick={() => handleClientClick(client)}
                                                size="small"
                                                sx={{
                                                    color: theme.palette.primary.main,
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.primary.main + '10',
                                                    },
                                                }}
                                                aria-label={`View details for ${client.name}`}
                                            >
                                                <EyeIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    <TablePagination
                        rowsPerPageOptions={[pagination.size]}
                        component="div"
                        count={total}
                        rowsPerPage={pagination.size}
                        page={pagination.page - 1} // Convert to 0-based for MUI
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </CardContent>
            </Card>
        </Box>
    )
}