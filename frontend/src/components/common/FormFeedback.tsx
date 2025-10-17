import React from 'react'
import {
    Alert,
    Box,
    CircularProgress,
    Fade,
    Slide,
    Typography,
    useTheme
} from '@mui/material'
import {
    CheckCircle,
    Error as ErrorIcon,
    Warning,
    Info
} from '@mui/icons-material'

export interface FormFeedbackProps {
    loading?: boolean
    success?: string | null
    error?: string | null
    warning?: string | null
    info?: string | null
    loadingText?: string
    showIcon?: boolean
    variant?: 'standard' | 'filled' | 'outlined'
    severity?: 'error' | 'warning' | 'info' | 'success'
    onClose?: () => void
    autoHideDuration?: number
}

export const FormFeedback: React.FC<FormFeedbackProps> = ({
    loading = false,
    success,
    error,
    warning,
    info,
    loadingText = 'Processing...',
    showIcon = true,
    variant = 'filled',
    onClose,
    autoHideDuration
}) => {
    const theme = useTheme()
    const [showSuccess, setShowSuccess] = React.useState(!!success)
    const [showError, setShowError] = React.useState(!!error)
    const [showWarning, setShowWarning] = React.useState(!!warning)
    const [showInfo, setShowInfo] = React.useState(!!info)

    // Auto-hide success messages
    React.useEffect(() => {
        if (success && autoHideDuration) {
            const timer = setTimeout(() => {
                setShowSuccess(false)
                if (onClose) onClose()
            }, autoHideDuration)
            return () => clearTimeout(timer)
        }
        setShowSuccess(!!success)
    }, [success, autoHideDuration, onClose])

    // Update visibility when props change
    React.useEffect(() => {
        setShowError(!!error)
    }, [error])

    React.useEffect(() => {
        setShowWarning(!!warning)
    }, [warning])

    React.useEffect(() => {
        setShowInfo(!!info)
    }, [info])

    if (loading) {
        return (
            <Fade in={loading} timeout={300}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        backgroundColor: theme.palette.primary.main + '10',
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.primary.main}20`,
                        mb: 2
                    }}
                >
                    <CircularProgress
                        size={20}
                        sx={{
                            color: theme.palette.primary.main
                        }}
                    />
                    <Typography
                        variant="body2"
                        sx={{
                            color: theme.palette.primary.main,
                            fontWeight: 500
                        }}
                    >
                        {loadingText}
                    </Typography>
                </Box>
            </Fade>
        )
    }

    return (
        <Box sx={{ mb: 2 }}>
            {/* Success Message */}
            <Slide direction="down" in={showSuccess} mountOnEnter unmountOnExit>
                <Alert
                    severity="success"
                    variant={variant}
                    icon={showIcon ? <CheckCircle /> : false}
                    onClose={onClose ? () => {
                        setShowSuccess(false)
                        onClose()
                    } : undefined}
                    sx={{
                        mb: 1,
                        '& .MuiAlert-message': {
                            display: 'flex',
                            alignItems: 'center'
                        },
                        animation: 'pulse 0.5s ease-in-out',
                        '@keyframes pulse': {
                            '0%': {
                                transform: 'scale(1)',
                            },
                            '50%': {
                                transform: 'scale(1.02)',
                            },
                            '100%': {
                                transform: 'scale(1)',
                            },
                        },
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {success}
                    </Typography>
                </Alert>
            </Slide>

            {/* Error Message */}
            <Slide direction="down" in={showError} mountOnEnter unmountOnExit>
                <Alert
                    severity="error"
                    variant={variant}
                    icon={showIcon ? <ErrorIcon /> : false}
                    onClose={onClose ? () => {
                        setShowError(false)
                        onClose()
                    } : undefined}
                    sx={{
                        mb: 1,
                        '& .MuiAlert-message': {
                            display: 'flex',
                            alignItems: 'center'
                        }
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {error}
                    </Typography>
                </Alert>
            </Slide>

            {/* Warning Message */}
            <Slide direction="down" in={showWarning} mountOnEnter unmountOnExit>
                <Alert
                    severity="warning"
                    variant={variant}
                    icon={showIcon ? <Warning /> : false}
                    onClose={onClose ? () => {
                        setShowWarning(false)
                        onClose()
                    } : undefined}
                    sx={{
                        mb: 1,
                        '& .MuiAlert-message': {
                            display: 'flex',
                            alignItems: 'center'
                        }
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {warning}
                    </Typography>
                </Alert>
            </Slide>

            {/* Info Message */}
            <Slide direction="down" in={showInfo} mountOnEnter unmountOnExit>
                <Alert
                    severity="info"
                    variant={variant}
                    icon={showIcon ? <Info /> : false}
                    onClose={onClose ? () => {
                        setShowInfo(false)
                        onClose()
                    } : undefined}
                    sx={{
                        mb: 1,
                        '& .MuiAlert-message': {
                            display: 'flex',
                            alignItems: 'center'
                        }
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {info}
                    </Typography>
                </Alert>
            </Slide>
        </Box>
    )
}

export default FormFeedback