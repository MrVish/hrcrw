import React, { useState, useEffect } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    Alert,
    CircularProgress,
    Chip,
    RadioGroup,
    FormControlLabel,
    Radio,
    Divider,
    useTheme,
    Paper,
    Container,
    Stack,
    Autocomplete
} from '@mui/material'
import {
    Save as SaveIcon,
    Send as SendIcon,
    Assignment as FileTextIcon,
    Warning as AlertTriangleIcon,
    CheckCircle,
    ArrowBack as ArrowBackIcon,
    Business as BusinessIcon,
    Assessment as AssessmentIcon,
    Description as DescriptionIcon,
    Recommend as RecommendIcon
} from '@mui/icons-material'
import { apiClient } from '../../services'
import { DocumentUpload, DocumentList } from '../documents'
import { KYCQuestionnaireForm } from '../kyc'
import { FormWithConfirmation } from '../common/FormWithConfirmation'
import { gradients } from '../../theme'
import type { KYCQuestionnaire } from '../../types'

interface ReviewFormData {
    client_id: string
    risk_assessment: string
    compliance_notes: string
    recommendations: string
    kyc_questionnaire?: KYCQuestionnaire
}

interface Client {
    client_id: string
    name: string
    risk_level: string
    country: string
}

interface ReviewFormWithConfirmationProps {
    reviewId?: number
    clientId?: string
    onSave?: (reviewId: number) => void
    onSubmit?: (reviewId: number) => void
    onCancel?: () => void
}

/**
 * Enhanced ReviewForm component with form navigation confirmation
 * 
 * Features:
 * - Tracks form dirty state when editing review details
 * - Shows confirmation dialog when navigating away from unsaved changes
 * - Provides "Stay", "Leave", and "Save and Leave" options
 * - Integrates with React Router for navigation blocking
 */
