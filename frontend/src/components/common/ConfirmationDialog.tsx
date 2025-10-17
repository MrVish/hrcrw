import React, { useEffect, useRef } from 'react'
import './ConfirmationDialog.css'

export interface ConfirmationDialogProps {
    open: boolean
    title: string
    message: string
    onStay: () => void
    onLeave: () => void
    onSaveAndLeave?: () => void
    canSave?: boolean
    isLoading?: boolean
    stayButtonText?: string
    leaveButtonText?: string
    saveAndLeaveButtonText?: string
}

/**
 * Reusable confirmation dialog component for form navigation confirmation
 * 
 * Features:
 * - "Stay", "Leave", and "Save and Leave" options
 * - Proper accessibility features and keyboard navigation
 * - Consistent styling that matches application theme
 * - Focus management and ARIA attributes
 * - Loading states for save operations
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    title,
    message,
    onStay,
    onLeave,
    onSaveAndLeave,
    canSave = false,
    isLoading = false,
    stayButtonText = 'Stay on Page',
    leaveButtonText = 'Leave Without Saving',
    saveAndLeaveButtonText = 'Save and Leave',
}) => {
    const dialogRef = useRef<HTMLDivElement>(null)
    const firstButtonRef = useRef<HTMLButtonElement>(null)
    const lastButtonRef = useRef<HTMLButtonElement>(null)

    // Focus management
    useEffect(() => {
        if (open && firstButtonRef.current) {
            firstButtonRef.current.focus()
        }
    }, [open])

    // Keyboard navigation
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onStay()
            }

            if (event.key === 'Tab') {
                const focusableElements = dialogRef.current?.querySelectorAll(
                    'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )

                if (!focusableElements || focusableElements.length === 0) return

                const firstElement = focusableElements[0] as HTMLElement
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

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
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open, onStay])

    // Prevent body scroll when dialog is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    if (!open) return null

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onStay()
        }
    }

    return (
        <div
            className="confirmation-dialog-overlay"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-dialog-title"
            aria-describedby="confirmation-dialog-message"
        >
            <div
                ref={dialogRef}
                className="confirmation-dialog"
                role="document"
            >
                <div className="confirmation-dialog__header">
                    <div className="confirmation-dialog__icon">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <h2 id="confirmation-dialog-title" className="confirmation-dialog__title">
                        {title}
                    </h2>
                </div>

                <div className="confirmation-dialog__content">
                    <p id="confirmation-dialog-message" className="confirmation-dialog__message">
                        {message}
                    </p>
                </div>

                <div className="confirmation-dialog__actions">
                    <button
                        ref={firstButtonRef}
                        type="button"
                        className="confirmation-dialog__button confirmation-dialog__button--secondary"
                        onClick={onStay}
                        disabled={isLoading}
                    >
                        {stayButtonText}
                    </button>

                    <button
                        type="button"
                        className="confirmation-dialog__button confirmation-dialog__button--danger"
                        onClick={onLeave}
                        disabled={isLoading}
                    >
                        {leaveButtonText}
                    </button>

                    {canSave && onSaveAndLeave && (
                        <button
                            ref={lastButtonRef}
                            type="button"
                            className="confirmation-dialog__button confirmation-dialog__button--primary"
                            onClick={onSaveAndLeave}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="confirmation-dialog__spinner" />
                                    Saving...
                                </>
                            ) : (
                                saveAndLeaveButtonText
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ConfirmationDialog