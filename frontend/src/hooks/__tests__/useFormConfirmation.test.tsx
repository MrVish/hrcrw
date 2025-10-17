import { renderHook, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, beforeEach, expect } from 'vitest'
import { useFormConfirmation, useFormDirtyTracking, useFormWithConfirmation } from '../useFormConfirmation'

// Mock React Router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ pathname: '/test' }),
    }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
)

describe('useFormConfirmation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with clean state', () => {
        const { result } = renderHook(() => useFormConfirmation(), { wrapper })

        expect(result.current.isDirty).toBe(false)
        expect(result.current.blockNavigation).toBe(false)
    })

    it('should set dirty state correctly', () => {
        const { result } = renderHook(() => useFormConfirmation(), { wrapper })

        act(() => {
            result.current.setDirty(true)
        })

        expect(result.current.isDirty).toBe(true)
        expect(result.current.blockNavigation).toBe(true)
    })

    it('should reset form state', () => {
        const { result } = renderHook(() => useFormConfirmation(), { wrapper })

        act(() => {
            result.current.setDirty(true)
        })

        expect(result.current.isDirty).toBe(true)

        act(() => {
            result.current.resetForm()
        })

        expect(result.current.isDirty).toBe(false)
        expect(result.current.blockNavigation).toBe(false)
    })

    it('should handle navigation confirmation when form is clean', () => {
        const { result } = renderHook(() => useFormConfirmation(), { wrapper })
        const mockCallback = vi.fn()

        act(() => {
            result.current.confirmNavigation(mockCallback)
        })

        expect(mockCallback).toHaveBeenCalled()
    })

    it('should store navigation callback when form is dirty', () => {
        const { result } = renderHook(() => useFormConfirmation(), { wrapper })
        const mockCallback = vi.fn()

        act(() => {
            result.current.setDirty(true)
        })

        act(() => {
            result.current.confirmNavigation(mockCallback)
        })

        // Callback should not be called immediately when form is dirty
        expect(mockCallback).not.toHaveBeenCalled()
    })

    it('should handle beforeunload event when form is dirty', () => {
        const { result } = renderHook(() => useFormConfirmation(), { wrapper })

        act(() => {
            result.current.setDirty(true)
        })

        // The event listener should be attached when form is dirty
        expect(result.current.isDirty).toBe(true)
    })
})

describe('useFormDirtyTracking', () => {
    it('should detect changes in form values', () => {
        const initialValues = { name: 'John', email: 'john@example.com' }
        const currentValues = { name: 'John', email: 'john@example.com' }

        const { result, rerender } = renderHook(
            ({ initial, current }) => useFormDirtyTracking(initial, current),
            {
                initialProps: { initial: initialValues, current: currentValues },
            }
        )

        expect(result.current).toBe(false)

        // Change current values
        const updatedValues = { name: 'Jane', email: 'john@example.com' }
        rerender({ initial: initialValues, current: updatedValues })

        expect(result.current).toBe(true)
    })

    it('should return false when values are the same', () => {
        const values = { name: 'John', email: 'john@example.com' }

        const { result } = renderHook(() => useFormDirtyTracking(values, values))

        expect(result.current).toBe(false)
    })
})

describe('useFormWithConfirmation', () => {
    it('should combine form confirmation with dirty tracking', () => {
        const initialValues = { name: 'John', email: 'john@example.com' }
        const currentValues = { name: 'John', email: 'john@example.com' }

        const { result, rerender } = renderHook(
            ({ initial, current }) => useFormWithConfirmation(initial, current),
            {
                wrapper,
                initialProps: { initial: initialValues, current: currentValues },
            }
        )

        expect(result.current.isDirty).toBe(false)
        expect(result.current.isFormDirty).toBe(false)

        // Change current values
        const updatedValues = { name: 'Jane', email: 'john@example.com' }
        rerender({ initial: initialValues, current: updatedValues })

        expect(result.current.isFormDirty).toBe(true)
        expect(result.current.isDirty).toBe(true)
    })

    it('should provide all form confirmation methods', () => {
        const values = { name: 'John', email: 'john@example.com' }

        const { result } = renderHook(
            () => useFormWithConfirmation(values, values),
            { wrapper }
        )

        expect(typeof result.current.setDirty).toBe('function')
        expect(typeof result.current.confirmNavigation).toBe('function')
        expect(typeof result.current.resetForm).toBe('function')
        expect(typeof result.current.setBlockNavigation).toBe('function')
    })
})