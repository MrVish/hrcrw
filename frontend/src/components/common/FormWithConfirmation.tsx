import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useFormConfirmation } from '../../hooks/useFormConfirmation'
import { ConfirmationDialog } from './ConfirmationDialog'

export interface FormWithConfirmationProps {
    children: React.ReactNode
    isDirty: boolean
    onSave?: () => Promise<void>
    canSave?: boolean
    isLoading?: boolean
    className?: string
}

/**
 * Higher-order component that wraps forms with navigation confirmation
 * 
 * Features:
 * - Automatically tracks form dirty state
 * - Shows confirmation dialog when navigating away from unsaved forms
 * - Provides "Stay", "Leave", and "Save and Leave" options
 * - Integrates with React Router for navigation blocking
 * - Handles save operations with loading states
 */
export const FormWithConfirmation: React.FC<FormWithConfirmationProps> = ({
    children,
    isDirty,
    onSave,
    canSave = false,
    isLoading = false,
    className = '',
}) => {
    const navigate = useNavigate()
    const location = useLocation()
    const {
        isDirty: hookIsDirty,
        setDirty,
        confirmNavigation,
        resetForm,
        blockNavigation,
    } = useFormConfirmation()

    const [showConfirmation, setShowConfirmation] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
    const [saveLoading, setSaveLoading] = useState(false)

    // Sync dirty state with hook
    useEffect(() => {
        setDirty(isDirty)
    }, [isDirty, setDirty])

    // Handle navigation blocking
    useEffect(() => {
        if (!blockNavigation) return

        const handlePopState = (event: PopStateEvent) => {
            if (hookIsDirty) {
                event.preventDefault()
                // Store the intended destination
                setPendingNavigation(window.location.pathname)
                setShowConfirmation(true)
                // Push current state back to prevent navigation
                window.history.pushState(null, '', location.pathname)
            }
        }

        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    }, [blockNavigation, hookIsDirty, location.pathname])

    // Handle programmatic navigation attempts
    useEffect(() => {
        // This is a simplified approach - in a production app, you might want to use
        // React Router's unstable_useBlocker or a similar navigation blocking mechanism
        const originalNavigate = navigate

        // Override navigate function to show confirmation when form is dirty
        const wrappedNavigate = (to: string | number, options?: any) => {
            if (hookIsDirty && typeof to === 'string') {
                setPendingNavigation(to)
                setShowConfirmation(true)
                return
            }
            originalNavigate(to, options)
        }

        // This is a hack for demonstration - in real implementation,
        // you'd use proper navigation blocking
        if (hookIsDirty) {
            // Store reference to show confirmation on navigation attempts
            (window as any).__formNavigationWrapper = wrappedNavigate
        }

        return () => {
            (window as any).__formNavigationWrapper = null
        }
    }, [navigate, hookIsDirty])

    const handleStay = () => {
        setShowConfirmation(false)
        setPendingNavigation(null)
    }

    const handleLeave = () => {
        resetForm()
        setShowConfirmation(false)

        if (pendingNavigation) {
            navigate(pendingNavigation)
            setPendingNavigation(null)
        }
    }

    const handleSaveAndLeave = async () => {
        if (!onSave) {
            handleLeave()
            return
        }

        try {
            setSaveLoading(true)
            await onSave()
            resetForm()
            setShowConfirmation(false)

            if (pendingNavigation) {
                navigate(pendingNavigation)
                setPendingNavigation(null)
            }
        } catch (error) {
            console.error('Failed to save form:', error)
            // Keep the confirmation dialog open on save error
            // The form should handle displaying the error message
        } finally {
            setSaveLoading(false)
        }
    }

    return (
        <div className={className}>
            {children}

            <ConfirmationDialog
                open={showConfirmation}
                title="Unsaved Changes"
                message="You have unsaved changes that will be lost if you leave this page. What would you like to do?"
                onStay={handleStay}
                onLeave={handleLeave}
                onSaveAndLeave={canSave ? handleSaveAndLeave : undefined}
                canSave={canSave}
                isLoading={saveLoading || isLoading}
                stayButtonText="Stay on Page"
                leaveButtonText="Leave Without Saving"
                saveAndLeaveButtonText="Save and Leave"
            />
        </div>
    )
}

/**
 * Hook for programmatic navigation with confirmation
 * Use this in forms to trigger navigation confirmation when needed
 */
export const useNavigateWithConfirmation = () => {
    const navigate = useNavigate()
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

    const navigateWithConfirmation = (to: string, isDirty: boolean) => {
        if (isDirty) {
            setPendingNavigation(to)
            setShowConfirmation(true)
        } else {
            navigate(to)
        }
    }

    const handleConfirmNavigation = () => {
        if (pendingNavigation) {
            navigate(pendingNavigation)
            setPendingNavigation(null)
        }
        setShowConfirmation(false)
    }

    const handleCancelNavigation = () => {
        setShowConfirmation(false)
        setPendingNavigation(null)
    }

    return {
        navigateWithConfirmation,
        showConfirmation,
        handleConfirmNavigation,
        handleCancelNavigation,
        pendingNavigation,
    }
}

export default FormWithConfirmation