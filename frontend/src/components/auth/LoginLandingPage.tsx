import React from 'react'
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid2 as Grid,
    Avatar,
    useTheme,
    alpha,
} from '@mui/material'
import {
    Security as SecurityIcon,
    Assessment as AssessmentIcon,
    People as PeopleIcon,
    CheckCircle as CheckCircleIcon,
    Speed as SpeedIcon,
    Shield as ShieldIcon,
    TrendingUp as TrendingUpIcon,
    Assignment as AssignmentIcon,
} from '@mui/icons-material'
import { gradients } from '../../theme'

interface FeatureCardProps {
    icon: React.ReactNode
    title: string
    description: string
    gradient: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, gradient }) => {
    const theme = useTheme()

    return (
        <Card
            elevation={0}
            sx={{
                height: '100%',
                background: 'white',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                    borderColor: theme.palette.primary.main,
                },
            }}
        >
            <CardContent sx={{ p: { xs: 2.5, sm: 3, lg: 2.5, xl: 3 }, textAlign: 'center' }}>
                <Avatar
                    sx={{
                        width: { xs: 48, sm: 56, lg: 52, xl: 56 },
                        height: { xs: 48, sm: 56, lg: 52, xl: 56 },
                        background: gradient,
                        margin: '0 auto 12px',
                        boxShadow: `0 6px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                    }}
                >
                    {icon}
                </Avatar>
                <Typography
                    variant="h6"
                    fontWeight="bold"
                    gutterBottom
                    sx={{
                        fontSize: { xs: '1rem', sm: '1.1rem', lg: '1.05rem', xl: '1.1rem' },
                        mb: 1,
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        lineHeight: 1.5,
                        fontSize: { xs: '0.8rem', sm: '0.85rem', lg: '0.82rem', xl: '0.85rem' },
                    }}
                >
                    {description}
                </Typography>
            </CardContent>
        </Card>
    )
}

interface StatCardProps {
    value: string
    label: string
    icon: React.ReactNode
}

const StatCard: React.FC<StatCardProps> = ({ value, label, icon }) => {
    const theme = useTheme()

    return (
        <Box
            sx={{
                textAlign: 'center',
                p: { xs: 1.5, sm: 2, lg: 1.8, xl: 2 },
                borderRadius: 2,
                background: alpha(theme.palette.primary.main, 0.04),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.06),
                    borderColor: alpha(theme.palette.primary.main, 0.12),
                },
            }}
        >
            <Box sx={{ color: theme.palette.primary.main, mb: 0.5 }}>
                {icon}
            </Box>
            <Typography
                variant="h4"
                fontWeight="bold"
                color="primary"
                gutterBottom
                sx={{
                    fontSize: { xs: '1.5rem', sm: '1.8rem', lg: '1.6rem', xl: '1.8rem' },
                    mb: 0.5,
                }}
            >
                {value}
            </Typography>
            <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={500}
                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem', lg: '0.72rem', xl: '0.75rem' } }}
            >
                {label}
            </Typography>
        </Box>
    )
}

export const LoginLandingPage: React.FC = () => {
    const theme = useTheme()

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                py: { xs: 2, sm: 3, md: 4, lg: 5 },
                px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 },
                overflow: 'auto',
                width: '100%',
            }}
        >
            <Box sx={{ width: '100%' }}>
                {/* Hero Section */}
                <Box textAlign="center" mb={{ xs: 3, sm: 4, md: 5, lg: 6 }}>
                    <Avatar
                        sx={{
                            width: { xs: 70, sm: 80, md: 90, lg: 100 },
                            height: { xs: 70, sm: 80, md: 90, lg: 100 },
                            margin: '0 auto 20px',
                            background: gradients.primary,
                            boxShadow: '0 12px 24px rgba(99, 102, 241, 0.25)',
                        }}
                    >
                        <SecurityIcon sx={{ fontSize: { xs: 35, sm: 40, md: 45, lg: 50 } }} />
                    </Avatar>

                    <Typography
                        variant="h2"
                        component="h1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{
                            background: gradients.primary,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 2,
                            fontSize: { xs: '1.6rem', sm: '2rem', md: '2.5rem', lg: '3rem', xl: '3.25rem' },
                            lineHeight: 1.2,
                        }}
                    >
                        High Risk Client Review
                    </Typography>

                    <Typography
                        variant="h5"
                        color="text.secondary"
                        sx={{
                            mx: 'auto',
                            mb: 3,
                            lineHeight: 1.4,
                            fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem', lg: '1.4rem', xl: '1.5rem' },
                            maxWidth: { xs: '95%', sm: '90%', md: '85%', lg: '80%', xl: '75%' },
                            fontWeight: 500,
                        }}
                    >
                        Comprehensive compliance management system for financial institutions
                    </Typography>

                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                            mx: 'auto',
                            lineHeight: 1.6,
                            fontSize: { xs: '0.85rem', sm: '0.9rem', md: '1rem', lg: '1.05rem' },
                            maxWidth: { xs: '95%', sm: '90%', md: '85%', lg: '80%', xl: '75%' }
                        }}
                    >
                        Streamline your KYC processes, manage client reviews, and ensure regulatory compliance
                        with our advanced workflow management platform.
                    </Typography>
                </Box>

                {/* Statistics */}
                <Grid
                    container
                    spacing={{ xs: 2, sm: 2.5, md: 3, lg: 3.5 }}
                    sx={{ mb: { xs: 3, sm: 4, md: 5, lg: 6 } }}
                >
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <StatCard
                            value="99.9%"
                            label="Uptime"
                            icon={<CheckCircleIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} />}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <StatCard
                            value="24/7"
                            label="Support"
                            icon={<ShieldIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} />}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <StatCard
                            value="50%"
                            label="Faster Reviews"
                            icon={<SpeedIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} />}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <StatCard
                            value="100+"
                            label="Institutions"
                            icon={<TrendingUpIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} />}
                        />
                    </Grid>
                </Grid>

                {/* Features */}
                <Grid
                    container
                    spacing={{ xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 }}
                    sx={{ mb: { xs: 3, sm: 4, md: 5 } }}
                >
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <FeatureCard
                            icon={<AssessmentIcon />}
                            title="Risk Assessment"
                            description="Advanced algorithms to identify and categorize high-risk clients with comprehensive scoring mechanisms."
                            gradient={gradients.error}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <FeatureCard
                            icon={<AssignmentIcon />}
                            title="Review Workflow"
                            description="Streamlined maker-checker workflow with automated routing and approval processes for efficient reviews."
                            gradient={gradients.primary}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <FeatureCard
                            icon={<PeopleIcon />}
                            title="Team Collaboration"
                            description="Role-based access control with seamless collaboration tools for compliance teams and stakeholders."
                            gradient={gradients.info}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <FeatureCard
                            icon={<SecurityIcon />}
                            title="Compliance Tracking"
                            description="Complete audit trails and regulatory reporting with real-time monitoring and exception management."
                            gradient={gradients.success}
                        />
                    </Grid>
                </Grid>

                {/* Footer */}
                <Box textAlign="center" mt={{ xs: 3, sm: 4, md: 5 }}>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.875rem' },
                            fontWeight: 500,
                        }}
                    >
                        Trusted by leading financial institutions worldwide
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            mt: 0.5,
                            display: 'block',
                            fontSize: { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' }
                        }}
                    >
                        © 2024 High Risk Client Review System. All rights reserved.
                    </Typography>
                </Box>
            </Box>
        </Box>
    )
}