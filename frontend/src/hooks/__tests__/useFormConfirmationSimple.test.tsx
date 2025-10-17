import { renderHook, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { useFormConfirmation, useFormDirtyTracking, useFormWithConfirmation } from '../useFormConfirmation'

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

describe('useFormConfirmation Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Basic Functionality', () => {
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

            // Set dirty state
            act(() => {
                result.current.setDirty(true)
            })

            expect(result.current.isDirty).toBe(true)

            // Reset form
            act(() => {
                result.current.resetForm()
            })

            expect(result.current.isDirty).toBe(false)
            expect(result.current.blockNavigation).toBe(false)
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

            // Callback should not be executed immediately when form is dirty
            expect(mockCallback).not.toHaveBeenCalled()
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
        })
    })

    describe('Browser Navigation Protection', () => {
        it('sets up beforeunload event listener when form becomes dirty', () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setDirty(true)
            })

            expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
        })

        it('removes beforeunload event listener when form becomes clean', () => {
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setDirty(true)
            })

            act(() => {
                result.current.setDirty(false)
            })

            expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
        })

        it('cleans up event listeners on unmount', () => {
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
            const { result, unmount } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setDirty(true)
            })

            unmount()

            expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
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

        it('handles block navigation state independently', () => {
            const { result } = renderHook(() => useFormConfirmation(), { wrapper })

            act(() => {
                result.current.setBlockNavigation(true)
            })

            expect(result.current.blockNavigation).toBe(true)
            expect(result.current.isDirty).toBe(false) // Should remain independent
        })
    })
})

describe('useFormDirtyTracking Hook', () => {
    it('detects changes in form values', () => {
        const initialValues = { name: 'John', email: 'john@example.com' }
        const currentValues = { name: 'John', email: 'john@example.com' }

        const { result, rerender } = renderHook(
            ({ initial, current }) => useFormDirtyTracking(initial, current),
            { initialProps: { initial: initialValues, current: currentValues } }
        )

        expect(result.current).toBe(false)

        // Change a value
        const updatedValues = { name: 'Jane', email: 'john@example.com' }
        rerender({ initial: initialValues, current: updatedValues })

        expect(result.current).toBe(true)
    })

    it('returns false when values are identical', () => {
        const values = { name: 'John', email: 'john@example.com' }

        const { result } = renderHook(() => useFormDirtyTracking(values, values))

        expect(result.current).toBe(false)
    })
})

describe('useFormWithConfirmation Hook', () => {
    it('combines form confirmation with automatic dirty tracking', () => {
        const initialValues = { name: 'John', email: 'john@example.com' }
        const currentValues = { name: 'John', email: 'john@example.com' }

        const { result, rerender } = renderHook(
            ({ initial, current }) => useFormWithConfirmation(initial, current),
            {
                initialProps: { initial: initialValues, current: currentValues },
                wrapper
            }
        )

        expect(result.current.isDirty).toBe(false)
        expect(result.current.isFormDirty).toBe(false)

        // Change a value
        const updatedValues = { name: 'Jane', email: 'john@example.com' }
        rerender({ initial: initialValues, current: updatedValues })

        expect(result.current.isFormDirty).toBe(true)
        expect(result.current.isDirty).toBe(true)
    })

    it('provides all form confirmation methods', () => {
        const values = { name: 'John', email: 'john@example.com' }

        const { result } = renderHook(() => useFormWithConfirmation(values, values), { wrapper })

        expect(typeof result.current.setDirty).toBe('function')
        expect(typeof result.current.resetForm).toBe('function')
        expect(typeof result.current.confirmNavigation).toBe('function')
        expect(typeof result.current.setBlockNavigation).toBe('function')
    })
})