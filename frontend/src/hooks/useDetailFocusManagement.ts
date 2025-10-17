import { useEffect, useRef, useCallback } from 'react'
import { useFocusManagement } from './useAccessibility'

/**
 * Hook for managing focus in detail components
 * Handles focus restoration, skip links, and keyboard navigation
 */
export const useDetailFocusManagement = (componentName: string) => {
    const { setFocus, clearFocus } = useFocusManagement()
    const previousFocusRef = useRef<HTMLElement | null>(null)
    const skipLinkRef = useRef<HTMLAnchorElement | null>(null)

    // Store the previously focused element when component mounts
    useEffect(() => {
        previousFocusRef.current = document.activeElement as HTMLElement
        
        // Set focus to main heading after a brief delay to allow rendering
        const timer = setTimeout(() => {
            const mainHeading = document.getElementById(`${componentName}-detail-heading`)
            if (mainHeading) {
                mainHeading.focus()
            }
        }, 100)

        return () => {
            clearTimeout(timer)
            // Restore focus when component unmounts
            if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
                previousFocusRef.current.focus()
            }
        }
    }, [componentName])

    // Handle skip link functionality
    const handleSkipToContent = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Tab' && !event.shiftKey) {
            const skipLink = skipLinkRef.current
            if (skipLink && document.activeElement === skipLink) {
                event.preventDefault()
                const mainContent = document.getElementById(`${componentName}-main-content`)
                if (mainContent) {
                    mainContent.focus()
                }
            }
        }
    }, [componentName])

    // Handle escape key to return to previous focus
    const handleEscapeKey = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
                previousFocusRef.current.focus()
            }
        }
    }, [])

    // Set up keyboard event listeners
    useEffect(() => {
        document.addEventListener('keydown', handleSkipToContent)
        document.addEventListener('keydown', handleEscapeKey)

        return () => {
            document.removeEventListener('keydown', handleSkipToContent)
            document.removeEventListener('keydown', handleEscapeKey)
        }
    }, [handleSkipToContent, handleEscapeKey])

    // Focus management for form interactions
    const focusFirstError = useCallback(() => {
        const firstError = document.querySelector('[aria-invalid="true"]') as HTMLElement
        if (firstError) {
            firstError.focus()
            return true
        }
        return false
    }, [])

    const focusElement = useCallback((elementId: string) => {
        setFocus(elementId)
    }, [setFocus])

    const clearElementFocus = useCallback(() => {
        clearFocus()
    }, [clearFocus])

    // Create skip link props
    const getSkipLinkProps = useCallback(() => ({
        ref: skipLinkRef,
        href: `#${componentName}-main-content`,
        className: 'skip-link',
        'aria-label': `Skip to ${componentName} main content`,
    }), [componentName])

    // Create main content props
    const getMainContentProps = useCallback(() => ({
        id: `${componentName}-main-content`,
        tabIndex: -1,
    }), [componentName])

    return {
        focusFirstError,
        focusElement,
        clearElementFocus,
        getSkipLinkProps,
        getMainContentProps,
    }
}

/**
 * Hook for managing focus in modal dialogs within detail components
 */
export const useDetailModalFocus = (isOpen: boolean) => {
    const modalRef = useRef<HTMLDivElement>(null)
    const previousActiveElement = useRef<Element | null>(null)
    const focusableElements = useRef<HTMLElement[]>([])

    // Update focusable elements list
    const updateFocusableElements = useCallback(() => {
        if (!modalRef.current) return

        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ')

        focusableElements.current = Array.from(
            modalRef.current.querySelectorAll(focusableSelectors)
        ) as HTMLElement[]
    }, [])

    // Handle tab key for focus trapping
    const handleTabKey = useCallback((event: KeyboardEvent) => {
        if (event.key !== 'Tab' || !isOpen) return

        updateFocusableElements()
        const elements = focusableElements.current

        if (elements.length === 0) {
            event.preventDefault()
            return
        }

        const firstElement = elements[0]
        const lastElement = elements[elements.length - 1]

        if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                event.preventDefault()
                lastElement.focus()
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                event.preventDefault()
                firstElement.focus()
            }
        }
    }, [isOpen, updateFocusableElements])

    // Handle escape key
    const handleEscapeKey = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
            // This should be handled by the parent component to close the modal
            event.preventDefault()
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen) {
            // Store the currently focused element
            previousActiveElement.current = document.activeElement
            
            // Set focus to modal after a brief delay
            const timer = setTimeout(() => {
                if (modalRef.current) {
                    updateFocusableElements()
                    const firstFocusable = focusableElements.current[0]
                    if (firstFocusable) {
                        firstFocusable.focus()
                    } else {
                        modalRef.current.focus()
                    }
                }
            }, 100)

            // Add event listeners
            document.addEventListener('keydown', handleTabKey)
            document.addEventListener('keydown', handleEscapeKey)

            return () => {
                clearTimeout(timer)
                document.removeEventListener('keydown', handleTabKey)
                document.removeEventListener('keydown', handleEscapeKey)
            }
        } else {
            // Restore focus to previous element
            if (previousActiveElement.current && 'focus' in previousActiveElement.current) {
                (previousActiveElement.current as HTMLElement).focus()
            }
        }
    }, [isOpen, handleTabKey, handleEscapeKey, updateFocusableElements])

    const getModalProps = useCallback(() => ({
        ref: modalRef,
        role: 'dialog' as const,
        'aria-modal': true,
        tabIndex: -1,
    }), [])

    return {
        modalRef,
        getModalProps,
    }
}

export default {
    useDetailFocusManagement,
    useDetailModalFocus,
}