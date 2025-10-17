import React, { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { FormWithConfirmation } from '../FormWithConfirmation'
import { useFormConfirmation } from '../../../hooks/useFormConfirmation'

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

// Integration test component that simulates a real form
const IntegratedFormExample: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        description: ''
    })
    const [originalData, setOriginalData] = useState({
        name: '',
        email: '',
        description: ''
    })
    const [saving, setSaving] = useState(false)

    const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData)

    const handleSave = async () => {
        setSaving(true)
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 100))
            setOriginalData({ ...formData })
        } finally {
            setSaving(false)
        }
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <FormWithConfirmation
            isDirty={isDirty}
            onSave={handleSave}
            canSave={true}
            isLoading={saving}
        >
            <form>
                <input
                    data-testid="name-input"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Name"
                />
                <input
                    data-testid="email-input"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Email"
                />
                <textarea
                    data-testid="description-input"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Description"
                />
                <button type="button" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </form>
        </FormWithConfirmation>
    )
}

// Test component using the hook directly
const HookIntegrationExample: React.FC = () => {
    const [formData, setFormData] = useState({ value: '' })
    const [originalData, setOriginalData] = useState({ value: '' })

    const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData)
    const { setDirty, resetForm } = useFormConfirmation()

    React.useEffect(() => {
        setDirty(isDirty)
    }, [isDirty, setDirty])

    const handleSave = () => {
        setOriginalData({ ...formData })
        resetForm()
    }

    return (
        <div>
            <input
                data-testid="hook-input"
                value={formData.value}
                onChange={(e) => setFormData({ value: e.target.value })}
                placeholder="Type here"
            />
            <button onClick={handleSave}>Save</button>
            <span data-testid="dirty-status">{isDirty ? 'Dirty' : 'Clean'}</span>
        </div>
    )
}

describe('Form Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('FormWithConfirmation Integration', () => {
        it('should integrate properly with a real form component', async () => {
            render(<IntegratedFormExample />, { wrapper })

            const nameInput = screen.getByTestId('name-input')
            const emailInput = screen.getByTestId('email-input')

            // Form should start clean
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

            // Make form dirty
            fireEvent.change(nameInput, { target: { value: 'John Doe' } })
            fireEvent.change(emailInput, { target: { value: 'john@example.com' } })

            // Simulate navigation attempt
            window.dispatchEvent(new PopStateEvent('popstate'))

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument()
                expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
            })
        })

        it('should handle save and leave functionality', async () => {
            render(<IntegratedFormExample />, { wrapper })

            const nameInput = screen.getByTestId('name-input')

            // Make form dirty
            fireEvent.change(nameInput, { target: { value: 'John Doe' } })

            // Simulate navigation attempt
            window.dispatchEvent(new PopStateEvent('popstate'))

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument()
            })

            // Click save and leave
            fireEvent.click(screen.getByText('Save and Leave'))

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            })
        })

        it('should handle multiple form fields correctly', async () => {
            render(<IntegratedFormExample />, { wrapper })

            const nameInput = screen.getByTestId('name-input')
            const emailInput = screen.getByTestId('email-input')
            const descriptionInput = screen.getByTestId('description-input')

            // Change multiple fields
            fireEvent.change(nameInput, { target: { value: 'John' } })
            fireEvent.change(emailInput, { target: { value: 'john@test.com' } })
            fireEvent.change(descriptionInput, { target: { value: 'Test description' } })

            // Simulate navigation attempt
            window.dispatchEvent(new PopStateEvent('popstate'))

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument()
            })

            // Should show all three options
            expect(screen.getByText('Stay on Page')).toBeInTheDocument()
            expect(screen.getByText('Leave Without Saving')).toBeInTheDocument()
            expect(screen.getByText('Save and Leave')).toBeInTheDocument()
        })
    })

    describe('useFormConfirmation Hook Integration', () => {
        it('should work correctly when used directly in components', () => {
            render(<HookIntegrationExample />, { wrapper })

            const input = screen.getByTestId('hook-input')
            const status = screen.getByTestId('dirty-status')

            // Should start clean
            expect(status).toHaveTextContent('Clean')

            // Make dirty
            fireEvent.change(input, { target: { value: 'test' } })
            expect(status).toHaveTextContent('Dirty')

            // Save should reset to clean
            fireEvent.click(screen.getByText('Save'))
            expect(status).toHaveTextContent('Clean')
        })

        it('should maintain dirty state correctly across multiple changes', () => {
            render(<HookIntegrationExample />, { wrapper })

            const input = screen.getByTestId('hook-input')
            const status = screen.getByTestId('dirty-status')

            // Multiple changes
            fireEvent.change(input, { target: { value: 'a' } })
            expect(status).toHaveTextContent('Dirty')

            fireEvent.change(input, { target: { value: 'ab' } })
            expect(status).toHaveTextContent('Dirty')

            fireEvent.change(input, { target: { value: 'abc' } })
            expect(status).toHaveTextContent('Dirty')

            // Clear input - should still be dirty (different from original)
            fireEvent.change(input, { target: { value: '' } })
            expect(status).toHaveTextContent('Clean') // Back to original state
        })
    })

    describe('Error Handling Integration', () => {
        it('should handle save errors gracefully', async () => {
            const FailingSaveForm: React.FC = () => {
                const [isDirty, setIsDirty] = useState(false)

                const handleSave = async () => {
                    throw new Error('Save failed')
                }

                return (
                    <FormWithConfirmation
                        isDirty={isDirty}
                        onSave={handleSave}
                        canSave={true}
                    >
                        <button onClick={() => setIsDirty(true)}>Make Dirty</button>
                    </FormWithConfirmation>
                )
            }

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

            render(<FailingSaveForm />, { wrapper })

            // Make form dirty
            fireEvent.click(screen.getByText('Make Dirty'))

            // Simulate navigation
            window.dispatchEvent(new PopStateEvent('popstate'))

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument()
            })

            // Try save and leave - should fail but keep dialog open
            fireEvent.click(screen.getByText('Save and Leave'))

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to save form:', expect.any(Error))
                // Dialog should remain open on error
                expect(screen.getByRole('dialog')).toBeInTheDocument()
            })

            consoleSpy.mockRestore()
        })
    })
})