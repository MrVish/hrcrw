import React from 'react'
import { Chip, useTheme } from '@mui/material'
import type { ChipProps } from '@mui/material'
import {
    CheckCircle,
    Cancel as XCircleIcon,
    Assignment as FileTextIcon,
    Schedule as ClockIcon,
    Visibility as EyeIcon,
    Warning as AlertTriangleIcon,
    Shield as ShieldIcon,
    Error as AlertOctagon,
} from '@mui/icons-material'

// Status type definitions
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW' | 'PENDING'
export type ExceptionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'CRITICAL'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ReviewStatus = 'DRAFT' | 'PENDING' | 'IN_REVIEW' | 'UNDER_REVIEW' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export type StatusType = ClientStatus | ExceptionStatus | RiskLevel | Priority | ReviewStatus

interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
    status: StatusType
    type?: 'client' | 'exception' | 'review' | 'risk' | 'priority'
    variant?: 'filled' | 'outlined'
    showIcon?: boolean
    'aria-label'?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    type,
    variant = 'outlined',
    showIcon = true,
    'aria-label': ariaLabel,
    ...chipProps
}) => {
    const theme = useTheme()

    // Icon mapping for different status types
    const getStatusIcon = (status: StatusType, type?: string) => {
        const iconProps = { sx: { fontSize: 16 } }

        // Review status icons (matching Reviews component)
        if (type === 'review' || (!type && ['DRAFT', 'SUBMITTED', 'PENDING', 'IN_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(status))) {
            switch (status) {
                case 'DRAFT':
                    return <FileTextIcon {...iconProps} />
                case 'SUBMITTED':
                case 'PENDING':
                    return <ClockIcon {...iconProps} />
                case 'IN_REVIEW':
                case 'UNDER_REVIEW':
                    return <EyeIcon {...iconProps} />
                case 'APPROVED':
                    return <CheckCircle {...iconProps} />
                case 'REJECTED':
                    return <XCircleIcon {...iconProps} />
                default:
                    return <FileTextIcon {...iconProps} />
            }
        }

        // Client status icons
        if (type === 'client' || (!type && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status))) {
            switch (status) {
                case 'ACTIVE':
                    return <CheckCircle {...iconProps} />
                case 'INACTIVE':
                    return <XCircleIcon {...iconProps} />
                case 'SUSPENDED':
                    return <AlertTriangleIcon {...iconProps} />
                case 'UNDER_REVIEW':
                case 'PENDING':
                    return <ClockIcon {...iconProps} />
                default:
                    return <CheckCircle {...iconProps} />
            }
        }

        // Exception status icons
        if (type === 'exception' || (!type && ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'].includes(status))) {
            switch (status) {
                case 'OPEN':
                    return <AlertTriangleIcon {...iconProps} />
                case 'IN_PROGRESS':
                    return <ClockIcon {...iconProps} />
                case 'RESOLVED':
                    return <CheckCircle {...iconProps} />
                case 'CLOSED':
                    return <XCircleIcon {...iconProps} />
                case 'ESCALATED':
                    return <AlertOctagon {...iconProps} />
                default:
                    return <AlertTriangleIcon {...iconProps} />
            }
        }

        // Risk level and priority icons
        if (type === 'risk' || type === 'priority' || (!type && ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'CRITICAL'].includes(status))) {
            switch (status) {
                case 'LOW':
                    return <ShieldIcon {...iconProps} />
                case 'MEDIUM':
                    return <AlertTriangleIcon {...iconProps} />
                case 'HIGH':
                    return <AlertTriangleIcon {...iconProps} />
                case 'VERY_HIGH':
                case 'CRITICAL':
                    return <AlertOctagon {...iconProps} />
                default:
                    return <ShieldIcon {...iconProps} />
            }
        }

        return <FileTextIcon {...iconProps} />
    }

    // Color mapping for different status types
    const getStatusColor = (status: StatusType) => {
        const colorMap: Record<StatusType, { color: string; backgroundColor?: string }> = {
            // Client Status - matching Reviews styling
            ACTIVE: {
                color: theme.palette.success.main,
                backgroundColor: variant === 'filled' ? theme.palette.success.main + '20' : undefined
            },
            INACTIVE: {
                color: theme.palette.grey[500],
                backgroundColor: variant === 'filled' ? theme.palette.grey[500] + '20' : undefined
            },
            SUSPENDED: {
                color: theme.palette.error.main,
                backgroundColor: variant === 'filled' ? theme.palette.error.main + '20' : undefined
            },
            UNDER_REVIEW: {
                color: theme.palette.warning.main,
                backgroundColor: variant === 'filled' ? theme.palette.warning.main + '20' : undefined
            },
            PENDING: {
                color: theme.palette.info.main,
                backgroundColor: variant === 'filled' ? theme.palette.info.main + '20' : undefined
            },

            // Exception Status (uppercase)
            OPEN: {
                color: theme.palette.error.main,
                backgroundColor: variant === 'filled' ? theme.palette.error.main + '20' : undefined
            },
            IN_PROGRESS: {
                color: theme.palette.warning.main,
                backgroundColor: variant === 'filled' ? theme.palette.warning.main + '20' : undefined
            },
            RESOLVED: {
                color: theme.palette.success.main,
                backgroundColor: variant === 'filled' ? theme.palette.success.main + '20' : undefined
            },
            CLOSED: {
                color: theme.palette.grey[500],
                backgroundColor: variant === 'filled' ? theme.palette.grey[500] + '20' : undefined
            },
            ESCALATED: {
                color: theme.palette.error.dark,
                backgroundColor: variant === 'filled' ? theme.palette.error.dark + '20' : undefined
            },

            // Exception Status (lowercase)
            open: {
                color: theme.palette.error.main,
                backgroundColor: variant === 'filled' ? theme.palette.error.main + '20' : undefined
            },
            in_progress: {
                color: theme.palette.warning.main,
                backgroundColor: variant === 'filled' ? theme.palette.warning.main + '20' : undefined
            },
            resolved: {
                color: theme.palette.success.main,
                backgroundColor: variant === 'filled' ? theme.palette.success.main + '20' : undefined
            },
            closed: {
                color: theme.palette.grey[500],
                backgroundColor: variant === 'filled' ? theme.palette.grey[500] + '20' : undefined
            },
            escalated: {
                color: theme.palette.error.dark,
                backgroundColor: variant === 'filled' ? theme.palette.error.dark + '20' : undefined
            },

            // Risk Level - intuitive color coding
            LOW: {
                color: theme.palette.success.main,
                backgroundColor: variant === 'filled' ? theme.palette.success.main + '20' : undefined
            },
            MEDIUM: {
                color: theme.palette.warning.main,
                backgroundColor: variant === 'filled' ? theme.palette.warning.main + '20' : undefined
            },
            HIGH: {
                color: theme.palette.error.main,
                backgroundColor: variant === 'filled' ? theme.palette.error.main + '20' : undefined
            },
            VERY_HIGH: {
                color: theme.palette.error.dark,
                backgroundColor: variant === 'filled' ? theme.palette.error.dark + '20' : undefined
            },
            CRITICAL: {
                color: theme.palette.error.dark,
                backgroundColor: variant === 'filled' ? theme.palette.error.dark + '20' : undefined
            },

            // Review Status - matching Reviews component
            DRAFT: {
                color: theme.palette.grey[500],
                backgroundColor: variant === 'filled' ? theme.palette.grey[500] + '20' : undefined
            },
            SUBMITTED: {
                color: theme.palette.info.main,
                backgroundColor: variant === 'filled' ? theme.palette.info.main + '20' : undefined
            },
            IN_REVIEW: {
                color: theme.palette.warning.main,
                backgroundColor: variant === 'filled' ? theme.palette.warning.main + '20' : undefined
            },
            APPROVED: {
                color: theme.palette.success.main,
                backgroundColor: variant === 'filled' ? theme.palette.success.main + '20' : undefined
            },
            REJECTED: {
                color: theme.palette.error.main,
                backgroundColor: variant === 'filled' ? theme.palette.error.main + '20' : undefined
            },
        }

        return colorMap[status] || {
            color: theme.palette.grey[500],
            backgroundColor: variant === 'filled' ? theme.palette.grey[500] + '20' : undefined
        }
    }

    // Format status text for display
    const formatStatusText = (status: StatusType): string => {
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
    }

    const statusColors = getStatusColor(status)
    const statusIcon = showIcon ? getStatusIcon(status, type) : undefined
    const formattedStatus = formatStatusText(status)

    // Determine appropriate ARIA label based on type
    const getAriaLabel = () => {
        if (ariaLabel) return ariaLabel

        const typeLabel = type ? `${type} ` : ''
        return `${typeLabel}${type === 'risk' || type === 'priority' ? 'level' : 'status'}: ${formattedStatus}`
    }

    return (
        <Chip
            icon={statusIcon}
            label={formattedStatus}
            variant={variant}
            size="small"
            role="status"
            aria-label={getAriaLabel()}
            sx={{
                borderRadius: '6px',
                fontWeight: 500,
                fontSize: '0.75rem',
                height: '24px',
                transition: 'all 0.2s ease-in-out',
                cursor: 'default',
                ...(variant === 'filled' ? {
                    backgroundColor: statusColors.backgroundColor,
                    color: statusColors.color,
                    border: `1px solid ${statusColors.color}40`,
                    '&:hover': {
                        backgroundColor: statusColors.color + '30',
                        borderColor: statusColors.color + '60',
                        transform: 'translateY(-1px)',
                        boxShadow: `0 2px 8px ${statusColors.color}30`,
                    },
                } : {
                    borderColor: statusColors.color,
                    color: statusColors.color,
                    backgroundColor: 'transparent',
                    '&:hover': {
                        backgroundColor: statusColors.color + '10',
                        borderColor: statusColors.color,
                        transform: 'translateY(-1px)',
                        boxShadow: `0 2px 8px ${statusColors.color}20`,
                    },
                }),
                '& .MuiChip-label': {
                    px: showIcon ? 1 : 1.5,
                },
                '& .MuiChip-icon': {
                    color: statusColors.color,
                    marginLeft: '8px',
                    marginRight: '-4px',
                },
            }}
            {...chipProps}
        />
    )
}

export default StatusBadge