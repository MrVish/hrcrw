import React from 'react'
import type { UserFriendlyError } from '../../services/errorHandler'

interface ErrorDisplayProps {
    error: UserFriendlyError
    onDismiss?: () => void
    className?: string
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    error,
    onDismiss,
    className = ''
}) => {
    return (
        <div className={`error-display ${className}`}>
            <div className="error-display__content">
                <div className="error-display__header">
                    <div className="error-display__icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <div className="error-display__text">
                        <h4 className="error-display__title">{error.title}</h4>
                        <p className="error-display__message">{error.message}</p>
                    </div>
                    {onDismiss && (
                        <button
                            className="error-display__dismiss"
                            onClick={onDismiss}
                            aria-label="Dismiss error"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                {error.actionable && error.actions && error.actions.length > 0 && (
                    <div className="error-display__actions">
                        {error.actions.map((action, index) => (
                            <button
                                key={index}
                                className={`error-display__action ${action.primary ? 'error-display__action--primary' : ''}`}
                                onClick={action.action}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ErrorDisplay