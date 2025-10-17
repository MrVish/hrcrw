import React from 'react'
import { renderHook, act } from '@testing-library/react'
import {
    useAnnouncement,
    useFocusManagement,
    useAccessibleLoading,
    useAccessibleForm,
    useAccessibleModal,
    useAccessibleTable,
    useAccessiblePagination,
    useAccessibleDropdown,
} from '../useAccessibility'

// Mock announceToScreenReader
jest.mock('../../utils/keyboard', () => ({
    announceToScreenReader: jest.fn(),
}))

import { announceToScreenReader } from '../../utils/keyboard'

describe('Accessibility Hooks', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('useAnnouncement', () => {
        it('provides announce function', () => {
            const { result } = renderHook(() => useAnnouncement())

            expect(typeof result.current.announce).toBe('function')
        })

        it('calls announceToScreenReader with correct parameters', () => {
            const { result } = renderHook(() => useAnnouncement())

            act(() => {
                result.current.announce('Test message', 'assertive')
            })

            expect(announceToScreenReader).toHaveBeenCalledWith('Test message', 'assertive')
        })

        it('uses polite as default priority', () => {
            const { result } = renderHook(() => useAnnouncement())

            act(() => {
                result.current.announce('Test message')
            })

            expect(announceToScreenReader).toHaveBeenCalledWith('Test message', 'polite')
        })
    })

    describe('useFocusManagement', () => {
        beforeEach(() => {
            // Mock getElementById
            document.getElementById = jest.fn()
        })

        it('initializes with no focused element', () => {
            const { result } = renderHook(() => useFocusManagement())

            expect(result.current.focusedId).toBeNull()
        })

        it('sets focus on element', () => {
            const mockElement = { focus: jest.fn() };
            (document.getElementById as jest.Mock).mockReturnValue(mockElement)

            const { result } = renderHook(() => useFocusManagement())

            act(() => {
                result.current.setFocus('test-element')
            })

            expect(document.getElementById).toHaveBeenCalledWith('test-element')
            expect(mockElement.focus).toHaveBeenCalled()
            expect(result.current.focusedId).toBe('test-element')
        })

        it('clears focus', () => {
            const { result } = renderHook(() => useFocusManagement())

            act(() => {
                result.current.setFocus('test-element')
            })

            act(() => {
                result.current.clearFocus()
            })

            expect(result.current.focusedId).toBeNull()
        })
    })

    describe('useAccessibleLoading', () => {
        it('returns correct ARIA attributes for loading state', () => {
            const { result } = renderHook(() => useAccessibleLoading(true))

            expect(result.current['aria-busy']).toBe(true)
            expect(result.current['aria-live']).toBe('polite')
        })

        it('returns correct ARIA attributes for non-loading state', () => {
            const { result } = renderHook(() => useAccessibleLoading(false))

            expect(result.current['aria-busy']).toBe(false)
            expect(result.current['aria-live']).toBe('polite')
        })

        it('announces loading state changes', () => {
            const { rerender } = renderHook(
                ({ isLoading }) => useAccessibleLoading(isLoading, 'Custom loading'),
                { initialProps: { isLoading: false } }
            )

            // Start loading
            rerender({ isLoading: true })
            expect(announceToScreenReader).toHaveBeenCalledWith('Custom loading', 'polite')

            // Stop loading
            rerender({ isLoading: false })
            expect(announceToScreenReader).toHaveBeenCalledWith('Loading complete', 'polite')
        })
    })

    describe('useAccessibleForm', () => {
        it('initializes with no errors', () => {
            const { result } = renderHook(() => useAccessibleForm())

            expect(result.current.errors).toEqual({})
        })

        it('sets field error and announces it', () => {
            const { result } = renderHook(() => useAccessibleForm())

            act(() => {
                result.current.setFieldError('email', 'Invalid email format')
            })

            expect(result.current.errors.email).toBe('Invalid email format')
            expect(announceToScreenReader).toHaveBeenCalledWith(
                'Error in email: Invalid email format',
                'assertive'
            )
        })

        it('clears field error', () => {
            const { result } = renderHook(() => useAccessibleForm())

            act(() => {
                result.current.setFieldError('email', 'Invalid email format')
            })

            act(() => {
                result.current.clearFieldError('email')
            })

            expect(result.current.errors.email).toBeUndefined()
        })

        it('clears all errors', () => {
            const { result } = renderHook(() => useAccessibleForm())

            act(() => {
                result.current.setFieldError('email', 'Invalid email')
                result.current.setFieldError('password', 'Too short')
            })

            act(() => {
                result.current.clearAllErrors()
            })

            expect(result.current.errors).toEqual({})
        })

        it('provides correct field props', () => {
            const { result } = renderHook(() => useAccessibleForm())

            act(() => {
                result.current.setFieldError('email', 'Invalid email')
            })

            const fieldProps = result.current.getFieldProps('email')
            expect(fieldProps['aria-invalid']).toBe(true)
            expect(fieldProps['aria-describedby']).toBe('email-error')
        })

        it('provides correct error props', () => {
            const { result } = renderHook(() => useAccessibleForm())

            act(() => {
                result.current.setFieldError('email', 'Invalid email')
            })

            const errorProps = result.current.getErrorProps('email')
            expect(errorProps.id).toBe('email-error')
            expect(errorProps.role).toBe('alert')
            expect(errorProps['aria-live']).toBe('assertive')
        })
    })

    describe('useAccessibleModal', () => {
        let mockModalElement: HTMLDivElement

        beforeEach(() => {
            mockModalElement = document.createElement('div')
            mockModalElement.focus = jest.fn()

            // Mock document.activeElement
            Object.defineProperty(document, 'activeElement', {
                value: document.body,
                configurable: true,
            })

            // Mock body style
            document.body.style = {} as CSSStyleDeclaration
        })

        it('provides modal props', () => {
            const { result } = renderHook(() => useAccessibleModal(false))

            expect(result.current.modalProps.role).toBe('dialog')
            expect(result.current.modalProps['aria-modal']).toBe(true)
            expect(result.current.modalProps.tabIndex).toBe(-1)
        })

        it('manages body overflow when modal opens', () => {
            const { rerender } = renderHook(
                ({ isOpen }) => useAccessibleModal(isOpen),
                { initialProps: { isOpen: false } }
            )

            rerender({ isOpen: true })
            expect(document.body.style.overflow).toBe('hidden')

            rerender({ isOpen: false })
            expect(document.body.style.overflow).toBe('')
        })
    })

    describe('useAccessibleTable', () => {
        it('initializes with no sort', () => {
            const { result } = renderHook(() => useAccessibleTable())

            expect(result.current.sortColumn).toBeNull()
            expect(result.current.sortDirection).toBeNull()
        })

        it('handles column sorting', () => {
            const { result } = renderHook(() => useAccessibleTable())

            act(() => {
                result.current.handleSort('name')
            })

            expect(result.current.sortColumn).toBe('name')
            expect(result.current.sortDirection).toBe('asc')

            act(() => {
                result.current.handleSort('name')
            })

            expect(result.current.sortDirection).toBe('desc')

            act(() => {
                result.current.handleSort('name')
            })

            expect(result.current.sortColumn).toBeNull()
            expect(result.current.sortDirection).toBeNull()
        })

        it('provides correct column props', () => {
            const { result } = renderHook(() => useAccessibleTable())

            act(() => {
                result.current.handleSort('name')
            })

            const columnProps = result.current.getColumnProps('name')
            expect(columnProps['aria-sort']).toBe('ascending')
            expect(columnProps.role).toBe('columnheader')
            expect(columnProps.tabIndex).toBe(0)
        })
    })

    describe('useAccessiblePagination', () => {
        const mockOnPageChange = jest.fn()

        beforeEach(() => {
            mockOnPageChange.mockClear()
        })

        it('provides navigation functions', () => {
            const { result } = renderHook(() =>
                useAccessiblePagination(1, 5, mockOnPageChange)
            )

            expect(typeof result.current.goToPage).toBe('function')
            expect(typeof result.current.goToNextPage).toBe('function')
            expect(typeof result.current.goToPreviousPage).toBe('function')
        })

        it('navigates to next page', () => {
            const { result } = renderHook(() =>
                useAccessiblePagination(1, 5, mockOnPageChange)
            )

            act(() => {
                result.current.goToNextPage()
            })

            expect(mockOnPageChange).toHaveBeenCalledWith(2)
            expect(announceToScreenReader).toHaveBeenCalledWith('Page 2 of 5', 'polite')
        })

        it('navigates to previous page', () => {
            const { result } = renderHook(() =>
                useAccessiblePagination(3, 5, mockOnPageChange)
            )

            act(() => {
                result.current.goToPreviousPage()
            })

            expect(mockOnPageChange).toHaveBeenCalledWith(2)
        })

        it('provides correct button props', () => {
            const { result } = renderHook(() =>
                useAccessiblePagination(2, 5, mockOnPageChange)
            )

            const pageProps = result.current.getPageButtonProps(2)
            expect(pageProps['aria-current']).toBe('page')
            expect(pageProps['aria-label']).toBe('Go to page 2')

            const prevProps = result.current.getPreviousButtonProps()
            expect(prevProps.disabled).toBe(false)
            expect(prevProps['aria-label']).toBe('Go to previous page')

            const nextProps = result.current.getNextButtonProps()
            expect(nextProps.disabled).toBe(false)
            expect(nextProps['aria-label']).toBe('Go to next page')
        })
    })

    describe('useAccessibleDropdown', () => {
        it('initializes with closed state', () => {
            const { result } = renderHook(() => useAccessibleDropdown())

            expect(result.current.isOpen).toBe(false)
            expect(result.current.activeIndex).toBe(-1)
        })

        it('opens and closes dropdown', () => {
            const { result } = renderHook(() => useAccessibleDropdown())

            act(() => {
                result.current.open()
            })

            expect(result.current.isOpen).toBe(true)

            act(() => {
                result.current.close()
            })

            expect(result.current.isOpen).toBe(false)
        })

        it('toggles dropdown state', () => {
            const { result } = renderHook(() => useAccessibleDropdown())

            act(() => {
                result.current.toggle()
            })

            expect(result.current.isOpen).toBe(true)

            act(() => {
                result.current.toggle()
            })

            expect(result.current.isOpen).toBe(false)
        })

        it('provides correct dropdown props', () => {
            const { result } = renderHook(() => useAccessibleDropdown())

            const dropdownProps = result.current.getDropdownProps()
            expect(dropdownProps['aria-expanded']).toBe(false)
            expect(dropdownProps['aria-haspopup']).toBe('listbox')
            expect(dropdownProps.role).toBe('combobox')
        })

        it('provides correct option props', () => {
            const { result } = renderHook(() => useAccessibleDropdown())

            const optionProps = result.current.getOptionProps(0)
            expect(optionProps.role).toBe('option')
            expect(optionProps['aria-selected']).toBe(false)
            expect(optionProps.id).toBe('option-0')
        })
    })
})