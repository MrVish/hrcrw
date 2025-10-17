import React from 'react'
import {
    Button,
    CircularProgress,
    useTheme,
    type ButtonProps
} from '@mui/material'
import { CheckCircle } from '@mui/icons-material'

export interface LoadingButtonProps extends Omit<ButtonProps, 'startIcon' | 'endIcon'> {
    loading?: boolean
    success?: boolean
    loadingText?: string
    successText?: string
    startIcon?: React.ReactNode
    endIcon?: React.ReactNode
    showSuccessIcon?: boolean
    successDuration?: number
    onSuccessComplete?: () => void
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
    loading = false,
    success = false,
    loadingText,
    successText,
    startIcon,
    endIcon,
    showSuccessIcon = true,
    successDuration = 2000,
    onSuccessComplete,
    children,
    disabled,
    sx,
    ...buttonProps
}) => {
    const theme = useTheme()
    const [showSuccess, setShowSuccess] = React.useState(false)

    // Handle success state
    React.useEffect(() => {
        if (success) {
            setShowSuccess(true)
            if (successDuration > 0) {
                const timer = setTimeout(() => {
                    setShowSuccess(false)
                    if (onSuccessComplete) {
                        onSuccessComplete()
                    }
                }, successDuration)
                return () => clearTimeout(timer)
            }
        } else {
            setShowSuccess(false)
        }
    }, [success, successDuration, onSuccessComplete])

    const getButtonContent = () => {
        if (loading) {
            return loadingText || children
        }
        if (showSuccess && successText) {
            return successText
        }
        return children
    }

    const getStartIcon = () => {
        if (loading) {
            return (
                <CircularProgress
                    size={16}
                    sx={{
                        color: 'inherit'
                    }}
                />
            )
        }
        if (showSuccess && showSuccessIcon) {
            return <CheckCircle fontSize="small" />
        }
        return startIcon
    }

    const getButtonStyles = () => {
        const baseStyles = {
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
                transform: disabled || loading ? 'none' : 'translateY(-2px)',
                boxShadow: disabled || loading ? 'none' : '0 8px 24px rgba(99, 102, 241, 0.4)',
            },
            '&:active': {
                transform: disabled || loading ? 'none' : 'translateY(0)',
            },
            ...sx
        }

        if (showSuccess) {
            return {
                ...baseStyles,
                backgroundColor: theme.palette.success.main,
                color: theme.palette.success.contrastText,
                '&:hover': {
                    ...baseStyles['&:hover'],
                    backgroundColor: theme.palette.success.dark,
                },
                animation: 'successPulse 0.6s ease-in-out',
                '@keyframes successPulse': {
                    '0%': {
                        transform: 'scale(1)',
                    },
                    '50%': {
                        transform: 'scale(1.05)',
                    },
                    '100%': {
                        transform: 'scale(1)',
                    },
                },
            }
        }

        return baseStyles
    }

    return (
        <Button
            {...buttonProps}
            disabled={disabled || loading}
            startIcon={getStartIcon()}
            endIcon={!loading && !showSuccess ? endIcon : undefined}
            sx={getButtonStyles()}
        >
            {getButtonContent()}
        </Button>
    )
}

export default LoadingButton