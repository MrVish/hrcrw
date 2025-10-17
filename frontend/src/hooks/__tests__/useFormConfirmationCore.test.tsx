import { renderHook, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { useFormConfirmation } from '../useFormConfirmation'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock React Router
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/test' }

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => mockLocation,
    }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
)

describe('useFormConfirmation Hook Core Functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Reset any global state
        window.removeEventListener('beforeunload', vi.fn())
        window.removeEventListener('popstate', vi.fn())
    })

    describe('Initial State', () => {
        it('initializes with clean state', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            expect(result.current.isDirty).toBe(false)
            expect(result.current.blockNavigation).toBe(false)
        })

        it('provides all required methods', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            expect(typeof result.current.setDirty).toBe('function')
            expect(typeof result.current.resetForm).toBe('function')
            expect(typeof result.current.confirmNavigation).toBe('function')
            expect(typeof result.current.setBlockNavigation).toBe('function')
        })
    })

    describe('Dirty State Management', () => {
        it('sets dirty state correctly', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setDirty(true)
            })

            expect(result.current.isDirty).toBe(true)
            expect(result.current.blockNavigation).toBe(true)
        })

        it('clears dirty state correctly', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            // First set dirty
            act(() => {
                result.current.setDirty(true)
            })

            expect(result.current.isDirty).toBe(true)

            // Then clear
            act(() => {
                result.current.setDirty(false)
            })

            expect(result.current.isDirty).toBe(false)
            expect(result.current.blockNavigation).toBe(false)
        })

        it('resets form state completely', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            // Set dirty and pending navigation
            act(() => {
                result.current.setDirty(true)
                result.current.confirmNavigation(() => { })
            })

            expect(result.current.isDirty).toBe(true)
            expect(result.current.pendingNavigation).not.toBeNull()

            // Reset form
            act(() => {
                result.current.resetForm()
            })

            expect(result.current.isDirty).toBe(false)
            expect(result.current.blockNavigation).toBe(false)
            expect(result.current.pendingNavigation).toBeNull()
        })
    })

    describe('Navigation Confirmation', () => {
        it('executes callback immediately when form is clean', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })
            const mockCallback = vi.fn()

            act(() => {
                result.current.confirmNavigation(mockCallback)
            })

            expect(mockCallback).toHaveBeenCalledTimes(1)
            expect(result.current.pendingNavigation).toBeNull()
        })

        it('stores navigation callback when form is dirty', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })
            const mockCallback = vi.fn()

            act(() => {
                result.current.setDirty(true)
            })

            act(() => {
                result.current.confirmNavigation(mockCallback)
            })

            expect(mockCallback).not.toHaveBeenCalled()
            expect(result.current.pendingNavigation).not.toBeNull()
        })

        it('handles multiple navigation attempts correctly', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })
            const firstCallback = vi.fn()
            const secondCallback = vi.fn()

            act(() => {
                result.current.setDirty(true)
            })

            // First navigation attempt
            act(() => {
                result.current.confirmNavigation(firstCallback)
            })

            // Second navigation attempt should replace the first
            act(() => {
                result.current.confirmNavigation(secondCallback)
            })

            expect(firstCallback).not.toHaveBeenCalled()
            expect(secondCallback).not.toHaveBeenCalled()
            expect(result.current.pendingNavigation).not.toBeNull()
        })
    })

    describe('Confirmation Dialog Actions', () => {
        it('handles stay action correctly', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })
            const mockCallback = vi.fn()

            act(() => {
                result.current.setDirty(true)
                result.current.confirmNavigation(mockCallback)
            })

            act(() => {
                result.current.handleStay()
            })

            expect(mockCallback).not.toHaveBeenCalled()
            expect(result.current.pendingNavigation).toBeNull()
            expect(result.current.isDirty).toBe(true) // Should remain dirty
        })

        it('handles leave action correctly', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })
            const mockCallback = vi.fn()

            act(() => {
                result.current.setDirty(true)
                result.current.confirmNavigation(mockCallback)
            })

            act(() => {
                result.current.handleLeave()
            })

            expect(mockCallback).toHaveBeenCalledTimes(1)
            expect(result.current.pendingNavigation).toBeNull()
            expect(result.current.isDirty).toBe(false) // Should be reset
        })

        it('handles save and leave action correctly', async () => {
            const mockSaveFunction = vi.fn().mockResolvedValue(undefined)
            const { result } = renderHook(() => useFormConfirmation(mockSaveFunction), { wrapper })
            const mockCallback = vi.fn()

            act(() => {
                result.current.setDirty(true)
                result.current.confirmNavigation(mockCallback)
            })

            await act(async () => {
                await result.current.handleSaveAndLeave()
            })

            expect(mockSaveFunction).toHaveBeenCalledTimes(1)
            expect(mockCallback).toHaveBeenCalledTimes(1)
            expect(result.current.pendingNavigation).toBeNull()
            expect(result.current.isDirty).toBe(false)
        })

        it('handles save failure in save and leave action', async () => {
            const mockSaveFunction = vi.fn().mockRejectedValue(new Error('Save failed'))
            const { result } = renderHook(() => useFormConfirmation(mockSaveFunction), { wrapper })
            const mockCallback = vi.fn()

            act(() => {
                result.current.setDirty(true)
                result.current.confirmNavigation(mockCallback)
            })

            await act(async () => {
                await result.current.handleSaveAndLeave()
            })

            expect(mockSaveFunction).toHaveBeenCalledTimes(1)
            expect(mockCallback).not.toHaveBeenCalled() // Should not navigate on save failure
            expect(result.current.pendingNavigation).not.toBeNull() // Should keep pending navigation
            expect(result.current.isDirty).toBe(true) // Should remain dirty
        })
    })

    describe('Browser Navigation Protection', () => {
        it('sets up beforeunload handler when form becomes dirty', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setDirty(true)
            })

            expect(window.onbeforeunload).toBeTruthy()
        })

        it('removes beforeunload handler when form becomes clean', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setDirty(true)
            })

            expect(window.onbeforeunload).toBeTruthy()

            act(() => {
                result.current.setDirty(false)
            })

            expect(window.onbeforeunload).toBeNull()
        })

        it('beforeunload handler returns confirmation message', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setDirty(true)
            })

            const event = new Event('beforeunload')
            const returnValue = window.onbeforeunload?.(event as any)

            expect(returnValue).toBe('You have unsaved changes. Are you sure you want to leave?')
        })
    })

    describe('Edge Cases', () => {
        it('handles undefined save function gracefully', async () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })
            const mockCallback = vi.fn()

            act(() => {
                result.current.setDirty(true)
                result.current.confirmNavigation(mockCallback)
            })

            await act(async () => {
                await result.current.handleSaveAndLeave()
            })

            // Should proceed with navigation even without save function
            expect(mockCallback).toHaveBeenCalledTimes(1)
            expect(result.current.isDirty).toBe(false)
        })

        it('handles actions when no pending navigation exists', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            // These should not throw errors
            expect(() => {
                act(() => {
                    result.current.handleStay()
                    result.current.handleLeave()
                })
            }).not.toThrow()
        })

        it('cleans up on unmount', () => {
            const { result, unmount } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setDirty(true)
            })

            expect(window.onbeforeunload).toBeTruthy()

            unmount()

            expect(window.onbeforeunload).toBeNull()
        })
    })

    describe('State Consistency', () => {
        it('maintains consistent state during rapid changes', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setDirty(true)
                result.current.setDirty(false)
                result.current.setDirty(true)
            })

            expect(result.current.isDirty).toBe(true)
            expect(result.current.blockNavigation).toBe(true)
        })

        it('handles concurrent navigation attempts', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })
            const callback1 = vi.fn()
            const callback2 = vi.fn()

            act(() => {
                result.current.setDirty(true)
                result.current.confirmNavigation(callback1)
                result.current.confirmNavigation(callback2)
            })

            act(() => {
                result.current.handleLeave()
            })

            // Only the last callback should be executed
            expect(callback1).not.toHaveBeenCalled()
            expect(callback2).toHaveBeenCalledTimes(1)
        })
    })
})