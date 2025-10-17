import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import { vi } from 'vitest'
import { FormFeedback } from '../FormFeedback'
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

describe('FormFeedback', () => {
    it('renders loading state correctly', () => {
        renderWithTheme(
            <FormFeedback loading={true} loadingText="Processing..." />
        )

        expect(screen.getByText('Processing...')).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('renders success message correctly', () => {
        renderWithTheme(
            <FormFeedback success="Operation completed successfully!" />
        )

        expect(screen.getByText('Operation completed successfully!')).toBeInTheDocument()
        expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument()
    })

    it('renders error message correctly', () => {
        renderWithTheme(
            <FormFeedback error="Something went wrong!" />
        )

        expect(screen.getByText('Something went wrong!')).toBeInTheDocument()
        expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument()
    })

    it('renders warning message correctly', () => {
        renderWithTheme(
            <FormFeedback warning="This is a warning!" />
        )

        expect(screen.getByText('This is a warning!')).toBeInTheDocument()
        expect(screen.getByTestId('WarningIcon')).toBeInTheDocument()
    })

    it('renders info message correctly', () => {
        renderWithTheme(
            <FormFeedback info="This is some information!" />
        )

        expect(screen.getByText('This is some information!')).toBeInTheDocument()
        expect(screen.getByTestId('InfoIcon')).toBeInTheDocument()
    })

    it('auto-hides success message after specified duration', async () => {
        const onClose = vi.fn()

        renderWithTheme(
            <FormFeedback
                success="Success!"
                autoHideDuration={100}
                onClose={onClose}
            />
        )

        expect(screen.getByText('Success!')).toBeInTheDocument()

        await waitFor(() => {
            expect(onClose).toHaveBeenCalled()
        }, { timeout: 200 })
    })

    it('does not render anything when no props are provided', () => {
        const { container } = renderWithTheme(<FormFeedback />)

        // Should only contain the empty Box with mb: 2
        expect(container.firstChild?.childNodes).toHaveLength(0)
    })

    it('renders multiple message types simultaneously', () => {
        renderWithTheme(
            <FormFeedback
                success="Success message"
                warning="Warning message"
                info="Info message"
            />
        )

        expect(screen.getByText('Success message')).toBeInTheDocument()
        expect(screen.getByText('Warning message')).toBeInTheDocument()
        expect(screen.getByText('Info message')).toBeInTheDocument()
    })
})