import React, { useState } from 'react'
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Container,
    Avatar,
    InputAdornment,
    IconButton,
    useMediaQuery,
    useTheme,
} from '@mui/material'
import {
    Email as EmailIcon,
    Lock as LockIcon,
    Visibility,
    VisibilityOff,
    Security as SecurityIcon,
} from '@mui/icons-material'
import { useAuth } from '../../contexts'
import type { LoginCredentials } from '../../types'
import { gradients } from '../../theme'
import { LoginLandingPage } from './LoginLandingPage'

export const LoginForm: React.FC = () => {
    const { login, isLoading } = useAuth()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
    const [credentials, setCredentials] = useState<LoginCredentials>({
        email: '',
        password: '',
    })
    const [error, setError] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setCredentials(prev => ({
            ...prev,
            [name]: value,
        }))
        // Clear error when user starts typing
        if (error) {
            setError('')
        }
    }

    const validateForm = (): boolean => {
        if (!credentials.email) {
            setError('Email is required')
            return false
        }
        if (!credentials.password) {
            setError('Password is required')
            return false
        }
        if (!/\S+@\S+\.\S+/.test(credentials.email)) {
            setError('Please enter a valid email address')
            return false
        }
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)
        setError('')

        try {
            await login(credentials)
            // Redirect will be handled by the app routing logic
        } catch (err: any) {
            setError(
                err.response?.data?.detail ||
                err.message ||
                'Login failed. Please check your credentials.'
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword)
    }

    if (isLoading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
                sx={{ background: gradients.primary }}
            >
                <CircularProgress size={60} sx={{ color: 'white' }} />
            </Box>
        )
    }

    // Mobile view - show only login form
    if (isMobile) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    background: gradients.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 2,
                }}
            >
                <Container maxWidth="sm">
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        <CardContent sx={{ p: 4 }}>
                            {/* Header */}
                            <Box textAlign="center" mb={4}>
                                <Avatar
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        margin: '0 auto 16px',
                                        background: gradients.primary,
                                    }}
                                >
                                    <SecurityIcon sx={{ fontSize: 40 }} />
                                </Avatar>
                                <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                                    High Risk Client Review
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Please sign in to continue to your dashboard
                                </Typography>
                            </Box>

                            {/* Form */}
                            <Box component="form" onSubmit={handleSubmit} noValidate>
                                <TextField
                                    fullWidth
                                    id="email"
                                    name="email"
                                    label="Email Address"
                                    type="email"
                                    value={credentials.email}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    autoComplete="email"
                                    autoFocus
                                    margin="normal"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <EmailIcon color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    id="password"
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={credentials.password}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    autoComplete="current-password"
                                    margin="normal"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockIcon color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={togglePasswordVisibility}
                                                    edge="end"
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 3 }}
                                />

                                {error && (
                                    <Alert severity="error" sx={{ mb: 3 }}>
                                        {error}
                                    </Alert>
                                )}

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={isSubmitting}
                                    sx={{
                                        py: 1.5,
                                        background: gradients.primary,
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        '&:hover': {
                                            background: gradients.primary,
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                                        },
                                    }}
                                >
                                    {isSubmitting ? (
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <CircularProgress size={20} color="inherit" />
                                            Signing in...
                                        </Box>
                                    ) : (
                                        'Sign In'
                                    )}
                                </Button>
                            </Box>

                            {/* Footer */}
                            <Box textAlign="center" mt={3}>
                                <Typography variant="caption" color="text.secondary">
                                    Secure access to compliance management system
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Container>
            </Box>
        )
    }

    // Desktop view - split screen with landing page
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex' }}>
            {/* Left side - Login Form */}
            <Box
                sx={{
                    width: { lg: '30%', xl: '28%' },
                    minWidth: '380px',
                    background: gradients.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: { lg: 3, xl: 4 },
                }}
            >
                <Box sx={{ width: '100%', maxWidth: 360 }}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        <CardContent sx={{ p: { lg: 3, xl: 4 } }}>
                            {/* Header */}
                            <Box textAlign="center" mb={3}>
                                <Avatar
                                    sx={{
                                        width: { lg: 70, xl: 80 },
                                        height: { lg: 70, xl: 80 },
                                        margin: '0 auto 12px',
                                        background: gradients.primary,
                                    }}
                                >
                                    <SecurityIcon sx={{ fontSize: { lg: 35, xl: 40 } }} />
                                </Avatar>
                                <Typography
                                    variant="h5"
                                    component="h1"
                                    gutterBottom
                                    fontWeight="bold"
                                    sx={{ fontSize: { lg: '1.4rem', xl: '1.5rem' } }}
                                >
                                    High Risk Client Review
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontSize: { lg: '0.85rem', xl: '0.875rem' } }}
                                >
                                    Please sign in to continue to your dashboard
                                </Typography>
                            </Box>

                            {/* Form */}
                            <Box component="form" onSubmit={handleSubmit} noValidate>
                                <TextField
                                    fullWidth
                                    id="email"
                                    name="email"
                                    label="Email Address"
                                    type="email"
                                    value={credentials.email}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    autoComplete="email"
                                    autoFocus
                                    margin="normal"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <EmailIcon color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    id="password"
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={credentials.password}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    autoComplete="current-password"
                                    margin="normal"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockIcon color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={togglePasswordVisibility}
                                                    edge="end"
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 3 }}
                                />

                                {error && (
                                    <Alert severity="error" sx={{ mb: 3 }}>
                                        {error}
                                    </Alert>
                                )}

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={isSubmitting}
                                    sx={{
                                        py: 1.5,
                                        background: gradients.primary,
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        '&:hover': {
                                            background: gradients.primary,
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                                        },
                                    }}
                                >
                                    {isSubmitting ? (
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <CircularProgress size={20} color="inherit" />
                                            Signing in...
                                        </Box>
                                    ) : (
                                        'Sign In'
                                    )}
                                </Button>
                            </Box>

                            {/* Footer */}
                            <Box textAlign="center" mt={3}>
                                <Typography variant="caption" color="text.secondary">
                                    Secure access to compliance management system
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* Right side - Landing Page */}
            <Box sx={{ width: { lg: '70%', xl: '72%' }, overflow: 'auto' }}>
                <LoginLandingPage />
            </Box>
        </Box>
    )
}