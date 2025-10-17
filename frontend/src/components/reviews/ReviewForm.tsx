import React, { useState, useEffect, useMemo } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Alert,
    CircularProgress,
    Chip,
    Divider,
    useTheme,
    Paper,
    Container,
    Stack,
    Autocomplete,
    TextField
} from '@mui/material'
import {
    Warning as AlertTriangleIcon,
    CheckCircle,
    ArrowBack as ArrowBackIcon,
    Business as BusinessIcon
} from '@mui/icons-material'
import { apiClient } from '../../services'
import { useAuth } from '../../contexts/AuthContext'

import { KYCQuestionnaireForm } from '../kyc'
import ActionButtonGroup from '../common/ActionButtonGroup'
import RejectionDialog from '../common/RejectionDialog'
import { approveReview, rejectReview } from '../../services/makerCheckerActions'
import { getAvailableActions, isOwner } from '../../utils/actionConfig'
import type { KYCQuestionnaire, ActionType, Review } from '../../types'


interface LocalReviewFormData {
    client_id: string
    kyc_questionnaire?: KYCQuestionnaire
}

interface Client {
    client_id: string
    name: string
    risk_level: string
    country: string
}

interface ReviewFormProps {
    reviewId?: number
    clientId?: string
    onSave?: (reviewId: number) => void
    onSubmit?: (reviewId: number) => void
    onCancel?: () => void
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
    reviewId,
    clientId,
    onSave,
    onSubmit,
    onCancel
}) => {
    const { user } = useAuth()
    const [formData, setFormData] = useState<LocalReviewFormData>({
        client_id: clientId || ''
    })
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [currentReviewId, setCurrentReviewId] = useState<number | null>(reviewId || null)

    const [kycData, setKycData] = useState<KYCQuestionnaire | null>(null)
    const [kycValid, setKycValid] = useState(false)
    const [kycErrors, setKycErrors] = useState<string[]>([])
    const [selectedExceptions, setSelectedExceptions] = useState<any[]>([])

    const [reviewData, setReviewData] = useState<Review | null>(null)
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false)
    const [actionLoading, setActionLoading] = useState({
        save: false,
        submit: false,
        accept: false,
        reject: false
    })

    // Permission detection logic
    const permissions = useMemo(() => {
        if (!user || !reviewData) {
            // For new reviews, allow makers and admins to create
            if (!reviewData && user) {
                const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'
                if (['maker', 'admin'].includes(userRole)) {
                    return ['SAVE_DRAFT', 'SUBMIT'] as ActionType[]
                }
            }
            return ['VIEW_ONLY'] as ActionType[]
        }

        return getAvailableActions({
            user,
            item: reviewData,
            isOwner: isOwner(user, reviewData)
        })
    }, [user, reviewData])

    // Helper functions for permission checks
    const canEditForm = useMemo(() => {
        if (!user) return false

        // For new reviews (no reviewData), allow makers and admins to create
        if (!reviewData) {
            const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'
            return ['maker', 'admin'].includes(userRole)
        }

        // Makers can edit their own draft reviews
        const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'
        if (userRole === 'maker') {
            return isOwner(user, reviewData) && reviewData.status === 'DRAFT'
        }

        // Admins can edit any review that's not completed
        if (userRole === 'admin') {
            return !['APPROVED', 'REJECTED', 'COMPLETED'].includes(reviewData.status)
        }

        return false
    }, [user, reviewData])

    const canApproveReject = useMemo(() => {
        if (!user || !reviewData) return false

        const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'
        return ['checker', 'admin'].includes(userRole) &&
            ['SUBMITTED', 'UNDER_REVIEW'].includes(reviewData.status)
    }, [user, reviewData])



    // Determine if this is a view-only mode
    const isViewOnly = useMemo(() => {
        return !canEditForm && !canApproveReject
    }, [canEditForm, canApproveReject])

    // Determine if form fields should be read-only (for submitted reviews being checked)
    const isFormReadOnly = useMemo(() => {
        if (!user || !reviewData) return false

        const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'

        // For checkers: submitted reviews should be read-only, approved/rejected should be read-only
        if (userRole === 'checker') {
            return ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(reviewData.status)
        }

        // For admins: approved/rejected should be read-only
        if (userRole === 'admin') {
            return ['APPROVED', 'REJECTED'].includes(reviewData.status)
        }

        // For makers: only their own drafts are editable
        if (userRole === 'maker') {
            return !(isOwner(user, reviewData) && reviewData.status === 'DRAFT')
        }

        return true
    }, [user, reviewData])

    useEffect(() => {
        fetchClients()
        if (reviewId) {
            fetchReviewData()
        }
    }, [reviewId])

    const fetchClients = async () => {
        try {
            const clientsResponse = await apiClient.getClients()

            if (!clientsResponse || !clientsResponse.clients || !Array.isArray(clientsResponse.clients)) {
                console.warn('Invalid clients response:', clientsResponse)
                setClients([])
                setError('Failed to load clients. Please refresh the page.')
                return
            }

            setClients(clientsResponse.clients)
        } catch (err: any) {
            console.error('Failed to fetch clients:', err)
            setError('Failed to load clients. Please check your connection and try again.')
            setClients([])
        }
    }

    const fetchReviewData = async () => {
        if (!reviewId) return

        try {
            setLoading(true)

            // Use appropriate endpoint based on user role
            let review: any
            try {
                // First try the regular endpoint
                review = await apiClient.getReview(reviewId)
            } catch (error: any) {
                // If access denied and user is a checker, try the checking endpoint
                if (error?.message?.includes('Access denied') && user?.role === 'checker') {
                    review = await apiClient.getReviewForChecking(reviewId)
                } else {
                    throw error
                }
            }

            // Store the full review data for access control - ensure proper typing
            const reviewWithStatus: Review = {
                ...review,
                status: review.status?.toUpperCase() as Review['status'] || 'DRAFT'
            }
            setReviewData(reviewWithStatus)

            setFormData({
                client_id: review.client_id
            })

            // Set KYC questionnaire data if available
            if (review.kyc_questionnaire) {
                console.log('KYC questionnaire data found:', review.kyc_questionnaire)
                setKycData(review.kyc_questionnaire as KYCQuestionnaire)
                console.log('KYC data loaded for structured form')
            } else {
                console.log('No KYC questionnaire data found in review')
            }

            setCurrentReviewId(review.id)
        } catch (err: any) {
            if (err?.message?.includes('Access denied')) {
                // For checkers, try to provide more specific guidance
                if (user?.role === 'checker') {
                    setError('Access denied. Checkers can view submitted, approved, and rejected reviews. This review may be in draft status or you may not have the required permissions.')
                } else {
                    setError('You do not have permission to view this review. Please contact your administrator if you believe this is an error.')
                }
            } else if (err?.message?.includes('not accessible')) {
                setError('This review is currently not accessible. It may have been deleted or you may not have the required permissions.')
            } else {
                setError('Failed to load review data. Please try again or contact support if the problem persists.')
            }
            console.error('Review fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: keyof LocalReviewFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError(null)
        setSuccess(null)
    }



    const handleKycDataChange = (data: KYCQuestionnaire, exceptions: any[]) => {
        setKycData(data)
        setSelectedExceptions(exceptions)
        // Don't update formData.kyc_questionnaire to avoid infinite loop
        // The KYC data is stored separately in kycData state
    }

    const handleKycValidationChange = (isValid: boolean, errors: string[]) => {
        setKycValid(isValid)
        setKycErrors(errors)
    }

    const validateForm = (): boolean => {
        if (!formData.client_id) {
            setError('Please select a client')
            return false
        }

        // Validate KYC questionnaire
        if (!kycValid) {
            setError('Please complete the KYC questionnaire before submitting')
            return false
        }
        if (kycErrors.length > 0) {
            setError(`KYC validation errors: ${kycErrors.join(', ')}`)
            return false
        }

        return true
    }

    const handleSave = async () => {
        if (!validateForm()) return

        // Create payload without status (backend will set to DRAFT)
        const payload = {
            client_id: formData.client_id,
            kyc_questionnaire: kycData
        }

        try {
            setActionLoading(prev => ({ ...prev, save: true }))
            setError(null)

            let response
            if (reviewId) {
                response = await apiClient.updateReview(reviewId, payload)
            } else {
                response = await apiClient.createReview(payload)
            }

            const savedReviewId = response.id
            setCurrentReviewId(savedReviewId)

            // Update reviewData if this is a new review
            if (!reviewData && response) {
                const newReviewData: Review = {
                    ...response,
                    status: 'DRAFT'
                }
                setReviewData(newReviewData)
            }
            setSuccess('Review saved successfully')
            if (onSave) {
                onSave(savedReviewId)
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to save review'
            setError(errorMessage)
            console.error('Save error:', err)
            console.error('Save error details:', {
                status: err.response?.status,
                data: err.response?.data,
                payload: payload
            })
        } finally {
            setActionLoading(prev => ({ ...prev, save: false }))
        }
    }

    const handleSubmit = async () => {
        if (!validateForm()) return

        // Create payload outside try block so it's accessible in catch
        const payload = {
            client_id: formData.client_id,
            review_type: 'manual' as const,
            auto_created: false,
            comments: undefined,
            kyc_questionnaire: kycData ? {
                ...kycData,
                // Convert empty strings to null for optional fields to pass backend validation
                missing_kyc_details: kycData.missing_kyc_details?.trim() || null,
                adverse_media_evidence: kycData.adverse_media_evidence?.trim() || null,
                remedial_actions: kycData.remedial_actions?.trim() || null,
                purpose_of_account: kycData.purpose_of_account?.trim() || null
            } : null
        }

        try {
            setActionLoading(prev => ({ ...prev, submit: true }))
            setError(null)

            // Prepare exceptions for submission
            const exceptionsForSubmission = selectedExceptions.map(exception => ({
                exception_type: exception.type,
                title: exception.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                description: exception.description,
                priority: exception.type === 'kyc_non_compliance' ? 'high' : 'medium'
            }))

            console.log('Submitting review with payload:', payload)
            console.log('Selected client:', selectedClient)
            console.log('Form data client_id:', formData.client_id)
            console.log('KYC Data being sent:', kycData)
            console.log('KYC Data validation status:', { kycValid, kycErrors })
            console.log('Selected exceptions:', selectedExceptions)
            console.log('Exceptions for submission:', exceptionsForSubmission)

            let response
            if (reviewId) {
                // Update existing review
                response = await apiClient.updateReview(reviewId, payload)
                // Then submit it with exceptions
                response = await apiClient.submitReview(response.id, undefined, exceptionsForSubmission)
            } else {
                // Create new review (will be in DRAFT status)
                console.log('Creating new review...')
                response = await apiClient.createReview(payload)
                console.log('Review created:', response)
                // Then submit it with exceptions
                response = await apiClient.submitReview(response.id, undefined, exceptionsForSubmission)
                console.log('Review submitted:', response)
            }

            const submittedReviewId = response.id
            setCurrentReviewId(submittedReviewId)

            // Update reviewData to reflect new status
            if (reviewData) {
                setReviewData({ ...reviewData, status: 'SUBMITTED' })
            }

            const successMessage = exceptionsForSubmission.length > 0
                ? `Review submitted successfully with ${exceptionsForSubmission.length} exception${exceptionsForSubmission.length > 1 ? 's' : ''}`
                : 'Review submitted successfully'
            setSuccess(successMessage)
            if (onSubmit) {
                onSubmit(submittedReviewId)
            }
        } catch (err: any) {
            console.error('Full error object:', err)
            console.error('Error response:', err.response)
            console.error('Error request:', err.request)
            console.error('Error config:', err.config)

            let errorMessage = 'Failed to submit review'
            let errorDetails = null

            if (err.response) {
                // Server responded with error status
                errorMessage = err.response.data?.detail || err.response.data?.message || `Server error: ${err.response.status}`
                errorDetails = err.response.data
                console.error('Server error response:', {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    data: err.response.data,
                    headers: err.response.headers
                })
            } else if (err.request) {
                // Request was made but no response received
                errorMessage = 'No response from server. Please check if the backend is running.'
                console.error('No response received:', err.request)
            } else {
                // Something else happened
                errorMessage = err.message || 'Unknown error occurred'
                console.error('Request setup error:', err.message)
            }

            setError(errorMessage)
            console.error('Payload that caused error:', payload)
            console.error('KYC data:', kycData)

            // If we have detailed validation errors, log them
            if (errorDetails && typeof errorDetails === 'object') {
                console.error('Detailed error info:', errorDetails)
            }
        } finally {
            setActionLoading(prev => ({ ...prev, submit: false }))
        }
    }

    // Action handlers for approve/reject functionality
    const handleAccept = async (comments?: string) => {
        if (!reviewId) return

        try {
            setActionLoading(prev => ({ ...prev, accept: true }))
            setError(null)

            await approveReview(reviewId, comments)

            // Update reviewData to reflect new status
            if (reviewData) {
                setReviewData({ ...reviewData, status: 'APPROVED' })
            }

            setSuccess('Review approved successfully')

            // Refresh the page or navigate away
            if (onSubmit) {
                onSubmit(reviewId)
            }
        } catch (error: any) {
            setError(error.message || 'Failed to approve review')
            console.error('Approve review error:', error)
        } finally {
            setActionLoading(prev => ({ ...prev, accept: false }))
        }
    }

    const handleReject = async (reason: string) => {
        if (!reviewId) return

        try {
            setActionLoading(prev => ({ ...prev, reject: true }))
            setError(null)

            await rejectReview(reviewId, reason)

            // Update reviewData to reflect new status
            if (reviewData) {
                setReviewData({ ...reviewData, status: 'REJECTED' })
            }

            setSuccess('Review rejected successfully')
            setRejectionDialogOpen(false)

            // Refresh the page or navigate away
            if (onSubmit) {
                onSubmit(reviewId)
            }
        } catch (error: any) {
            setError(error.message || 'Failed to reject review')
            console.error('Reject review error:', error)
        } finally {
            setActionLoading(prev => ({ ...prev, reject: false }))
            setRejectionDialogOpen(false)
        }
    }

    const handleRejectClick = async (reason: string) => {
        if (reason.trim()) {
            await handleReject(reason)
        } else {
            setRejectionDialogOpen(true)
        }
    }



    const selectedClient = clients?.find(c => c.client_id === formData.client_id)

    const theme = useTheme()

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress size={60} />
                    <Typography sx={{ ml: 2 }}>Loading review...</Typography>
                </Box>
            </Container>
        )
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: 'white',
                    p: 4,
                    borderRadius: 3,
                    mb: 3,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={onCancel}
                        sx={{
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                    >
                        Back
                    </Button>
                </Box>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                    {reviewId ? 'Edit KYC Review' : 'Create New KYC Review'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Complete the structured KYC questionnaire for the selected high-risk client
                </Typography>
            </Paper>

            {/* Error Alert */}
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 3, borderRadius: 2 }}
                    onClose={() => setError(null)}
                    icon={<AlertTriangleIcon />}
                    action={
                        (error.includes('permission') || error.includes('not accessible')) && onCancel ? (
                            <Button color="inherit" size="small" onClick={onCancel}>
                                Go Back
                            </Button>
                        ) : undefined
                    }
                >
                    {error}
                </Alert>
            )}

            {/* Success Alert */}
            {success && (
                <Alert
                    severity="success"
                    sx={{ mb: 3, borderRadius: 2 }}
                    onClose={() => setSuccess(null)}
                    icon={<CheckCircle />}
                >
                    {success}
                </Alert>
            )}

            {/* Access Control Alert */}
            {(isViewOnly || isFormReadOnly) && user && reviewData && (
                <Alert
                    severity={canApproveReject ? "warning" : "info"}
                    sx={{ mb: 3, borderRadius: 2 }}
                >
                    {user.role === 'checker' && reviewData.status === 'SUBMITTED'
                        ? 'This review is submitted and ready for your review. Form fields are read-only, but you can Accept or Reject the review.'
                        : user.role === 'checker' && ['APPROVED', 'REJECTED'].includes(reviewData.status)
                            ? `This review has been ${reviewData.status.toLowerCase()} and is in read-only mode.`
                            : user.role === 'checker' && reviewData.status === 'DRAFT'
                                ? 'This review is still in draft status and is in view-only mode for checkers.'
                                : 'This review is in read-only mode.'}
                </Alert>
            )}

            {/* Authentication Alert */}
            {!user && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    You must be logged in to view this review
                </Alert>
            )}

            <Grid container spacing={4}>
                {/* Main Form Content */}
                <Grid item xs={12} lg={8}>
                    <Stack spacing={4}>
                        {/* Client Selection */}
                        <Card
                            elevation={0}
                            sx={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 3,
                                overflow: 'hidden'
                            }}
                        >
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                    <BusinessIcon color="primary" />
                                    <Typography variant="h6" fontWeight={600}>
                                        Client Information
                                    </Typography>
                                </Box>
                                <Divider sx={{ mb: 3 }} />

                                <Autocomplete
                                    options={clients}
                                    getOptionLabel={(client) => `${client.name} (${client.client_id}) - ${client.risk_level} Risk`}
                                    value={clients.find(c => c.client_id === formData.client_id) || null}
                                    onChange={(_, newValue) => {
                                        handleInputChange('client_id', newValue?.client_id || '')
                                    }}
                                    disabled={!!clientId || !!reviewId || isFormReadOnly}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Select Client"
                                            required
                                            helperText="Choose the high-risk client for this compliance review"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                },
                                            }}
                                        />
                                    )}
                                    renderOption={(props, client) => {
                                        const { key, ...otherProps } = props
                                        return (
                                            <Box component="li" key={key} {...otherProps}>
                                                <Box>
                                                    <Typography variant="body1" fontWeight={500}>
                                                        {client.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        ID: {client.client_id} • Risk: {client.risk_level} • Country: {client.country}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )
                                    }}
                                />

                                {selectedClient && (
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3,
                                            mt: 3,
                                            backgroundColor: theme.palette.grey[50],
                                            border: `1px solid ${theme.palette.grey[200]}`,
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                            <BusinessIcon color="action" />
                                            <Typography variant="h6" fontWeight={600}>
                                                {selectedClient.name}
                                            </Typography>
                                            <Chip
                                                label={`${selectedClient.risk_level} Risk`}
                                                color={
                                                    selectedClient.risk_level === 'High' ? 'error' :
                                                        selectedClient.risk_level === 'Medium' ? 'warning' : 'success'
                                                }
                                                size="small"
                                            />
                                            <Chip
                                                label={selectedClient.country}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Box>
                                    </Paper>
                                )}
                            </CardContent>
                        </Card>



                        {/* KYC Questionnaire - Now the only review method */}
                        <Card
                            elevation={0}
                            sx={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 3,
                                overflow: 'hidden'
                            }}
                        >
                            <CardContent sx={{ p: 4 }}>
                                <KYCQuestionnaireForm
                                    reviewId={currentReviewId || 0}
                                    initialData={kycData || undefined}
                                    onDataChange={handleKycDataChange}
                                    onValidationChange={handleKycValidationChange}
                                    disabled={loading || actionLoading.save || actionLoading.submit}
                                    readOnly={isFormReadOnly}
                                />
                            </CardContent>
                        </Card>



                    </Stack>
                </Grid>

                {/* Sidebar */}
                <Grid item xs={12} lg={4}>
                    <Box sx={{ position: 'sticky', top: 24 }}>
                        {/* Form Actions */}
                        <Card
                            elevation={0}
                            sx={{
                                border: `1px solid ${theme.palette.divider}`,
                                mb: 3,
                                borderRadius: 3,
                                overflow: 'hidden'
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Actions
                                </Typography>

                                <Box sx={{ mt: 2 }}>
                                    <ActionButtonGroup
                                        actions={permissions}
                                        onSave={handleSave}
                                        onSubmit={handleSubmit}
                                        onAccept={handleAccept}
                                        onReject={handleRejectClick}
                                        loading={actionLoading}
                                        disabled={false}
                                    />
                                </Box>

                                {/* Back button for view-only mode */}
                                {isViewOnly && (
                                    <Box sx={{ mt: 2 }}>
                                        <Button
                                            variant="outlined"
                                            size="large"
                                            startIcon={<ArrowBackIcon />}
                                            onClick={onCancel}
                                            fullWidth
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                                '&:hover': {
                                                    transform: 'translateY(-1px)',
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                                },
                                                transition: 'all 0.2s ease-in-out',
                                            }}
                                        >
                                            Back
                                        </Button>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>



                        {/* Document Management Info */}
                        <Card
                            elevation={0}
                            sx={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 3,
                                overflow: 'hidden'
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <CheckCircle sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                                    <Typography variant="h6" fontWeight={600}>
                                        Document Upload
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    Document uploads are integrated within the KYC questionnaire (Question 12: Source of Funds).
                                    Additional supporting documents can be uploaded after saving the review.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                </Grid>
            </Grid>

            {/* Rejection Dialog */}
            <RejectionDialog
                open={rejectionDialogOpen}
                onClose={() => setRejectionDialogOpen(false)}
                onConfirm={handleReject}
                title="Reject Review"
                itemType="Review"
                loading={actionLoading.reject}
            />
        </Container>
    )
}