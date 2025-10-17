import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { UIProvider, useUI, useToast, useLoading } from '../UIContext'

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <UIProvider>{children}</UIProvider>
)

describe('UIContext', () => {
    describe('useUI', () => {
        it('throws error when used outside provider', () => {
            // Suppress console.error for this test
            const originalError = console.error
            console.error = jest.fn()

            expect(() => {
                renderHook(() => useUI())
            }).toThrow('useUI must be used within a UIProvider')

            console.error = originalError
        })

        it('provides initial state', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            expect(result.current.state.toasts).toEqual([])
            expect(result.current.state.loading).toEqual({})
            expect(result.current.state.globalLoading).toBe(false)
        })

        it('adds and removes toasts', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.addToast({
                    type: 'success',
                    title: 'Test Toast',
                    message: 'Test message',
                })
            })

            expect(result.current.state.toasts).toHaveLength(1)
            expect(result.current.state.toasts[0].title).toBe('Test Toast')
            expect(result.current.state.toasts[0].id).toBeDefined()

            const toastId = result.current.state.toasts[0].id

            act(() => {
                result.current.removeToast(toastId)
            })

            expect(result.current.state.toasts).toHaveLength(0)
        })

        it('clears all toasts', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.addToast({ type: 'success', title: 'Toast 1' })
                result.current.addToast({ type: 'error', title: 'Toast 2' })
            })

            expect(result.current.state.toasts).toHaveLength(2)

            act(() => {
                result.current.clearToasts()
            })

            expect(result.current.state.toasts).toHaveLength(0)
        })

        it('manages loading states', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.setLoading('test-key', true)
            })

            expect(result.current.state.loading['test-key']).toBe(true)
            expect(result.current.isLoading('test-key')).toBe(true)

            act(() => {
                result.current.setLoading('test-key', false)
            })

            expect(result.current.state.loading['test-key']).toBe(false)
            expect(result.current.isLoading('test-key')).toBe(false)
        })

        it('manages global loading state', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.setGlobalLoading(true)
            })

            expect(result.current.state.globalLoading).toBe(true)
            expect(result.current.isLoading()).toBe(true)

            act(() => {
                result.current.setGlobalLoading(false)
            })

            expect(result.current.state.globalLoading).toBe(false)
            expect(result.current.isLoading()).toBe(false)
        })

        it('clears all loading states', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.setLoading('key1', true)
                result.current.setLoading('key2', true)
                result.current.setGlobalLoading(true)
            })

            expect(result.current.isLoading()).toBe(true)

            act(() => {
                result.current.clearLoading()
            })

            expect(result.current.state.loading).toEqual({})
            expect(result.current.state.globalLoading).toBe(false)
            expect(result.current.isLoading()).toBe(false)
        })

        it('detects loading when any key is loading', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.setLoading('key1', false)
                result.current.setLoading('key2', true)
            })

            expect(result.current.isLoading()).toBe(true)
        })
    })

    describe('Toast convenience methods', () => {
        it('shows success toast with correct properties', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.showSuccess('Success Title', 'Success message')
            })

            const toast = result.current.state.toasts[0]
            expect(toast.type).toBe('success')
            expect(toast.title).toBe('Success Title')
            expect(toast.message).toBe('Success message')
        })

        it('shows error toast with longer duration', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.showError('Error Title', 'Error message')
            })

            const toast = result.current.state.toasts[0]
            expect(toast.type).toBe('error')
            expect(toast.duration).toBe(8000)
        })

        it('shows warning toast with custom duration', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.showWarning('Warning Title', 'Warning message')
            })

            const toast = result.current.state.toasts[0]
            expect(toast.type).toBe('warning')
            expect(toast.duration).toBe(6000)
        })

        it('shows info toast', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.showInfo('Info Title', 'Info message')
            })

            const toast = result.current.state.toasts[0]
            expect(toast.type).toBe('info')
            expect(toast.title).toBe('Info Title')
        })

        it('accepts custom options for toast methods', () => {
            const { result } = renderHook(() => useUI(), { wrapper })

            act(() => {
                result.current.showSuccess('Title', 'Message', {
                    persistent: true,
                    duration: 10000,
                })
            })

            const toast = result.current.state.toasts[0]
            expect(toast.persistent).toBe(true)
            expect(toast.duration).toBe(10000)
        })
    })
})

describe('useToast', () => {
    it('provides toast methods', () => {
        const { result } = renderHook(() => useToast(), { wrapper })

        expect(typeof result.current.showSuccess).toBe('function')
        expect(typeof result.current.showError).toBe('function')
        expect(typeof result.current.showWarning).toBe('function')
        expect(typeof result.current.showInfo).toBe('function')
    })
})

describe('useLoading', () => {
    it('manages loading state for specific key', () => {
        const { result } = renderHook(() => useLoading('test-key'), { wrapper })

        expect(result.current.loading).toBe(false)

        act(() => {
            result.current.startLoading()
        })

        expect(result.current.loading).toBe(true)

        act(() => {
            result.current.stopLoading()
        })

        expect(result.current.loading).toBe(false)
    })

    it('manages global loading state when no key provided', () => {
        const { result } = renderHook(() => useLoading(), { wrapper })

        expect(result.current.loading).toBe(false)

        act(() => {
            result.current.startLoading()
        })

        expect(result.current.loading).toBe(true)

        act(() => {
            result.current.stopLoading()
        })

        expect(result.current.loading).toBe(false)
    })
})