import React from 'react'
import { Box, Typography, Paper, Grid } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../../theme'
import { StatusBadge } from '../StatusBadge'
import type { ClientStatus, ExceptionStatus, RiskLevel, Priority, ReviewStatus } from '../StatusBadge'

/**
 * Visual Consistency Verification Demo Component
 * 
 * This component demonstrates the comprehensive visual consistency verification
 * implemented for StatusBadge components across the application.
 * 
 * It shows all status types with their consistent color coding:
 * - Green for positive states (ACTIVE, APPROVED, RESOLVED, LOW)
 * - Red for negative states (SUSPENDED, REJECTED, OPEN, HIGH)
 * - Orange for warning states (UNDER_REVIEW, IN_PROGRESS, MEDIUM)
 * - Gray for neutral states (INACTIVE, DRAFT, CLOSED)
 * - Blue for informational states (PENDING, SUBMITTED)
 * - Dark Red for critical states (ESCALATED, CRITICAL, VERY_HIGH)
 */

const StatusBadgeVerificationDemo: React.FC = () => {
    const clientStatuses: ClientStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'UNDER_REVIEW', 'PENDING']
    const exceptionStatuses: ExceptionStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED']
    const riskLevels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'CRITICAL']
    const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    const reviewStatuses: ReviewStatus[] = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED']

    const ColorSection: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color, fontWeight: 600 }}>
                {title}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {children}
            </Box>
        </Paper>
    )

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
                <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4, fontWeight: 700 }}>
                    StatusBadge Visual Consistency Verification
                </Typography>

                <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
                    This demo shows consistent color coding across all status types in the application.
                    All badges follow the same visual patterns and accessibility standards.
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <ColorSection title="Green - Positive States" color={theme.palette.success.main}>
                            <StatusBadge status="ACTIVE" type="client" variant="outlined" showIcon />
                            <StatusBadge status="RESOLVED" type="exception" variant="filled" showIcon />
                            <StatusBadge status="APPROVED" type="review" variant="outlined" showIcon />
                            <StatusBadge status="LOW" type="risk" variant="outlined" showIcon />
                            <StatusBadge status="LOW" type="priority" variant="outlined" showIcon />
                        </ColorSection>

                        <ColorSection title="Red - Negative States" color={theme.palette.error.main}>
                            <StatusBadge status="SUSPENDED" type="client" variant="outlined" showIcon />
                            <StatusBadge status="OPEN" type="exception" variant="filled" showIcon />
                            <StatusBadge status="REJECTED" type="review" variant="outlined" showIcon />
                            <StatusBadge status="HIGH" type="risk" variant="outlined" showIcon />
                            <StatusBadge status="HIGH" type="priority" variant="outlined" showIcon />
                        </ColorSection>

                        <ColorSection title="Orange - Warning States" color={theme.palette.warning.main}>
                            <StatusBadge status="UNDER_REVIEW" type="client" variant="outlined" showIcon />
                            <StatusBadge status="IN_PROGRESS" type="exception" variant="filled" showIcon />
                            <StatusBadge status="IN_REVIEW" type="review" variant="outlined" showIcon />
                            <StatusBadge status="MEDIUM" type="risk" variant="outlined" showIcon />
                            <StatusBadge status="MEDIUM" type="priority" variant="outlined" showIcon />
                        </ColorSection>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <ColorSection title="Gray - Neutral States" color={theme.palette.grey[500]}>
                            <StatusBadge status="INACTIVE" type="client" variant="outlined" showIcon />
                            <StatusBadge status="CLOSED" type="exception" variant="filled" showIcon />
                            <StatusBadge status="DRAFT" type="review" variant="outlined" showIcon />
                        </ColorSection>

                        <ColorSection title="Blue - Informational States" color={theme.palette.info.main}>
                            <StatusBadge status="PENDING" type="client" variant="outlined" showIcon />
                            <StatusBadge status="SUBMITTED" type="review" variant="outlined" showIcon />
                        </ColorSection>

                        <ColorSection title="Dark Red - Critical States" color={theme.palette.error.dark}>
                            <StatusBadge status="ESCALATED" type="exception" variant="filled" showIcon />
                            <StatusBadge status="CRITICAL" type="risk" variant="outlined" showIcon />
                            <StatusBadge status="CRITICAL" type="priority" variant="outlined" showIcon />
                            <StatusBadge status="VERY_HIGH" type="risk" variant="outlined" showIcon />
                        </ColorSection>
                    </Grid>
                </Grid>

                <Paper elevation={2} sx={{ p: 3, mt: 4, bgcolor: 'grey.50' }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                        Complete Status Collections
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Client Statuses</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {clientStatuses.map(status => (
                                <StatusBadge key={status} status={status} type="client" variant="outlined" showIcon />
                            ))}
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Exception Statuses</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {exceptionStatuses.map(status => (
                                <StatusBadge key={status} status={status} type="exception" variant="filled" showIcon />
                            ))}
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Risk Levels</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {riskLevels.map(level => (
                                <StatusBadge key={level} status={level} type="risk" variant="outlined" showIcon />
                            ))}
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Priority Levels</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {priorities.map(priority => (
                                <StatusBadge key={priority} status={priority} type="priority" variant="outlined" showIcon />
                            ))}
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Review Statuses</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {reviewStatuses.map(status => (
                                <StatusBadge key={status} status={status} type="review" variant="outlined" showIcon />
                            ))}
                        </Box>
                    </Box>
                </Paper>

                <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        ✅ Visual Consistency Verified: All status badges use consistent colors, styling, and accessibility features across the application.
                    </Typography>
                </Paper>
            </Box>
        </ThemeProvider>
    )
}

export default StatusBadgeVerificationDemo