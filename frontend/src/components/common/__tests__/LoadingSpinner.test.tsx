import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
    LoadingSpinner,
    LoadingOverlay,
    LoadingButton,
    ProgressBar
} from '../LoadingSpinner'

describe('LoadingSpinner', () => {
    it('renders with default props', () => {
        render(<LoadingSpinner />)

        const spinner = screen.getByRole('img', { hidden: true })
        expect(spinner).toBeInTheDocument()
    })

    it('renders with custom text', () => {
        render(<LoadingSpinner text="Loading data..." />)

        expect(screen.getByText('Loading data...')).toBeInTheDocument()
    })

    it('applies size classes correctly', () => {
        const { rerender } = render(<LoadingSpinner size="small" />)
        expect(document.querySelector('.loading-spinner--small')).toBeInTheDocument()

        rerender(<LoadingSpinner size="large" />)
        expect(document.querySelector('.loading-spinner--large')).toBeInTheDocument()
    })

    it('applies color classes correctly', () => {
        const { rerender } = render(<LoadingSpinner color="primary" />)
        expect(document.querySelector('.loading-spinner--primary')).toBeInTheDocument()

        rerender(<LoadingSpinner color="white" />)
        expect(document.querySelector('.loading-spinner--white')).toBeInTheDocument()
    })
})

describe('LoadingOverlay', () => {
    it('renders children when not loading', () => {
        render(
            <LoadingOverlay isLoading={false}>
                <div>Content</div>
            </LoadingOverlay>
        )

        expect(screen.getByText('Content')).toBeInTheDocument()
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    it('shows overlay when loading', () => {
        render(
            <LoadingOverlay isLoading={true}>
                <div>Content</div>
            </LoadingOverlay>
        )

        expect(screen.getByText('Content')).toBeInTheDocument()
        expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows custom loading text', () => {
        render(
            <LoadingOverlay isLoading={true} text="Processing...">
                <div>Content</div>
            </LoadingOverlay>
        )

        expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('applies custom className', () => {
        render(
            <LoadingOverlay isLoading={false} className="custom-class">
                <div>Content</div>
            </LoadingOverlay>
        )

        expect(document.querySelector('.custom-class')).toBeInTheDocument()
    })
})

describe('LoadingButton', () => {
    it('renders children when not loading', () => {
        render(
            <LoadingButton isLoading={false}>
                Click me
            </LoadingButton>
        )

        expect(screen.getByText('Click me')).toBeInTheDocument()
        expect(screen.getByRole('button')).not.toBeDisabled()
    })

    it('shows loading state', () => {
        render(
            <LoadingButton isLoading={true}>
                Click me
            </LoadingButton>
        )

        expect(screen.getByRole('button')).toBeDisabled()
        expect(document.querySelector('.loading-button--loading')).toBeInTheDocument()
    })

    it('shows custom loading text', () => {
        render(
            <LoadingButton isLoading={true} loadingText="Saving...">
                Save
            </LoadingButton>
        )

        expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('handles click events when not loading', () => {
        const handleClick = jest.fn()

        render(
            <LoadingButton isLoading={false} onClick={handleClick}>
                Click me
            </LoadingButton>
        )

        fireEvent.click(screen.getByRole('button'))
        expect(handleClick).toHaveBeenCalled()
    })

    it('does not handle click events when loading', () => {
        const handleClick = jest.fn()

        render(
            <LoadingButton isLoading={true} onClick={handleClick}>
                Click me
            </LoadingButton>
        )

        fireEvent.click(screen.getByRole('button'))
        expect(handleClick).not.toHaveBeenCalled()
    })

    it('respects disabled prop', () => {
        render(
            <LoadingButton isLoading={false} disabled={true}>
                Click me
            </LoadingButton>
        )

        expect(screen.getByRole('button')).toBeDisabled()
    })
})

describe('ProgressBar', () => {
    it('renders with correct progress', () => {
        render(<ProgressBar progress={50} />)

        const progressFill = document.querySelector('.progress-bar__fill')
        expect(progressFill).toHaveStyle('width: 50%')
    })

    it('clamps progress to 0-100 range', () => {
        const { rerender } = render(<ProgressBar progress={-10} />)
        let progressFill = document.querySelector('.progress-bar__fill')
        expect(progressFill).toHaveStyle('width: 0%')

        rerender(<ProgressBar progress={150} />)
        progressFill = document.querySelector('.progress-bar__fill')
        expect(progressFill).toHaveStyle('width: 100%')
    })

    it('shows percentage when enabled', () => {
        render(<ProgressBar progress={75} showPercentage={true} />)

        expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('hides percentage by default', () => {
        render(<ProgressBar progress={75} />)

        expect(screen.queryByText('75%')).not.toBeInTheDocument()
    })

    it('applies color classes correctly', () => {
        const { rerender } = render(<ProgressBar progress={50} color="success" />)
        expect(document.querySelector('.progress-bar--success')).toBeInTheDocument()

        rerender(<ProgressBar progress={50} color="danger" />)
        expect(document.querySelector('.progress-bar--danger')).toBeInTheDocument()
    })

    it('applies custom className', () => {
        render(<ProgressBar progress={50} className="custom-progress" />)

        expect(document.querySelector('.custom-progress')).toBeInTheDocument()
    })
})