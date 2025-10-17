import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ConfirmationDialog from '../ConfirmationDialog'
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
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

describe('ConfirmationDialog', () => {
    const defaultProps = {
        open: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. What would you like to do?',
        onStay: vi.fn(),
        onLeave: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        // Reset body overflow style
        document.body.style.overflow = ''
    })

    it('should not render when closed', () => {
        render(<ConfirmationDialog {...defaultProps} open={false} />)

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render with correct title and message', () => {
        render(<ConfirmationDialog {...defaultProps} />)

        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
        expect(screen.getByText('You have unsaved changes. What would you like to do?')).toBeInTheDocument()
    })

    it('should render default buttons', () => {
        render(<ConfirmationDialog {...defaultProps} />)

        expect(screen.getByText('Stay on Page')).toBeInTheDocument()
        expect(screen.getByText('Leave Without Saving')).toBeInTheDocument()
    })

    it('should render save button when canSave is true', () => {
        const onSaveAndLeave = vi.fn()
        render(
            <ConfirmationDialog
                {...defaultProps}
                canSave={true}
                onSaveAndLeave={onSaveAndLeave}
            />
        )

        expect(screen.getByText('Save and Leave')).toBeInTheDocument()
    })

    it('should call onStay when stay button is clicked', () => {
        render(<ConfirmationDialog {...defaultProps} />)

        fireEvent.click(screen.getByText('Stay on Page'))
        expect(defaultProps.onStay).toHaveBeenCalledTimes(1)
    })

    it('should call onLeave when leave button is clicked', () => {
        render(<ConfirmationDialog {...defaultProps} />)

        fireEvent.click(screen.getByText('Leave Without Saving'))
        expect(defaultProps.onLeave).toHaveBeenCalledTimes(1)
    })

    it('should call onSaveAndLeave when save button is clicked', () => {
        const onSaveAndLeave = vi.fn()
        render(
            <ConfirmationDialog
                {...defaultProps}
                canSave={true}
                onSaveAndLeave={onSaveAndLeave}
            />
        )

        fireEvent.click(screen.getByText('Save and Leave'))
        expect(onSaveAndLeave).toHaveBeenCalledTimes(1)
    })

    it('should call onStay when escape key is pressed', () => {
        render(<ConfirmationDialog {...defaultProps} />)

        fireEvent.keyDown(document, { key: 'Escape' })
        expect(defaultProps.onStay).toHaveBeenCalledTimes(1)
    })

    it('should call onStay when backdrop is clicked', () => {
        render(<ConfirmationDialog {...defaultProps} />)

        const overlay = screen.getByRole('dialog')
        fireEvent.click(overlay)
        expect(defaultProps.onStay).toHaveBeenCalledTimes(1)
    })

    it('should not call onStay when dialog content is clicked', () => {
        render(<ConfirmationDialog {...defaultProps} />)

        const dialog = screen.getByRole('document')
        fireEvent.click(dialog)
        expect(defaultProps.onStay).not.toHaveBeenCalled()
    })

    it('should show loading state on save button', () => {
        const onSaveAndLeave = vi.fn()
        render(
            <ConfirmationDialog
                {...defaultProps}
                canSave={true}
                onSaveAndLeave={onSaveAndLeave}
                isLoading={true}
            />
        )

        expect(screen.getByText('Saving...')).toBeInTheDocument()
        const saveButton = screen.getByText('Saving...')
        expect(saveButton).toBeDisabled()
    })

    it('should disable all buttons when loading', () => {
        const onSaveAndLeave = vi.fn()
        render(
            <ConfirmationDialog
                {...defaultProps}
                canSave={true}
                onSaveAndLeave={onSaveAndLeave}
                isLoading={true}
            />
        )

        expect(screen.getByText('Stay on Page')).toBeDisabled()
        expect(screen.getByText('Leave Without Saving')).toBeDisabled()
        expect(screen.getByText('Saving...')).toBeDisabled()
    })

    it('should use custom button texts', () => {
        render(
            <ConfirmationDialog
                {...defaultProps}
                stayButtonText="Keep Editing"
                leaveButtonText="Discard Changes"
                saveAndLeaveButtonText="Save & Continue"
                canSave={true}
                onSaveAndLeave={vi.fn()}
            />
        )

        expect(screen.getByText('Keep Editing')).toBeInTheDocument()
        expect(screen.getByText('Discard Changes')).toBeInTheDocument()
        expect(screen.getByText('Save & Continue')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
        render(<ConfirmationDialog {...defaultProps} />)

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAttribute('aria-labelledby', 'confirmation-dialog-title')
        expect(dialog).toHaveAttribute('aria-describedby', 'confirmation-dialog-message')
    })

    it('should focus first button when opened', async () => {
        render(<ConfirmationDialog {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Stay on Page')).toHaveFocus()
        })
    })

    it('should prevent body scroll when open', () => {
        render(<ConfirmationDialog {...defaultProps} />)

        expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body scroll when closed', () => {
        const { rerender } = render(<ConfirmationDialog {...defaultProps} />)

        expect(document.body.style.overflow).toBe('hidden')

        rerender(<ConfirmationDialog {...defaultProps} open={false} />)

        expect(document.body.style.overflow).toBe('')
    })

    it('should handle tab navigation correctly', () => {
        const onSaveAndLeave = vi.fn()
        render(
            <ConfirmationDialog
                {...defaultProps}
                canSave={true}
                onSaveAndLeave={onSaveAndLeave}
            />
        )

        const stayButton = screen.getByText('Stay on Page')
        const leaveButton = screen.getByText('Leave Without Saving')
        const saveButton = screen.getByText('Save and Leave')

        // Focus should start on first button
        expect(stayButton).toHaveFocus()

        // All buttons should be focusable
        expect(stayButton).not.toHaveAttribute('tabindex', '-1')
        expect(leaveButton).not.toHaveAttribute('tabindex', '-1')
        expect(saveButton).not.toHaveAttribute('tabindex', '-1')
    })

    it('should handle shift+tab navigation correctly', () => {
        const onSaveAndLeave = vi.fn()
        render(
            <ConfirmationDialog
                {...defaultProps}
                canSave={true}
                onSaveAndLeave={onSaveAndLeave}
            />
        )

        const stayButton = screen.getByText('Stay on Page')
        const saveButton = screen.getByText('Save and Leave')

        // Focus should start on first button
        expect(stayButton).toHaveFocus()

        // Shift+Tab should wrap to last button
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
        expect(saveButton).toHaveFocus()
    })
})