import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { AppStateProvider } from '../../contexts/AppStateContext'
import { useClients } from '../useClients'
import { apiClient } from '../../services'

// Mock the API client
vi.mock('../../services', () => ({
    apiClient: {
        getClients: vi.fn(),
    },
}))

const mockedApiClient = vi.mocked(apiClient)

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => (
    <AppStateProvider>{children}</AppStateProvider>
)

describe('useClients', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with empty state', () => {
        const { result } = renderHook(() => useClients(), {
            wrapper: TestWrapper,
        })

        expect(result.current.clients).toEqual([])
        expect(result.current.total).toBe(0)
        expect(result.current.loading).toBe(true) // Loading starts immediately
        expect(result.current.error).toBe(null)
        expect(result.current.filters).toEqual({
            search: '',
            risk_level: '',
            country: '',
            status: '',
        })
        expect(result.current.pagination).toEqual({
            page: 1,
            size: 20,
            pages: 0,
        })
    })

    it('should fetch clients on mount', async () => {
        const mockClients = [
            {
                client_id: 'CLIENT001',
                name: 'Test Client 1',
                risk_level: 'High' as const,
                country: 'US',
                last_review_date: '2024-01-01',
                status: 'Active' as const,
                review_count: 5,
                pending_reviews: 1,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            },
        ]

        const mockResponse = {
            items: mockClients,
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
        }

        mockedApiClient.getClients.mockResolvedValue(mockResponse)

        const { result } = renderHook(() => useClients(), {
            wrapper: TestWrapper,
        })

        // Initially loading should be true
        expect(result.current.loading).toBe(true)

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(mockedApiClient.getClients).toHaveBeenCalledWith(
            {
                search: '',
                risk_level: '',
                country: '',
                status: '',
            },
            1,
            20
        )

        expect(result.current.clients).toEqual(mockClients)
        expect(result.current.total).toBe(1)
        expect(result.current.error).toBe(null)
    })

    it('should handle fetch error', async () => {
        const errorMessage = 'Failed to fetch clients'
        mockedApiClient.getClients.mockRejectedValue(new Error(errorMessage))

        const { result } = renderHook(() => useClients(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBe(errorMessage)
        expect(result.current.clients).toEqual([])
    })

    it('should update filters and reset page', async () => {
        mockedApiClient.getClients.mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            size: 20,
            pages: 0,
        })

        const { result } = renderHook(() => useClients(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        act(() => {
            result.current.setFilters({ search: 'test', risk_level: 'High' })
        })

        expect(result.current.filters).toEqual({
            search: 'test',
            risk_level: 'High',
            country: '',
            status: '',
        })
        expect(result.current.pagination.page).toBe(1)

        // Should trigger new fetch with updated filters
        await waitFor(() => {
            expect(mockedApiClient.getClients).toHaveBeenCalledWith(
                {
                    search: 'test',
                    risk_level: 'High',
                    country: '',
                    status: '',
                },
                1,
                20
            )
        })
    })

    it('should update page', async () => {
        mockedApiClient.getClients.mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            size: 20,
            pages: 0,
        })

        const { result } = renderHook(() => useClients(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        act(() => {
            result.current.setPage(2)
        })

        expect(result.current.pagination.page).toBe(2)

        // Should trigger new fetch with updated page
        await waitFor(() => {
            expect(mockedApiClient.getClients).toHaveBeenCalledWith(
                {
                    search: '',
                    risk_level: '',
                    country: '',
                    status: '',
                },
                2,
                20
            )
        })
    })

    it('should refresh clients', async () => {
        const mockClients = [
            {
                client_id: 'CLIENT001',
                name: 'Test Client 1',
                risk_level: 'High' as const,
                country: 'US',
                last_review_date: '2024-01-01',
                status: 'Active' as const,
                review_count: 5,
                pending_reviews: 1,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            },
        ]

        mockedApiClient.getClients.mockResolvedValue({
            items: mockClients,
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
        })

        const { result } = renderHook(() => useClients(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        // Clear the mock to test refresh
        mockedApiClient.getClients.mockClear()

        await act(async () => {
            await result.current.refreshClients()
        })

        expect(mockedApiClient.getClients).toHaveBeenCalledTimes(1)
    })

    it('should clear cache', async () => {
        mockedApiClient.getClients.mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            size: 20,
            pages: 0,
        })

        const { result } = renderHook(() => useClients(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        act(() => {
            result.current.clearCache()
        })

        expect(result.current.clients).toEqual([])
        expect(result.current.total).toBe(0)
        expect(result.current.error).toBe(null)
    })

    it('should not refetch if cache is fresh', async () => {
        const mockClients = [
            {
                client_id: 'CLIENT001',
                name: 'Test Client 1',
                risk_level: 'High' as const,
                country: 'US',
                last_review_date: '2024-01-01',
                status: 'Active' as const,
                review_count: 5,
                pending_reviews: 1,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            },
        ]

        mockedApiClient.getClients.mockResolvedValue({
            items: mockClients,
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
        })

        const { result, rerender } = renderHook(() => useClients(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(mockedApiClient.getClients).toHaveBeenCalledTimes(1)

        // Rerender should not trigger another fetch since cache is fresh
        rerender()

        expect(mockedApiClient.getClients).toHaveBeenCalledTimes(1)
    })
})