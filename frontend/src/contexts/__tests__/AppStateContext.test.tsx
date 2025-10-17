import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import { AppStateProvider, useAppState } from '../AppStateContext'
import type { Client, Review, Exception, User } from '../../types'

// Mock window.addEventListener and removeEventListener
const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => (
    <AppStateProvider>{children}</AppStateProvider>
)

describe('AppStateContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should provide initial state', () => {
        const { result } = renderHook(() => useAppState(), {
            wrapper: TestWrapper,
        })

        expect(result.current.state.clients.items).toEqual([])
        expect(result.current.state.clients.loading).toBe(false)
        expect(result.current.state.clients.error).toBe(null)
        expect(result.current.state.clients.total).toBe(0)

        expect(result.current.state.reviews.items).toEqual([])
        expect(result.current.state.exceptions.items).toEqual([])
        expect(result.current.state.dashboard.metrics).toBe(null)
        expect(result.current.state.users.items).toEqual([])
    })

    it('should set up auth error listener', () => {
        renderHook(() => useAppState(), {
            wrapper: TestWrapper,
        })

        expect(addEventListenerSpy).toHaveBeenCalledWith('auth:error', expect.any(Function))
    })

    it('should clean up auth error listener on unmount', () => {
        const { unmount } = renderHook(() => useAppState(), {
            wrapper: TestWrapper,
        })

        unmount()

        expect(removeEventListenerSpy).toHaveBeenCalledWith('auth:error', expect.any(Function))
    })

    describe('Client Actions', () => {
        it('should handle CLIENTS_FETCH_START', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            act(() => {
                result.current.dispatch({ type: 'CLIENTS_FETCH_START' })
            })

            expect(result.current.state.clients.loading).toBe(true)
            expect(result.current.state.clients.error).toBe(null)
        })

        it('should handle CLIENTS_FETCH_SUCCESS', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            const mockClients: Client[] = [
                {
                    client_id: 'CLIENT001',
                    name: 'Test Client',
                    risk_level: 'High',
                    country: 'US',
                    last_review_date: '2024-01-01',
                    status: 'Active',
                    review_count: 5,
                    pending_reviews: 1,
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                },
            ]

            act(() => {
                result.current.dispatch({
                    type: 'CLIENTS_FETCH_SUCCESS',
                    payload: {
                        items: mockClients,
                        total: 1,
                        page: 1,
                        size: 20,
                        pages: 1,
                    },
                })
            })

            expect(result.current.state.clients.items).toEqual(mockClients)
            expect(result.current.state.clients.total).toBe(1)
            expect(result.current.state.clients.loading).toBe(false)
            expect(result.current.state.clients.error).toBe(null)
            expect(result.current.state.clients.lastFetch).toBeTypeOf('number')
            expect(result.current.state.clients.pagination).toEqual({
                page: 1,
                size: 20,
                pages: 1,
            })
        })

        it('should handle CLIENTS_FETCH_ERROR', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            act(() => {
                result.current.dispatch({
                    type: 'CLIENTS_FETCH_ERROR',
                    payload: 'Failed to fetch clients',
                })
            })

            expect(result.current.state.clients.loading).toBe(false)
            expect(result.current.state.clients.error).toBe('Failed to fetch clients')
        })

        it('should handle CLIENTS_SET_FILTERS', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            act(() => {
                result.current.dispatch({
                    type: 'CLIENTS_SET_FILTERS',
                    payload: { search: 'test', risk_level: 'High' },
                })
            })

            expect(result.current.state.clients.filters.search).toBe('test')
            expect(result.current.state.clients.filters.risk_level).toBe('High')
            expect(result.current.state.clients.pagination.page).toBe(1) // Should reset page
        })

        it('should handle CLIENTS_UPDATE_ITEM', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            const initialClient: Client = {
                client_id: 'CLIENT001',
                name: 'Test Client',
                risk_level: 'Medium',
                country: 'US',
                last_review_date: '2024-01-01',
                status: 'Active',
                review_count: 5,
                pending_reviews: 1,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            }

            // First add a client
            act(() => {
                result.current.dispatch({
                    type: 'CLIENTS_FETCH_SUCCESS',
                    payload: {
                        items: [initialClient],
                        total: 1,
                        page: 1,
                        size: 20,
                        pages: 1,
                    },
                })
            })

            // Then update it
            const updatedClient = { ...initialClient, risk_level: 'High' as const }
            act(() => {
                result.current.dispatch({
                    type: 'CLIENTS_UPDATE_ITEM',
                    payload: updatedClient,
                })
            })

            expect(result.current.state.clients.items[0]).toEqual(updatedClient)
        })

        it('should handle CLIENTS_CLEAR_CACHE', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            // First set some data
            act(() => {
                result.current.dispatch({
                    type: 'CLIENTS_FETCH_SUCCESS',
                    payload: {
                        items: [
                            {
                                client_id: 'CLIENT001',
                                name: 'Test Client',
                                risk_level: 'High',
                                country: 'US',
                                last_review_date: '2024-01-01',
                                status: 'Active',
                                review_count: 5,
                                pending_reviews: 1,
                                created_at: '2024-01-01T00:00:00Z',
                                updated_at: '2024-01-01T00:00:00Z',
                            },
                        ],
                        total: 1,
                        page: 1,
                        size: 20,
                        pages: 1,
                    },
                })
            })

            // Set some filters
            act(() => {
                result.current.dispatch({
                    type: 'CLIENTS_SET_FILTERS',
                    payload: { search: 'test' },
                })
            })

            // Clear cache
            act(() => {
                result.current.dispatch({ type: 'CLIENTS_CLEAR_CACHE' })
            })

            expect(result.current.state.clients.items).toEqual([])
            expect(result.current.state.clients.total).toBe(0)
            expect(result.current.state.clients.lastFetch).toBe(null)
            expect(result.current.state.clients.error).toBe(null)
            // Filters and pagination should be preserved
            expect(result.current.state.clients.filters.search).toBe('test')
        })
    })

    describe('Review Actions', () => {
        it('should handle REVIEWS_ADD_ITEM', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            const newReview: Review = {
                review_id: 1,
                client_id: 'CLIENT001',
                client_name: 'Test Client',
                client_risk_level: 'High',
                status: 'Draft',
                submitted_by: 'Test User',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            }

            act(() => {
                result.current.dispatch({
                    type: 'REVIEWS_ADD_ITEM',
                    payload: newReview,
                })
            })

            expect(result.current.state.reviews.items).toContain(newReview)
            expect(result.current.state.reviews.total).toBe(1)
        })

        it('should handle REVIEWS_UPDATE_ITEM', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            const initialReview: Review = {
                review_id: 1,
                client_id: 'CLIENT001',
                client_name: 'Test Client',
                client_risk_level: 'High',
                status: 'Draft',
                submitted_by: 'Test User',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            }

            // Add initial review
            act(() => {
                result.current.dispatch({
                    type: 'REVIEWS_ADD_ITEM',
                    payload: initialReview,
                })
            })

            // Update review
            const updatedReview = { ...initialReview, status: 'Submitted' as const }
            act(() => {
                result.current.dispatch({
                    type: 'REVIEWS_UPDATE_ITEM',
                    payload: updatedReview,
                })
            })

            expect(result.current.state.reviews.items[0]).toEqual(updatedReview)
        })
    })

    describe('Exception Actions', () => {
        it('should handle EXCEPTIONS_ADD_ITEM', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            const newException: Exception = {
                exception_id: 1,
                review_id: 1,
                client_name: 'Test Client',
                client_id: 'CLIENT001',
                type: 'Documentation Missing',
                description: 'Required documents are missing',
                status: 'Open',
                priority: 'High',
                created_by: 'Test User',
                created_at: '2024-01-01T00:00:00Z',
            }

            act(() => {
                result.current.dispatch({
                    type: 'EXCEPTIONS_ADD_ITEM',
                    payload: newException,
                })
            })

            expect(result.current.state.exceptions.items).toContain(newException)
            expect(result.current.state.exceptions.total).toBe(1)
        })
    })

    describe('Dashboard Actions', () => {
        it('should handle DASHBOARD_UPDATE_NOTIFICATION', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            const initialNotifications = [
                {
                    id: 'notif-1',
                    type: 'review_submitted' as const,
                    title: 'Review Submitted',
                    message: 'A review has been submitted',
                    timestamp: '2024-01-01T00:00:00Z',
                    read: false,
                    priority: 'medium' as const,
                },
            ]

            // Set initial notifications
            act(() => {
                result.current.dispatch({
                    type: 'DASHBOARD_FETCH_SUCCESS',
                    payload: {
                        metrics: {
                            pendingReviews: 5,
                            approvedReviews: 20,
                            rejectedReviews: 2,
                            openExceptions: 3,
                            activeUsers: 10,
                            averageReviewTime: 2.5,
                            reviewsByStatus: [],
                            reviewsOverTime: [],
                        },
                        notifications: initialNotifications,
                    },
                })
            })

            // Update notification
            const updatedNotification = { ...initialNotifications[0], read: true }
            act(() => {
                result.current.dispatch({
                    type: 'DASHBOARD_UPDATE_NOTIFICATION',
                    payload: updatedNotification,
                })
            })

            expect(result.current.state.dashboard.notifications[0].read).toBe(true)
        })
    })

    describe('User Actions', () => {
        it('should handle USERS_REMOVE_ITEM', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            const users: User[] = [
                {
                    id: 1,
                    name: 'User 1',
                    email: 'user1@example.com',
                    role: 'Maker',
                    is_active: true,
                },
                {
                    id: 2,
                    name: 'User 2',
                    email: 'user2@example.com',
                    role: 'Checker',
                    is_active: true,
                },
            ]

            // Add users
            act(() => {
                result.current.dispatch({
                    type: 'USERS_FETCH_SUCCESS',
                    payload: {
                        items: users,
                        total: 2,
                        page: 1,
                        size: 20,
                        pages: 1,
                    },
                })
            })

            // Remove user
            act(() => {
                result.current.dispatch({
                    type: 'USERS_REMOVE_ITEM',
                    payload: 1,
                })
            })

            expect(result.current.state.users.items).toHaveLength(1)
            expect(result.current.state.users.items[0].id).toBe(2)
            expect(result.current.state.users.total).toBe(1)
        })
    })

    describe('Global Actions', () => {
        it('should handle CLEAR_ALL_CACHE', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            // Set some data first
            act(() => {
                result.current.dispatch({
                    type: 'CLIENTS_FETCH_SUCCESS',
                    payload: {
                        items: [
                            {
                                client_id: 'CLIENT001',
                                name: 'Test Client',
                                risk_level: 'High',
                                country: 'US',
                                last_review_date: '2024-01-01',
                                status: 'Active',
                                review_count: 5,
                                pending_reviews: 1,
                                created_at: '2024-01-01T00:00:00Z',
                                updated_at: '2024-01-01T00:00:00Z',
                            },
                        ],
                        total: 1,
                        page: 1,
                        size: 20,
                        pages: 1,
                    },
                })
            })

            // Clear all cache
            act(() => {
                result.current.dispatch({ type: 'CLEAR_ALL_CACHE' })
            })

            expect(result.current.state.clients.items).toEqual([])
            expect(result.current.state.clients.total).toBe(0)
            expect(result.current.state.reviews.items).toEqual([])
            expect(result.current.state.exceptions.items).toEqual([])
            expect(result.current.state.dashboard.metrics).toBe(null)
            expect(result.current.state.users.items).toEqual([])
        })

        it('should clear all cache on auth error event', () => {
            const { result } = renderHook(() => useAppState(), {
                wrapper: TestWrapper,
            })

            // Set some data first
            act(() => {
                result.current.dispatch({
                    type: 'CLIENTS_FETCH_SUCCESS',
                    payload: {
                        items: [
                            {
                                client_id: 'CLIENT001',
                                name: 'Test Client',
                                risk_level: 'High',
                                country: 'US',
                                last_review_date: '2024-01-01',
                                status: 'Active',
                                review_count: 5,
                                pending_reviews: 1,
                                created_at: '2024-01-01T00:00:00Z',
                                updated_at: '2024-01-01T00:00:00Z',
                            },
                        ],
                        total: 1,
                        page: 1,
                        size: 20,
                        pages: 1,
                    },
                })
            })

            // Simulate auth error event
            act(() => {
                window.dispatchEvent(new CustomEvent('auth:error'))
            })

            expect(result.current.state.clients.items).toEqual([])
            expect(result.current.state.clients.total).toBe(0)
        })
    })

    it('should throw error when used outside provider', () => {
        expect(() => {
            renderHook(() => useAppState())
        }).toThrow('useAppState must be used within an AppStateProvider')
    })
})