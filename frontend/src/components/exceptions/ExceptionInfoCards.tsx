import React from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid2,
    useTheme
} from '@mui/material'
import {
    Info,
    Person,
    Assignment,
    CheckCircle,
    Schedule,
    Business,
    Description,
    CalendarToday,
    AccountCircle,
    AssignmentInd
} from '@mui/icons-material'
import type { Exception } from '../../types'
import { StatusBadge } from '../common/StatusBadge'

interface ExceptionInfoCardsProps {
    exception: Exception
}



const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set'

    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'Invalid date'

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch (error) {
        return 'Invalid date'
    }
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
            sx={{
                color: 'text.secondary',
                fontWeight: 500,
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
            }}
        >
            {icon}
            {label}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.primary' }}>
            {value}
        </Typography>
    </Box>
)

export const ExceptionInfoCards: React.FC<ExceptionInfoCardsProps> = ({
    exception
}) => {
    const theme = useTheme()

    // Safety check for exception data
    if (!exception) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                    Exception data not available
                </Typography>
            </Box>
        )
    }

    const cardStyles = {
        height: '100%',
        border: `1px solid ${theme.palette.grey[200]}`,
        borderRadius: 3,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
            borderColor: theme.palette.grey[300],
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-2px)',
        }
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3, lg: 4, xl: 5 } }}>
            <Grid2 container spacing={{ xs: 3, sm: 4, lg: 4, xl: 6 }}>
                {/* Exception Information Card */}
                <Grid2 size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
                    <Card elevation={0} sx={cardStyles}>
                        <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 3,
                                    gap: 1
                                }}
                            >
                                <Info color="primary" />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Exception Information
                                </Typography>
                            </Box>

                            <InfoItem
                                label="Exception ID"
                                value={`#${exception.id}`}
                                icon={<Description fontSize="small" />}
                            />

                            <InfoItem
                                label="Title"
                                value={exception.title || 'No title'}
                            />

                            <InfoItem
                                label="Type"
                                value={exception.type ? exception.type.replace('_', ' ') : 'Unknown'}
                            />

                            <InfoItem
                                label="Priority"
                                value={
                                    <StatusBadge
                                        status={exception.priority || 'MEDIUM'}
                                        type="priority"
                                        variant="outlined"
                                        showIcon={true}
                                        size="small"
                                        aria-label={`Priority level: ${exception.priority || 'MEDIUM'}`}
                                    />
                                }
                            />

                            <InfoItem
                                label="Status"
                                value={
                                    <StatusBadge
                                        status={exception.status}
                                        type="exception"
                                        variant="outlined"
                                        showIcon={true}
                                        size="small"
                                        aria-label={`Exception status: ${exception.status ? exception.status.replace('_', ' ') : 'Unknown'}`}
                                    />
                                }
                            />
                        </CardContent>
                    </Card>
                </Grid2>

                {/* Related Client Card */}
                <Grid2 size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
                    <Card elevation={0} sx={cardStyles}>
                        <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 3,
                                    gap: 1
                                }}
                            >
                                <Business color="primary" />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Related Client
                                </Typography>
                            </Box>

                            <InfoItem
                                label="Client Name"
                                value={exception.client_name || 'Unknown Client'}
                                icon={<AccountCircle fontSize="small" />}
                            />

                            <InfoItem
                                label="Client ID"
                                value={exception.client_id || 'N/A'}
                            />

                            <InfoItem
                                label="Related Review"
                                value={`Review #${exception.review_id}`}
                                icon={<Assignment fontSize="small" />}
                            />

                            {exception.review_status && (
                                <InfoItem
                                    label="Review Status"
                                    value={exception.review_status ? exception.review_status.replace('_', ' ') : 'Unknown'}
                                />
                            )}
                        </CardContent>
                    </Card>
                </Grid2>

                {/* Assignment & Timeline Card */}
                <Grid2 size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
                    <Card elevation={0} sx={cardStyles}>
                        <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 3,
                                    gap: 1
                                }}
                            >
                                <AssignmentInd color="primary" />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Assignment & Timeline
                                </Typography>
                            </Box>

                            <InfoItem
                                label="Created By"
                                value={exception.creator_name || `User ${exception.created_by}`}
                                icon={<Person fontSize="small" />}
                            />

                            <InfoItem
                                label="Created At"
                                value={formatDate(exception.created_at)}
                                icon={<CalendarToday fontSize="small" />}
                            />

                            <InfoItem
                                label="Assigned To"
                                value={
                                    exception.assigned_to ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Person fontSize="small" />
                                            {exception.assigned_to_name || exception.assigned_user_name || `User ${exception.assigned_to}`}
                                        </Box>
                                    ) : (
                                        <Box sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                            Unassigned
                                        </Box>
                                    )
                                }
                            />

                            {exception.due_date && (
                                <InfoItem
                                    label="Due Date"
                                    value={formatDate(exception.due_date)}
                                    icon={<Schedule fontSize="small" />}
                                />
                            )}
                        </CardContent>
                    </Card>
                </Grid2>

                {/* Resolution Card */}
                <Grid2 size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
                    <Card elevation={0} sx={cardStyles}>
                        <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 3,
                                    gap: 1
                                }}
                            >
                                <CheckCircle color="primary" />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Resolution
                                </Typography>
                            </Box>

                            {(exception.resolved_at || exception.status === 'resolved' || exception.status === 'closed') ? (
                                <>
                                    {exception.resolved_at && (
                                        <InfoItem
                                            label="Resolved At"
                                            value={formatDate(exception.resolved_at)}
                                            icon={<CalendarToday fontSize="small" />}
                                        />
                                    )}

                                    {!exception.resolved_at && (exception.status === 'resolved' || exception.status === 'closed') && (
                                        <InfoItem
                                            label="Status"
                                            value={
                                                <StatusBadge
                                                    status={exception.status}
                                                    type="exception"
                                                    variant="outlined"
                                                    showIcon={true}
                                                    size="small"
                                                    aria-label={`Exception status: ${exception.status}`}
                                                />
                                            }
                                            icon={<CheckCircle fontSize="small" />}
                                        />
                                    )}

                                    {exception.resolution_notes && (
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: 'text.secondary',
                                                    fontWeight: 500,
                                                    mb: 1
                                                }}
                                            >
                                                Resolution Notes
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: 'text.primary',
                                                    backgroundColor: theme.palette.grey[50],
                                                    p: 2,
                                                    borderRadius: 1,
                                                    border: `1px solid ${theme.palette.grey[200]}`
                                                }}
                                            >
                                                {exception.resolution_notes}
                                            </Typography>
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 4,
                                        textAlign: 'center'
                                    }}
                                >
                                    <Schedule
                                        sx={{
                                            fontSize: 48,
                                            color: 'text.secondary',
                                            mb: 2
                                        }}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                                    >
                                        Not yet resolved
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid2>

                {/* Description Section - Full Width */}
                <Grid2 size={{ xs: 12 }}>
                    <Card elevation={0} sx={cardStyles}>
                        <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 3,
                                    gap: 1
                                }}
                            >
                                <Description color="primary" />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Description
                                </Typography>
                            </Box>

                            <Typography
                                variant="body1"
                                sx={{
                                    color: 'text.primary',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {exception.description}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid2>
            </Grid2>
        </Box>
    )
}