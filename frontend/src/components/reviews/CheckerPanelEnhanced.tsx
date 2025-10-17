import React, { useState, useEffect } from 'react'
import {
    CheckCircle,
    XCircle,
    Clock,
    User,
    Calendar,
    FileText,
    AlertTriangle,
    Eye,
    MessageSquare,
    Download,
    Settings,
    History,
    Shield,
    Info
} from 'lucide-react'
import { apiClient } from '../../services'
import { useAuth } from '../../contexts'
import { DocumentList } from '../documents'
import { KYCResponseDisplay, ExceptionDisplay } from '../kyc'
import { useMakerCheckerErrorHandler } from '../../services/makerCheckerErrors'
import { Toast } from '../common/Toast'
import { ConfirmationDialog } from '../common/ConfirmationDialog'
import type { ReviewDetail, KYCQuestionnaire, Exception } from '../../types'

// Use ReviewDetail which includes client_name and other extended fields
type Review = ReviewDetail

interface CheckerPanelProps {
    className?: string
}

interface ApprovalDecision {
    action: 'approve' | 'reject'
    comments: string
    exceptionUpdates: Record<number, string>
}

interface WorkflowHistory {
    id: number
    action: string
    user_name: string
    timestamp: string
    comments?: string
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Submitted':
            return 'status-submitted'
        case 'Under Review':
            return 'status-under-review'
        case 'Approved':
            return 'status-approved'
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

export const CheckerPanelEnhanced: React.FC<CheckerPanelProps> = ({ className = '' }) => {
    const { user } = useAuth()
    const { handleError, retryOperation, shouldRetry } = useMakerCheckerErrorHandler()

    const [reviews, setReviews] = useState<Review[]>([])
    const [selectedReview, setSelectedReview] = useState<Review | null>(null)
    const [selectedKYC, setSelectedKYC] = useState<KYCQuestionnaire | null>(null)
    const [selectedExceptions, setSelectedExceptions] = useState<Exception[]>([])
    const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [comments, setComments] = useState('')
    const [filter, setFilter] = useState<'all' | 'submitted' | 'under_review'>('submitted')
    const [exceptionStatuses, setExceptionStatuses] = useState<Record<number, string>>({})

    // Enhanced UI state
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [pendingDecision, setPendingDecision] = useState<ApprovalDecision | null>(null)
    const [showWorkflowHistory, setShowWorkflowHistory] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
    const [validationErrors, setValidationErrors] = useState<string[]>([])

    useEffect(() => {
        fetchReviews()
    }, [filter])

    const fetchReviews = async () => {
        try {
            setLoading(true)
            setError(null)

            const operation = async () => {
                const status = filter === 'all' ? undefined : (filter === 'submitted' ? 'Submitted' : 'Under Review')
                return await apiClient.getReviewsForChecking(status)
            }

            const reviews = await retryOperation(operation, 'fetch-reviews')
            setReviews(reviews)
        } catch (err: any) {
            const friendlyError = handleError(err, {
                action: 'fetch_reviews',
                workflowContext: 'review'
            })
            setError(friendlyError.message)
            setToast({ message: friendlyError.message, type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleReviewSelect = async (review: Review) => {
        try {
            setError(null)
            setValidationErrors([])

            // Mark as under review if it's submitted
            if (review.status === 'Submitted') {
                const operation = async () => {
                    return await apiClient.updateReview(review.id, {
                        status: 'UNDER_REVIEW',
                        reviewed_by: user?.id
                    })
                }

                await retryOperation(operation, `start-review-${review.id}`)

                // Update local state
                setReviews(prev => prev.map(r =>
                    r.id === review.id
                        ? { ...r, status: 'Under Review' as const }
                        : r
                ))
                review.status = 'Under Review'

                setToast({
                    message: `Review ${review.id} is now under your review`,
                    type: 'success'
                })
            }

            setSelectedReview(review)
            setComments('')
            setExceptionStatuses({})

            // Load review details
            await loadReviewDetails(review.id)
        } catch (err: any) {
            const friendlyError = handleError(err, {
                action: 'start_review',
                reviewId: review.id,
                workflowContext: 'review'
            })
            setError(friendlyError.message)
            setToast({ message: friendlyError.message, type: 'error' })
        }
    }

    const loadReviewDetails = async (reviewId: number) => {
        try {
            const operations = [
                // Load KYC questionnaire
                retryOperation(
                    () => apiClient.getKYCQuestionnaire(reviewId),
                    `kyc-${reviewId}`
                ).catch(() => null), // Don't fail if KYC doesn't exist

                // Load exceptions
                retryOperation(
                    () => apiClient.getReviewExceptions(reviewId),
                    `exceptions-${reviewId}`
                ).catch(() => []), // Don't fail if no exceptions

                // Load workflow history
                retryOperation(
                    () => apiClient.get(`/reviews/${reviewId}/audit-trail`),
                    `history-${reviewId}`
                ).catch(() => ({ audit_trail: [] }))
            ]

            const [kycResponse, exceptionsResponse, historyResponse] = await Promise.all(operations)

            setSelectedKYC(kycResponse)
            setSelectedExceptions(exceptionsResponse || [])
            setWorkflowHistory(historyResponse?.audit_trail || [])

            // Initialize exception statuses
            const statuses: Record<number, string> = {}
            if (exceptionsResponse) {
                exceptionsResponse.forEach((exception: Exception) => {
                    statuses[exception.id] = exception.status
                })
            }
            setExceptionStatuses(statuses)
        } catch (err: any) {
            const friendlyError = handleError(err, {
                action: 'load_review_details',
                reviewId,
                workflowContext: 'review'
            })
            console.error('Failed to load review details:', friendlyError.message)
            // Don't show error for missing details - set defaults
            setSelectedKYC(null)
            setSelectedExceptions([])
            setWorkflowHistory([])
        }
    }

    const validateDecision = (action: 'approve' | 'reject'): string[] => {
        const errors: string[] = []

        if (action === 'reject' && !comments.trim()) {
            errors.push('Comments are required when rejecting a review')
        }

        if (!selectedReview) {
            errors.push('No review selected')
        }

        // Check for maker-checker violation
        if (selectedReview && selectedReview.submitted_by === user?.id) {
            errors.push('You cannot review your own submission (maker-checker violation)')
        }

        // Validate exception status changes
        const changedExceptions = Object.entries(exceptionStatuses).filter(([exceptionId, status]) => {
            const originalException = selectedExceptions.find(ex => ex.id === parseInt(exceptionId))
            return originalException && status !== originalException.status
        })

        if (action === 'approve' && changedExceptions.some(([_, status]) => status === 'open')) {
            errors.push('Cannot approve review with open exceptions. Please resolve or close exceptions first.')
        }

        return errors
    }

    const handleDecisionRequest = (action: 'approve' | 'reject') => {
        const errors = validateDecision(action)
        setValidationErrors(errors)

        if (errors.length > 0) {
            setToast({
                message: `Cannot ${action}: ${errors[0]}`,
                type: 'error'
            })
            return
        }

        const decision: ApprovalDecision = {
            action,
            comments: comments.trim(),
            exceptionUpdates: { ...exceptionStatuses }
        }

        setPendingDecision(decision)
        setShowConfirmation(true)
    }

    const executeDecision = async () => {
        if (!pendingDecision || !selectedReview) return

        try {
            setProcessing(true)
            setError(null)
            setShowConfirmation(false)

            // Update exception statuses first
            const exceptionUpdates = Object.entries(pendingDecision.exceptionUpdates)
                .filter(([exceptionId, status]) => {
                    const originalException = selectedExceptions.find(ex => ex.id === parseInt(exceptionId))
                    return originalException && status !== originalException.status
                })

            if (exceptionUpdates.length > 0) {
                const updateOperations = exceptionUpdates.map(([exceptionId, status]) =>
                    retryOperation(
                        () => apiClient.updateExceptionStatus(
                            parseInt(exceptionId),
                            status
                        ),
                        `update-exception-${exceptionId}`
                    )
                )

                await Promise.all(updateOperations)

                setToast({
                    message: `Updated ${exceptionUpdates.length} exception(s)`,
                    type: 'success'
                })
            }

            // Execute the review decision
            const operation = pendingDecision.action === 'approve'
                ? () => apiClient.approveReview(selectedReview.id, pendingDecision.comments || undefined)
                : () => apiClient.rejectReview(selectedReview.id, pendingDecision.comments)

            await retryOperation(operation, `${pendingDecision.action}-review-${selectedReview.id}`)

            // Success - update UI
            const actionText = pendingDecision.action === 'approve' ? 'approved' : 'rejected'
            setToast({
                message: `Review ${selectedReview.id} has been ${actionText}`,
                type: 'success'
            })

            // Remove from list and clear selection
            setReviews(prev => prev.filter(r => r.id !== selectedReview.id))
            clearSelection()

        } catch (err: any) {
            const friendlyError = handleError(err, {
                action: pendingDecision.action === 'approve' ? 'approve_review' : 'reject_review',
                reviewId: selectedReview.id,
                workflowContext: 'review'
            })
            setError(friendlyError.message)
            setToast({ message: friendlyError.message, type: 'error' })
        } finally {
            setProcessing(false)
            setPendingDecision(null)
        }
    }

    const clearSelection = () => {
        setSelectedReview(null)
        setSelectedKYC(null)
        setSelectedExceptions([])
        setWorkflowHistory([])
        setComments('')
        setExceptionStatuses({})
        setValidationErrors([])
        setError(null)
    }

    const handleExceptionStatusChange = (exceptionId: number, newStatus: string) => {
        setExceptionStatuses(prev => ({
            ...prev,
            [exceptionId]: newStatus
        }))

        // Clear validation errors when user makes changes
        setValidationErrors([])
    }

    const getDecisionSummary = () => {
        if (!selectedReview) return null

        const openExceptions = selectedExceptions.filter(ex =>
            (exceptionStatuses[ex.id] || ex.status) === 'open'
        ).length

        const changedExceptions = Object.entries(exceptionStatuses).filter(([exceptionId, status]) => {
            const originalException = selectedExceptions.find(ex => ex.id === parseInt(exceptionId))
            return originalException && status !== originalException.status
        }).length

        return {
            openExceptions,
            changedExceptions,
            hasKYC: !!selectedKYC,
            totalExceptions: selectedExceptions.length
        }
    }

    const filteredReviews = reviews.filter(review => {
        if (filter === 'all') return true
        if (filter === 'submitted') return review.status === 'Submitted'
        if (filter === 'under_review') return review.status === 'Under Review'
        return true
    })

    if (loading) {
        return (
            <div className={`checker-panel ${className}`}>
                <div className="loading-spinner">Loading reviews...</div>
            </div>
        )
    }

    const decisionSummary = getDecisionSummary()

    return (
        <div className={`checker-panel ${className}`}>
            <div className="panel-header">
                <h2>Review Queue</h2>
                <p>Reviews pending your approval</p>
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle className="error-icon" />
                    {error}
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="validation-errors">
                    <AlertTriangle className="error-icon" />
                    <div>
                        <strong>Validation Errors:</strong>
                        <ul>
                            {validationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="panel-content">
                {/* Review List */}
                <div className="review-queue">
                    <div className="queue-header">
                        <h3>Pending Reviews ({filteredReviews.length})</h3>
                        <div className="filter-tabs">
                            <button
                                onClick={() => setFilter('submitted')}
                                className={`filter-tab ${filter === 'submitted' ? 'active' : ''}`}
                            >
                                New ({reviews.filter(r => r.status === 'Submitted').length})
                            </button>
                            <button
                                onClick={() => setFilter('under_review')}
                                className={`filter-tab ${filter === 'under_review' ? 'active' : ''}`}
                            >
                                In Progress ({reviews.filter(r => r.status === 'Under Review').length})
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
                                                {review.status === 'Submitted' && <Clock size={14} />}
                                                {review.status === 'Under Review' && <Eye size={14} />}
                                                {review.status}
                                            </span>
                                        </div>

                                        <div className="review-meta">
                                            <span>
                                                <User size={14} />
                                                {review.submitted_by}
                                            </span>
                                            <span>
                                                <Calendar size={14} />
                                                {formatDate(review.submitted_at)}
                                            </span>
                                            <span className={`risk-badge risk-${review.client_risk_level.toLowerCase()}`}>
                                                {review.client_risk_level} Risk
                                            </span>
                                        </div>

                                        {/* Maker-checker validation indicator */}
                                        {review.submitted_by === user?.id && (
                                            <div className="maker-checker-warning">
                                                <Shield size={14} />
                                                <span>Cannot review own submission</span>
                                            </div>
                                        )}
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
                                <span className={`risk-badge risk-${selectedReview.client_risk_level.toLowerCase()}`}>
                                    {selectedReview.client_risk_level} Risk
                                </span>
                            </div>

                            <div className="review-info">
                                <span>Review #{selectedReview.id}</span>
                                <span>Submitted by {selectedReview.submitted_by}</span>
                                <span>{formatDate(selectedReview.submitted_at)}</span>

                                {workflowHistory.length > 0 && (
                                    <button
                                        onClick={() => setShowWorkflowHistory(!showWorkflowHistory)}
                                        className="history-toggle"
                                    >
                                        <History size={14} />
                                        View History
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Workflow History */}
                        {showWorkflowHistory && workflowHistory.length > 0 && (
                            <div className="workflow-history">
                                <h4>Workflow History</h4>
                                <div className="history-timeline">
                                    {workflowHistory.map(entry => (
                                        <div key={entry.id} className="history-entry">
                                            <div className="history-meta">
                                                <span className="history-action">{entry.action}</span>
                                                <span className="history-user">{entry.user_name}</span>
                                                <span className="history-time">{formatDate(entry.timestamp)}</span>
                                            </div>
                                            {entry.comments && (
                                                <div className="history-comments">{entry.comments}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="detail-content">
                            {/* Decision Summary */}
                            {decisionSummary && (
                                <div className="decision-summary">
                                    <h4>
                                        <Info size={16} />
                                        Review Summary
                                    </h4>
                                    <div className="summary-grid">
                                        <div className="summary-item">
                                            <span className="summary-label">KYC Assessment:</span>
                                            <span className={`summary-value ${decisionSummary.hasKYC ? 'positive' : 'neutral'}`}>
                                                {decisionSummary.hasKYC ? 'Complete' : 'Legacy Review'}
                                            </span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="summary-label">Exceptions:</span>
                                            <span className={`summary-value ${decisionSummary.openExceptions > 0 ? 'negative' : 'positive'}`}>
                                                {decisionSummary.openExceptions} Open / {decisionSummary.totalExceptions} Total
                                            </span>
                                        </div>
                                        {decisionSummary.changedExceptions > 0 && (
                                            <div className="summary-item">
                                                <span className="summary-label">Pending Updates:</span>
                                                <span className="summary-value neutral">
                                                    {decisionSummary.changedExceptions} Exception Status Changes
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* KYC Questionnaire Responses */}
                            {selectedKYC ? (
                                <div className="content-section">
                                    <h4>KYC Assessment</h4>
                                    <KYCResponseDisplay
                                        questionnaire={selectedKYC}
                                        showDocumentLinks={true}
                                        className="checker-kyc-display"
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Fallback to legacy review fields for older reviews */}
                                    {selectedReview.risk_assessment && (
                                        <div className="content-section">
                                            <h4>Risk Assessment</h4>
                                            <div className="content-text">
                                                {selectedReview.risk_assessment}
                                            </div>
                                        </div>
                                    )}

                                    {selectedReview.compliance_notes && (
                                        <div className="content-section">
                                            <h4>Compliance Notes</h4>
                                            <div className="content-text">
                                                {selectedReview.compliance_notes}
                                            </div>
                                        </div>
                                    )}

                                    {selectedReview.recommendations && (
                                        <div className="content-section">
                                            <h4>Recommendations</h4>
                                            <div className="content-text">
                                                {selectedReview.recommendations}
                                            </div>
                                        </div>
                                    )}
                                </>
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
                                            status: exceptionStatuses[ex.id] || ex.status
                                        }))}
                                        showActions={true}
                                        className="checker-exceptions"
                                    />

                                    {/* Exception Status Management */}
                                    <div className="exception-management mt-4">
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                                            <Settings className="h-4 w-4 inline mr-1" />
                                            Exception Status Updates
                                        </h5>
                                        <div className="space-y-2">
                                            {selectedExceptions.map(exception => (
                                                <div key={exception.id} className="exception-status-row">
                                                    <div className="exception-info">
                                                        <span className="exception-id">Exception #{exception.id}</span>
                                                        <span className="exception-type">{exception.exception_type}</span>
                                                    </div>
                                                    <select
                                                        value={exceptionStatuses[exception.id] || exception.status}
                                                        onChange={(e) => handleExceptionStatusChange(exception.id, e.target.value)}
                                                        className="exception-status-select"
                                                        disabled={processing}
                                                    >
                                                        <option value="open">Open</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="closed">Closed</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
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
                                    <textarea
                                        value={comments}
                                        onChange={(e) => {
                                            setComments(e.target.value)
                                            setValidationErrors([]) // Clear validation errors on input
                                        }}
                                        placeholder="Add your review comments, decision rationale, and any additional notes..."
                                        rows={5}
                                        className={`comments-textarea ${validationErrors.some(e => e.includes('Comments')) ? 'error' : ''}`}
                                    />
                                    <div className="field-help">
                                        <div className="help-text">
                                            <span>Comments are optional for approval but required for rejection</span>
                                            {selectedExceptions.length > 0 && (
                                                <span className="exception-help">
                                                    • Exception status updates will be applied with your decision
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="detail-actions">
                            <div className="action-buttons-container">
                                {/* Maker-checker validation warning */}
                                {selectedReview.submitted_by === user?.id && (
                                    <div className="maker-checker-violation">
                                        <Shield size={16} />
                                        <span>You cannot review your own submission (maker-checker principle)</span>
                                    </div>
                                )}

                                <div className="action-buttons">
                                    <button
                                        onClick={() => handleDecisionRequest('reject')}
                                        disabled={processing || selectedReview.submitted_by === user?.id}
                                        className="action-button reject"
                                    >
                                        <XCircle size={16} />
                                        {processing ? 'Processing...' : 'Reject Review'}
                                    </button>

                                    <button
                                        onClick={() => handleDecisionRequest('approve')}
                                        disabled={processing || selectedReview.submitted_by === user?.id}
                                        className="action-button approve"
                                    >
                                        <CheckCircle size={16} />
                                        {processing ? 'Processing...' : 'Approve Review'}
                                    </button>
                                </div>

                                <div className="action-help">
                                    <div className="help-grid">
                                        <span>All changes will be saved automatically</span>
                                        <span>Decision will be recorded in audit trail</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            {showConfirmation && pendingDecision && (
                <ConfirmationDialog
                    isOpen={showConfirmation}
                    title={`${pendingDecision.action === 'approve' ? 'Approve' : 'Reject'} Review`}
                    message={
                        <div className="confirmation-details">
                            <p>
                                Are you sure you want to {pendingDecision.action} review #{selectedReview?.id}?
                            </p>
                            {pendingDecision.action === 'approve' && decisionSummary?.openExceptions > 0 && (
                                <div className="warning-text">
                                    <AlertTriangle size={16} />
                                    This review has {decisionSummary.openExceptions} open exception(s).
                                </div>
                            )}
                            {Object.keys(pendingDecision.exceptionUpdates).length > 0 && (
                                <div className="info-text">
                                    {Object.keys(pendingDecision.exceptionUpdates).length} exception status updates will be applied.
                                </div>
                            )}
                        </div>
                    }
                    confirmText={pendingDecision.action === 'approve' ? 'Approve' : 'Reject'}
                    cancelText="Cancel"
                    onConfirm={executeDecision}
                    onCancel={() => {
                        setShowConfirmation(false)
                        setPendingDecision(null)
                    }}
                    variant={pendingDecision.action === 'approve' ? 'primary' : 'danger'}
                />
            )}

            {/* Toast Notifications */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}