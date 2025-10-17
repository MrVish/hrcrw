import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { AppStateProvider } from '../../contexts/AppStateContext'
import { useDashboard } from '../useDashboard'
import { apiClient } from '../../services'
import type { DashboardMetrics, Notification } from '../../types'

// Mock the API client
vi.mock('../../services', () => ({
    apiClient: {
        getDashboardMetrics: vi.fn(),
        getNotifications: vi.fn(),
        markNotificationRead: vi.fn(),
    },
}))

const mockedApiClient = vi.mocked(apiClient)

// Mock timers
vi.useFakeTimers()

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => (
    <AppStateProvider>{children}</AppStateProvider>
)

describe('useDashboard', () => {
    const mockMetrics: DashboardMetrics = {
        pendingReviews: 5,
        approvedReviews: 20,
        rejectedReviews: 2,
        openExceptions: 3,
        activeUsers: 10,
        averageReviewTime: 2.5,
        reviewsByStatus: [
            { name: 'Pending', value: 5, color: '#fbbf24' },
            { name: 'Approved', value: 20, color: '#10b981' },
            { name: 'Rejected', value: 2, color: '#ef4444' },
        ],
        reviewsOverTime: [
            { date: '2024-01-01', submitted: 3, approved: 2, rejected: 1 },
        ],
    }

    const mockNotifications: Notification[] = [
        {
            id: 'notif-1',
            type: 'review_submitted',
            title: 'New Review Submitted',
            message: 'A new review has been submitted for CLIENT001',
            timestamp: '2024-01-01T00:00:00Z',
            read: false,
            priority: 'medium',
            actionUrl: '/reviews/1',
        },
        {
            id: 'notif-2',
            type: 'exception_created',
            title: 'Exception Created',
            message: 'A new exception has been created',
            timestamp: '2024-01-01T01:00:00Z',
            read: true,
            priority: 'high',
        },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
        vi.clearAllTimers()
    })

    it('should initialize with empty state', () => {
        const { result } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        expect(result.current.metrics).toBe(null)
        expect(result.current.notifications).toEqual([])
        expect(result.current.loading).toBe(true) // Loading starts immediately
        expect(result.current.error).toBe(null)
    })

    it('should fetch dashboard data on mount', async () => {
        mockedApiClient.getDashboardMetrics.mockResolvedValue(mockMetrics)
        mockedApiClient.getNotifications.mockResolvedValue(mockNotifications)

        const { result } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        expect(result.current.loading).toBe(true)

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(mockedApiClient.getDashboardMetrics).toHaveBeenCalledTimes(1)
        expect(mockedApiClient.getNotifications).toHaveBeenCalledTimes(1)

        expect(result.current.metrics).toEqual(mockMetrics)
        expect(result.current.notifications).toEqual(mockNotifications)
        expect(result.current.error).toBe(null)
    })

    it('should handle fetch error', async () => {
        const errorMessage = 'Failed to fetch dashboard data'
        mockedApiClient.getDashboardMetrics.mockRejectedValue(new Error(errorMessage))
        mockedApiClient.getNotifications.mockRejectedValue(new Error(errorMessage))

        const { result } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBe(errorMessage)
        expect(result.current.metrics).toBe(null)
        expect(result.current.notifications).toEqual([])
    })

    it('should mark notification as read', async () => {
        mockedApiClient.getDashboardMetrics.mockResolvedValue(mockMetrics)
        mockedApiClient.getNotifications.mockResolvedValue(mockNotifications)
        mockedApiClient.markNotificationRead.mockResolvedValue()

        const { result } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        await act(async () => {
            await result.current.markNotificationRead('notif-1')
        })

        expect(mockedApiClient.markNotificationRead).toHaveBeenCalledWith('notif-1')

        // Check that the notification was marked as read in state
        const updatedNotification = result.current.notifications.find(n => n.id === 'notif-1')
        expect(updatedNotification?.read).toBe(true)
    })

    it('should handle mark notification read error gracefully', async () => {
        mockedApiClient.getDashboardMetrics.mockResolvedValue(mockMetrics)
        mockedApiClient.getNotifications.mockResolvedValue(mockNotifications)
        mockedApiClient.markNotificationRead.mockRejectedValue(new Error('Network error'))

        // Mock console.error to avoid test output noise
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        const { result } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        await act(async () => {
            await result.current.markNotificationRead('notif-1')
        })

        expect(consoleSpy).toHaveBeenCalledWith('Failed to mark notification as read:', expect.any(Error))

        // Notification should not be marked as read in state
        const notification = result.current.notifications.find(n => n.id === 'notif-1')
        expect(notification?.read).toBe(false)

        consoleSpy.mockRestore()
    })

    it('should refresh dashboard data', async () => {
        mockedApiClient.getDashboardMetrics.mockResolvedValue(mockMetrics)
        mockedApiClient.getNotifications.mockResolvedValue(mockNotifications)

        const { result } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        // Clear mocks to test refresh
        mockedApiClient.getDashboardMetrics.mockClear()
        mockedApiClient.getNotifications.mockClear()

        await act(async () => {
            await result.current.refreshDashboard()
        })

        expect(mockedApiClient.getDashboardMetrics).toHaveBeenCalledTimes(1)
        expect(mockedApiClient.getNotifications).toHaveBeenCalledTimes(1)
    })

    it('should clear cache', async () => {
        mockedApiClient.getDashboardMetrics.mockResolvedValue(mockMetrics)
        mockedApiClient.getNotifications.mockResolvedValue(mockNotifications)

        const { result } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        act(() => {
            result.current.clearCache()
        })

        expect(result.current.metrics).toBe(null)
        expect(result.current.notifications).toEqual([])
        expect(result.current.error).toBe(null)
    })

    it('should set up periodic refresh', async () => {
        mockedApiClient.getDashboardMetrics.mockResolvedValue(mockMetrics)
        mockedApiClient.getNotifications.mockResolvedValue(mockNotifications)

        const { result, unmount } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        // Clear initial calls
        mockedApiClient.getDashboardMetrics.mockClear()
        mockedApiClient.getNotifications.mockClear()

        // Fast-forward time by 2 minutes (cache duration)
        act(() => {
            vi.advanceTimersByTime(2 * 60 * 1000)
        })

        await waitFor(() => {
            expect(mockedApiClient.getDashboardMetrics).toHaveBeenCalledTimes(1)
            expect(mockedApiClient.getNotifications).toHaveBeenCalledTimes(1)
        })

        // Cleanup
        unmount()
    })

    it('should not refetch if cache is fresh', async () => {
        mockedApiClient.getDashboardMetrics.mockResolvedValue(mockMetrics)
        mockedApiClient.getNotifications.mockResolvedValue(mockNotifications)

        const { result, rerender } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(mockedApiClient.getDashboardMetrics).toHaveBeenCalledTimes(1)
        expect(mockedApiClient.getNotifications).toHaveBeenCalledTimes(1)

        // Rerender should not trigger another fetch since cache is fresh
        rerender()

        expect(mockedApiClient.getDashboardMetrics).toHaveBeenCalledTimes(1)
        expect(mockedApiClient.getNotifications).toHaveBeenCalledTimes(1)
    })

    it('should handle partial API failures', async () => {
        mockedApiClient.getDashboardMetrics.mockResolvedValue(mockMetrics)
        mockedApiClient.getNotifications.mockRejectedValue(new Error('Notifications failed'))

        const { result } = renderHook(() => useDashboard(), {
            wrapper: TestWrapper,
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        // Should have error but still show metrics if one API call succeeded
        expect(result.current.error).toBe('Notifications failed')
        expect(result.current.metrics).toBe(null) // Both calls are in Promise.all, so both fail
        expect(result.current.notifications).toEqual([])
    })
})