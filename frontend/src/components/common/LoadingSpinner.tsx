import React from 'react'

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large'
    color?: 'primary' | 'secondary' | 'white'
    className?: string
    text?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    color = 'primary',
    className = '',
    text
}) => {
    return (
        <div className={`loading-spinner loading-spinner--${size} loading-spinner--${color} ${className}`}>
            <div className="loading-spinner__circle">
                <svg viewBox="0 0 50 50" className="loading-spinner__svg">
                    <circle
                        className="loading-spinner__path"
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        strokeWidth="4"
                    />
                </svg>
            </div>
            {text && <span className="loading-spinner__text">{text}</span>}
        </div>
    )
}

interface LoadingOverlayProps {
    isLoading: boolean
    text?: string
    children: React.ReactNode
    className?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isLoading,
    text = 'Loading...',
    children,
    className = ''
}) => {
    return (
        <div className={`loading-overlay ${className}`}>
            {children}
            {isLoading && (
                <div className="loading-overlay__backdrop">
                    <LoadingSpinner size="large" color="white" text={text} />
                </div>
            )}
        </div>
    )
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading: boolean
    loadingText?: string
    children: React.ReactNode
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
    isLoading,
    loadingText,
    children,
    disabled,
    className = '',
    ...props
}) => {
    return (
        <button
            {...props}
            disabled={disabled || isLoading}
            className={`loading-button ${isLoading ? 'loading-button--loading' : ''} ${className}`}
        >
            {isLoading && <LoadingSpinner size="small" color="white" />}
            <span className={`loading-button__text ${isLoading ? 'loading-button__text--hidden' : ''}`}>
                {isLoading && loadingText ? loadingText : children}
            </span>
        </button>
    )
}

interface ProgressBarProps {
    progress: number // 0-100
    className?: string
    showPercentage?: boolean
    color?: 'primary' | 'success' | 'warning' | 'danger'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    className = '',
    showPercentage = false,
    color = 'primary'
}) => {
    const clampedProgress = Math.max(0, Math.min(100, progress))

    return (
        <div className={`progress-bar progress-bar--${color} ${className}`}>
            <div className="progress-bar__track">
                <div
                    className="progress-bar__fill"
                    style={{ width: `${clampedProgress}%` }}
                />
            </div>
            {showPercentage && (
                <span className="progress-bar__percentage">
                    {Math.round(clampedProgress)}%
                </span>
            )}
        </div>
    )
}

export default LoadingSpinner