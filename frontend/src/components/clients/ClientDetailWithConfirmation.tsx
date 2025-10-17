import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Typography,
} from '@mui/material'
import { apiClient } from '../../services'
import type { Client, Review } from '../../types'
import { DetailPageContainer } from '../common/DetailPageContainer'
import { FormWithConfirmation } from '../common/FormWithConfirmation'
import {
    DetailHeaderSkeleton,
    OverviewTabSkeleton,
    TableRowSkeleton
} from '../common/LoadingStates'
import {
    ErrorDisplay,
    SuccessDisplay,
    CenteredError
} from '../common/ErrorHandling'
import { ClientDetailHeader } from './ClientDetailHeader'
import { ClientDetailTabs, type ClientTabType } from './ClientDetailTabs'
import { ClientOverviewTab } from './ClientOverviewTab'
import { ClientReviewsTab } from './ClientReviewsTab'
import { useAnnouncement, useAccessibleLoading } from '../../hooks/useAccessibility'
import { useDetailFocusManagement } from '../../hooks/useDetailFocusManagement'

interface ClientDetailWithConfirmationProps {
    clientId: string
    onBack: () => void
    className?: string
}

/**
 * Enhanced ClientDetail component with form navigation confirmation
 * 
 * Features:
 * - Tracks form dirty state when editing client details
 * - Shows confirmation dialog when navigating away from unsaved changes
 * - Provides "Stay", "Leave", and "Save and Leave" options
 * - Integrates with React Router for navigation blocking
 */
