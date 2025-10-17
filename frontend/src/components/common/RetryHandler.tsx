import React, { useState, useEffect } from 'react'
import {
    Alert,
    AlertTitle,
    Button,
    Box,
    Typography,
    LinearProgress,
    Chip,
    Stack,
    IconButton,
    Collapse,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material'
import {
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon
} from '@mui/icons-material'
import { RetryError } from '../../utils/retry'
import { ErrorSeverity } from '../../utils/errorHandling'
import type { RetryState } from '../../utils/retry'
import type { CategorizedError } from '../../utils/errorHandling'

interface RetryHandlerProps {
    error?: RetryError | CategorizedError
    retryState?: RetryState
    onRetry?: () => Promise<void>
    onCancel?: () => void
    showDetails?: boolean
    autoRetryEnabled?: boolean
    className?: string
}

/**
 * Component for displaying retry options and status to users
 */
export const RetryHandler: React.FC<RetryHandlerProps> = ({
    error,
    retryState,
    onRetry,
    onCancel,
    showDetails = false,
    autoRetryEnabled = true,
    className
}) => {
    const [isRetrying, setIsRetrying] = useState(false)
    const [showDetailsExpanded, setShowDetailsExpanded] = useState(false)
    const [countdown, setCountdown] = useState(0)

    // Handle countdown for auto-retry
    useEffect(() => {
        if (retryState?.isAutoRetrying && retryState.nextRetryDelay > 0) {
            setCountdown(Math.ceil(retryState.nextRetryDelay / 1000))

            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

            return () => clearInterval(interval)
        }
    }, [retryState?.isAutoRetrying, retryState?.nextRetryDelay])

    const handleRetry = async () => {
        if (!onRetry) return

        setIsRetrying(true)
        try {
            await onRetry()
        } catch (err) {
            console.error('Retry failed:', err)
        } finally {
            setIsRetrying(false)
        }
    }

    const getSeverityColor = (severity?: ErrorSeverity) => {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                return 'error'
            case ErrorSeverity.HIGH:
                return 'error'
            case ErrorSeverity.MEDIUM:
                return 'warning'
            case ErrorSeverity.LOW:
                return 'info'
            default:
                return 'info'
        }
    }

    const getSeverityIcon = (severity?: ErrorSeverity) => {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                return <ErrorIcon />
            case ErrorSeverity.MEDIUM:
                return <WarningIcon />
            case ErrorSeverity.LOW:
                return <InfoIcon />
            default:
                return <InfoIcon />
        }
    }

    if (!error && !retryState) {
        return null
    }

    const isRetryError = error instanceof RetryError
    const categorizedError = !isRetryError ? error as CategorizedError : undefined
    const canRetry = isRetryError ? error.canRetry() : retryState?.canRetry || false
    const severity = categorizedError?.severity

    return (
        <Box className={className}>
            <Alert
                severity={getSeverityColor(severity) as any}
                icon={getSeverityIcon(severity)}
                action={
                    <Stack direction="row" spacing={1} alignItems="center">
                        {canRetry && onRetry && (
                            <Button
                                color="inherit"
                                size="small"
                                onClick={handleRetry}
                                disabled={isRetrying || retryState?.isAutoRetrying}
                                startIcon={<RefreshIcon />}
                            >
                                {isRetrying ? 'Retrying...' : 'Retry'}
                            </Button>
                        )}
                        {onCancel && (
                            <IconButton
                                color="inherit"
                                size="small"
                                onClick={onCancel}
                                title="Cancel"
                            >
                                <CancelIcon />
                            </IconButton>
                        )}
                        {showDetails && (
                            <IconButton
                                color="inherit"
                                size="small"
                                onClick={() => setShowDetailsExpanded(!showDetailsExpanded)}
                                title={showDetailsExpanded ? 'Hide Details' : 'Show Details'}
                            >
                                {showDetailsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                        )}
                    </Stack>
                }
            >
                <AlertTitle>
                    {categorizedError?.userMessage || (error as any)?.message || 'Operation Failed'}
                </AlertTitle>

                {/* Retry Status */}
                {retryState && (
                    <Box sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Chip
                                size="small"
                                label={`Attempt ${retryState.attempt}/${retryState.maxAttempts}`}
                                color={retryState.canRetry ? 'primary' : 'default'}
                            />

                            {retryState.isAutoRetrying && autoRetryEnabled && (
                                <Chip
                                    size="small"
                                    label={countdown > 0 ? `Auto-retry in ${countdown}s` : 'Retrying...'}
                                    color="info"
                                    icon={<RefreshIcon />}
                                />
                            )}

                            {!retryState.canRetry && (
                                <Chip
                                    size="small"
                                    label="Max attempts reached"
                                    color="error"
                                />
                            )}
                        </Stack>

                        {retryState.isAutoRetrying && (
                            <Box sx={{ mt: 1 }}>
                                <LinearProgress />
                            </Box>
                        )}
                    </Box>
                )}

                {/* Recovery Suggestions */}
                {categorizedError?.recoverySuggestions && categorizedError.recoverySuggestions.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Try these solutions:
                        </Typography>
                        <List dense>
                            {categorizedError.recoverySuggestions.map((suggestion, index) => (
                                <ListItem key={index} sx={{ py: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 20 }}>
                                        <CheckCircleIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={suggestion}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}

                {/* Custom Actions */}
                {categorizedError?.actions && categorizedError.actions.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {categorizedError.actions.map((action, index) => (
                                <Button
                                    key={index}
                                    size="small"
                                    variant={action.primary ? 'contained' : 'outlined'}
                                    color={action.variant === 'danger' ? 'error' : 'primary'}
                                    onClick={action.action}
                                >
                                    {action.label}
                                </Button>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Alert>

            {/* Detailed Error Information */}
            <Collapse in={showDetailsExpanded}>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Error Details
                    </Typography>

                    {categorizedError && (
                        <Stack spacing={1}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Category:
                                </Typography>
                                <Typography variant="body2">
                                    {categorizedError.category}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Severity:
                                </Typography>
                                <Typography variant="body2">
                                    {categorizedError.severity}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Error Code:
                                </Typography>
                                <Typography variant="body2" fontFamily="monospace">
                                    {categorizedError.errorCode}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Technical Message:
                                </Typography>
                                <Typography variant="body2" fontFamily="monospace">
                                    {categorizedError.technicalMessage}
                                </Typography>
                            </Box>
                        </Stack>
                    )}

                    {isRetryError && (
                        <Stack spacing={1}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Attempts Made:
                                </Typography>
                                <Typography variant="body2">
                                    {error.attempts}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Last Error:
                                </Typography>
                                <Typography variant="body2" fontFamily="monospace">
                                    {error.lastError?.message}
                                </Typography>
                            </Box>

                            {error.retryInfo && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Next Retry Delay:
                                    </Typography>
                                    <Typography variant="body2">
                                        {error.retryInfo.nextRetryDelay}ms
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    )}
                </Box>
            </Collapse>
        </Box>
    )
}

export default RetryHandler