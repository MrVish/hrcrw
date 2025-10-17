import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Toast, ToastContainer, ToastMessage } from '../Toast'

const mockToast: ToastMessage = {
    id: 'test-toast',
    type: 'success',
    title: 'Success',
    message: 'Operation completed successfully',
}

const mockErrorToast: ToastMessage = {
    id: 'error-toast',
    type: 'error',
    title: 'Error',
    message: 'Something went wrong',
    persistent: true,
}

const mockToastWithActions: ToastMessage = {
    id: 'action-toast',
    type: 'info',
    title: 'Confirmation',
    message: 'Do you want to continue?',
    actions: [
        { label: 'Cancel', action: jest.fn() },
        { label: 'Continue', action: jest.fn(), primary: true },
    ],
}

describe('Toast', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders toast with title and message', () => {
        const onDismiss = jest.fn()

        render(<Toast toast={mockToast} onDismiss={onDismiss} />)

        expect(screen.getByText('Success')).toBeInTheDocument()
        expect(screen.getByText('Operation completed successfully')).toBeInTheDocument()
    })

    it('renders correct icon for each toast type', () => {
        const onDismiss = jest.fn()

        const { rerender } = render(<Toast toast={mockToast} onDismiss={onDismiss} />)
        expect(document.querySelector('.toast--success')).toBeInTheDocument()

        rerender(<Toast toast={{ ...mockToast, type: 'error' }} onDismiss={onDismiss} />)
        expect(document.querySelector('.toast--error')).toBeInTheDocument()

        rerender(<Toast toast={{ ...mockToast, type: 'warning' }} onDismiss={onDismiss} />)
        expect(document.querySelector('.toast--warning')).toBeInTheDocument()

        rerender(<Toast toast={{ ...mockToast, type: 'info' }} onDismiss={onDismiss} />)
        expect(document.querySelector('.toast--info')).toBeInTheDocument()
    })

    it('calls onDismiss when dismiss button is clicked', () => {
        const onDismiss = jest.fn()

        render(<Toast toast={mockToast} onDismiss={onDismiss} />)

        const dismissButton = screen.getByLabelText('Dismiss notification')
        fireEvent.click(dismissButton)

        expect(onDismiss).toHaveBeenCalledWith('test-toast')
    })

    it('auto-dismisses after duration', async () => {
        const onDismiss = jest.fn()
        const shortDurationToast = { ...mockToast, duration: 100 }

        render(<Toast toast={shortDurationToast} onDismiss={onDismiss} />)

        await waitFor(() => {
            expect(onDismiss).toHaveBeenCalledWith('test-toast')
        }, { timeout: 200 })
    })

    it('does not auto-dismiss persistent toasts', async () => {
        const onDismiss = jest.fn()

        render(<Toast toast={mockErrorToast} onDismiss={onDismiss} />)

        // Wait longer than default duration
        await new Promise(resolve => setTimeout(resolve, 100))

        expect(onDismiss).not.toHaveBeenCalled()
    })

    it('does not auto-dismiss when duration is 0', async () => {
        const onDismiss = jest.fn()
        const noDurationToast = { ...mockToast, duration: 0 }

        render(<Toast toast={noDurationToast} onDismiss={onDismiss} />)

        await new Promise(resolve => setTimeout(resolve, 100))

        expect(onDismiss).not.toHaveBeenCalled()
    })

    it('renders action buttons when provided', () => {
        const onDismiss = jest.fn()

        render(<Toast toast={mockToastWithActions} onDismiss={onDismiss} />)

        expect(screen.getByText('Cancel')).toBeInTheDocument()
        expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('calls action callback and dismisses when action is clicked', () => {
        const onDismiss = jest.fn()
        const mockAction = jest.fn()
        const toastWithAction = {
            ...mockToast,
            actions: [{ label: 'Action', action: mockAction }],
        }

        render(<Toast toast={toastWithAction} onDismiss={onDismiss} />)

        const actionButton = screen.getByText('Action')
        fireEvent.click(actionButton)

        expect(mockAction).toHaveBeenCalled()
        expect(onDismiss).toHaveBeenCalledWith('test-toast')
    })

    it('applies primary class to primary actions', () => {
        const onDismiss = jest.fn()

        render(<Toast toast={mockToastWithActions} onDismiss={onDismiss} />)

        const continueButton = screen.getByText('Continue')
        expect(continueButton).toHaveClass('toast__action--primary')

        const cancelButton = screen.getByText('Cancel')
        expect(cancelButton).not.toHaveClass('toast__action--primary')
    })

    it('shows progress bar for non-persistent toasts', () => {
        const onDismiss = jest.fn()

        render(<Toast toast={mockToast} onDismiss={onDismiss} />)

        expect(document.querySelector('.toast__progress')).toBeInTheDocument()
    })

    it('hides progress bar for persistent toasts', () => {
        const onDismiss = jest.fn()

        render(<Toast toast={mockErrorToast} onDismiss={onDismiss} />)

        expect(document.querySelector('.toast__progress')).not.toBeInTheDocument()
    })

    it('has proper accessibility attributes', () => {
        const onDismiss = jest.fn()

        render(<Toast toast={mockToast} onDismiss={onDismiss} />)

        const toast = document.querySelector('.toast')
        expect(toast).toHaveAttribute('role', 'alert')
        expect(toast).toHaveAttribute('aria-live', 'polite')

        const dismissButton = screen.getByLabelText('Dismiss notification')
        expect(dismissButton).toBeInTheDocument()
    })
})

describe('ToastContainer', () => {
    const mockToasts: ToastMessage[] = [
        { id: '1', type: 'success', title: 'Success 1' },
        { id: '2', type: 'error', title: 'Error 1' },
        { id: '3', type: 'info', title: 'Info 1' },
    ]

    it('renders all toasts', () => {
        const onDismiss = jest.fn()

        render(<ToastContainer toasts={mockToasts} onDismiss={onDismiss} />)

        expect(screen.getByText('Success 1')).toBeInTheDocument()
        expect(screen.getByText('Error 1')).toBeInTheDocument()
        expect(screen.getByText('Info 1')).toBeInTheDocument()
    })

    it('renders empty container when no toasts', () => {
        const onDismiss = jest.fn()

        render(<ToastContainer toasts={[]} onDismiss={onDismiss} />)

        expect(document.querySelector('.toast-container')).toBeInTheDocument()
        expect(document.querySelectorAll('.toast')).toHaveLength(0)
    })

    it('applies position classes correctly', () => {
        const onDismiss = jest.fn()

        const { rerender } = render(
            <ToastContainer toasts={[]} onDismiss={onDismiss} position="top-right" />
        )
        expect(document.querySelector('.toast-container--top-right')).toBeInTheDocument()

        rerender(
            <ToastContainer toasts={[]} onDismiss={onDismiss} position="bottom-left" />
        )
        expect(document.querySelector('.toast-container--bottom-left')).toBeInTheDocument()
    })

    it('calls onDismiss for individual toasts', () => {
        const onDismiss = jest.fn()

        render(<ToastContainer toasts={mockToasts} onDismiss={onDismiss} />)

        const dismissButtons = screen.getAllByLabelText('Dismiss notification')
        fireEvent.click(dismissButtons[0])

        expect(onDismiss).toHaveBeenCalledWith('1')
    })

    it('handles empty toast list gracefully', () => {
        const onDismiss = jest.fn()

        expect(() => {
            render(<ToastContainer toasts={[]} onDismiss={onDismiss} />)
        }).not.toThrow()
    })
})