export const ReviewFormWithConfirmation: React.FC<ReviewFormWithConfirmationProps> = ({
    reviewId,
    clientId,
    onSave,
    onSubmit,
    onCancel
}) => {
    const [formData, setFormData] = useState<ReviewFormData>({
        client_id: clientId || '',
        risk_assessment: '',
        compliance_notes: '',
        recommendations: ''
    })
    const [originalFormData, setOriginalFormData] = useState<ReviewFormData>({
        client_id: clientId || '',
        risk_assessment: '',
        compliance_notes: '',
        recommendations: ''
    })
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [currentReviewId, setCurrentReviewId] = useState<number | null>(reviewId || null)
    const [showDocuments, setShowDocuments] = useState(false)
    const [kycData, setKycData] = useState<KYCQuestionnaire | null>(null)
    const [originalKycData, setOriginalKycData] = useState<KYCQuestionnaire | null>(null)
    const [kycValid, setKycValid] = useState(false)
    const [kycErrors, setKycErrors] = useState<string[]>([])
    const [useStructuredKyc, setUseStructuredKyc] = useState(true)

    // Calculate if form is dirty
    const isFormDirty =
        JSON.stringify(formData) !== JSON.stringify(originalFormData) ||
        JSON.stringify(kycData) !== JSON.stringify(originalKycData)

    useEffect(() => {
        fetchClients()
        if (reviewId) {
            fetchReviewData()
        }
    }, [reviewId])

    const fetchClients = async () => {
        try {
            const clientsResponse = await apiClient.getClients()
            setClients(clientsResponse.clients)
        } catch (err) {
            console.error('Failed to fetch clients:', err)
        }
    }

    const fetchReviewData = async () => {
        if (!reviewId) return

        try {
            setLoading(true)
            const review = await apiClient.getReview(reviewId)

            const reviewFormData = {
                client_id: review.client_id,
                risk_assessment: '', // These fields don't exist in the backend model
                compliance_notes: '',
                recommendations: review.comments || '' // Use comments field instead
            }

            setFormData(reviewFormData)
            setOriginalFormData(reviewFormData)
            setCurrentReviewId(review.id)
            setShowDocuments(true)
        } catch (err) {
            setError('Failed to load review data')
            console.error('Review fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: keyof ReviewFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError(null)
        setSuccess(null)
    }

    const handleDocumentUpload = () => {
        setSuccess('Document uploaded successfully')
    }

    const handleDocumentUploadError = (error: string) => {
        setError(error)
    }

    const handleDocumentDelete = () => {
        setSuccess('Document deleted successfully')
    }

    const refreshDocuments = () => {
        // This will be handled by the DocumentList component
        setSuccess('Documents refreshed')
    }

    const handleKycDataChange = (data: KYCQuestionnaire, exceptions: any[]) => {
        setKycData(data)
        setFormData(prev => ({
            ...prev,
            kyc_questionnaire: data,
            exceptions: exceptions
        }))
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

        if (useStructuredKyc) {
            // Validate KYC questionnaire
            if (!kycValid) {
                setError('Please complete the KYC questionnaire before submitting')
                return false
            }
            if (kycErrors.length > 0) {
                setError(`KYC validation errors: ${kycErrors.join(', ')}`)
                return false
            }
        } else {
            // Validate traditional form fields
            if (!formData.risk_assessment.trim()) {
                setError('Risk assessment is required')
                return false
            }

            if (!formData.compliance_notes.trim()) {
                setError('Compliance notes are required')
                return false
            }
        }

        return true
    }

    const handleSave = async () => {
        if (!validateForm()) return

        try {
            setSaving(true)
            setError(null)

            const payload = useStructuredKyc ? {
                client_id: formData.client_id,
                kyc_questionnaire: kycData,
                status: 'Draft'
            } : {
                client_id: formData.client_id,
                risk_assessment: formData.risk_assessment,
                compliance_notes: formData.compliance_notes,
                recommendations: formData.recommendations,
                status: 'Draft'
            }

            let response
            if (reviewId) {
                response = await apiClient.updateReview(reviewId, payload)
            } else {
                response = await apiClient.createReview(payload)
            }

            const savedReviewId = response.id
            setCurrentReviewId(savedReviewId)
            setShowDocuments(true)

            // Update original data to reflect saved state
            setOriginalFormData({ ...formData })
            setOriginalKycData(kycData ? { ...kycData } : null)

            setSuccess('Review saved successfully')
            if (onSave) {
                onSave(savedReviewId)
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save review')
            console.error('Save error:', err)
            throw err // Re-throw to let FormWithConfirmation handle the error
        } finally {
            setSaving(false)
        }
    }

    const handleSubmit = async () => {
        if (!validateForm()) return

        try {
            setSubmitting(true)
            setError(null)

            const payload = useStructuredKyc ? {
                client_id: formData.client_id,
                kyc_questionnaire: kycData,
                status: 'Submitted'
            } : {
                client_id: formData.client_id,
                risk_assessment: formData.risk_assessment,
                compliance_notes: formData.compliance_notes,
                recommendations: formData.recommendations,
                status: 'Submitted'
            }

            let response
            if (reviewId) {
                response = await apiClient.updateReview(reviewId, payload)
            } else {
                response = await apiClient.createReview(payload)
            }

            const submittedReviewId = response.id
            setCurrentReviewId(submittedReviewId)

            // Update original data to reflect submitted state
            setOriginalFormData({ ...formData })
            setOriginalKycData(kycData ? { ...kycData } : null)

            setSuccess('Review submitted successfully')
            if (onSubmit) {
                onSubmit(submittedReviewId)
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to submit review')
            console.error('Submit error:', err)
            throw err // Re-throw to let FormWithConfirmation handle the error
        } finally {
            setSubmitting(false)
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
        <FormWithConfirmation
            isDirty={isFormDirty}
            onSave={handleSave}
            canSave={true}
            isLoading={saving || submitting}
        >
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
                        {reviewId ? 'Edit Review' : 'Create New Review'}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                        Complete the compliance review for the selected high-risk client
                    </Typography>
                </Paper>

                {/* Error Alert */}
                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 3, borderRadius: 2 }}
                        onClose={() => setError(null)}
                        icon={<AlertTriangleIcon />}
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
                                        disabled={!!clientId || !!reviewId}
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
                                        renderOption={(props, client) => (
                                            <Box component="li" {...props}>
                                                <Box>
                                                    <Typography variant="body1" fontWeight={500}>
                                                        {client.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        ID: {client.client_id} • Risk: {client.risk_level} • Country: {client.country}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
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

                            {/* Review Method Selection */}
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
                                        <AssessmentIcon color="primary" />
                                        <Typography variant="h6" fontWeight={600}>
                                            Review Method
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />

                                    <FormControl component="fieldset">
                                        <RadioGroup
                                            value={useStructuredKyc ? 'structured' : 'traditional'}
                                            onChange={(e) => setUseStructuredKyc(e.target.value === 'structured')}
                                            sx={{ gap: 2 }}
                                        >
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 3,
                                                    border: `2px solid ${useStructuredKyc ? theme.palette.primary.main : theme.palette.grey[200]}`,
                                                    borderRadius: 2,
                                                    backgroundColor: useStructuredKyc ? theme.palette.primary.main + '08' : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        borderColor: theme.palette.primary.main,
                                                        backgroundColor: theme.palette.primary.main + '08',
                                                    }
                                                }}
                                                onClick={() => setUseStructuredKyc(true)}
                                            >
                                                <FormControlLabel
                                                    value="structured"
                                                    control={<Radio />}
                                                    label={
                                                        <Box>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                <Typography variant="body1" fontWeight={600}>
                                                                    📋 Structured KYC Questionnaire
                                                                </Typography>
                                                                <Chip label="Recommended" size="small" color="primary" />
                                                            </Box>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Complete a structured 12-question KYC assessment for comprehensive compliance review.
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    sx={{ m: 0, width: '100%' }}
                                                />
                                            </Paper>

                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 3,
                                                    border: `2px solid ${!useStructuredKyc ? theme.palette.primary.main : theme.palette.grey[200]}`,
                                                    borderRadius: 2,
                                                    backgroundColor: !useStructuredKyc ? theme.palette.primary.main + '08' : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        borderColor: theme.palette.primary.main,
                                                        backgroundColor: theme.palette.primary.main + '08',
                                                    }
                                                }}
                                                onClick={() => setUseStructuredKyc(false)}
                                            >
                                                <FormControlLabel
                                                    value="traditional"
                                                    control={<Radio />}
                                                    label={
                                                        <Box>
                                                            <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                                                                📝 Traditional Free-form Review
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Use traditional free-form fields for risk assessment and compliance notes.
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    sx={{ m: 0, width: '100%' }}
                                                />
                                            </Paper>
                                        </RadioGroup>
                                    </FormControl>
                                </CardContent>
                            </Card>

                            {useStructuredKyc ? (
                                /* KYC Questionnaire */
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
                                            initialData={formData.kyc_questionnaire}
                                            onDataChange={handleKycDataChange}
                                            onValidationChange={handleKycValidationChange}
                                            disabled={loading || saving || submitting}
                                            className="kyc-questionnaire-section"
                                        />
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    {/* Risk Assessment */}
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
                                                <AssessmentIcon color="primary" />
                                                <Typography variant="h6" fontWeight={600}>
                                                    Risk Assessment
                                                </Typography>
                                            </Box>
                                            <Divider sx={{ mb: 3 }} />

                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={6}
                                                label="Risk Assessment Analysis"
                                                value={formData.risk_assessment}
                                                onChange={(e) => handleInputChange('risk_assessment', e.target.value)}
                                                placeholder="Provide detailed risk assessment analysis..."
                                                required
                                                helperText="Analyze the client's risk profile, including transaction patterns, geographic exposure, and regulatory concerns."
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* Compliance Notes */}
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
                                                <DescriptionIcon color="primary" />
                                                <Typography variant="h6" fontWeight={600}>
                                                    Compliance Review
                                                </Typography>
                                            </Box>
                                            <Divider sx={{ mb: 3 }} />

                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={6}
                                                label="Compliance Notes"
                                                value={formData.compliance_notes}
                                                onChange={(e) => handleInputChange('compliance_notes', e.target.value)}
                                                placeholder="Document compliance findings and observations..."
                                                required
                                                helperText="Document AML/CTF compliance findings, regulatory requirements, and any red flags identified."
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* Recommendations */}
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
                                                <RecommendIcon color="primary" />
                                                <Typography variant="h6" fontWeight={600}>
                                                    Recommendations
                                                </Typography>
                                            </Box>
                                            <Divider sx={{ mb: 3 }} />

                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={4}
                                                label="Recommendations"
                                                value={formData.recommendations}
                                                onChange={(e) => handleInputChange('recommendations', e.target.value)}
                                                placeholder="Provide recommendations for ongoing monitoring or actions..."
                                                helperText="Suggest next steps, monitoring requirements, or risk mitigation strategies."
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                            />
                                        </CardContent>
                                    </Card>
                                </>
                            )}

                            {/* Action Buttons */}
                            <Card
                                elevation={0}
                                sx={{
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: 3,
                                    overflow: 'hidden'
                                }}
                            >
                                <CardContent sx={{ p: 4 }}>
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={2}
                                        justifyContent="flex-end"
                                    >
                                        <Button
                                            variant="outlined"
                                            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                                            onClick={handleSave}
                                            disabled={saving || submitting}
                                            sx={{
                                                borderRadius: 2,
                                                px: 4,
                                                py: 1.5,
                                            }}
                                        >
                                            {saving ? 'Saving...' : 'Save Draft'}
                                        </Button>
                                        <Button
                                            variant="contained"
                                            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                                            onClick={handleSubmit}
                                            disabled={saving || submitting}
                                            sx={{
                                                borderRadius: 2,
                                                px: 4,
                                                py: 1.5,
                                            }}
                                        >
                                            {submitting ? 'Submitting...' : 'Submit Review'}
                                        </Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>

                    {/* Sidebar */}
                    <Grid item xs={12} lg={4}>
                        {showDocuments && currentReviewId && (
                            <Stack spacing={4}>
                                {/* Document Upload */}
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
                                            <FileTextIcon color="primary" />
                                            <Typography variant="h6" fontWeight={600}>
                                                Documents
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ mb: 3 }} />

                                        <DocumentUpload
                                            reviewId={currentReviewId}
                                            onUpload={handleDocumentUpload}
                                            onError={handleDocumentUploadError}
                                        />

                                        <Box sx={{ mt: 3 }}>
                                            <DocumentList
                                                reviewId={currentReviewId}
                                                onDelete={handleDocumentDelete}
                                                onRefresh={refreshDocuments}
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Stack>
                        )}
                    </Grid>
                </Grid>
            </Container>
        </FormWithConfirmation>
    )
}

export default ReviewFormWithConfirmation