import React from 'react'
import {
    Alert,
    AlertTitle,
    Button,
    Box,
    Typography,
    Stack,
    IconButton
} from '@mui/material'
import {
    Error as ErrorIcon,
    CheckCircle as SuccessIcon,
    Refresh,
    Close
} from '@mui/icons-material'

// Enhanced error display with Material-UI Alert
interface ErrorDisplayProps {
    error: string | Error | null
    title?: string
    onRetry?: () => void
    onDismiss?: () => void
    retryText?: string
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    error,
    title = 'Error',
    onRetry,
    onDismiss,
    retryText = 'Try Again'
}) => {
    if (!error) return null

    const errorMessage = typeof error === 'string' ? error : error.message

    return (
        <Alert
            severity="error"
            action={
                <Stack direction="row" spacing={1}>
                    {onRetry && (
                        <Button
                            color="inherit"
                            size="small"
                            onClick={onRetry}
                            startIcon={<Refresh />}
                        >
                            {retryText}
                        </Button>
                    )}
                    {onDismiss && (
                        <IconButton
                            size="small"
                            onClick={onDismiss}
                            sx={{ color: 'inherit' }}
                        >
                            <Close />
                        </IconButton>
                    )}
                </Stack>
            }
        >
            <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>
            <Typography variant="body2">{errorMessage}</Typography>
        </Alert>
    )
}

// Success message component
interface SuccessDisplayProps {
    message: string | null
    title?: string
    onDismiss?: () => void
}

export const SuccessDisplay: React.FC<SuccessDisplayProps> = ({
    message,
    title = 'Success',
    onDismiss
}) => {
    if (!message) return null

    return (
        <Alert
            severity="success"
            icon={<SuccessIcon />}
            action={
                onDismiss && (
                    <IconButton
                        size="small"
                        onClick={onDismiss}
                        sx={{ color: 'inherit' }}
                    >
                        <Close />
                    </IconButton>
                )
            }
        >
            <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>
            <Typography variant="body2">{message}</Typography>
        </Alert>
    )
}

// Centered error state for full page errors
interface CenteredErrorProps {
    error: string | Error
    title?: string
    onRetry?: () => void
    retryText?: string
}

export const CenteredError: React.FC<CenteredErrorProps> = ({
    error,
    title = 'Something went wrong',
    onRetry,
    retryText = 'Try Again'
}) => {
    const errorMessage = typeof error === 'string' ? error : error.message

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                width: '100%',
                p: 3
            }}
        >
            <Box sx={{ maxWidth: 500, width: '100%' }}>
                <ErrorDisplay
                    error={errorMessage}
                    title={title}
                    onRetry={onRetry}
                    retryText={retryText}
                />
            </Box>
        </Box>
    )
}

// Error boundary fallback with Material-UI styling
interface ErrorBoundaryFallbackProps {
    error: Error
    resetError: () => void
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
    error,
    resetError
}) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '50vh',
                p: 4,
                textAlign: 'center'
            }}
        >
            <ErrorIcon
                sx={{
                    fontSize: 64,
                    color: 'error.main',
                    mb: 2
                }}
            />
            <Typography variant="h4" gutterBottom fontWeight={600}>
                Oops! Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
                We encountered an unexpected error. This has been logged and our team will look into it.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                    variant="contained"
                    onClick={resetError}
                    startIcon={<Refresh />}
                    size="large"
                >
                    Try Again
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => window.location.reload()}
                    size="large"
                >
                    Reload Page
                </Button>
            </Stack>
        </Box>
    )
}