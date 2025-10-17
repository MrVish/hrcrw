import React, { useState, useEffect } from 'react'
import {
    CheckCircle,
    XCircle,
    Clock,
    User,
    Calendar,
    AlertTriangle,
    Eye,
    MessageSquare,
    Settings
} from 'lucide-react'
import { apiClient } from '../../services'
import { useAuth } from '../../contexts'
import { DocumentList } from '../documents'
import { KYCResponseDisplay, KYCQuestionnaireForm, ExceptionDisplay } from '../kyc'
import type { ReviewDetail, KYCQuestionnaire, Exception } from '../../types'

// Use ReviewDetail which includes client_name and other extended fields
type Review = ReviewDetail



interface CheckerPanelProps {
    className?: string
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'SUBMITTED':
        case 'Submitted':
            return 'status-submitted'
        case 'UNDER_REVIEW':
        case 'Under Review':
            return 'status-under-review'
        case 'APPROVED':
        case 'Approved':
            return 'status-approved'
        case 'REJECTED':
        case 'Rejected':
            return 'status-rejected'
        default:
            return ''
    }
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



export const CheckerPanel: React.FC<CheckerPanelProps> = ({ className = '' }) => {
    const { user } = useAuth()
    const [reviews, setReviews] = useState<ReviewDetail[]>([])
    const [selectedReview, setSelectedReview] = useState<ReviewDetail | null>(null)
    const [selectedKYC, setSelectedKYC] = useState<KYCQuestionnaire | null>(null)
    const [selectedExceptions, setSelectedExceptions] = useState<Exception[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [comments, setComments] = useState('')
    const [filter, setFilter] = useState<'all' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'draft'>('submitted')
    const [exceptionStatuses, setExceptionStatuses] = useState<Record<number, string>>({})

    useEffect(() => {
        fetchReviews()
    }, [filter])

    const fetchReviews = async () => {
        try {
            setLoading(true)
            let reviews: ReviewDetail[]

            // For active reviews (submitted/under_review), use the checking endpoint
            if (filter === 'submitted' || filter === 'under_review') {
                const status = filter === 'submitted' ? 'SUBMITTED' : 'UNDER_REVIEW'
                reviews = await apiClient.getReviewsForChecking(status) as ReviewDetail[]
            } else {
                // For all other statuses, use the general reviews endpoint with status filter
                const statusFilter = filter === 'all' ? undefined : filter.toUpperCase() as 'DRAFT' | 'APPROVED' | 'REJECTED'
                const reviewsResponse = await apiClient.getReviews({
                    status: statusFilter
                }, 1, 100) // Get more reviews for checker view
                reviews = reviewsResponse.reviews as ReviewDetail[]
            }

            setReviews(reviews)
            setError(null)
        } catch (err) {
            setError('Failed to load reviews')
            console.error('Reviews fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    // Status-based display mode logic
    const getDisplayMode = (review: Review | null) => {
        if (!review || !user) {
            return { isReadOnly: true, showActions: false, displayMode: 'view' as const }
        }

        const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'

        switch (review.status) {
            case 'DRAFT':
            case 'APPROVED':
            case 'REJECTED':
                return { isReadOnly: true, showActions: false, displayMode: 'view' as const }
            case 'SUBMITTED':
            case 'UNDER_REVIEW':
                // Only checkers and admins can review submitted/under_review reviews
                if (['checker', 'admin'].includes(userRole)) {
                    return { isReadOnly: false, showActions: true, displayMode: 'review' as const }
                }
                return { isReadOnly: true, showActions: false, displayMode: 'view' as const }
            default:
                return { isReadOnly: true, showActions: false, displayMode: 'view' as const }
        }
    }

    // Compute display mode for selected review
    const displayMode = getDisplayMode(selectedReview)
    const isFormReadOnly = displayMode.isReadOnly
    const canApproveReject = displayMode.showActions

    const handleReviewSelect = async (review: Review) => {
        try {
            // Check if user can review this specific review
            const reviewDisplayMode = getDisplayMode(review)

            // Only mark as under review if it's submitted and user can review it
            if (review.status === 'SUBMITTED' && reviewDisplayMode.showActions) {
                await apiClient.updateReview(review.id, {
                    reviewed_by: user?.id
                } as any)

                // Update local state
                setReviews(prev => prev.map(r =>
                    r.id === review.id
                        ? { ...r, status: 'UNDER_REVIEW' as const }
                        : r
                ))
                review.status = 'UNDER_REVIEW'
            }

            setSelectedReview(review)
            setComments('')

            // Load KYC questionnaire and exceptions for the selected review
            await loadReviewDetails(review.id)
        } catch (err) {
            console.error('Failed to update review status:', err)
        }
    }

    const loadReviewDetails = async (reviewId: number) => {
        setLoadingDetails(true)
        try {
            // Load KYC questionnaire - try for all review statuses
            try {
                const kycResponse = await apiClient.getKYCQuestionnaire(reviewId)
                setSelectedKYC(kycResponse)
                console.log('KYC questionnaire loaded for review:', reviewId)
            } catch (kycErr: any) {
                console.warn(`No KYC questionnaire found for review ${reviewId}:`, kycErr)
                setSelectedKYC(null)

                // Only log as error if it's not a 404 (missing data is expected for older reviews)
                if (kycErr?.response?.status !== 404) {
                    console.error('Unexpected error loading KYC data:', kycErr)
                }
            }

            // Load exceptions - try for all review statuses
            try {
                const exceptionsResponse = await apiClient.getReviewExceptions(reviewId)
                setSelectedExceptions(exceptionsResponse)

                // Initialize exception statuses
                const statuses: Record<number, string> = {}
                exceptionsResponse.forEach((exception: Exception) => {
                    statuses[exception.id] = exception.status
                })
                setExceptionStatuses(statuses)
                console.log('Exceptions loaded for review:', reviewId, exceptionsResponse.length)
            } catch (exceptionsErr: any) {
                console.warn(`No exceptions found for review ${reviewId}:`, exceptionsErr)
                setSelectedExceptions([])
                setExceptionStatuses({})

                // Only log as error if it's not a 404
                if (exceptionsErr?.response?.status !== 404) {
                    console.error('Unexpected error loading exceptions:', exceptionsErr)
                }
            }
        } catch (err) {
            console.error('Failed to load review details:', err)
            // Graceful fallback - don't break the interface
            setSelectedKYC(null)
            setSelectedExceptions([])
            setExceptionStatuses({})
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleApprove = async () => {
        if (!selectedReview) return

        // Validation for approving reviews with open exceptions
        const openExceptions = selectedExceptions.filter(ex =>
            (exceptionStatuses[ex.id] || ex.status).toLowerCase() === 'open'
        )

        if (openExceptions.length > 0) {
            const confirmApproval = window.confirm(
                `This review has ${openExceptions.length} open exception(s). Are you sure you want to approve it? Consider resolving exceptions first.`
            )
            if (!confirmApproval) return
        }

        try {
            setProcessing(true)
            setError(null)

            // Update exception statuses for any that have changed
            const exceptionUpdates = Object.entries(exceptionStatuses)
                .filter(([exceptionId, status]) => {
                    const originalException = selectedExceptions.find(ex => ex.id === parseInt(exceptionId))
                    return originalException && status !== originalException.status
                })
                .map(([exceptionId, status]) =>
                    apiClient.updateExceptionStatus(parseInt(exceptionId), status)
                )

            if (exceptionUpdates.length > 0) {
                await Promise.all(exceptionUpdates)
            }

            // Approve the review
            await apiClient.approveReview(selectedReview.id, comments.trim() || undefined)

            // Remove from list and clear selection
            setReviews(prev => prev.filter(r => r.id !== selectedReview.id))
            setSelectedReview(null)
            setSelectedKYC(null)
            setSelectedExceptions([])
            setComments('')
            setExceptionStatuses({})
            setError(null)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to approve review')
            console.error('Approve error:', err)
        } finally {
            setProcessing(false)
        }
    }

    const handleReject = async () => {
        if (!selectedReview) return

        if (!comments.trim()) {
            setError('Comments are required when rejecting a review')
            return
        }

        // Confirmation for rejection
        const confirmRejection = window.confirm(
            'Are you sure you want to reject this review? This action will send it back to the maker for revision.'
        )
        if (!confirmRejection) return

        try {
            setProcessing(true)
            setError(null)

            // Update exception statuses for any that have changed
            const exceptionUpdates = Object.entries(exceptionStatuses)
                .filter(([exceptionId, status]) => {
                    const originalException = selectedExceptions.find(ex => ex.id === parseInt(exceptionId))
                    return originalException && status !== originalException.status
                })
                .map(([exceptionId, status]) =>
                    apiClient.updateExceptionStatus(parseInt(exceptionId), status)
                )

            if (exceptionUpdates.length > 0) {
                await Promise.all(exceptionUpdates)
            }

            // Reject the review
            await apiClient.rejectReview(selectedReview.id, comments.trim())

            // Remove from list and clear selection
            setReviews(prev => prev.filter(r => r.id !== selectedReview.id))
            setSelectedReview(null)
            setSelectedKYC(null)
            setSelectedExceptions([])
            setComments('')
            setExceptionStatuses({})
            setError(null)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to reject review')
            console.error('Reject error:', err)
        } finally {
            setProcessing(false)
        }
    }

    const handleExceptionStatusChange = (exceptionId: number, newStatus: string) => {
        setExceptionStatuses(prev => ({
            ...prev,
            [exceptionId]: newStatus
        }))
    }

    const filteredReviews = reviews.filter(review => {
        if (filter === 'all') return true
        if (filter === 'submitted') return review.status === 'SUBMITTED'
        if (filter === 'under_review') return review.status === 'UNDER_REVIEW'
        if (filter === 'approved') return review.status === 'APPROVED'
        if (filter === 'rejected') return review.status === 'REJECTED'
        if (filter === 'draft') return review.status === 'DRAFT'
        return true
    })

    if (loading) {
        return (
            <div className={`checker-panel ${className}`}>
                <div className="loading-spinner">Loading reviews...</div>
            </div>
        )
    }

    return (
        <div className={`checker-panel ${className}`}>
            <div className="panel-header">
                <h2>Review Management</h2>
                <p>View and manage reviews across all statuses</p>
            </div>

            {error && (
                <div className="error-message bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-red-800 mb-1">Error Loading Reviews</h4>
                            <p className="text-sm text-red-700 mb-3">{error}</p>
                            <button
                                onClick={fetchReviews}
                                disabled={loading}
                                className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Retrying...' : 'Retry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="panel-content">
                {/* Review List */}
                <div className="review-queue">
                    <div className="queue-header">
                        <h3>Reviews ({filteredReviews.length})</h3>
                        <div className="filter-tabs">
                            <button
                                onClick={() => setFilter('submitted')}
                                className={`filter-tab ${filter === 'submitted' ? 'active' : ''}`}
                            >
                                New ({reviews.filter(r => r.status === 'SUBMITTED').length})
                            </button>
                            <button
                                onClick={() => setFilter('under_review')}
                                className={`filter-tab ${filter === 'under_review' ? 'active' : ''}`}
                            >
                                In Progress ({reviews.filter(r => r.status === 'UNDER_REVIEW').length})
                            </button>
                            <button
                                onClick={() => setFilter('approved')}
                                className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
                            >
                                Approved ({reviews.filter(r => r.status === 'APPROVED').length})
                            </button>
                            <button
                                onClick={() => setFilter('rejected')}
                                className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
                            >
                                Rejected ({reviews.filter(r => r.status === 'REJECTED').length})
                            </button>
                            <button
                                onClick={() => setFilter('draft')}
                                className={`filter-tab ${filter === 'draft' ? 'active' : ''}`}
                            >
                                Draft ({reviews.filter(r => r.status === 'DRAFT').length})
                            </button>
                            <button
                                onClick={() => setFilter('all')}
                                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                            >
                                All ({reviews.length})
                            </button>
                        </div>
                    </div>

                    {filteredReviews.length === 0 ? (
                        <div className="empty-queue">
                            <CheckCircle className="empty-icon" />
                            <h3>No reviews pending</h3>
                            <p>All reviews have been processed</p>
                        </div>
                    ) : (
                        <div className="review-list">
                            {filteredReviews.map(review => (
                                <div
                                    key={review.id}
                                    className={`review-item ${selectedReview?.id === review.id ? 'selected' : ''}`}
                                    onClick={() => handleReviewSelect(review)}
                                >
                                    <div className="review-summary">
                                        <div className="review-title">
                                            <h4>{review.client_name}</h4>
                                            <span className={`status-badge ${getStatusColor(review.status)}`}>
                                                {review.status === 'SUBMITTED' && <Clock size={14} />}
                                                {review.status === 'UNDER_REVIEW' && <Eye size={14} />}
                                                {review.status === 'SUBMITTED' ? 'Submitted' :
                                                    review.status === 'UNDER_REVIEW' ? 'Under Review' :
                                                        review.status}
                                            </span>
                                        </div>

                                        <div className="review-meta">
                                            <span>
                                                <User size={14} />
                                                {review.submitter_name || review.submitted_by}
                                            </span>
                                            <span>
                                                <Calendar size={14} />
                                                {review.submitted_at ? formatDate(review.submitted_at) : 'Not submitted'}
                                            </span>
                                            <span className={`risk-badge risk-${review.client_risk_level?.toLowerCase() || 'unknown'}`}>
                                                {review.client_risk_level || 'Unknown'} Risk
                                            </span>
                                        </div>
                                    </div>

                                    <div className="review-actions">
                                        <button className="view-button">
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Review Detail */}
                {selectedReview && (
                    <div className="review-detail">
                        <div className="detail-header">
                            <div className="client-info">
                                <h3>{selectedReview.client_name}</h3>
                                <span className="client-id">{selectedReview.client_id}</span>
                                <span className={`risk-badge risk-${selectedReview.client_risk_level?.toLowerCase() || 'unknown'}`}>
                                    {selectedReview.client_risk_level || 'Unknown'} Risk
                                </span>
                            </div>

                            <div className="review-info">
                                <span>Review #{selectedReview.id}</span>
                                <span>Submitted by {selectedReview.submitter_name || selectedReview.submitted_by}</span>
                                <span>{selectedReview.submitted_at ? formatDate(selectedReview.submitted_at) : 'Not submitted'}</span>
                            </div>
                        </div>

                        {/* Status and Mode Indicator */}
                        <div className="review-mode-indicator">
                            <div className={`mode-badge ${displayMode.displayMode}`}>
                                {displayMode.displayMode === 'view' ? (
                                    <>
                                        <Eye size={14} />
                                        <span>View Only - {selectedReview.status === 'DRAFT' ? 'Draft Review' :
                                            selectedReview.status === 'APPROVED' ? 'Approved Review' :
                                                selectedReview.status === 'REJECTED' ? 'Rejected Review' : 'Read Only'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Settings size={14} />
                                        <span>Review Mode - Actions & Exception Management Available</span>
                                        {selectedExceptions.length > 0 && (
                                            <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                                {selectedExceptions.length} Exception(s)
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="detail-content">
                            {/* Loading indicator for review details */}
                            {loadingDetails && (
                                <div className="content-section">
                                    <div className="flex items-center justify-center p-8">
                                        <Clock className="h-6 w-6 animate-spin mr-3 text-blue-600" />
                                        <span className="text-gray-600">Loading review details...</span>
                                    </div>
                                </div>
                            )}

                            {/* KYC Questionnaire */}
                            {selectedKYC ? (
                                <div className="content-section">
                                    <h4>KYC Assessment</h4>
                                    {isFormReadOnly ? (
                                        <KYCResponseDisplay
                                            questionnaire={selectedKYC}
                                            showDocumentLinks={true}
                                            className="checker-kyc-display"
                                        />
                                    ) : (
                                        <KYCQuestionnaireForm
                                            reviewId={selectedReview.id}
                                            initialData={selectedKYC}
                                            readOnly={isFormReadOnly}
                                            disabled={processing}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="content-section">
                                    <h4>Review Information</h4>
                                    <div className="content-text">
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-start">
                                                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                                                <div>
                                                    <h5 className="text-sm font-medium text-yellow-800 mb-1">
                                                        No KYC Questionnaire Data
                                                    </h5>
                                                    <p className="text-sm text-yellow-700">
                                                        This review was created before the KYC questionnaire system was implemented,
                                                        or the KYC data could not be loaded. Please review the uploaded documents
                                                        and any comments from the submitter.
                                                    </p>
                                                    {selectedReview.status === 'SUBMITTED' || selectedReview.status === 'UNDER_REVIEW' ? (
                                                        <p className="text-xs text-yellow-600 mt-2">
                                                            <strong>Note:</strong> You can still approve or reject this review based on
                                                            the available documentation and your assessment.
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Review Exceptions */}
                            {selectedExceptions.length > 0 && (
                                <div className="content-section">
                                    <h4>
                                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                                        Review Exceptions
                                    </h4>
                                    <ExceptionDisplay
                                        exceptions={selectedExceptions.map(ex => ({
                                            ...ex,
                                            status: (exceptionStatuses[ex.id] || ex.status) as 'closed' | 'open' | 'in_progress' | 'resolved',
                                            resolved_at: ex.resolved_at || undefined,
                                            resolution_notes: ex.resolution_notes || undefined
                                        }))}
                                        showActions={true}
                                        className="checker-exceptions"
                                    />

                                    {/* Exception Status Management */}
                                    <div className="exception-management mt-4">
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                                            <Settings className="h-4 w-4 inline mr-1" />
                                            Exception Status Updates
                                            {isFormReadOnly && (
                                                <span className="ml-2 text-xs text-gray-500 font-normal">
                                                    (Read Only)
                                                </span>
                                            )}
                                        </h5>
                                        <div className="space-y-2">
                                            {selectedExceptions.map(exception => (
                                                <div key={exception.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                    <span className="text-sm text-gray-700">
                                                        Exception #{exception.id} - {exception.title}
                                                    </span>
                                                    {isFormReadOnly ? (
                                                        <span className="text-sm font-medium px-2 py-1 bg-gray-200 rounded">
                                                            {(exceptionStatuses[exception.id] || exception.status).replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    ) : (
                                                        <select
                                                            value={exceptionStatuses[exception.id] || exception.status}
                                                            onChange={(e) => handleExceptionStatusChange(exception.id, e.target.value)}
                                                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            disabled={processing}
                                                        >
                                                            <option value="open">Open</option>
                                                            <option value="in_progress">In Progress</option>
                                                            <option value="resolved">Resolved</option>
                                                            <option value="closed">Closed</option>
                                                        </select>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {!isFormReadOnly && selectedExceptions.length > 0 && (
                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-start">
                                                    <Settings className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                                                    <div className="text-sm">
                                                        <p className="text-blue-800 font-medium mb-1">Exception Management Enabled</p>
                                                        <p className="text-blue-700">
                                                            You can update exception statuses as part of your review.
                                                            Changes will be applied when you approve or reject this review.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Documents */}
                            <div className="content-section">
                                <h4>Supporting Documents</h4>
                                <DocumentList
                                    reviewId={selectedReview.id}
                                    showActions={true}
                                    compact={true}
                                    className="checker-documents"
                                />
                            </div>

                            {/* Comments Section */}
                            <div className="content-section">
                                <h4>
                                    <MessageSquare size={16} />
                                    Review Comments & Decision
                                </h4>
                                <div className="review-decision-section">
                                    <div className="decision-summary mb-4">
                                        {selectedKYC && (
                                            <div className="kyc-summary p-3 bg-gray-50 rounded-lg">
                                                <h5 className="text-sm font-medium text-gray-700 mb-2">KYC Assessment Summary</h5>
                                                <div className="flex gap-4 text-sm">
                                                    <span className="text-green-600">
                                                        ✓ {Object.values(selectedKYC).filter(v => v === 'yes').length} Positive
                                                    </span>
                                                    <span className="text-red-600">
                                                        ✗ {Object.values(selectedKYC).filter(v => v === 'no').length} Issues
                                                    </span>
                                                    <span className="text-orange-600">
                                                        ⚠ {selectedExceptions.length} Exceptions
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <textarea
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        placeholder="Add your review comments, decision rationale, and any additional notes..."
                                        rows={5}
                                        className="comments-textarea w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <div className="field-help mt-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-4">
                                            <span>Comments are optional for approval but required for rejection</span>
                                            {selectedExceptions.length > 0 && (
                                                <span className="text-orange-600">
                                                    • Exception status updates will be applied
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons - Only show for reviews that can be approved/rejected */}
                        {canApproveReject ? (
                            <div className="detail-actions">
                                <div className="action-buttons-container">
                                    <div className="action-summary mb-3">
                                        {selectedExceptions.length > 0 && (
                                            <div className="exception-action-summary text-sm text-gray-600">
                                                <AlertTriangle className="h-4 w-4 inline mr-1" />
                                                <span className="font-medium">{selectedExceptions.length} exception(s) found</span>
                                                {(() => {
                                                    const updatedCount = Object.entries(exceptionStatuses).filter(([exceptionId, status]) => {
                                                        const originalException = selectedExceptions.find(ex => ex.id === parseInt(exceptionId))
                                                        return originalException && status !== originalException.status
                                                    }).length
                                                    return updatedCount > 0 ? (
                                                        <span className="ml-2 text-blue-600">
                                                            • {updatedCount} status update(s) will be applied
                                                        </span>
                                                    ) : (
                                                        <span className="ml-2 text-gray-500">
                                                            • No status changes made
                                                        </span>
                                                    )
                                                })()}
                                            </div>
                                        )}
                                        {selectedExceptions.length === 0 && (
                                            <div className="text-sm text-green-600">
                                                <CheckCircle className="h-4 w-4 inline mr-1" />
                                                No exceptions found - review appears clean
                                            </div>
                                        )}
                                    </div>

                                    <div className="action-buttons flex gap-3">
                                        <button
                                            onClick={handleReject}
                                            disabled={processing}
                                            className="action-button reject flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <XCircle size={16} className="mr-2" />
                                            {processing ? 'Rejecting...' : 'Reject Review'}
                                        </button>

                                        <button
                                            onClick={handleApprove}
                                            disabled={processing}
                                            className="action-button approve flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <CheckCircle size={16} className="mr-2" />
                                            {processing ? 'Approving...' : 'Approve Review'}
                                        </button>
                                    </div>

                                    <div className="action-help mt-2 text-xs text-gray-500">
                                        <div className="flex justify-between">
                                            <span>Rejection requires comments</span>
                                            <span>All changes will be saved automatically</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="detail-actions">
                                <div className="no-actions-message">
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <Eye className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                                            {selectedReview.status === 'DRAFT' ? 'Draft Review' :
                                                selectedReview.status === 'APPROVED' ? 'Review Approved' :
                                                    selectedReview.status === 'REJECTED' ? 'Review Rejected' : 'View Only'}
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            {selectedReview.status === 'DRAFT' ? 'This review is still being prepared by the maker.' :
                                                selectedReview.status === 'APPROVED' ? 'This review has been approved and is now complete.' :
                                                    selectedReview.status === 'REJECTED' ? 'This review has been rejected and returned to the maker.' :
                                                        'No actions are available for this review status.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}