import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../theme'
import { AuthProvider } from '../../contexts/AuthContext'
import { ClientList } from '../clients/ClientList'
import { ExceptionList } from '../exceptions/ExceptionList'
import { ReviewList } from '../reviews/ReviewList'
import { ClientDetail } from '../clients/ClientDetail'
import { ExceptionDetail } from '../exceptions/ExceptionDetail'
import { apiClient } from '../../services'

// Mock API client
jest.mock('../../services', () => ({
    apiClient: {
        getClients: jest.fn(),
        getExceptions: jest.fn(),
        getReviews: jest.fn(),
        getClient: jest.fn(),
        getException: jest.fn(),
        getClientReviews: jest.fn(),
        getAssignableUsersList: jest.fn(),
    }
}))

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

// Test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>
        <ThemeProvider theme={theme}>
            <AuthProvider>
                {children}
            </AuthProvider>
        </ThemeProvider>
    </BrowserRouter>
)

// Mock data
const mockClients = [
    {
        client_id: 'CLIENT001',
        name: 'Test Client 1',
        status: 'ACTIVE',
        risk_level: 'HIGH',
        country: 'USA',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_review_date: '2024-01-01T00:00:00Z',
        review_count: 5,
        has_auto_review_flags: true,
        auto_kyc_review: true,
        auto_aml_review: false,
        auto_sanctions_review: false,
        auto_pep_review: false,
        auto_financial_review: false
    },
    {
        client_id: 'CLIENT002',
        name: 'Test Client 2',
        status: 'INACTIVE',
        risk_level: 'LOW',
        country: 'UK',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_review_date: null,
        review_count: 0,
        has_auto_review_flags: false,
        auto_kyc_review: false,
        auto_aml_review: false,
        auto_sanctions_review: false,
        auto_pep_review: false,
        auto_financial_review: false
    },
    {
        client_id: 'CLIENT003',
        name: 'Test Client 3',
        status: 'SUSPENDED',
        risk_level: 'MEDIUM',
        country: 'Canada',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_review_date: '2024-01-01T00:00:00Z',
        review_count: 2,
        has_auto_review_flags: false,
        auto_kyc_review: false,
        auto_aml_review: false,
        auto_sanctions_review: false,
        auto_pep_review: false,
        auto_financial_review: false
    }
]

const mockExceptions = [
    {
        id: 1,
        client_id: 'CLIENT001',
        client_name: 'Test Client 1',
        title: 'Test Exception 1',
        type: 'COMPLIANCE',
        description: 'Test description',
        status: 'OPEN',
        priority: 'HIGH',
        assigned_to: null,
        assigned_user_name: null,
        created_by: 1,
        creator_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        resolved_at: null,
        resolution_notes: null,
        due_date: null
    },
    {
        id: 2,
        client_id: 'CLIENT002',
        client_name: 'Test Client 2',
        title: 'Test Exception 2',
        type: 'DOCUMENTATION',
        description: 'Test description 2',
        status: 'RESOLVED',
        priority: 'LOW',
        assigned_to: 1,
        assigned_user_name: 'Test User',
        created_by: 1,
        creator_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        resolved_at: '2024-01-01T00:00:00Z',
        resolution_notes: 'Resolved',
        due_date: null
    },
    {
        id: 3,
        client_id: 'CLIENT003',
        client_name: 'Test Client 3',
        title: 'Test Exception 3',
        type: 'TECHNICAL',
        description: 'Test description 3',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        assigned_to: 1,
        assigned_user_name: 'Test User',
        created_by: 1,
        creator_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        resolved_at: null,
        resolution_notes: null,
        due_date: null
    }
]

const mockReviews = [
    {
        id: 1,
        client_id: 'CLIENT001',
        client_name: 'Test Client 1',
        client_risk_level: 'HIGH',
        status: 'APPROVED',
        submitted_by: 1,
        submitter_name: 'Test User',
        reviewer_name: 'Test Reviewer',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        document_count: 3,
        exception_count: 0
    },
    {
        id: 2,
        client_id: 'CLIENT002',
        client_name: 'Test Client 2',
        client_risk_level: 'LOW',
        status: 'DRAFT',
        submitted_by: 1,
        submitter_name: 'Test User',
        reviewer_name: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        document_count: 1,
        exception_count: 0
    },
    {
        id: 3,
        client_id: 'CLIENT003',
        client_name: 'Test Client 3',
        client_risk_level: 'MEDIUM',
        status: 'REJECTED',
        submitted_by: 1,
        submitter_name: 'Test User',
        reviewer_name: 'Test Reviewer',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        document_count: 2,
        exception_count: 1
    }
]

const mockClient = {
    client_id: 'CLIENT001',
    name: 'Test Client Detail',
    status: 'ACTIVE',
    risk_level: 'HIGH',
    country: 'USA',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_review_date: '2024-01-01T00:00:00Z',
    review_count: 5,
    has_auto_review_flags: true,
    auto_kyc_review: true,
    auto_aml_review: false,
    auto_sanctions_review: false,
    auto_pep_review: false,
    auto_financial_review: false,
    domicile_branch: 'Main Branch',
    relationship_manager: 'John Doe',
    business_unit: 'Corporate',
    aml_risk: 'MEDIUM'
}

const mockException = {
    id: 1,
    review_id: 1,
    client_id: 'CLIENT001',
    client_name: 'Test Client Detail',
    title: 'Test Exception Detail',
    type: 'COMPLIANCE' as const,
    description: 'Test description',
    status: 'OPEN' as const,
    priority: 'HIGH' as const,
    assigned_to: null,
    assigned_user_name: null,
    created_by: 1,
    creator_name: 'Test User',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    resolved_at: null,
    resolution_notes: null,
    due_date: null
}

describe('StatusBadge Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('ClientList Component Integration', () => {
        beforeEach(() => {
            mockApiClient.getClients.mockResolvedValue({
                clients: mockClients,
                total: mockClients.length,
                page: 1,
                size: 25
            })
        })

        test('should display consistent status badges for all client statuses', async () => {
            render(
                <TestWrapper>
                    <ClientList />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Active')).toBeInTheDocument()
                expect(screen.getByText('Inactive')).toBeInTheDocument()
                expect(screen.getByText('Suspended')).toBeInTheDocument()
            })

            // Verify status badges have correct colors
            const activeBadge = screen.getByLabelText('Status: ACTIVE')
            const inactiveBadge = screen.getByLabelText('Status: INACTIVE')
            const suspendedBadge = screen.getByLabelText('Status: SUSPENDED')

            expect(activeBadge).toHaveStyle({ borderColor: theme.palette.success.main })
            expect(inactiveBadge).toHaveStyle({ borderColor: theme.palette.grey[500] })
            expect(suspendedBadge).toHaveStyle({ borderColor: theme.palette.error.main })
        })

        test('should display consistent risk level badges for all risk levels', async () => {
            render(
                <TestWrapper>
                    <ClientList />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('High')).toBeInTheDocument()
                expect(screen.getByText('Low')).toBeInTheDocument()
                expect(screen.getByText('Medium')).toBeInTheDocument()
            })

            // Verify risk level badges have correct colors
            const highRiskBadge = screen.getByLabelText('Risk level: HIGH')
            const lowRiskBadge = screen.getByLabelText('Risk level: LOW')
            const mediumRiskBadge = screen.getByLabelText('Risk level: MEDIUM')

            expect(highRiskBadge).toHaveStyle({ borderColor: theme.palette.error.main })
            expect(lowRiskBadge).toHaveStyle({ borderColor: theme.palette.success.main })
            expect(mediumRiskBadge).toHaveStyle({ borderColor: theme.palette.warning.main })
        })

        test('should use outlined variant for client status badges', async () => {
            render(
                <TestWrapper>
                    <ClientList />
                </TestWrapper>
            )

            await waitFor(() => {
                const statusBadges = screen.getAllByLabelText(/Status:/)
                statusBadges.forEach(badge => {
                    expect(badge).toHaveClass('MuiChip-outlined')
                })
            })
        })
    })

    describe('ExceptionList Component Integration', () => {
        beforeEach(() => {
            mockApiClient.getExceptions.mockResolvedValue({
                exceptions: mockExceptions
            })
            mockApiClient.getAssignableUsersList.mockResolvedValue([])
        })

        test('should display consistent status badges for all exception statuses', async () => {
            render(
                <TestWrapper>
                    <ExceptionList />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Open')).toBeInTheDocument()
                expect(screen.getByText('Resolved')).toBeInTheDocument()
                expect(screen.getByText('In Progress')).toBeInTheDocument()
            })

            // Verify exception status badges have correct colors
            const openBadge = screen.getByLabelText('exception status: Open')
            const resolvedBadge = screen.getByLabelText('exception status: Resolved')
            const inProgressBadge = screen.getByLabelText('exception status: In Progress')

            expect(openBadge).toHaveStyle({ borderColor: theme.palette.error.main })
            expect(resolvedBadge).toHaveStyle({ borderColor: theme.palette.success.main })
            expect(inProgressBadge).toHaveStyle({ borderColor: theme.palette.warning.main })
        })

        test('should display consistent priority badges for all priority levels', async () => {
            render(
                <TestWrapper>
                    <ExceptionList />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('High')).toBeInTheDocument()
                expect(screen.getByText('Low')).toBeInTheDocument()
                expect(screen.getByText('Critical')).toBeInTheDocument()
            })

            // Verify priority badges have correct colors
            const highPriorityBadge = screen.getByLabelText('priority level: High')
            const lowPriorityBadge = screen.getByLabelText('priority level: Low')
            const criticalPriorityBadge = screen.getByLabelText('priority level: Critical')

            expect(highPriorityBadge).toHaveStyle({ borderColor: theme.palette.error.main })
            expect(lowPriorityBadge).toHaveStyle({ borderColor: theme.palette.success.main })
            expect(criticalPriorityBadge).toHaveStyle({ borderColor: theme.palette.error.dark })
        })

        test('should use filled variant for exception status badges', async () => {
            render(
                <TestWrapper>
                    <ExceptionList />
                </TestWrapper>
            )

            await waitFor(() => {
                const statusBadges = screen.getAllByLabelText(/exception status:/)
                statusBadges.forEach(badge => {
                    expect(badge).toHaveClass('MuiChip-filled')
                })
            })
        })

        test('should use outlined variant for priority badges', async () => {
            render(
                <TestWrapper>
                    <ExceptionList />
                </TestWrapper>
            )

            await waitFor(() => {
                const priorityBadges = screen.getAllByLabelText(/priority level:/)
                priorityBadges.forEach(badge => {
                    expect(badge).toHaveClass('MuiChip-outlined')
                })
            })
        })
    })

    describe('ReviewList Component Integration', () => {
        beforeEach(() => {
            mockApiClient.getReviews.mockResolvedValue({
                reviews: mockReviews
            })
        })

        test('should display consistent status badges matching Reviews component styling', async () => {
            render(
                <TestWrapper>
                    <ReviewList />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('APPROVED')).toBeInTheDocument()
                expect(screen.getByText('DRAFT')).toBeInTheDocument()
                expect(screen.getByText('REJECTED')).toBeInTheDocument()
            })

            // Note: ReviewList uses custom Chip components, not StatusBadge
            // This test verifies the visual consistency exists
            const approvedChip = screen.getByText('APPROVED').closest('.MuiChip-root')
            const draftChip = screen.getByText('DRAFT').closest('.MuiChip-root')
            const rejectedChip = screen.getByText('REJECTED').closest('.MuiChip-root')

            expect(approvedChip).toHaveStyle({ borderColor: theme.palette.success.main })
            expect(draftChip).toHaveStyle({ borderColor: theme.palette.grey[500] })
            expect(rejectedChip).toHaveStyle({ borderColor: theme.palette.error.main })
        })

        test('should use outlined variant for review status badges', async () => {
            render(
                <TestWrapper>
                    <ReviewList />
                </TestWrapper>
            )

            await waitFor(() => {
                const statusChips = screen.getAllByText(/APPROVED|DRAFT|REJECTED/).map(text =>
                    text.closest('.MuiChip-root')
                )
                statusChips.forEach(chip => {
                    expect(chip).toHaveClass('MuiChip-outlined')
                })
            })
        })
    })

    describe('ClientDetail Component Integration', () => {
        beforeEach(() => {
            mockApiClient.getClient.mockResolvedValue(mockClient)
            mockApiClient.getClientReviews.mockResolvedValue([])
        })

        test('should display consistent status and risk badges in detail view', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="CLIENT001" onBack={() => { }} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Active')).toBeInTheDocument()
                expect(screen.getByText('High')).toBeInTheDocument()
            })

            // Verify badges maintain consistency with list view
            const statusBadge = screen.getByLabelText('Status: ACTIVE')
            const riskBadge = screen.getByLabelText('Risk level: HIGH')

            expect(statusBadge).toHaveStyle({ borderColor: theme.palette.success.main })
            expect(riskBadge).toHaveStyle({ borderColor: theme.palette.error.main })
        })

        test('should display AML risk level with consistent styling', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="CLIENT001" onBack={() => { }} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Medium')).toBeInTheDocument()
            })

            // Verify AML risk uses same color scheme as general risk levels
            const amlRiskBadge = screen.getByLabelText('AML Risk level: MEDIUM')
            expect(amlRiskBadge).toHaveStyle({ borderColor: theme.palette.warning.main })
        })
    })

    describe('ExceptionDetail Component Integration', () => {
        beforeEach(() => {
            mockApiClient.getException.mockResolvedValue(mockException)
            mockApiClient.getAssignableUsersList.mockResolvedValue([])
        })

        test('should display consistent status and priority badges in detail view', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={() => { }} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Open')).toBeInTheDocument()
                expect(screen.getByText('High')).toBeInTheDocument()
            })

            // Verify badges maintain consistency with list view
            const statusBadge = screen.getByLabelText('exception status: Open')
            const priorityBadge = screen.getByLabelText('priority level: High')

            expect(statusBadge).toHaveStyle({ borderColor: theme.palette.error.main })
            expect(priorityBadge).toHaveStyle({ borderColor: theme.palette.error.main })
        })
    })

    describe('Cross-Component Color Consistency', () => {
        test('should use same colors for equivalent states across all components', async () => {
            // Setup mocks for all components
            mockApiClient.getClients.mockResolvedValue({
                clients: [{ ...mockClients[0], status: 'ACTIVE', risk_level: 'HIGH' }],
                total: 1,
                page: 1,
                size: 25
            })
            mockApiClient.getExceptions.mockResolvedValue({
                exceptions: [{ ...mockExceptions[0], status: 'OPEN', priority: 'HIGH' }]
            })
            mockApiClient.getReviews.mockResolvedValue({
                reviews: [{ ...mockReviews[0], status: 'APPROVED' }]
            })
            mockApiClient.getAssignableUsersList.mockResolvedValue([])

            // Render all components
            const { rerender } = render(
                <TestWrapper>
                    <ClientList />
                </TestWrapper>
            )

            await waitFor(() => {
                const activeClientBadge = screen.getByLabelText('Status: ACTIVE')
                const highRiskBadge = screen.getByLabelText('Risk level: HIGH')

                expect(activeClientBadge).toHaveStyle({ borderColor: theme.palette.success.main })
                expect(highRiskBadge).toHaveStyle({ borderColor: theme.palette.error.main })
            })

            rerender(
                <TestWrapper>
                    <ExceptionList />
                </TestWrapper>
            )

            await waitFor(() => {
                const openExceptionBadge = screen.getByLabelText('exception status: Open')
                const highPriorityBadge = screen.getByLabelText('priority level: High')

                expect(openExceptionBadge).toHaveStyle({ borderColor: theme.palette.error.main })
                expect(highPriorityBadge).toHaveStyle({ borderColor: theme.palette.error.main })
            })

            rerender(
                <TestWrapper>
                    <ReviewList />
                </TestWrapper>
            )

            await waitFor(() => {
                const approvedReviewChip = screen.getByText('APPROVED').closest('.MuiChip-root')
                expect(approvedReviewChip).toHaveStyle({ borderColor: theme.palette.success.main })
            })
        })
    })

    describe('Accessibility Consistency', () => {
        test('all status badges should have proper ARIA labels across components', async () => {
            mockApiClient.getClients.mockResolvedValue({
                clients: mockClients,
                total: mockClients.length,
                page: 1,
                size: 25
            })

            render(
                <TestWrapper>
                    <ClientList />
                </TestWrapper>
            )

            await waitFor(() => {
                // Verify all status badges have proper ARIA labels
                expect(screen.getByLabelText('Status: ACTIVE')).toBeInTheDocument()
                expect(screen.getByLabelText('Status: INACTIVE')).toBeInTheDocument()
                expect(screen.getByLabelText('Status: SUSPENDED')).toBeInTheDocument()

                // Verify all risk level badges have proper ARIA labels
                expect(screen.getByLabelText('Risk level: HIGH')).toBeInTheDocument()
                expect(screen.getByLabelText('Risk level: LOW')).toBeInTheDocument()
                expect(screen.getByLabelText('Risk level: MEDIUM')).toBeInTheDocument()
            })
        })

        test('all badges should have role="status" attribute', async () => {
            mockApiClient.getClients.mockResolvedValue({
                clients: [mockClients[0]],
                total: 1,
                page: 1,
                size: 25
            })

            render(
                <TestWrapper>
                    <ClientList />
                </TestWrapper>
            )

            await waitFor(() => {
                const statusBadge = screen.getByLabelText('Status: ACTIVE')
                const riskBadge = screen.getByLabelText('Risk level: HIGH')

                expect(statusBadge).toHaveAttribute('role', 'status')
                expect(riskBadge).toHaveAttribute('role', 'status')
            })
        })
    })

    describe('Visual Regression Prevention', () => {
        test('should maintain consistent styling properties across all badge instances', async () => {
            mockApiClient.getClients.mockResolvedValue({
                clients: [mockClients[0]],
                total: 1,
                page: 1,
                size: 25
            })

            render(
                <TestWrapper>
                    <ClientList />
                </TestWrapper>
            )

            await waitFor(() => {
                const statusBadge = screen.getByLabelText('Status: ACTIVE')
                const riskBadge = screen.getByLabelText('Risk level: HIGH')

                // Verify consistent styling properties
                const statusStyles = window.getComputedStyle(statusBadge)
                const riskStyles = window.getComputedStyle(riskBadge)

                expect(statusStyles.borderRadius).toBe('6px')
                expect(riskStyles.borderRadius).toBe('6px')

                expect(statusStyles.fontWeight).toBe('500')
                expect(riskStyles.fontWeight).toBe('500')

                expect(statusStyles.height).toBe('24px')
                expect(riskStyles.height).toBe('24px')
            })
        })
    })
})