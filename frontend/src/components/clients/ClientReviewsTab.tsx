import React from 'react'
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Typography,
    Stack,
    IconButton,
    useTheme,
    useMediaQuery,
} from '@mui/material'
import {
    Visibility,
    Add,
    Assignment,
    Person,
    Schedule,
} from '@mui/icons-material'
import { StatusBadge } from '../common/StatusBadge'
import type { Review } from '../../types'

interface ClientReviewsTabProps {
    reviews: Review[]
    onViewReview: (reviewId: number) => void
    onCreateReview: () => void
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export const ClientReviewsTab: React.FC<ClientReviewsTabProps> = ({
    reviews,
    onViewReview,
    onCreateReview,
}) => {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))

    if (reviews.length === 0) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 8,
                    px: 3,
                    textAlign: 'center',
                }}
            >
                <Assignment
                    sx={{
                        fontSize: 64,
                        color: 'text.secondary',
                        mb: 2,
                    }}
                />
                <Typography variant="h5" gutterBottom fontWeight={600}>
                    No reviews found
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
                    This client has no review history yet. Create the first review to get started.
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={onCreateReview}
                    size="large"
                    sx={{
                        background: theme.palette.primary.main,
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                        },
                        transition: 'all 0.2s ease-in-out',
                    }}
                >
                    Create First Review
                </Button>
            </Box>
        )
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3, lg: 4 } }}>
            {/* Header */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Typography variant="h5" fontWeight={600}>
                    Review History ({reviews.length})
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={onCreateReview}
                    sx={{
                        background: theme.palette.primary.main,
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                        },
                        transition: 'all 0.2s ease-in-out',
                    }}
                >
                    New Review
                </Button>
            </Stack>

            {/* Reviews Table */}
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    border: `1px solid ${theme.palette.grey[200]}`,
                    borderRadius: 3,
                    overflow: 'hidden',
                }}
            >
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Review ID</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            {!isMobile && (
                                <>
                                    <TableCell sx={{ fontWeight: 600 }}>Submitted By</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Reviewed By</TableCell>
                                </>
                            )}
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reviews.map((review) => (
                            <TableRow
                                key={review.id}
                                sx={{
                                    '&:hover': {
                                        backgroundColor: theme.palette.grey[50],
                                    },
                                    transition: 'background-color 0.2s ease-in-out',
                                }}
                            >
                                <TableCell>
                                    <Typography variant="body2" fontWeight={500}>
                                        #{review.id}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={review.status as any} />
                                </TableCell>
                                {!isMobile && (
                                    <>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Person fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {(review as any).submitter_name || `User ${review.submitted_by}`}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Schedule fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {formatDate(review.created_at)}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            {review.reviewed_by ? (
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Person fontSize="small" color="action" />
                                                    <Typography variant="body2">
                                                        {(review as any).reviewer_name || `User ${review.reviewed_by}`}
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Not reviewed
                                                </Typography>
                                            )}
                                        </TableCell>
                                    </>
                                )}
                                <TableCell align="right">
                                    <IconButton
                                        onClick={() => onViewReview(review.id)}
                                        size="small"
                                        sx={{
                                            color: theme.palette.primary.main,
                                            '&:hover': {
                                                backgroundColor: theme.palette.primary.main + '10',
                                                transform: 'scale(1.1)',
                                            },
                                            transition: 'all 0.2s ease-in-out',
                                        }}
                                    >
                                        <Visibility fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Mobile View - Additional Info */}
            {isMobile && (
                <Box sx={{ mt: 2 }}>
                    {reviews.map((review) => (
                        <Paper
                            key={`mobile-${review.id}`}
                            elevation={0}
                            sx={{
                                p: 2,
                                mb: 2,
                                border: `1px solid ${theme.palette.grey[200]}`,
                                borderRadius: 2,
                            }}
                        >
                            <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" fontWeight={500}>
                                        Review #{review.id}
                                    </Typography>
                                    <StatusBadge status={review.status as any} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                    Submitted by: {(review as any).submitter_name || `User ${review.submitted_by}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Created: {formatDate(review.created_at)}
                                </Typography>
                                {review.reviewed_by && (
                                    <Typography variant="caption" color="text.secondary">
                                        Reviewed by: {(review as any).reviewer_name || `User ${review.reviewed_by}`}
                                    </Typography>
                                )}
                                {review.comments && (
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        {review.comments}
                                    </Typography>
                                )}
                            </Stack>
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    )
}

export default ClientReviewsTab