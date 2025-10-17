import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
    if (shouldThrow) {
        throw new Error('Test error')
    }
    return <div>No error</div>
}

// Mock API error
const mockApiError = {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    timestamp: '2024-01-15T10:30:00Z',
    request_id: 'req_123456',
}

describe('ErrorBoundary', () => {
    // Suppress console.error for these tests
    const originalError = console.error
    beforeAll(() => {
        console.error = jest.fn()
    })

    afterAll(() => {
        console.error = originalError
    })

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        )

        expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('renders error fallback when there is an error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        expect(screen.getByText('Test error')).toBeInTheDocument()
    })

    it('renders custom fallback when provided', () => {
        const customFallback = <div>Custom error message</div>

        render(
            <ErrorBoundary fallback={customFallback}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })

    it('calls onError callback when error occurs', () => {
        const onError = jest.fn()

        render(
            <ErrorBoundary onError={onError}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(onError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
                componentStack: expect.any(String),
            })
        )
    })

    it('allows retry after error', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.getByText('Something went wrong')).toBeInTheDocument()

        const retryButton = screen.getByText('Try Again')
        fireEvent.click(retryButton)

        // Re-render with no error
        rerender(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        )

        expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('allows page reload', () => {
        // Mock window.location.reload
        const mockReload = jest.fn()
        Object.defineProperty(window, 'location', {
            value: { reload: mockReload },
            writable: true,
        })

        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        const reloadButton = screen.getByText('Reload Page')
        fireEvent.click(reloadButton)

        expect(mockReload).toHaveBeenCalled()
    })

    it('displays API error details when available', () => {
        const ApiErrorComponent: React.FC = () => {
            throw mockApiError
        }

        render(
            <ErrorBoundary>
                <ApiErrorComponent />
            </ErrorBoundary>
        )

        expect(screen.getByText('Invalid input data')).toBeInTheDocument()
        expect(screen.getByText('VALIDATION_ERROR')).toBeInTheDocument()
        expect(screen.getByText('req_123456')).toBeInTheDocument()
    })

    it('shows debug information in development mode', () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()

        process.env.NODE_ENV = originalEnv
    })

    it('hides debug information in production mode', () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument()

        process.env.NODE_ENV = originalEnv
    })

    it('has proper accessibility attributes', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        const retryButton = screen.getByText('Try Again')
        const reloadButton = screen.getByText('Reload Page')

        expect(retryButton).toHaveAttribute('class', expect.stringContaining('error-boundary__button--primary'))
        expect(reloadButton).toHaveAttribute('class', expect.stringContaining('error-boundary__button--secondary'))
    })
})