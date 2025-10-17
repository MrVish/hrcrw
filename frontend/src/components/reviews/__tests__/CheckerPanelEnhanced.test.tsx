import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CheckerPanel } from '../CheckerPanel'
import { apiClient } from '../../../services'
import type { User, ReviewDetail, KYCQuestionnaire, Exception } from '../../../types'

// Mock the useAuth hook
vi.mock('../../../contexts', () => ({
    useAuth: () => ({
        user: {
            id: 1,
            name: 'Test Checker',
            email: 'checker@test.com',
            role: 'Checker',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        },
        token: 'mock-token',
        login: vi.fn(),
        logout: vi.fn(),
        isAuthenticated: true,
        isLoading: false
    })
}))

// Mock the API client
vi.mock('../../../services', () => ({
    apiClient: {
        getReviewsForChecking: vi.fn(),
        updateReview: vi.fn(),
        approveReview: vi.fn(),
        rejectReview: vi.fn(),
        getKYCQuestionnaire: vi.fn(),
        getReviewExceptions: vi.fn(),
        updateExceptionStatus: vi.fn(),
    }
}))

// Mock the document components
vi.mock('../../documents', () => ({
    DocumentList: ({ reviewId }: { reviewId: number }) => (
        <div data-testid={`document-list-${reviewId}`}>Document List</div>
    )
}))

// Mock the KYC components
vi.mock('../../kyc', () => ({
    KYCResponseDisplay: ({ questionnaire }: { questionnaire: any }) => (
        <div data-testid="kyc-response-display">
            KYC Response Display - {questionnaire.purpose_of_account}
        </div>
    ),
    ExceptionDisplay: ({ exceptions }: { exceptions: any[] }) => (
        <div data-testid="exception-display">
            Exception Display - {exceptions.length} exceptions
        </div>
    )
}))

const mockUser: User = {
    id: 1,
    name: 'Test Checker',
    email: 'checker@test.com',
    role: 'Checker',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
}

const mockReview: ReviewDetail = {
    id: 1,
    client_id: 'CLIENT001',
    client_name: 'Test Client',
    client_risk_level: 'HIGH',
    submitted_by: 2,
    submitter_name: 'Test Maker',
    reviewed_by: null,
    reviewer_name: null,
    status: 'Submitted' as any,
    comments: null,
    rejection_reason: null,
    submitted_at: '2024-01-01T10:00:00Z',
    reviewed_at: null,
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    document_count: 3,
    exception_count: 1,
    is_draft: false,
    is_submitted: true,
    is_pending_review: true,
    is_completed: false,
    is_approved: false,
    is_rejected: false
}

const mockKYCQuestionnaire: KYCQuestionnaire = {
    id: 1,
    review_id: 1,
    purpose_of_account: 'Business operations',
    kyc_documents_complete: 'yes',
    account_purpose_aligned: 'yes',
    adverse_media_completed: 'yes',
    pep_approval_obtained: 'not_applicable',
    static_data_correct: 'yes',
    kyc_documents_valid: 'yes',
    regulated_business_license: 'yes',
    source_of_funds_docs: [1, 2],
    created_at: '2024-01-01T09:30:00Z',
    updated_at: '2024-01-01T09:30:00Z'
}

const mockExceptions: Exception[] = [
    {
        id: 1,
        review_id: 1,
        assigned_to: null,
        created_by: 2,
        type: 'COMPLIANCE',
        title: 'KYC Non-Compliance',
        description: 'Missing documentation',
        priority: 'HIGH',
        status: 'OPEN',
        resolution_notes: null,
        resolved_at: null,
        due_date: null,
        created_at: '2024-01-01T09:45:00Z',
        updated_at: '2024-01-01T09:45:00Z'
    }
]

const renderWithAuth = (component: React.ReactElement) => {
    return render(component)
}

