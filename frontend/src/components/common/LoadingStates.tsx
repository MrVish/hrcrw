import React from 'react'
import {
    Box,
    CircularProgress,
    Skeleton,
    Card,
    CardContent,
    Typography,
    Grid,
    Stack
} from '@mui/material'

// Enhanced loading spinner with consistent Material-UI styling
interface LoadingSpinnerProps {
    size?: number
    message?: string
    centered?: boolean
    minHeight?: string | number
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 48,
    message = 'Loading...',
    centered = true,
    minHeight = '400px'
}) => {
    const content = (
        <Stack spacing={2} alignItems="center">
            <CircularProgress
                size={size}
                sx={{
                    color: 'primary.main',
                    '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                    }
                }}
            />
            {message && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                >
                    {message}
                </Typography>
            )}
        </Stack>
    )

    if (centered) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight,
                    width: '100%'
                }}
            >
                {content}
            </Box>
        )
    }

    return content
}

// Skeleton loader for detail page headers
export const DetailHeaderSkeleton: React.FC = () => (
    <Box sx={{ mb: 4 }}>
        <Box
            sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 3,
                p: { xs: 3, lg: 4 },
                mb: 3
            }}
        >
            <Stack spacing={2}>
                <Skeleton
                    variant="text"
                    width="60%"
                    height={40}
                    sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}
                />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Skeleton
                        variant="rectangular"
                        width={80}
                        height={32}
                        sx={{
                            borderRadius: 2,
                            bgcolor: 'rgba(255, 255, 255, 0.2)'
                        }}
                    />
                    <Skeleton
                        variant="rectangular"
                        width={100}
                        height={32}
                        sx={{
                            borderRadius: 2,
                            bgcolor: 'rgba(255, 255, 255, 0.2)'
                        }}
                    />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Skeleton
                        variant="rectangular"
                        width={120}
                        height={36}
                        sx={{
                            borderRadius: 2,
                            bgcolor: 'rgba(255, 255, 255, 0.2)'
                        }}
                    />
                    <Skeleton
                        variant="rectangular"
                        width={140}
                        height={36}
                        sx={{
                            borderRadius: 2,
                            bgcolor: 'rgba(255, 255, 255, 0.2)'
                        }}
                    />
                </Box>
            </Stack>
        </Box>
    </Box>
)

// Skeleton loader for information cards
export const InfoCardSkeleton: React.FC = () => (
    <Card
        elevation={0}
        sx={{
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 3,
            height: '100%'
        }}
    >
        <CardContent sx={{ p: { xs: 3, lg: 4 } }}>
            <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width="40%" height={24} />
                </Box>
                <Stack spacing={1.5}>
                    {[...Array(4)].map((_, index) => (
                        <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Skeleton variant="text" width="35%" height={20} />
                            <Skeleton variant="text" width="45%" height={20} />
                        </Box>
                    ))}
                </Stack>
            </Stack>
        </CardContent>
    </Card>
)

// Skeleton loader for overview tab with multiple cards
export const OverviewTabSkeleton: React.FC = () => (
    <Grid container spacing={{ xs: 3, lg: 4 }}>
        {[...Array(3)].map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
                <InfoCardSkeleton />
            </Grid>
        ))}
    </Grid>
)

// Skeleton loader for table rows
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
    <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
            {[...Array(5)].map((_, rowIndex) => (
                <Box key={rowIndex} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {[...Array(columns)].map((_, colIndex) => (
                        <Skeleton
                            key={colIndex}
                            variant="text"
                            width={colIndex === 0 ? '25%' : '20%'}
                            height={20}
                        />
                    ))}
                </Box>
            ))}
        </Stack>
    </Box>
)

// Skeleton loader for exception info cards grid
export const ExceptionInfoSkeleton: React.FC = () => (
    <Grid container spacing={{ xs: 3, lg: 4 }}>
        {[...Array(4)].map((_, index) => (
            <Grid item xs={12} md={6} key={index}>
                <InfoCardSkeleton />
            </Grid>
        ))}
    </Grid>
)

// Loading overlay for forms and buttons
interface LoadingOverlayProps {
    loading: boolean
    children: React.ReactNode
    message?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    loading,
    children,
    message = 'Processing...'
}) => (
    <Box sx={{ position: 'relative' }}>
        {children}
        {loading && (
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'inherit',
                    zIndex: 1
                }}
            >
                <LoadingSpinner size={32} message={message} centered={false} />
            </Box>
        )}
    </Box>
)