export const ClientDetailWithConfirmation: React.FC<ClientDetailWithConfirmationProps> = ({
    clientId,
    onBack,
    className = ''
}) => {
    const navigate = useNavigate()
    const { announce } = useAnnouncement()
    const { focusFirstError, getSkipLinkProps, getMainContentProps } = useDetailFocusManagement('client')
    const [client, setClient] = useState<Client | null>(null)
    const [reviews, setReviews] = useState<Review[]>([])
    const [loading, setLoading] = useState(true)
    const [reviewsLoading, setReviewsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<ClientTabType>('overview')
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<Partial<Client>>({})
    const [originalForm, setOriginalForm] = useState<Partial<Client>>({})
    const [saving, setSaving] = useState(false)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    // Accessibility loading props
    const loadingProps = useAccessibleLoading(loading, 'Loading client details')

    // Calculate if form is dirty
    const isFormDirty = isEditing && JSON.stringify(editForm) !== JSON.stringify(originalForm)

    useEffect(() => {
        fetchClientDetails()
        fetchClientReviews()
    }, [clientId])

    const fetchClientDetails = async () => {
        try {
            setLoading(true)
            const client = await apiClient.getClient(clientId)
            setClient(client)
            setError(null)
            announce(`Client details loaded for ${client.name}`, 'polite')
        } catch (err) {
            const errorMessage = 'Failed to load client details'
            setError(errorMessage)
            announce(errorMessage, 'assertive')
            console.error('Client details error:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchClientReviews = async () => {
        try {
            setReviewsLoading(true)
            const reviews = await apiClient.getClientReviews(clientId)
            setReviews(reviews)
        } catch (err) {
            console.error('Client reviews error:', err)
        } finally {
            setReviewsLoading(false)
        }
    }

    const handleCreateReview = () => {
        // Navigate to review creation page using React Router
        navigate(`/reviews/create?client_id=${clientId}`)
    }

    const handleViewReview = (reviewId: number) => {
        // Navigate to review detail page using React Router
        navigate(`/reviews/${reviewId}`)
    }

    const handleEditClick = () => {
        if (client) {
            const formData = {
                name: client.name,
                risk_level: client.risk_level,
                country: client.country,
                status: client.status,
                domicile_branch: client.domicile_branch || '',
                relationship_manager: client.relationship_manager || '',
                business_unit: client.business_unit || '',
                aml_risk: client.aml_risk || undefined,
                auto_kyc_review: client.auto_kyc_review,
                auto_aml_review: client.auto_aml_review,
                auto_sanctions_review: client.auto_sanctions_review,
                auto_pep_review: client.auto_pep_review,
                auto_financial_review: client.auto_financial_review
            }
            setEditForm(formData)
            setOriginalForm(formData)
            setIsEditing(true)
            setValidationErrors({})
        }
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
        setEditForm({})
        setOriginalForm({})
        setValidationErrors({})
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}

        if (!editForm.name?.trim()) {
            errors.name = 'Client name is required'
        } else if (editForm.name.length > 255) {
            errors.name = 'Client name must be 255 characters or less'
        }

        if (!editForm.risk_level) {
            errors.risk_level = 'Risk level is required'
        }

        if (!editForm.country?.trim()) {
            errors.country = 'Country is required'
        } else if (editForm.country.length > 100) {
            errors.country = 'Country must be 100 characters or less'
        }

        if (!editForm.status) {
            errors.status = 'Status is required'
        }

        // Validate optional fields are not empty strings if provided
        if (editForm.domicile_branch !== undefined && editForm.domicile_branch !== null && editForm.domicile_branch.trim() === '') {
            errors.domicile_branch = 'Domicile branch cannot be empty'
        } else if (editForm.domicile_branch && editForm.domicile_branch.length > 100) {
            errors.domicile_branch = 'Domicile branch must be 100 characters or less'
        }

        if (editForm.relationship_manager !== undefined && editForm.relationship_manager !== null && editForm.relationship_manager.trim() === '') {
            errors.relationship_manager = 'Relationship manager cannot be empty'
        } else if (editForm.relationship_manager && editForm.relationship_manager.length > 100) {
            errors.relationship_manager = 'Relationship manager must be 100 characters or less'
        }

        if (editForm.business_unit !== undefined && editForm.business_unit !== null && editForm.business_unit.trim() === '') {
            errors.business_unit = 'Business unit cannot be empty'
        } else if (editForm.business_unit && editForm.business_unit.length > 100) {
            errors.business_unit = 'Business unit must be 100 characters or less'
        }

        setValidationErrors(errors)

        // Focus first error field if validation fails
        if (Object.keys(errors).length > 0) {
            setTimeout(() => focusFirstError(), 100)
        }

        return Object.keys(errors).length === 0
    }

    const handleSaveEdit = async () => {
        if (!validateForm()) {
            announce('Please correct the form errors before saving', 'assertive')
            return
        }

        try {
            setSaving(true)
            announce('Saving client changes', 'polite')

            // Prepare update data, converting empty strings to null for optional fields
            const updateData = {
                ...editForm,
                domicile_branch: (editForm.domicile_branch && editForm.domicile_branch.trim()) || null,
                relationship_manager: (editForm.relationship_manager && editForm.relationship_manager.trim()) || null,
                business_unit: (editForm.business_unit && editForm.business_unit.trim()) || null,
                aml_risk: editForm.aml_risk || null
            }

            const updatedClient = await apiClient.updateClient(clientId, updateData)
            setClient(updatedClient)
            setIsEditing(false)
            setEditForm({})
            setOriginalForm({})
            setValidationErrors({})
            const successMsg = 'Client updated successfully'
            setSuccessMessage(successMsg)
            setError(null)
            announce(successMsg, 'polite')

            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000)
        } catch (err: any) {
            console.error('Failed to update client:', err)
            let errorMessage = 'Failed to update client. Please try again.'
            if (err.response?.data?.detail) {
                errorMessage = `Failed to update client: ${err.response.data.detail}`
            }
            setError(errorMessage)
            announce(errorMessage, 'assertive')
            throw err // Re-throw to let FormWithConfirmation handle the error
        } finally {
            setSaving(false)
        }
    }

    const handleFormChange = (field: keyof Client, value: any) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }))

        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    if (loading) {
        return (
            <DetailPageContainer className={className}>
                <Box
                    role="main"
                    aria-label="Client details loading"
                    {...loadingProps}
                >
                    <DetailHeaderSkeleton />
                    <Box sx={{ mb: 3 }}>
                        {/* Tabs skeleton */}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                            <Box sx={{ display: 'flex', gap: 4 }}>
                                {['Overview', 'Reviews', 'Documents'].map((_, index) => (
                                    <Box key={index} sx={{ py: 2 }}>
                                        <Box
                                            sx={{
                                                width: 80,
                                                height: 20,
                                                bgcolor: 'grey.200',
                                                borderRadius: 1,
                                                animation: 'pulse 1.5s ease-in-out infinite'
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <OverviewTabSkeleton />
                    </Box>
                </Box>
            </DetailPageContainer>
        )
    }

    if (error || !client) {
        return (
            <DetailPageContainer className={className}>
                <Box role="main" aria-label="Client details error">
                    <CenteredError
                        error={error || 'Client not found'}
                        title="Failed to load client"
                        onRetry={fetchClientDetails}
                        retryText="Retry"
                    />
                </Box>
            </DetailPageContainer>
        )
    }

    return (
        <FormWithConfirmation
            isDirty={isFormDirty}
            onSave={handleSaveEdit}
            canSave={isEditing}
            isLoading={saving}
            className={className}
        >
            <DetailPageContainer>
                {/* Skip Link */}
                <a {...getSkipLinkProps()}>
                    Skip to main content
                </a>

                <Box
                    component="main"
                    role="main"
                    aria-labelledby="client-detail-heading"
                    aria-describedby="client-detail-description"
                    {...getMainContentProps()}
                >
                    {/* Screen reader description */}
                    <Box id="client-detail-description" className="sr-only">
                        Client detail page for {client.name}. Use tab navigation to move between sections.
                    </Box>

                    {/* Success Message */}
                    {successMessage && (
                        <Box sx={{ mb: 3 }} role="status" aria-live="polite">
                            <SuccessDisplay
                                message={successMessage}
                                onDismiss={() => setSuccessMessage(null)}
                            />
                        </Box>
                    )}

                    {/* Error Message */}
                    {error && !loading && client && (
                        <Box sx={{ mb: 3 }} role="alert" aria-live="assertive">
                            <ErrorDisplay
                                error={error}
                                title="Update Failed"
                                onDismiss={() => setError(null)}
                            />
                        </Box>
                    )}

                    {/* Header */}
                    <header>
                        <ClientDetailHeader
                            client={client}
                            isEditing={isEditing}
                            onBack={onBack}
                            onEdit={handleEditClick}
                            onSave={handleSaveEdit}
                            onCancel={handleCancelEdit}
                            onCreateReview={handleCreateReview}
                            saving={saving}
                        />
                    </header>

                    {/* Navigation */}
                    <nav aria-label="Client detail sections">
                        <ClientDetailTabs
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            reviewCount={reviews.length}
                        />
                    </nav>

                    {/* Tab Content */}
                    <section
                        role="tabpanel"
                        id={`${activeTab}-tabpanel`}
                        aria-labelledby={`${activeTab}-tab`}
                    >
                        {activeTab === 'overview' && (
                            <ClientOverviewTab
                                client={client}
                                isEditing={isEditing}
                                editForm={editForm}
                                validationErrors={validationErrors}
                                onFormChange={handleFormChange}
                            />
                        )}

                        {activeTab === 'reviews' && (
                            reviewsLoading ? (
                                <Box
                                    sx={{ p: { xs: 2, sm: 3, lg: 4 } }}
                                    aria-label="Loading client reviews"
                                    aria-busy="true"
                                >
                                    <TableRowSkeleton columns={6} />
                                </Box>
                            ) : (
                                <ClientReviewsTab
                                    reviews={reviews}
                                    onViewReview={handleViewReview}
                                    onCreateReview={handleCreateReview}
                                />
                            )
                        )}

                        {activeTab === 'documents' && (
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
                                role="region"
                                aria-label="Documents section"
                            >
                                <Box
                                    sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
                                    aria-hidden="true"
                                >
                                    📄
                                </Box>
                                <Typography
                                    variant="h5"
                                    gutterBottom
                                    fontWeight={600}
                                    component="h2"
                                >
                                    No documents found
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Documents will appear here when reviews are created with attachments.
                                </Typography>
                            </Box>
                        )}
                    </section>
                </Box>
            </DetailPageContainer>
        </FormWithConfirmation>
    )
}

export default ClientDetailWithConfirmation