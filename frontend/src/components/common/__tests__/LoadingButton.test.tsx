import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import { vi } from 'vitest'
import { LoadingButton } from '../LoadingButton'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'

const theme = createTheme()

const renderWithTheme = (component: React.ReactElement) => {
    return render(
        <ThemeProvider theme={theme}>
            {component}
        </ThemeProvider>
    )
}

describe('LoadingButton', () => {
    it('renders button with children text', () => {
        renderWithTheme(
            <LoadingButton>Click me</LoadingButton>
        )

        expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('shows loading state correctly', () => {
        renderWithTheme(
            <LoadingButton loading={true} loadingText="Loading...">
                Click me
            </LoadingButton>
        )

        expect(screen.getByText('Loading...')).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('shows success state correctly', () => {
        renderWithTheme(
            <LoadingButton success={true} successText="Success!">
                Click me
            </LoadingButton>
        )

        expect(screen.getByText('Success!')).toBeInTheDocument()
        expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument()
    })

    it('calls onClick when clicked and not loading', () => {
        const handleClick = vi.fn()

        renderWithTheme(
            <LoadingButton onClick={handleClick}>
                Click me
            </LoadingButton>
        )

        fireEvent.click(screen.getByRole('button'))
        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when loading', () => {
        const handleClick = vi.fn()

        renderWithTheme(
            <LoadingButton loading={true} onClick={handleClick}>
                Click me
            </LoadingButton>
        )

        fireEvent.click(screen.getByRole('button'))
        expect(handleClick).not.toHaveBeenCalled()
    })

    it('auto-hides success state after specified duration', async () => {
        const onSuccessComplete = vi.fn()

        renderWithTheme(
            <LoadingButton
                success={true}
                successText="Success!"
                successDuration={100}
                onSuccessComplete={onSuccessComplete}
            >
                Click me
            </LoadingButton>
        )

        expect(screen.getByText('Success!')).toBeInTheDocument()

        await waitFor(() => {
            expect(onSuccessComplete).toHaveBeenCalled()
        }, { timeout: 200 })
    })

    it('shows start icon when provided', () => {
        renderWithTheme(
            <LoadingButton startIcon={<span data-testid="start-icon">Icon</span>}>
                Click me
            </LoadingButton>
        )

        expect(screen.getByTestId('start-icon')).toBeInTheDocument()
    })

    it('shows end icon when provided and not loading/success', () => {
        renderWithTheme(
            <LoadingButton endIcon={<span data-testid="end-icon">Icon</span>}>
                Click me
            </LoadingButton>
        )

        expect(screen.getByTestId('end-icon')).toBeInTheDocument()
    })

    it('hides end icon when loading', () => {
        renderWithTheme(
            <LoadingButton
                loading={true}
                endIcon={<span data-testid="end-icon">Icon</span>}
            >
                Click me
            </LoadingButton>
        )

        expect(screen.queryByTestId('end-icon')).not.toBeInTheDocument()
    })

    it('applies custom styles correctly', () => {
        renderWithTheme(
            <LoadingButton sx={{ backgroundColor: 'red' }}>
                Click me
            </LoadingButton>
        )

        const button = screen.getByRole('button')
        expect(button).toHaveStyle('background-color: rgb(255, 0, 0)')
    })

    it('respects disabled prop', () => {
        renderWithTheme(
            <LoadingButton disabled={true}>
                Click me
            </LoadingButton>
        )

        expect(screen.getByRole('button')).toBeDisabled()
    })
})