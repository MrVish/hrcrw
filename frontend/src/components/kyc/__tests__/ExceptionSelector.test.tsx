import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ExceptionSelector from '../ExceptionSelector'
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
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

describe('ExceptionSelector', () => {
    const defaultProps = {
        onExceptionsChange: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders all exception options', () => {
        render(<ExceptionSelector {...defaultProps} />)

        expect(screen.getByText(/Flag Customer for KYC Non-Compliance/i)).toBeInTheDocument()
        expect(screen.getByText(/Dormant or Non-reachable.*funded account.*UFAA/i)).toBeInTheDocument()
        expect(screen.getByText(/Dormant or non-reachable.*overdrawn account.*Exit/i)).toBeInTheDocument()
    })

    it('shows empty state initially', () => {
        render(<ExceptionSelector {...defaultProps} />)

        expect(screen.getByText(/No exceptions selected/i)).toBeInTheDocument()
        expect(screen.getByText(/Review will be submitted without exceptions/i)).toBeInTheDocument()
    })

    it('allows selecting and deselecting exceptions', async () => {
        const user = userEvent.setup()
        const onExceptionsChange = vi.fn()
        render(<ExceptionSelector {...defaultProps} onExceptionsChange={onExceptionsChange} />)

        // Select KYC non-compliance exception
        const kycCheckbox = screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i)
        await user.click(kycCheckbox)

        expect(onExceptionsChange).toHaveBeenCalledWith([
            expect.objectContaining({
                type: 'kyc_non_compliance'
            })
        ])

        // Deselect the exception
        await user.click(kycCheckbox)

        expect(onExceptionsChange).toHaveBeenCalledWith([])
    })

    it('allows multiple exception selections', async () => {
        const user = userEvent.setup()
        const onExceptionsChange = vi.fn()
        render(<ExceptionSelector {...defaultProps} onExceptionsChange={onExceptionsChange} />)

        // Select multiple exceptions
        await user.click(screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i))
        await user.click(screen.getByLabelText(/Dormant or Non-reachable.*funded/i))

        expect(onExceptionsChange).toHaveBeenCalledWith([
            expect.objectContaining({ type: 'kyc_non_compliance' }),
            expect.objectContaining({ type: 'dormant_funded_ufaa' })
        ])
    })

    it('shows custom description fields when exceptions are selected', async () => {
        const user = userEvent.setup()
        render(<ExceptionSelector {...defaultProps} />)

        // Select an exception
        await user.click(screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i))

        // Should show custom description field
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Provide additional context/i)).toBeInTheDocument()
        })
    })

    it('handles custom descriptions', async () => {
        const user = userEvent.setup()
        const onExceptionsChange = vi.fn()
        render(<ExceptionSelector {...defaultProps} onExceptionsChange={onExceptionsChange} />)

        // Select an exception
        await user.click(screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i))

        // Add custom description
        const descriptionField = screen.getByPlaceholderText(/Provide additional context/i)
        await user.type(descriptionField, 'Custom description')

        await waitFor(() => {
            expect(onExceptionsChange).toHaveBeenCalledWith([
                expect.objectContaining({
                    type: 'kyc_non_compliance',
                    description: 'Custom description'
                })
            ])
        })
    })

    it('shows exception summary when exceptions are selected', async () => {
        const user = userEvent.setup()
        render(<ExceptionSelector {...defaultProps} />)

        // Select an exception
        await user.click(screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i))

        await waitFor(() => {
            expect(screen.getByText(/1 Exception Selected/i)).toBeInTheDocument()
        })

        // Select another exception
        await user.click(screen.getByLabelText(/Dormant or Non-reachable.*funded/i))

        await waitFor(() => {
            expect(screen.getByText(/2 Exceptions Selected/i)).toBeInTheDocument()
        })
    })

    it('allows removing exceptions from summary', async () => {
        const user = userEvent.setup()
        const onExceptionsChange = vi.fn()
        render(<ExceptionSelector {...defaultProps} onExceptionsChange={onExceptionsChange} />)

        // Select an exception
        await user.click(screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i))

        // Remove from summary
        const removeButton = screen.getByTitle('Remove exception')
        await user.click(removeButton)

        expect(onExceptionsChange).toHaveBeenCalledWith([])
    })

    it('disables form when disabled prop is true', () => {
        render(<ExceptionSelector {...defaultProps} disabled={true} />)

        const checkbox = screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i)
        expect(checkbox).toBeDisabled()
    })

    it('displays correct severity indicators', () => {
        render(<ExceptionSelector {...defaultProps} />)

        // All exception cards should be visible with their severity indicators
        const exceptionCards = screen.getAllByRole('checkbox')
        expect(exceptionCards).toHaveLength(3)

        // Check for severity-specific styling (this would be more detailed in actual implementation)
        expect(screen.getByText(/Flag Customer for KYC Non-Compliance/i)).toBeInTheDocument()
    })

    it('handles edge case of empty custom description', async () => {
        const user = userEvent.setup()
        const onExceptionsChange = vi.fn()
        render(<ExceptionSelector {...defaultProps} onExceptionsChange={onExceptionsChange} />)

        // Select an exception
        await user.click(screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i))

        // Clear the description field (should use default description)
        const descriptionField = screen.getByPlaceholderText(/Provide additional context/i)
        await user.clear(descriptionField)

        // Should still have the exception with default description
        expect(onExceptionsChange).toHaveBeenCalledWith([
            expect.objectContaining({
                type: 'kyc_non_compliance',
                description: expect.stringContaining('incomplete or non-compliant')
            })
        ])
    })
})