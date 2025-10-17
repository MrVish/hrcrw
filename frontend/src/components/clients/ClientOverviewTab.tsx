import React from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid2,
    TextField,
    Select,
    MenuItem,
    FormControl,
    Stack,
    Divider,
    useTheme,
    FormControlLabel,
    Checkbox,
    Alert,
} from '@mui/material'
import {
    Person,
    LocationOn,
    Business,
    AccountBalance,
    Security,
    Schedule,
    Update,
    AutoMode,
    Gavel,
    Assessment,
} from '@mui/icons-material'
import { StatusBadge } from '../common/StatusBadge'
import type { Client } from '../../types'

interface ClientOverviewTabProps {
    client: Client
    isEditing: boolean
    editForm: Partial<Client>
    validationErrors: Record<string, string>
    onFormChange: (field: keyof Client, value: any) => void
}

interface InfoItemProps {
    label: string
    value: React.ReactNode
    icon?: React.ReactNode
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, icon }) => (
    <Box sx={{ mb: 2 }}>
        <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 0.5, fontWeight: 500 }}
        >
            {label}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
            {icon && (
                <Box sx={{ color: 'text.secondary', display: 'flex' }}>
                    {icon}
                </Box>
            )}
            <Box>{value}</Box>
        </Stack>
    </Box>
)

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const formatDateShort = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export const ClientOverviewTab: React.FC<ClientOverviewTabProps> = ({
    client,
    isEditing,
    editForm,
    validationErrors,
    onFormChange,
}) => {
    const theme = useTheme()

    const cardStyle = {
        height: '100%',
        border: `1px solid ${theme.palette.grey[200]}`,
        borderRadius: 3,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
            borderColor: theme.palette.grey[300],
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-2px)',
        },
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3, lg: 4, xl: 5 } }}>
            <Grid2 container spacing={{ xs: 3, sm: 4, lg: 4, xl: 6 }}>
                {/* Basic Information Card */}
                <Grid2 size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                    <Card elevation={0} sx={cardStyle}>
                        <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                                <Person color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    Basic Information
                                </Typography>
                            </Stack>

                            <InfoItem
                                label="Client ID"
                                value={
                                    <Typography variant="body1" fontWeight={500}>
                                        {client.client_id}
                                    </Typography>
                                }
                            />

                            <InfoItem
                                label="Name"
                                value={
                                    isEditing ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={editForm.name || ''}
                                            onChange={(e) => onFormChange('name', e.target.value)}
                                            error={!!validationErrors.name}
                                            helperText={validationErrors.name}
                                            placeholder="Enter client name"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: theme.palette.primary.main,
                                                        },
                                                    },
                                                    '&.Mui-focused': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderWidth: '2px',
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    ) : (
                                        <Typography variant="body1">
                                            {client.name}
                                        </Typography>
                                    )
                                }
                            />

                            <InfoItem
                                label="Risk Level"
                                value={
                                    isEditing ? (
                                        <FormControl fullWidth size="small" error={!!validationErrors.risk_level}>
                                            <Select
                                                value={editForm.risk_level || ''}
                                                onChange={(e) => onFormChange('risk_level', e.target.value)}
                                                displayEmpty
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        transition: 'all 0.2s ease-in-out',
                                                        '&:hover': {
                                                            '& .MuiOutlinedInput-notchedOutline': {
                                                                borderColor: theme.palette.primary.main,
                                                            },
                                                        },
                                                    },
                                                }}
                                            >
                                                <MenuItem value="" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Select risk level
                                                </MenuItem>
                                                <MenuItem value="LOW" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Low
                                                </MenuItem>
                                                <MenuItem value="MEDIUM" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Medium
                                                </MenuItem>
                                                <MenuItem value="HIGH" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    High
                                                </MenuItem>
                                            </Select>
                                            {validationErrors.risk_level && (
                                                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                                    {validationErrors.risk_level}
                                                </Typography>
                                            )}
                                        </FormControl>
                                    ) : (
                                        <StatusBadge
                                            status={client.risk_level}
                                            type="risk"
                                            variant="outlined"
                                            showIcon={true}
                                            aria-label={`Risk level: ${client.risk_level}`}
                                        />
                                    )
                                }
                            />

                            <InfoItem
                                label="Status"
                                value={
                                    isEditing ? (
                                        <FormControl fullWidth size="small" error={!!validationErrors.status}>
                                            <Select
                                                value={editForm.status || ''}
                                                onChange={(e) => onFormChange('status', e.target.value)}
                                                displayEmpty
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        transition: 'all 0.2s ease-in-out',
                                                        '&:hover': {
                                                            '& .MuiOutlinedInput-notchedOutline': {
                                                                borderColor: theme.palette.primary.main,
                                                            },
                                                        },
                                                    },
                                                }}
                                            >
                                                <MenuItem value="" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Select status
                                                </MenuItem>
                                                <MenuItem value="ACTIVE" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Active
                                                </MenuItem>
                                                <MenuItem value="INACTIVE" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Inactive
                                                </MenuItem>
                                                <MenuItem value="SUSPENDED" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Suspended
                                                </MenuItem>
                                                <MenuItem value="UNDER_REVIEW" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Under Review
                                                </MenuItem>
                                            </Select>
                                            {validationErrors.status && (
                                                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                                    {validationErrors.status}
                                                </Typography>
                                            )}
                                        </FormControl>
                                    ) : (
                                        <StatusBadge
                                            status={client.status}
                                            type="client"
                                            variant="outlined"
                                            showIcon={true}
                                            aria-label={`Client status: ${client.status}`}
                                        />
                                    )
                                }
                            />

                            <InfoItem
                                label="Country"
                                icon={<LocationOn fontSize="small" />}
                                value={
                                    isEditing ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={editForm.country || ''}
                                            onChange={(e) => onFormChange('country', e.target.value)}
                                            error={!!validationErrors.country}
                                            helperText={validationErrors.country}
                                            placeholder="Enter country"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: theme.palette.primary.main,
                                                        },
                                                    },
                                                    '&.Mui-focused': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderWidth: '2px',
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    ) : (
                                        <Typography variant="body1">
                                            {client.country}
                                        </Typography>
                                    )
                                }
                            />

                            <InfoItem
                                label="Last Review"
                                icon={<Schedule fontSize="small" />}
                                value={
                                    <Typography variant="body1">
                                        {formatDateShort(client.last_review_date)}
                                    </Typography>
                                }
                            />
                        </CardContent>
                    </Card>
                </Grid2>

                {/* Enhanced Information Card */}
                <Grid2 size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                    <Card elevation={0} sx={cardStyle}>
                        <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                                <Business color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    Enhanced Information
                                </Typography>
                            </Stack>

                            <InfoItem
                                label="Domicile Branch"
                                icon={<AccountBalance fontSize="small" />}
                                value={
                                    isEditing ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={editForm.domicile_branch || ''}
                                            onChange={(e) => onFormChange('domicile_branch', e.target.value)}
                                            error={!!validationErrors.domicile_branch}
                                            helperText={validationErrors.domicile_branch}
                                            placeholder="Enter domicile branch (optional)"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: theme.palette.primary.main,
                                                        },
                                                    },
                                                    '&.Mui-focused': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderWidth: '2px',
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    ) : (
                                        <Typography variant="body1">
                                            {client.domicile_branch || 'Not specified'}
                                        </Typography>
                                    )
                                }
                            />

                            <InfoItem
                                label="Relationship Manager"
                                icon={<Person fontSize="small" />}
                                value={
                                    isEditing ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={editForm.relationship_manager || ''}
                                            onChange={(e) => onFormChange('relationship_manager', e.target.value)}
                                            error={!!validationErrors.relationship_manager}
                                            helperText={validationErrors.relationship_manager}
                                            placeholder="Enter relationship manager (optional)"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: theme.palette.primary.main,
                                                        },
                                                    },
                                                    '&.Mui-focused': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderWidth: '2px',
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    ) : (
                                        <Typography variant="body1">
                                            {client.relationship_manager || 'Not assigned'}
                                        </Typography>
                                    )
                                }
                            />

                            <InfoItem
                                label="Business Unit"
                                icon={<Business fontSize="small" />}
                                value={
                                    isEditing ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={editForm.business_unit || ''}
                                            onChange={(e) => onFormChange('business_unit', e.target.value)}
                                            error={!!validationErrors.business_unit}
                                            helperText={validationErrors.business_unit}
                                            placeholder="Enter business unit (optional)"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: theme.palette.primary.main,
                                                        },
                                                    },
                                                    '&.Mui-focused': {
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderWidth: '2px',
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    ) : (
                                        <Typography variant="body1">
                                            {client.business_unit || 'Not specified'}
                                        </Typography>
                                    )
                                }
                            />

                            <InfoItem
                                label="AML Risk Level"
                                icon={<Security fontSize="small" />}
                                value={
                                    isEditing ? (
                                        <FormControl fullWidth size="small">
                                            <Select
                                                value={editForm.aml_risk || ''}
                                                onChange={(e) => onFormChange('aml_risk', e.target.value || null)}
                                                displayEmpty
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        transition: 'all 0.2s ease-in-out',
                                                        '&:hover': {
                                                            '& .MuiOutlinedInput-notchedOutline': {
                                                                borderColor: theme.palette.primary.main,
                                                            },
                                                        },
                                                    },
                                                }}
                                            >
                                                <MenuItem value="" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Select AML risk level (optional)
                                                </MenuItem>
                                                <MenuItem value="LOW" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Low
                                                </MenuItem>
                                                <MenuItem value="MEDIUM" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Medium
                                                </MenuItem>
                                                <MenuItem value="HIGH" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    High
                                                </MenuItem>
                                                <MenuItem value="VERY_HIGH" sx={{ '&:hover': { backgroundColor: theme.palette.primary.main + '10' } }}>
                                                    Very High
                                                </MenuItem>
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        client.aml_risk ? (
                                            <StatusBadge
                                                status={client.aml_risk}
                                                type="risk"
                                                variant="outlined"
                                                showIcon={true}
                                                aria-label={`AML risk level: ${client.aml_risk}`}
                                            />
                                        ) : (
                                            <Typography variant="body1" color="text.secondary">
                                                Not assessed
                                            </Typography>
                                        )
                                    )
                                }
                            />
                        </CardContent>
                    </Card>
                </Grid2>

                {/* Auto-Review Configuration Card */}
                <Grid2 size={{ xs: 12, sm: 12, md: 12, lg: 4 }}>
                    <Card elevation={0} sx={cardStyle}>
                        <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                                <AutoMode color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    Auto-Review Configuration
                                </Typography>
                            </Stack>

                            {!client.is_high_risk && (
                                <Alert severity="info" sx={{ mb: 3 }}>
                                    Auto-reviews are only available for high-risk clients
                                </Alert>
                            )}

                            <Box sx={{ mb: 2 }}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 1, fontWeight: 500 }}
                                >
                                    Enabled Auto-Review Types
                                </Typography>

                                {isEditing && client.is_high_risk ? (
                                    <Stack spacing={1}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={editForm.auto_kyc_review || false}
                                                    onChange={(e) => onFormChange('auto_kyc_review', e.target.checked)}
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Security fontSize="small" />
                                                    <Typography variant="body2">KYC Reviews</Typography>
                                                </Stack>
                                            }
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={editForm.auto_aml_review || false}
                                                    onChange={(e) => onFormChange('auto_aml_review', e.target.checked)}
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <AccountBalance fontSize="small" />
                                                    <Typography variant="body2">AML Reviews</Typography>
                                                </Stack>
                                            }
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={editForm.auto_sanctions_review || false}
                                                    onChange={(e) => onFormChange('auto_sanctions_review', e.target.checked)}
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Gavel fontSize="small" />
                                                    <Typography variant="body2">Sanctions Reviews</Typography>
                                                </Stack>
                                            }
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={editForm.auto_pep_review || false}
                                                    onChange={(e) => onFormChange('auto_pep_review', e.target.checked)}
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Person fontSize="small" />
                                                    <Typography variant="body2">PEP Reviews</Typography>
                                                </Stack>
                                            }
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={editForm.auto_financial_review || false}
                                                    onChange={(e) => onFormChange('auto_financial_review', e.target.checked)}
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Assessment fontSize="small" />
                                                    <Typography variant="body2">Financial Reviews</Typography>
                                                </Stack>
                                            }
                                        />
                                    </Stack>
                                ) : (
                                    <Box>
                                        {client.has_auto_review_flags ? (
                                            <Stack spacing={1}>
                                                {client.auto_kyc_review && (
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Security fontSize="small" color="primary" />
                                                        <Typography variant="body2">KYC Reviews</Typography>
                                                    </Stack>
                                                )}
                                                {client.auto_aml_review && (
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <AccountBalance fontSize="small" color="primary" />
                                                        <Typography variant="body2">AML Reviews</Typography>
                                                    </Stack>
                                                )}
                                                {client.auto_sanctions_review && (
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Gavel fontSize="small" color="primary" />
                                                        <Typography variant="body2">Sanctions Reviews</Typography>
                                                    </Stack>
                                                )}
                                                {client.auto_pep_review && (
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Person fontSize="small" color="primary" />
                                                        <Typography variant="body2">PEP Reviews</Typography>
                                                    </Stack>
                                                )}
                                                {client.auto_financial_review && (
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Assessment fontSize="small" color="primary" />
                                                        <Typography variant="body2">Financial Reviews</Typography>
                                                    </Stack>
                                                )}
                                            </Stack>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {client.is_high_risk ? 'No auto-reviews configured' : 'Not available for this risk level'}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Box>

                            {client.is_high_risk && (
                                <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Auto-reviews will be created automatically when enabled for high-risk clients
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid2>

                {/* System Information Card */}
                <Grid2 size={{ xs: 12, sm: 12, md: 12, lg: 4 }}>
                    <Card elevation={0} sx={cardStyle}>
                        <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                                <Update color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    System Information
                                </Typography>
                            </Stack>

                            <InfoItem
                                label="Created"
                                value={
                                    <Typography variant="body1">
                                        {formatDate(client.created_at)}
                                    </Typography>
                                }
                            />

                            <InfoItem
                                label="Last Updated"
                                value={
                                    <Typography variant="body1">
                                        {formatDate(client.updated_at)}
                                    </Typography>
                                }
                            />

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    System information is read-only
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid2>
            </Grid2>
        </Box>
    )
}

export default ClientOverviewTab