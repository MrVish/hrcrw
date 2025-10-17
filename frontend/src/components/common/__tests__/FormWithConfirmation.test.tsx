import React, { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { FormWithConfirmation, useNavigateWithConfirmation } from '../FormWithConfirmation'

// Mock React Router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ pathname: '/test' }),
    }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
)

// Test component that uses FormWithConfirmation
const TestForm: React.FC<{
    onSave?: () => Promise<void>
    canSave?: boolean
    isLoading?: boolean
}> = ({ onSave, canSave = false, isLoading = false }) => {
    const [isDirty, setIsDirty] = useState(false)
    const [inputValue, setInputValue] = useState('')

    const handleInputChange = (value: string) => {
        setInputValue(value)
        setIsDirty(value.length > 0)
    }

    return (
        <FormWithConfirmation
            isDirty={isDirty}
            onSave={onSave}
            canSave={canSave}
            isLoading={isLoading}
        >
            <form>
                <input
                    data-testid="test-input"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Type to make form dirty"
                />
                <button type="button" onClick={() => setIsDirty(false)}>
                    Reset
                </button>
            </form>
        </FormWithConfirmation>
    )
}

// Test component for useNavigateWithConfirmation hook
const TestNavigationComponent: React.FC = () => {
    const [isDirty, setIsDirty] = useState(false)
    const {
        navigateWithConfirmation,
        showConfirmation,
        handleConfirmNavigation,
        handleCancelNavigation,
    } = useNavigateWithConfirmation()

    return (
        <div>
            <button onClick={() => setIsDirty(!isDirty)}>
                Toggle Dirty: {isDirty ? 'Dirty' : 'Clean'}
            </button>
            <button onClick={() => navigateWithConfirmation('/other-page', isDirty)}>
                Navigate
            </button>
            {showConfirmation && (
                <div data-testid="navigation-confirmation">
                    <p>Navigate away?</p>
                    <button onClick={handleConfirmNavigation}>Confirm</button>
                    <button onClick={handleCancelNavigation}>Cancel</button>
                </div>
            )}
        </div>
    )
}

describe('FormWithConfirmation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should render children without confirmation dialog when form is clean', () => {
        render(<TestForm />, { wrapper })

        expect(screen.getByTestId('test-input')).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should not show confirmation dialog when form is clean', () => {
        render(<TestForm />, { wrapper })

        // Simulate browser back button
        window.dispatchEvent(new PopStateEvent('popstate'))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should show confirmation dialog when form is dirty and navigation is attempted', async () => {
        render(<TestForm />, { wrapper })

        const input = screen.getByTestId('test-input')
        fireEvent.change(input, { target: { value: 'test' } })

        // Simulate browser back button
        window.dispatchEvent(new PopStateEvent('popstate'))

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
            expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
        })
    })

    it('should hide confirmation dialog when "Stay on Page" is clicked', async () => {
        render(<TestForm />, { wrapper })

        const input = screen.getByTestId('test-input')
        fireEvent.change(input, { target: { value: 'test' } })

        // Simulate browser back button
        window.dispatchEvent(new PopStateEvent('popstate'))

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Stay on Page'))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    })

    it('should navigate when "Leave Without Saving" is clicked', async () => {
        render(<TestForm />, { wrapper })

        const input = screen.getByTestId('test-input')
        fireEvent.change(input, { target: { value: 'test' } })

        // Simulate browser back button
        window.dispatchEvent(new PopStateEvent('popstate'))

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Leave Without Saving'))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    })

    it('should show save button when canSave is true', async () => {
        const mockSave = vi.fn().mockResolvedValue(undefined)
        render(<TestForm onSave={mockSave} canSave={true} />, { wrapper })

        const input = screen.getByTestId('test-input')
        fireEvent.change(input, { target: { value: 'test' } })

        // Simulate browser back button
        window.dispatchEvent(new PopStateEvent('popstate'))

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
            expect(screen.getByText('Save and Leave')).toBeInTheDocument()
        })
    })

    it('should call onSave when "Save and Leave" is clicked', async () => {
        const mockSave = vi.fn().mockResolvedValue(undefined)
        render(<TestForm onSave={mockSave} canSave={true} />, { wrapper })

        const input = screen.getByTestId('test-input')
        fireEvent.change(input, { target: { value: 'test' } })

        // Simulate browser back button
        window.dispatchEvent(new PopStateEvent('popstate'))

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Save and Leave'))

        await waitFor(() => {
            expect(mockSave).toHaveBeenCalledTimes(1)
        })
    })

    it('should show loading state when save is in progress', async () => {
        const mockSave = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
        render(<TestForm onSave={mockSave} canSave={true} />, { wrapper })

        const input = screen.getByTestId('test-input')
        fireEvent.change(input, { target: { value: 'test' } })

        // Simulate browser back button
        window.dispatchEvent(new PopStateEvent('popstate'))

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Save and Leave'))

        await waitFor(() => {
            expect(screen.getByText('Saving...')).toBeInTheDocument()
        })
    })

    it('should handle save errors gracefully', async () => {
        const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'))
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        render(<TestForm onSave={mockSave} canSave={true} />, { wrapper })

        const input = screen.getByTestId('test-input')
        fireEvent.change(input, { target: { value: 'test' } })

        // Simulate browser back button
        window.dispatchEvent(new PopStateEvent('popstate'))

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Save and Leave'))

        await waitFor(() => {
            expect(mockSave).toHaveBeenCalledTimes(1)
            expect(consoleSpy).toHaveBeenCalledWith('Failed to save form:', expect.any(Error))
            // Dialog should remain open on error
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        consoleSpy.mockRestore()
    })
})

describe('useNavigateWithConfirmation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should navigate immediately when form is clean', () => {
        render(<TestNavigationComponent />, { wrapper })

        fireEvent.click(screen.getByText('Navigate'))

        expect(mockNavigate).toHaveBeenCalledWith('/other-page')
        expect(screen.queryByTestId('navigation-confirmation')).not.toBeInTheDocument()
    })

    it('should show confirmation when form is dirty', () => {
        render(<TestNavigationComponent />, { wrapper })

        // Make form dirty
        fireEvent.click(screen.getByText(/Toggle Dirty/))
        expect(screen.getByText('Toggle Dirty: Dirty')).toBeInTheDocument()

        fireEvent.click(screen.getByText('Navigate'))

        expect(mockNavigate).not.toHaveBeenCalled()
        expect(screen.getByTestId('navigation-confirmation')).toBeInTheDocument()
    })

    it('should navigate when confirmation is accepted', () => {
        render(<TestNavigationComponent />, { wrapper })

        // Make form dirty
        fireEvent.click(screen.getByText(/Toggle Dirty/))
        fireEvent.click(screen.getByText('Navigate'))

        expect(screen.getByTestId('navigation-confirmation')).toBeInTheDocument()

        fireEvent.click(screen.getByText('Confirm'))

        expect(mockNavigate).toHaveBeenCalledWith('/other-page')
        expect(screen.queryByTestId('navigation-confirmation')).not.toBeInTheDocument()
    })

    it('should cancel navigation when confirmation is cancelled', () => {
        render(<TestNavigationComponent />, { wrapper })

        // Make form dirty
        fireEvent.click(screen.getByText(/Toggle Dirty/))
        fireEvent.click(screen.getByText('Navigate'))

        expect(screen.getByTestId('navigation-confirmation')).toBeInTheDocument()

        fireEvent.click(screen.getByText('Cancel'))

        expect(mockNavigate).not.toHaveBeenCalled()
        expect(screen.queryByTestId('navigation-confirmation')).not.toBeInTheDocument()
    })
})