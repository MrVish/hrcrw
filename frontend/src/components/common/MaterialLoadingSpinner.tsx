import React from 'react'
import { Box, CircularProgress, Typography, Backdrop } from '@mui/material'

interface LoadingSpinnerProps {
    size?: number
    text?: string
    color?: 'primary' | 'secondary' | 'inherit'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 40,
    text = 'Loading...',
    color = 'primary'
}) => {
    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap={2}
            p={3}
        >
            <CircularProgress size={size} color={color} />
            {text && (
                <Typography variant="body2" color="text.secondary">
                    {text}
                </Typography>
            )}
        </Box>
    )
}

interface LoadingOverlayProps {
    isLoading: boolean
    text?: string
    children: React.ReactNode
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isLoading,
    text = 'Loading...',
    children
}) => {
    return (
        <>
            {children}
            <Backdrop
                sx={{
                    color: '#fff',
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                }}
                open={isLoading}
            >
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={2}
                >
                    <CircularProgress color="inherit" size={60} />
                    <Typography variant="h6" color="inherit">
                        {text}
                    </Typography>
                </Box>
            </Backdrop>
        </>
    )
}