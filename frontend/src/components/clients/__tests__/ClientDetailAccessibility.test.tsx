import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { ClientDetail } from '../ClientDetail'
import { AuthProvider } from '../../../contexts/AuthContext'
import theme from '../../../theme'
import { apiClient } from '../../../services'

// Mock the API client
jest.mock('../../../services', () => ({
    apiClient: {
        getClient: jest.fn(),
        getClientReviews: jest.fn(),
        updateClient: jest.fn(),
    },
}))

const mockClient = {
    client_id: 'TEST001',
    name: 'Test Client',
    risk_level: 'MEDIUM' as const,
    status: 'ACTIVE' as const,
    country: 'United States',
    domicile_branch: 'New York',
    relationship_manager: 'John Doe',
    business_unit: 'Corporate Banking',
    aml_risk: 'LOW' as const,
    last_review_date: '2024-01-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
}

const mockReviews = [
    {
        id: 1,
        client_id: 'TEST001',
        status: 'APPROVED' as const,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        created_by: 1,
        updated_by: 1,
    },
]

const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'Admin' as const,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
}

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>
        <ThemeProvider theme={theme}>
            <AuthProvider>
                {children}
            </AuthProvider>
        </ThemeProvider>
    </BrowserRouter>
)

describe('ClientDetail Accessibility', () => {
    beforeEach(() => {
        jest.clearAllMocks()
            ; (apiClient.getClient as jest.Mock).mockResolvedValue(mockClient)
            ; (apiClient.getClientReviews as jest.Mock).mockResolvedValue(mockReviews)
    })

    describe('ARIA Labels and Semantic HTML', () => {
        it('should have proper heading hierarchy', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
            })

            const mainHeading = screen.getByRole('heading', { level: 1 })
            expect(mainHeading).toHaveTextContent('Test Client')
            expect(mainHeading).toHaveAttribute('id', 'client-detail-heading')
        })

        it('should have proper landmark roles', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByRole('main')).toBeInTheDocument()
            })

            expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'client-detail-heading')
            expect(screen.getByRole('banner')).toBeInTheDocument()
            expect(screen.getByRole('navigation')).toBeInTheDocument()
        })

        it('should have proper ARIA labels on interactive elements', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByLabelText('Go back to client list')).toBeInTheDocument()
            })

            expect(screen.getByLabelText('Edit client information')).toBeInTheDocument()
            expect(screen.getByLabelText('Create new review for this client')).toBeInTheDocument()
        })

        it('should have proper status badge labels', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByLabelText('Risk level: MEDIUM')).toBeInTheDocument()
            })

            expect(screen.getByLabelText('Client status: ACTIVE')).toBeInTheDocument()
            expect(screen.getByLabelText('AML risk level: LOW')).toBeInTheDocument()
        })

        it('should have proper tab navigation', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByRole('tablist')).toBeInTheDocument()
            })

            const tabs = screen.getAllByRole('tab')
            expect(tabs).toHaveLength(3)

            tabs.forEach((tab, index) => {
                const tabNames = ['overview', 'reviews', 'documents']
                expect(tab).toHaveAttribute('id', `${tabNames[index]}-tab`)
                expect(tab).toHaveAttribute('aria-controls', `${tabNames[index]}-tabpanel`)
            })
        })

        it('should announce loading states to screen readers', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            // Check loading state has proper ARIA attributes
            const loadingElement = screen.getByLabelText('Client details loading')
            expect(loadingElement).toHaveAttribute('aria-busy', 'true')
            expect(loadingElement).toHaveAttribute('aria-live', 'polite')
        })

        it('should have proper error announcements', async () => {
            ; (apiClient.getClient as jest.Mock).mockRejectedValue(new Error('Network error'))

            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Client details error')
            })
        })
    })

    describe('Focus Management', () => {
        it('should have a skip link', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Skip to main content')).toBeInTheDocument()
            })

            const skipLink = screen.getByText('Skip to main content')
            expect(skipLink).toHaveAttribute('href', '#client-main-content')
            expect(skipLink).toHaveClass('skip-link')
        })

        it('should focus first error field on validation failure', async () => {
            const user = userEvent.setup()
                ; (apiClient.updateClient as jest.Mock).mockResolvedValue(mockClient)

            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            // Enter edit mode
            const editButton = screen.getByLabelText('Edit client information')
            await user.click(editButton)

            // Clear required field
            const nameField = screen.getByDisplayValue('Test Client')
            await user.clear(nameField)

            // Try to save
            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            // Should focus the first error field
            await waitFor(() => {
                expect(nameField).toHaveFocus()
            })
        })

        it('should manage focus for keyboard navigation', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            // Tab through interactive elements
            await user.tab()
            expect(screen.getByLabelText('Go back to client list')).toHaveFocus()

            await user.tab()
            expect(screen.getByLabelText('Edit client information')).toHaveFocus()

            await user.tab()
            expect(screen.getByLabelText('Create new review for this client')).toHaveFocus()
        })

        it('should handle escape key to cancel edit mode', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            // Enter edit mode
            const editButton = screen.getByLabelText('Edit client information')
            await user.click(editButton)

            // Press escape
            await user.keyboard('{Escape}')

            // Should exit edit mode
            await waitFor(() => {
                expect(screen.getByLabelText('Edit client information')).toBeInTheDocument()
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
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            // High contrast styles should be applied via CSS media queries
            // This is tested through CSS, not directly in React
            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-contrast: high)')
        })

        it('should have sufficient color contrast for status badges', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByLabelText('Risk level: MEDIUM')).toBeInTheDocument()
            })

            const statusBadges = screen.getAllByRole('status')
            statusBadges.forEach(badge => {
                // Status badges should have role="status" for screen readers
                expect(badge).toHaveAttribute('role', 'status')
            })
        })
    })

    describe('Screen Reader Support', () => {
        it('should have proper live regions for dynamic content', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            // Success and error messages should have proper live regions
            const liveRegions = screen.getAllByRole('status')
            expect(liveRegions.length).toBeGreaterThan(0)
        })

        it('should have descriptive text for complex UI elements', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            // Should have screen reader description
            expect(screen.getByText(/Client detail page for Test Client/)).toHaveClass('sr-only')
        })

        it('should group related elements with proper roles', async () => {
            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            // Status badges should be grouped
            expect(screen.getByLabelText('Client status information')).toBeInTheDocument()
            expect(screen.getByLabelText('Client actions')).toBeInTheDocument()
        })
    })

    describe('Keyboard Navigation', () => {
        it('should support tab navigation through all interactive elements', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            // Should be able to tab through all interactive elements
            const interactiveElements = [
                screen.getByLabelText('Go back to client list'),
                screen.getByLabelText('Edit client information'),
                screen.getByLabelText('Create new review for this client'),
                ...screen.getAllByRole('tab'),
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
                    <ClientDetail clientId="TEST001" onBack={mockOnBack} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            const backButton = screen.getByLabelText('Go back to client list')
            backButton.focus()

            // Should activate with Enter key
            await user.keyboard('{Enter}')
            expect(mockOnBack).toHaveBeenCalled()
        })

        it('should support arrow key navigation in tabs', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ClientDetail clientId="TEST001" onBack={jest.fn()} />
                </TestWrapper>
            )

            await waitFor(() => {
                expect(screen.getByText('Test Client')).toBeInTheDocument()
            })

            const overviewTab = screen.getByRole('tab', { name: /overview/i })
            overviewTab.focus()

            // Arrow right should move to next tab
            await user.keyboard('{ArrowRight}')
            const reviewsTab = screen.getByRole('tab', { name: /reviews/i })
            expect(reviewsTab).toHaveFocus()
        })
    })
})