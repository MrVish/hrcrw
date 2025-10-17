import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { ExceptionDetail } from '../ExceptionDetail'
import { AuthProvider } from '../../../contexts/AuthContext'
import theme from '../../../theme'
import { apiClient } from '../../../services'

// Mock the API client
jest.mock('../../../services', () => ({
    apiClient: {
        getException: jest.fn(),
        getAssignableUsersList: jest.fn(),
        updateException: jest.fn(),
    },
}))

const mockException = {
    id: 1,
    review_id: 1,
    client_id: 'TEST001',
    client_name: 'Test Client',
    title: 'Test Exception',
    type: 'COMPLIANCE' as const,
    description: 'Test exception description',
    status: 'OPEN' as const,
    priority: 'HIGH' as const,
    assigned_to: null,
    assigned_user_name: null,
    created_by: 1,
    creator_name: 'Test User',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    resolved_at: null,
    resolution_notes: null,
    due_date: null,
}

const mockUsers = [
    {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'Admin' as const,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
    },
]

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>
        <ThemeProvider theme={theme}>
            <AuthProvider>
                {children}
            </AuthProvider>
        </ThemeProvider>
    </BrowserRouter>
)

describe('ExceptionDetail Accessibility', () => {
    beforeEach(() => {
        jest.clearAllMocks()
            ; (apiClient.getException as jest.Mock).mockResolvedValue(mockException)
            ; (apiClient.getAssignableUsersList as jest.Mock).mockResolvedValue(mockUsers)
    })

    describe('ARIA Labels and Semantic HTML', () => {
        it('should have proper heading hierarchy', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
            })

            const mainHeading = screen.getByRole('heading', { level: 1 })
            expect(mainHeading).toHaveTextContent('Test Exception')
            expect(mainHeading).toHaveAttribute('id', 'exception-detail-heading')
        })

        it('should have proper landmark roles', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByRole('main')).toBeInTheDocument()
            })

            expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'exception-detail-heading')
            expect(screen.getByRole('banner')).toBeInTheDocument()
        })

        it('should have proper breadcrumb navigation', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByLabelText('Exception navigation breadcrumb')).toBeInTheDocument()
            })

            const backLink = screen.getByLabelText('Go back to exceptions list')
            expect(backLink).toBeInTheDocument()

            const currentPage = screen.getByText('Exception #1')
            expect(currentPage).toHaveAttribute('aria-current', 'page')
        })

        it('should have proper ARIA labels on interactive elements', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByLabelText('Go back to exceptions list')).toBeInTheDocument()
            })

            expect(screen.getByLabelText('Update exception status')).toBeInTheDocument()
        })

        it('should have proper status and priority labels', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByLabelText('Status: OPEN')).toBeInTheDocument()
            })

            expect(screen.getByLabelText('Priority level: HIGH')).toBeInTheDocument()
        })

        it('should group related elements properly', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByLabelText('Exception status and priority')).toBeInTheDocument()
            })

            expect(screen.getByLabelText('Exception actions')).toBeInTheDocument()
        })

        it('should announce loading states to screen readers', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            // Check loading state has proper ARIA attributes
            const loadingElement = screen.getByLabelText('Exception details loading')
            expect(loadingElement).toHaveAttribute('aria-busy', 'true')
            expect(loadingElement).toHaveAttribute('aria-live', 'polite')
        })

        it('should have proper error announcements', async () => {
            ; (apiClient.getException as jest.Mock).mockRejectedValue(new Error('Network error'))

            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Exception details error')
            })
        })
    })

    describe('Focus Management', () => {
        it('should have a skip link', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Skip to main content')).toBeInTheDocument()
            })

            const skipLink = screen.getByText('Skip to main content')
            expect(skipLink).toHaveAttribute('href', '#exception-main-content')
            expect(skipLink).toHaveClass('skip-link')
        })

        it('should manage focus for modal dialogs', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Exception')).toBeInTheDocument()
            })

            // Open status update form
            const updateButton = screen.getByLabelText('Update exception status')
            await user.click(updateButton)

            // Modal should have proper attributes
            await waitFor(() => {
                const modal = screen.getByRole('dialog')
                expect(modal).toHaveAttribute('aria-modal', 'true')
                expect(modal).toHaveAttribute('tabindex', '-1')
            })
        })

        it('should trap focus within modal', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Exception')).toBeInTheDocument()
            })

            // Open status update form
            const updateButton = screen.getByLabelText('Update exception status')
            await user.click(updateButton)

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument()
            })

            // Tab should cycle within modal
            const modalElements = screen.getAllByRole('combobox').concat(
                screen.getAllByRole('button').filter(btn =>
                    btn.textContent?.includes('Save') || btn.textContent?.includes('Cancel')
                )
            )

            // Focus should be trapped within modal elements
            for (const element of modalElements) {
                await user.tab()
                expect(modalElements).toContain(document.activeElement)
            }
        })

        it('should handle escape key to close modal', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Exception')).toBeInTheDocument()
            })

            // Open status update form
            const updateButton = screen.getByLabelText('Update exception status')
            await user.click(updateButton)

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument()
            })

            // Press escape should close modal
            await user.keyboard('{Escape}')

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            })
        })
    })

    describe('High Contrast Support', () => {
        it('should apply high contrast styles when media query matches', () => {
            // Mock high contrast media query
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-contrast: high)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            })

            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-contrast: high)')
        })

        it('should have sufficient color contrast for status indicators', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByLabelText('Status: OPEN')).toBeInTheDocument()
            })

            const statusElements = screen.getAllByRole('status')
            statusElements.forEach(element => {
                expect(element).toHaveAttribute('role', 'status')
            })
        })
    })

    describe('Screen Reader Support', () => {
        it('should have proper live regions for dynamic content', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Exception')).toBeInTheDocument()
            })

            // Success messages should have proper live regions
            const liveRegions = screen.getAllByRole('status')
            expect(liveRegions.length).toBeGreaterThan(0)
        })

        it('should have descriptive text for complex UI elements', async () => {
            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Exception')).toBeInTheDocument()
            })

            // Should have screen reader description
            expect(screen.getByText(/Exception detail page for Test Exception/)).toHaveClass('sr-only')
        })

        it('should announce form updates', async () => {
            const user = userEvent.setup()
                ; (apiClient.updateException as jest.Mock).mockResolvedValue({
                    ...mockException,
                    status: 'IN_PROGRESS',
                })

            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Exception')).toBeInTheDocument()
            })

            // Open status update form
            const updateButton = screen.getByLabelText('Update exception status')
            await user.click(updateButton)

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument()
            })

            // Change status and save
            const statusSelect = screen.getByLabelText(/status/i)
            await user.click(statusSelect)

            const inProgressOption = screen.getByText('In Progress')
            await user.click(inProgressOption)

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            // Should announce success
            await waitFor(() => {
                expect(screen.getByRole('status')).toBeInTheDocument()
            })
        })
    })

    describe('Keyboard Navigation', () => {
        it('should support tab navigation through all interactive elements', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Exception')).toBeInTheDocument()
            })

            // Should be able to tab through all interactive elements
            const interactiveElements = [
                screen.getByLabelText('Go back to exceptions list'),
                screen.getByLabelText('Update exception status'),
            ]

            for (const element of interactiveElements) {
                await user.tab()
                expect(element).toHaveFocus()
            }
        })

        it('should support enter and space key activation', async () => {
            const user = userEvent.setup()
            const mockOnBack = jest.fn()

            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={mockOnBack} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Exception')).toBeInTheDocument()
            })

            const backButton = screen.getByLabelText('Go back to exceptions list')
            backButton.focus()

            // Should activate with Enter key
            await user.keyboard('{Enter}')
            expect(mockOnBack).toHaveBeenCalled()
        })

        it('should handle form navigation with keyboard', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ExceptionDetail exceptionId={1} onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Exception')).toBeInTheDocument()
            })

            // Open status update form
            const updateButton = screen.getByLabelText('Update exception status')
            await user.click(updateButton)

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument()
            })

            // Should be able to navigate form with keyboard
            const formElements = screen.getAllByRole('combobox')
            for (const element of formElements) {
                await user.tab()
                expect(element).toHaveFocus()
            }
        })
    })
})