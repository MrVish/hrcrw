import React from 'react'
import {
    Box,
    Typography,
    Button,
    Breadcrumbs,
    Link,
    Stack
} from '@mui/material'
import {
    ArrowBack,
    Edit,
    Update
} from '@mui/icons-material'
import type { Exception } from '../../types'
import { gradients } from '../../theme'
import { StatusBadge } from '../common/StatusBadge'

interface ExceptionDetailHeaderProps {
    exception: Exception
    canEdit: boolean
    canUpdateStatus: boolean
    onBack: () => void
    onEdit?: () => void
    onUpdateStatus?: () => void
}



export const ExceptionDetailHeader: React.FC<ExceptionDetailHeaderProps> = ({
    exception,
    canEdit,
    canUpdateStatus,
    onBack,
    onEdit,
    onUpdateStatus
}) => {

    return (
        <Box
            sx={{
                background: gradients.primary,
                color: 'white',
                p: { xs: 3, sm: 4, lg: 5, xl: 6 },
                borderRadius: 3,
                mb: 4,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 0,
                }
            }}
            role="banner"
        >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                {/* Breadcrumb Navigation */}
                <Breadcrumbs
                    aria-label="Exception navigation breadcrumb"
                    sx={{
                        mb: 2,
                        '& .MuiBreadcrumbs-separator': {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }}
                >
                    <Link
                        component="button"
                        variant="body2"
                        onClick={onBack}
                        aria-label="Go back to exceptions list"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': {
                                color: 'white',
                                textDecoration: 'underline'
                            }
                        }}
                    >
                        <ArrowBack fontSize="small" />
                        Exceptions
                    </Link>
                    <Typography
                        variant="body2"
                        sx={{ color: 'white', fontWeight: 500 }}
                        aria-current="page"
                    >
                        Exception #{exception.id}
                    </Typography>
                </Breadcrumbs>

                {/* Header Content */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { xs: 'flex-start', md: 'center' },
                        justifyContent: 'space-between',
                        gap: 3
                    }}
                >
                    {/* Exception Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="h4"
                            component="h1"
                            id="exception-detail-heading"
                            sx={{
                                fontWeight: 'bold',
                                mb: 1,
                                wordBreak: 'break-word'
                            }}
                        >
                            {exception.title}
                        </Typography>

                        <Typography
                            variant="h6"
                            sx={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                mb: 2,
                                fontWeight: 400
                            }}
                            aria-label={`Exception ID ${exception.id}`}
                        >
                            Exception #{exception.id}
                        </Typography>

                        {/* Status and Priority Badges */}
                        <Stack
                            direction="row"
                            spacing={2}
                            sx={{ flexWrap: 'wrap', gap: 1 }}
                            role="group"
                            aria-label="Exception status and priority"
                        >
                            <StatusBadge
                                status={exception.status}
                                type="exception"
                                variant="filled"
                                showIcon={true}
                                aria-label={`Exception status: ${exception.status.replace('_', ' ')}`}
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                    '& .MuiChip-icon': {
                                        color: 'white'
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                    }
                                }}
                            />
                            <StatusBadge
                                status={exception.priority}
                                type="priority"
                                variant="filled"
                                showIcon={true}
                                aria-label={`Priority level: ${exception.priority}`}
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                    '& .MuiChip-icon': {
                                        color: 'white'
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                    }
                                }}
                            />
                        </Stack>
                    </Box>

                    {/* Action Buttons */}
                    <Stack
                        direction={{ xs: 'row', sm: 'row' }}
                        spacing={2}
                        sx={{
                            flexShrink: 0,
                            width: { xs: '100%', md: 'auto' },
                            justifyContent: { xs: 'flex-end', md: 'flex-start' }
                        }}
                        role="group"
                        aria-label="Exception actions"
                    >
                        {canEdit && onEdit && (
                            <Button
                                variant="outlined"
                                startIcon={<Edit />}
                                onClick={onEdit}
                                aria-label="Edit exception details"
                                sx={{
                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                    color: 'white',
                                    '&:hover': {
                                        borderColor: 'white',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                    }
                                }}
                            >
                                Edit
                            </Button>
                        )}

                        {canUpdateStatus && onUpdateStatus && (
                            <Button
                                variant="contained"
                                startIcon={<Update />}
                                onClick={onUpdateStatus}
                                aria-label="Update exception status"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
                                    },
                                    transition: 'all 0.2s ease-in-out'
                                }}
                            >
                                Update Status
                            </Button>
                        )}
                    </Stack>
                </Box>
            </Box>
        </Box>
    )
}