describe('CheckerPanel Enhanced Features', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // Setup default API responses
        vi.mocked(apiClient.getReviewsForChecking).mockResolvedValue([mockReview])
        vi.mocked(apiClient.updateReview).mockResolvedValue(mockReview)
        vi.mocked(apiClient.getKYCQuestionnaire).mockResolvedValue(mockKYCQuestionnaire)
        vi.mocked(apiClient.getReviewExceptions).mockResolvedValue(mockExceptions)
        vi.mocked(apiClient.approveReview).mockResolvedValue(mockReview)
        vi.mocked(apiClient.rejectReview).mockResolvedValue(mockReview)
        vi.mocked(apiClient.updateExceptionStatus).mockResolvedValue(mockExceptions[0])
    })

    describe('KYC Response Display', () => {
        it('should display KYC questionnaire responses when available', async () => {
            renderWithAuth(<CheckerPanel />)

            // Wait for reviews to load
            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            // Click on the review to select it
            fireEvent.click(screen.getByText('Test Client'))

            // Wait for KYC data to load and display
            await waitFor(() => {
                expect(screen.getByTestId('kyc-response-display')).toBeInTheDocument()
            })

            expect(screen.getByText(/KYC Response Display - Business operations/)).toBeInTheDocument()
        })

        it('should fall back to legacy review fields when KYC data is not available', async () => {
            // Mock KYC questionnaire to fail
            vi.mocked(apiClient.getKYCQuestionnaire).mockRejectedValue(new Error('Not found'))

            const legacyReview = {
                ...mockReview,
                risk_assessment: 'High risk client',
                compliance_notes: 'Additional compliance checks required'
            }
            vi.mocked(apiClient.getReviewsForChecking).mockResolvedValue([legacyReview])

            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(screen.getByText('Risk Assessment')).toBeInTheDocument()
                expect(screen.getByText('High risk client')).toBeInTheDocument()
                expect(screen.getByText('Compliance Notes')).toBeInTheDocument()
                expect(screen.getByText('Additional compliance checks required')).toBeInTheDocument()
            })
        })
    })

    describe('Exception Management', () => {
        it('should display exceptions when available', async () => {
            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(screen.getByTestId('exception-display')).toBeInTheDocument()
            })

            expect(screen.getByText(/Exception Display - 1 exceptions/)).toBeInTheDocument()
            expect(screen.getByText('Review Exceptions')).toBeInTheDocument()
        })

        it('should allow updating exception statuses', async () => {
            const user = userEvent.setup()
            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(screen.getByText('Exception Status Updates')).toBeInTheDocument()
            })

            // Find and update exception status
            const statusSelect = screen.getByDisplayValue('open')
            await user.selectOptions(statusSelect, 'resolved')

            expect(statusSelect).toHaveValue('resolved')
        })

        it('should update exception statuses during approval', async () => {
            const user = userEvent.setup()
            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(screen.getByText('Exception Status Updates')).toBeInTheDocument()
            })

            // Update exception status
            const statusSelect = screen.getByDisplayValue('open')
            await user.selectOptions(statusSelect, 'resolved')

            // Add comments
            const commentsTextarea = screen.getByPlaceholderText(/Add your review comments/)
            await user.type(commentsTextarea, 'Review approved with resolved exceptions')

            // Approve the review
            const approveButton = screen.getByText('Approve Review')
            fireEvent.click(approveButton)

            await waitFor(() => {
                expect(apiClient.updateExceptionStatus).toHaveBeenCalledWith(
                    1,
                    'resolved'
                )
                expect(apiClient.approveReview).toHaveBeenCalledWith(
                    1,
                    'Review approved with resolved exceptions'
                )
            })
        })
    })

    describe('Enhanced Approval Workflow', () => {
        it('should show confirmation when approving with open exceptions', async () => {
            // Mock window.confirm
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(screen.getByText('Approve Review')).toBeInTheDocument()
            })

            // Try to approve without resolving exceptions
            const approveButton = screen.getByText('Approve Review')
            fireEvent.click(approveButton)

            await waitFor(() => {
                expect(confirmSpy).toHaveBeenCalledWith(
                    expect.stringContaining('This review has 1 open exception(s)')
                )
            })

            confirmSpy.mockRestore()
        })

        it('should show KYC assessment summary in comments section', async () => {
            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(screen.getByText('KYC Assessment Summary')).toBeInTheDocument()
            })

            // Should show positive responses count
            expect(screen.getByText(/✓.*Positive/)).toBeInTheDocument()
            // Should show exceptions count
            expect(screen.getByText(/⚠.*1 Exceptions/)).toBeInTheDocument()
        })

        it('should require comments for rejection', async () => {
            const user = userEvent.setup()
            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(screen.getByText('Reject Review')).toBeInTheDocument()
            })

            // Try to reject without comments
            const rejectButton = screen.getByText('Reject Review')
            fireEvent.click(rejectButton)

            await waitFor(() => {
                expect(screen.getByText('Comments are required when rejecting a review')).toBeInTheDocument()
            })

            // Add comments and try again
            const commentsTextarea = screen.getByPlaceholderText(/Add your review comments/)
            await user.type(commentsTextarea, 'Review rejected due to incomplete documentation')

            // Mock window.confirm for rejection
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

            fireEvent.click(rejectButton)

            await waitFor(() => {
                expect(confirmSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Are you sure you want to reject this review?')
                )
                expect(apiClient.rejectReview).toHaveBeenCalledWith(
                    1,
                    'Review rejected due to incomplete documentation'
                )
            })

            confirmSpy.mockRestore()
        })
    })

    describe('Review Selection and Loading', () => {
        it('should load KYC questionnaire and exceptions when selecting a review', async () => {
            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(apiClient.getKYCQuestionnaire).toHaveBeenCalledWith(1)
                expect(apiClient.getReviewExceptions).toHaveBeenCalledWith(1)
            })
        })

        it('should handle errors when loading review details gracefully', async () => {
            // Mock API calls to fail
            vi.mocked(apiClient.getKYCQuestionnaire).mockRejectedValue(new Error('KYC not found'))
            vi.mocked(apiClient.getReviewExceptions).mockRejectedValue(new Error('Exceptions not found'))

            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            // Should not show error messages for missing KYC/exceptions (graceful degradation)
            await waitFor(() => {
                expect(screen.queryByText(/Failed to load/)).not.toBeInTheDocument()
            })
        })

        it('should update review status to UNDER_REVIEW when selecting submitted review', async () => {
            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(apiClient.updateReview).toHaveBeenCalledWith(1, {
                    status: 'UNDER_REVIEW',
                    reviewed_by: 1
                })
            })
        })
    })

    describe('Error Handling', () => {
        it('should display error messages when API calls fail', async () => {
            vi.mocked(apiClient.approveReview).mockRejectedValue(new Error('Approval failed'))

            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            await waitFor(() => {
                expect(screen.getByText('Approve Review')).toBeInTheDocument()
            })

            const approveButton = screen.getByText('Approve Review')
            fireEvent.click(approveButton)

            await waitFor(() => {
                expect(screen.getByText('Failed to approve review')).toBeInTheDocument()
            })
        })

        it('should clear error messages when successful operations occur', async () => {
            // First cause an error
            vi.mocked(apiClient.approveReview).mockRejectedValueOnce(new Error('Approval failed'))

            renderWithAuth(<CheckerPanel />)

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Test Client'))

            const approveButton = screen.getByText('Approve Review')
            fireEvent.click(approveButton)

            await waitFor(() => {
                expect(screen.getByText('Failed to approve review')).toBeInTheDocument()
            })

            // Now make it succeed
            vi.mocked(apiClient.approveReview).mockResolvedValue(mockReview)
            fireEvent.click(approveButton)

            await waitFor(() => {
                expect(screen.queryByText('Failed to approve review')).not.toBeInTheDocument()
            })
        })
    })
})