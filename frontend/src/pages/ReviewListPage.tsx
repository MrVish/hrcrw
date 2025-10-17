import React, { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { Box, CircularProgress, Button, useTheme } from '@mui/material'
import { ModernLayout } from '../components/layout/ModernLayout'
import { ReviewList, ReviewForm, RoleGuard } from '../components'
import { useAuth } from '../contexts'
import { apiClient } from '../services'
import { gradients } from '../theme'
import type { ReviewDetail } from '../types'

type Review = ReviewDetail

type ViewMode = 'list' | 'create' | 'edit'

export const ReviewListPage: React.FC = () => {
    const { user } = useAuth()
    const theme = useTheme()
    const [searchParams, setSearchParams] = useSearchParams()
    const { id: reviewId } = useParams<{ id: string }>()
    const [viewMode, setViewMode] = useState<ViewMode>('list')
    const [selectedReview, setSelectedReview] = useState<Review | null>(null)
    const [initialClientId, setInitialClientId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Handle URL parameters on component mount
    useEffect(() => {
        const clientId = searchParams.get('client_id')
        const action = searchParams.get('action')

        if (action === 'create' || clientId) {
            setInitialClientId(clientId)
            setViewMode('create')
            // Clear the URL parameters after handling them
            setSearchParams({})
        }
    }, [searchParams, setSearchParams])

    // Handle review ID from URL
    useEffect(() => {
        if (reviewId) {
            fetchReviewById(parseInt(reviewId))
        }
    }, [reviewId])

    const fetchReviewById = async (id: number) => {
        try {
            setLoading(true)
            let review: Review

            // For checkers, try to use the checker-specific endpoint first
            if (user?.role === 'checker') {
                try {
                    review = await apiClient.getReviewForChecking(id)
                } catch (checkerError) {
                    // If checker endpoint fails, try the regular endpoint as fallback
                    console.warn('Checker endpoint failed, trying regular endpoint:', checkerError)
                    review = await apiClient.getReview(id)
                }
            } else {
                // For makers and admins, use the regular endpoint
                review = await apiClient.getReview(id)
            }

            setSelectedReview(review)
            // Determine view mode based on review status and user permissions
            if (review.status === 'DRAFT' && review.submitted_by === user?.id) {
                setViewMode('edit')
            } else {
                // Always use edit mode for specific review access - ReviewForm will handle permissions
                // This ensures checkers get approve/reject actions and makers get read-only view
                setViewMode('edit')
            }
        } catch (error) {
            console.error('Error fetching review:', error)
            // If review not found or error, go back to list
            setSelectedReview(null)
            setViewMode('list')
            // Optionally show an error message
        } finally {
            setLoading(false)
        }
    }

    const handleCreateReview = () => {
        setSelectedReview(null)
        setInitialClientId(null)
        setViewMode('create')
    }

    const handleReviewSelect = (review: Review) => {
        setSelectedReview(review)
        if (review.status === 'DRAFT' && review.submitted_by === user?.id) {
            setViewMode('edit')
        } else {
            // Always use edit mode for specific review access - ReviewForm will handle permissions
            // This ensures checkers get approve/reject actions and makers get read-only view
            setViewMode('edit')
        }
    }

    const handleBackToList = () => {
        setSelectedReview(null)
        setInitialClientId(null)
        setViewMode('list')
    }

    const handleReviewSaved = () => {
        // Optionally refresh the list or show success message
        setInitialClientId(null)
        setViewMode('list')
    }

    const handleReviewSubmitted = () => {
        // Optionally refresh the list or show success message
        setInitialClientId(null)
        setViewMode('list')
    }

    const getPageTitle = () => {
        switch (viewMode) {
            case 'create':
                return 'Create Review'
            case 'edit':
                return selectedReview ? `Review: ${selectedReview.client_id}` : 'Edit Review'
            default:
                return 'Reviews'
        }
    }

    const renderContent = () => {
        if (loading) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress size={60} />
                </Box>
            )
        }

        switch (viewMode) {
            case 'create':
                return (
                    <ReviewForm
                        clientId={initialClientId || undefined}
                        onSave={handleReviewSaved}
                        onSubmit={handleReviewSubmitted}
                        onCancel={handleBackToList}
                    />
                )

            case 'edit':
                return selectedReview ? (
                    <ReviewForm
                        reviewId={selectedReview.id}
                        clientId={selectedReview.client_id}
                        onSave={handleReviewSaved}
                        onSubmit={handleReviewSubmitted}
                        onCancel={handleBackToList}
                    />
                ) : null

            case 'list':
            default:
                return (
                    <Box>
                        {/* Role-based view selection */}
                        <RoleGuard allowedRoles={['checker', 'admin']}>
                            <Box
                                sx={{
                                    mb: 3,
                                    display: 'flex',
                                    gap: 2,
                                    borderBottom: `1px solid ${theme.palette.grey[200]}`,
                                    pb: 2,
                                }}
                            >
                                <Button
                                    onClick={() => setViewMode('list')}
                                    variant="contained"
                                    sx={{
                                        fontWeight: 600,
                                        background: gradients.primary,
                                        '&:hover': {
                                            background: gradients.primary,
                                        },
                                    }}
                                >
                                    All Reviews
                                </Button>
                            </Box>
                        </RoleGuard>

                        <ReviewList
                            onReviewSelect={handleReviewSelect}
                            onCreateReview={handleCreateReview}
                        />
                    </Box>
                )
        }
    }

    return (
        <ModernLayout title={getPageTitle()}>
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    p: { xs: 2, sm: 3, md: 3, lg: 4, xl: 5 },
                }}
            >
                {renderContent()}
            </Box>
        </ModernLayout>
    )
}