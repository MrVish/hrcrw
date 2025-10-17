import React, { useEffect, useState } from 'react'

export interface ToastMessage {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    duration?: number
    persistent?: boolean
    actions?: Array<{
        label: string
        action: () => void
        primary?: boolean
    }>
}

interface ToastProps {
    toast: ToastMessage
    onDismiss: (id: string) => void
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 10)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (!toast.persistent && toast.duration !== 0) {
            const duration = toast.duration || getDefaultDuration(toast.type)
            const timer = setTimeout(() => {
                handleDismiss()
            }, duration)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const handleDismiss = () => {
        setIsExiting(true)
        setTimeout(() => {
            onDismiss(toast.id)
        }, 300) // Match CSS animation duration
    }

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22,4 12,14.01 9,11.01" />
                    </svg>
                )
            case 'error':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                )
            case 'warning':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                )
            case 'info':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                )
        }
    }

    return (
        <div
            className={`toast toast--${toast.type} ${isVisible ? 'toast--visible' : ''} ${isExiting ? 'toast--exiting' : ''}`}
            role="alert"
            aria-live="polite"
        >
            <div className="toast__content">
                <div className="toast__header">
                    <div className="toast__icon">
                        {getIcon()}
                    </div>
                    <div className="toast__text">
                        <h4 className="toast__title">{toast.title}</h4>
                        {toast.message && (
                            <p className="toast__message">{toast.message}</p>
                        )}
                    </div>
                    <button
                        className="toast__dismiss"
                        onClick={handleDismiss}
                        aria-label="Dismiss notification"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {toast.actions && toast.actions.length > 0 && (
                    <div className="toast__actions">
                        {toast.actions.map((action, index) => (
                            <button
                                key={index}
                                className={`toast__action ${action.primary ? 'toast__action--primary' : ''}`}
                                onClick={() => {
                                    action.action()
                                    handleDismiss()
                                }}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {!toast.persistent && toast.duration !== 0 && (
                <div className="toast__progress">
                    <div
                        className="toast__progress-bar"
                        style={{
                            animationDuration: `${toast.duration || getDefaultDuration(toast.type)}ms`
                        }}
                    />
                </div>
            )}
        </div>
    )
}

const getDefaultDuration = (type: ToastMessage['type']): number => {
    switch (type) {
        case 'error': return 8000
        case 'warning': return 6000
        case 'success': return 4000
        case 'info': return 5000
        default: return 5000
    }
}

interface ToastContainerProps {
    toasts: ToastMessage[]
    onDismiss: (id: string) => void
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
    toasts,
    onDismiss,
    position = 'top-right'
}) => {
    return (
        <div className={`toast-container toast-container--${position}`}>
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    )
}

export default Toast