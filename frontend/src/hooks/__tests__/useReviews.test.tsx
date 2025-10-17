import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { AppStateProvider } from '../../contexts/AppStateContext'
import { useReviews } from '../useReviews'
import { apiClient } from '../../services'
import type { Review, ReviewFormData } from '../../types'

// Mock the API client
vi.mock('../../services', () => ({
    apiClient: {
        getReviews: vi.fn(),
        createReview: vi.fn(),
        updateReview: vi.fn(),
        submitReview: vi.fn(),
        approveReview: vi.fn(),
        rejectReview: vi.fn(),
    },
}))

const mockedApiClient = vi.mocked(apiClient)

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => (
    <AppStateProvider>{children}</AppStateProvider>
)

describe('useReviews', () => {
    const mockReview: Review = {
        review_id: 1,
        client_id: 'CLIENT001',
        client_name: 'Test Client',
        client_risk_level: 'High',
        status: 'Draft',
        submitted_by: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        risk_assessment: 'High risk assessment',
        compliance_notes: 'Compliance notes',
        recommendations: 'Recommendations',
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with empty state', () => {
        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        expect(result.current.reviews).toEqual([])
        expect(result.current.total).toBe(0)
        expect(result.current.loading).toBe(true) // Loading starts immediately
        expect(result.current.error).toBe(null)
        expect(result.current.filters).toEqual({
            search: '',
            status: '',
            client_risk_level: '',
            date_range: '',
        })
    })

    it('should fetch reviews on mount', async () => {
        const mockResponse = {
            items: [mockReview],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
        }

        mockedApiClient.getReviews.mockResolvedValue(mockResponse)

        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        expect(result.current.loading).toBe(true)

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(mockedApiClient.getReviews).toHaveBeenCalledWith(
            {
                search: '',
                status: '',
                client_risk_level: '',
                date_range: '',
            },
            1,
            20
        )

        expect(result.current.reviews).toEqual([mockReview])
        expect(result.current.total).toBe(1)
    })

    it('should create review and update state', async () => {
        const reviewData: ReviewFormData = {
            client_id: 'CLIENT001',
            risk_assessment: 'High risk assessment',
            compliance_notes: 'Compliance notes',
            recommendations: 'Recommendations',
            documents: [],
        }

        mockedApiClient.getReviews.mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            size: 20,
            pages: 0,
        })

        mockedApiClient.createReview.mockResolvedValue(mockReview)

        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        let createdReview: Review
        await act(async () => {
            createdReview = await result.current.createReview(reviewData)
        })

        expect(mockedApiClient.createReview).toHaveBeenCalledWith(reviewData)
        expect(createdReview!).toEqual(mockReview)
        expect(result.current.reviews).toContain(mockReview)
        expect(result.current.total).toBe(1)
    })

    it('should update review and update state', async () => {
        const updatedReview = { ...mockReview, status: 'Submitted' as const }
        const updateData = { risk_assessment: 'Updated assessment' }

        mockedApiClient.getReviews.mockResolvedValue({
            items: [mockReview],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
        })

        mockedApiClient.updateReview.mockResolvedValue(updatedReview)

        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        let updated: Review
        await act(async () => {
            updated = await result.current.updateReview(1, updateData)
        })

        expect(mockedApiClient.updateReview).toHaveBeenCalledWith(1, updateData)
        expect(updated!).toEqual(updatedReview)
        expect(result.current.reviews[0]).toEqual(updatedReview)
    })

    it('should submit review and update state', async () => {
        const submittedReview = { ...mockReview, status: 'Submitted' as const }

        mockedApiClient.getReviews.mockResolvedValue({
            items: [mockReview],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
        })

        mockedApiClient.submitReview.mockResolvedValue(submittedReview)

        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        let submitted: Review
        await act(async () => {
            submitted = await result.current.submitReview(1)
        })

        expect(mockedApiClient.submitReview).toHaveBeenCalledWith(1)
        expect(submitted!).toEqual(submittedReview)
        expect(result.current.reviews[0]).toEqual(submittedReview)
    })

    it('should approve review and update state', async () => {
        const approvedReview = {
            ...mockReview,
            status: 'Approved' as const,
            comments: 'Approved with conditions',
            reviewed_by: 'Checker User',
        }

        mockedApiClient.getReviews.mockResolvedValue({
            items: [mockReview],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
        })

        mockedApiClient.approveReview.mockResolvedValue(approvedReview)

        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        let approved: Review
        await act(async () => {
            approved = await result.current.approveReview(1, 'Approved with conditions')
        })

        expect(mockedApiClient.approveReview).toHaveBeenCalledWith(1, 'Approved with conditions')
        expect(approved!).toEqual(approvedReview)
        expect(result.current.reviews[0]).toEqual(approvedReview)
    })

    it('should reject review and update state', async () => {
        const rejectedReview = {
            ...mockReview,
            status: 'Rejected' as const,
            comments: 'Insufficient documentation',
            reviewed_by: 'Checker User',
        }

        mockedApiClient.getReviews.mockResolvedValue({
            items: [mockReview],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
        })

        mockedApiClient.rejectReview.mockResolvedValue(rejectedReview)

        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        let rejected: Review
        await act(async () => {
            rejected = await result.current.rejectReview(1, 'Insufficient documentation')
        })

        expect(mockedApiClient.rejectReview).toHaveBeenCalledWith(1, 'Insufficient documentation')
        expect(rejected!).toEqual(rejectedReview)
        expect(result.current.reviews[0]).toEqual(rejectedReview)
    })

    it('should handle fetch error', async () => {
        const errorMessage = 'Failed to fetch reviews'
        mockedApiClient.getReviews.mockRejectedValue(new Error(errorMessage))

        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBe(errorMessage)
        expect(result.current.reviews).toEqual([])
    })

    it('should update filters and trigger refetch', async () => {
        mockedApiClient.getReviews.mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            size: 20,
            pages: 0,
        })

        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        act(() => {
            result.current.setFilters({ status: 'Submitted', client_risk_level: 'High' })
        })

        expect(result.current.filters).toEqual({
            search: '',
            status: 'Submitted',
            client_risk_level: 'High',
            date_range: '',
        })

        await waitFor(() => {
            expect(mockedApiClient.getReviews).toHaveBeenCalledWith(
                {
                    search: '',
                    status: 'Submitted',
                    client_risk_level: 'High',
                    date_range: '',
                },
                1,
                20
            )
        })
    })

    it('should refresh reviews', async () => {
        mockedApiClient.getReviews.mockResolvedValue({
            items: [mockReview],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
        })

        const { result } = renderHook(() => useReviews(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        mockedApiClient.getReviews.mockClear()

        await act(async () => {
            await result.current.refreshReviews()
        })

        expect(mockedApiClient.getReviews).toHaveBeenCalledTimes(1)
    })
})