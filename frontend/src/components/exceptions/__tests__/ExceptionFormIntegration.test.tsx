/**
 * Integration tests for ExceptionForm component with backend API.
 * Tests form submission, API response handling, error display, and field persistence.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../../theme'
import { ExceptionForm } from '../ExceptionForm'
import { apiClient } from '../../../services/apiClient'

// Mock the API client
jest.mock('../../../services/apiClient', () => ({
    apiClient: {
        getReviews: jest.fn(),
        getAssignableUsersList: jest.fn(),
        createException: jest.fn(),
        updateException: jest.fn(),
        getException: jest.fn(),
    }
}))

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

// Mock data
const mockReviews = {
    reviews: [
        {
            id: 1,
            client_id: 'TEST001',
            client_name: 'Test Client 1',
            status: 'submitted',
            client: { name: 'Test Client 1' }
        },
        {
            id: 2,
            client_id: 'TEST002',
            client_name: 'Test Client 2',
            status: 'under_review',
            client: { name: 'Test Client 2' }
        }
    ]
}

const mockUsers = [
    {
        id: 1,
        name: 'John Checker',
        email: 'john@example.com',
        role: 'Checker' as const
    },
    {
        id: 2,
        name: 'Jane Admin',
        email: 'jane@example.com',
        role: 'Admin' as const
    }
]

const mockCreatedException = {
    id: 123,
    review_id: 1,
    exception_type: 'DOCUMENTATION',
    title: 'Test Exception',
    description: 'Test description',
    priority: 'HIGH',
    status: 'OPEN',
    created_by: 1,
    created_by_name: 'Test User',
    assigned_to_name: 'John Checker',
    due_date: '2024-01-15T10:00:00Z',
    created_at: '2024-01-08T10:00:00Z',
    updated_at: '2024-01-08T10:00:00Z',
    is_open: true,
    is_high_priority: true,
    is_active: true,
    is_resolved: false,
    is_closed: false,
    is_in_progress: false,
    is_critical: false,
    is_overdue: false
}

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>
        {children}
    </ThemeProvider>
)

describe('ExceptionForm Integration Tests', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks()

        // Setup default mock responses
        mockApiClient.getReviews.mockResolvedValue(mockReviews)
        mockApiClient.getAssignableUsersList.mockResolvedValue(mockUsers)
    })

    describe('Exception Creation from Frontend Form', () => {
        it('should create exception with all frontend form fields', async () => {
            const user = userEvent.setup()
            const mockOnSave = jest.fn()

            mockApiClient.createException.mockResolvedValue(mockCreatedException)

            render(
                <TestWrapper>
                    <ExceptionForm onSave={mockOnSave} />
                </TestWrapper>
            )

            // Wait for form to load
            await waitFor(() => {
                expect(screen.getByLabelText(/select review/i)).toBeInTheDocument()
            })

            // Fill out the form with comprehensive data

            // Select review
            const reviewSelect = screen.getByLabelText(/select review/i)
            fireEvent.mouseDown(reviewSelect)
            await waitFor(() => {
                expect(screen.getByText(/Review #1 - Test Client 1/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Review #1 - Test Client 1/))

            // Fill title
            const titleInput = screen.getByLabelText(/exception title/i)
            await user.clear(titleInput)
            await user.type(titleInput, 'Missing KYC Documentation')

            // Select exception type
            const typeSelect = screen.getByLabelText(/exception type/i)
            fireEvent.mouseDown(typeSelect)
            await waitFor(() => {
                expect(screen.getByText(/Documentation Missing/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Documentation Missing/))

            // Fill description
            const descriptionInput = screen.getByLabelText(/description/i)
            await user.clear(descriptionInput)
            await user.type(descriptionInput, 'Client has not provided required identity verification documents for account opening compliance.')

            // Select priority
            const prioritySelect = screen.getByLabelText(/priority/i)
            fireEvent.mouseDown(prioritySelect)
            await waitFor(() => {
                expect(screen.getByText(/High/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/High/))

            // Assign to user
            const assignSelect = screen.getByLabelText(/assign to/i)
            fireEvent.mouseDown(assignSelect)
            await waitFor(() => {
                expect(screen.getByText(/John Checker/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/John Checker/))

            // Submit form
            const submitButton = screen.getByRole('button', { name: /create exception/i })
            fireEvent.click(submitButton)

            // Verify API call was made with correct data
            await waitFor(() => {
                expect(mockApiClient.createException).toHaveBeenCalledWith({
                    review_id: 1,
                    type: 'DOCUMENTATION',  // Frontend uses 'type' field
                    title: 'Missing KYC Documentation',
                    description: 'Client has not provided required identity verification documents for account opening compliance.',
                    priority: 'HIGH',
                    due_date: undefined  // Not set in this test
                })
            })

            // Verify success callback was called
            expect(mockOnSave).toHaveBeenCalledWith(123)
        })

        it('should handle API response format correctly', async () => {
            const user = userEvent.setup()

            mockApiClient.createException.mockResolvedValue(mockCreatedException)

            render(
                <TestWrapper>
                    <ExceptionForm />
                </TestWrapper>
            )

            // Wait for form to load and fill minimal required fields
            await waitFor(() => {
                expect(screen.getByLabelText(/select review/i)).toBeInTheDocument()
            })

            // Select review
            const reviewSelect = screen.getByLabelText(/select review/i)
            fireEvent.mouseDown(reviewSelect)
            await waitFor(() => {
                expect(screen.getByText(/Review #1 - Test Client 1/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Review #1 - Test Client 1/))

            // Fill required fields
            await user.type(screen.getByLabelText(/exception title/i), 'Test Exception')

            const typeSelect = screen.getByLabelText(/exception type/i)
            fireEvent.mouseDown(typeSelect)
            await waitFor(() => {
                expect(screen.getByText(/Documentation Missing/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Documentation Missing/))

            await user.type(screen.getByLabelText(/description/i), 'Test description for API response verification')

            // Submit form
            fireEvent.click(screen.getByRole('button', { name: /create exception/i }))

            // Verify success message appears (indicating API response was processed correctly)
            await waitFor(() => {
                expect(screen.getByText(/exception created successfully/i)).toBeInTheDocument()
            })
        })
    })

    describe('Error Message Display', () => {
        it('should display validation errors from API', async () => {
            const user = userEvent.setup()

            // Mock API to return validation error
            const validationError = {
                response: {
                    status: 422,
                    data: {
                        detail: [
                            {
                                loc: ['body', 'title'],
                                msg: 'ensure this value has at least 1 characters',
                                type: 'value_error.any_str.min_length'
                            }
                        ]
                    }
                }
            }

            mockApiClient.createException.mockRejectedValue(validationError)

            render(
                <TestWrapper>
                    <ExceptionForm />
                </TestWrapper>
            )

            // Wait for form to load
            await waitFor(() => {
                expect(screen.getByLabelText(/select review/i)).toBeInTheDocument()
            })

            // Fill form with invalid data (empty title)
            const reviewSelect = screen.getByLabelText(/select review/i)
            fireEvent.mouseDown(reviewSelect)
            await waitFor(() => {
                expect(screen.getByText(/Review #1 - Test Client 1/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Review #1 - Test Client 1/))

            // Leave title empty and fill other required fields
            const typeSelect = screen.getByLabelText(/exception type/i)
            fireEvent.mouseDown(typeSelect)
            await waitFor(() => {
                expect(screen.getByText(/Documentation Missing/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Documentation Missing/))

            await user.type(screen.getByLabelText(/description/i), 'Test description')

            // Submit form
            fireEvent.click(screen.getByRole('button', { name: /create exception/i }))

            // Verify error message is displayed
            await waitFor(() => {
                expect(screen.getByText(/failed to save exception/i)).toBeInTheDocument()
            })
        })

        it('should display network errors appropriately', async () => {
            const user = userEvent.setup()

            // Mock network error
            mockApiClient.createException.mockRejectedValue(new Error('Network error'))

            render(
                <TestWrapper>
                    <ExceptionForm />
                </TestWrapper>
            )

            // Fill and submit form
            await waitFor(() => {
                expect(screen.getByLabelText(/select review/i)).toBeInTheDocument()
            })

            const reviewSelect = screen.getByLabelText(/select review/i)
            fireEvent.mouseDown(reviewSelect)
            await waitFor(() => {
                expect(screen.getByText(/Review #1 - Test Client 1/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Review #1 - Test Client 1/))

            await user.type(screen.getByLabelText(/exception title/i), 'Test Exception')

            const typeSelect = screen.getByLabelText(/exception type/i)
            fireEvent.mouseDown(typeSelect)
            await waitFor(() => {
                expect(screen.getByText(/Documentation Missing/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Documentation Missing/))

            await user.type(screen.getByLabelText(/description/i), 'Test description')

            fireEvent.click(screen.getByRole('button', { name: /create exception/i }))

            // Verify error message is displayed
            await waitFor(() => {
                expect(screen.getByText(/failed to save exception/i)).toBeInTheDocument()
            })
        })
    })

    describe('Field Persistence and Retrieval', () => {
        it('should load and display existing exception data for editing', async () => {
            const existingException = {
                ...mockCreatedException,
                title: 'Existing Exception Title',
                description: 'Existing exception description',
                priority: 'CRITICAL',
                assigned_user_name: 'Jane Admin'
            }

            mockApiClient.getException.mockResolvedValue(existingException)

            render(
                <TestWrapper>
                    <ExceptionForm exceptionId={123} />
                </TestWrapper>
            )

            // Wait for data to load
            await waitFor(() => {
                expect(mockApiClient.getException).toHaveBeenCalledWith(123)
            })

            // Verify form fields are populated with existing data
            await waitFor(() => {
                expect(screen.getByDisplayValue('Existing Exception Title')).toBeInTheDocument()
                expect(screen.getByDisplayValue('Existing exception description')).toBeInTheDocument()
            })

            // Verify priority is selected
            expect(screen.getByText(/Critical/)).toBeInTheDocument()
        })

        it('should preserve all fields when updating exception', async () => {
            const user = userEvent.setup()

            const existingException = {
                ...mockCreatedException,
                title: 'Original Title',
                description: 'Original description'
            }

            const updatedException = {
                ...existingException,
                title: 'Updated Title',
                description: 'Updated description'
            }

            mockApiClient.getException.mockResolvedValue(existingException)
            mockApiClient.updateException.mockResolvedValue(updatedException)

            render(
                <TestWrapper>
                    <ExceptionForm exceptionId={123} />
                </TestWrapper>
            )

            // Wait for data to load
            await waitFor(() => {
                expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument()
            })

            // Update title
            const titleInput = screen.getByDisplayValue('Original Title')
            await user.clear(titleInput)
            await user.type(titleInput, 'Updated Title')

            // Update description
            const descriptionInput = screen.getByDisplayValue('Original description')
            await user.clear(descriptionInput)
            await user.type(descriptionInput, 'Updated description')

            // Submit form
            fireEvent.click(screen.getByRole('button', { name: /update exception/i }))

            // Verify API call was made with updated data
            await waitFor(() => {
                expect(mockApiClient.updateException).toHaveBeenCalledWith(123, {
                    review_id: 1,
                    type: 'DOCUMENTATION',
                    title: 'Updated Title',
                    description: 'Updated description',
                    priority: 'HIGH',
                    due_date: undefined
                })
            })
        })
    })

    describe('Form Validation', () => {
        it('should validate required fields before submission', async () => {
            render(
                <TestWrapper>
                    <ExceptionForm />
                </TestWrapper>
            )

            // Wait for form to load
            await waitFor(() => {
                expect(screen.getByLabelText(/select review/i)).toBeInTheDocument()
            })

            // Try to submit without filling required fields
            fireEvent.click(screen.getByRole('button', { name: /create exception/i }))

            // Verify validation error is shown
            await waitFor(() => {
                expect(screen.getByText(/please select a review/i)).toBeInTheDocument()
            })

            // Verify API was not called
            expect(mockApiClient.createException).not.toHaveBeenCalled()
        })

        it('should validate description length', async () => {
            const user = userEvent.setup()

            render(
                <TestWrapper>
                    <ExceptionForm />
                </TestWrapper>
            )

            // Wait for form to load
            await waitFor(() => {
                expect(screen.getByLabelText(/select review/i)).toBeInTheDocument()
            })

            // Select review
            const reviewSelect = screen.getByLabelText(/select review/i)
            fireEvent.mouseDown(reviewSelect)
            await waitFor(() => {
                expect(screen.getByText(/Review #1 - Test Client 1/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Review #1 - Test Client 1/))

            // Fill title
            await user.type(screen.getByLabelText(/exception title/i), 'Test Title')

            // Select type
            const typeSelect = screen.getByLabelText(/exception type/i)
            fireEvent.mouseDown(typeSelect)
            await waitFor(() => {
                expect(screen.getByText(/Documentation Missing/)).toBeInTheDocument()
            })
            fireEvent.click(screen.getByText(/Documentation Missing/))

            // Fill description with too short text
            await user.type(screen.getByLabelText(/description/i), 'Short')

            // Submit form
            fireEvent.click(screen.getByRole('button', { name: /create exception/i }))

            // Verify validation error
            await waitFor(() => {
                expect(screen.getByText(/description must be at least 10 characters long/i)).toBeInTheDocument()
            })
        })
    })

    describe('User Assignment', () => {
        it('should load and display assignable users', async () => {
            render(
                <TestWrapper>
                    <ExceptionForm />
                </TestWrapper>
            )

            // Wait for form to load
            await waitFor(() => {
                expect(mockApiClient.getAssignableUsersList).toHaveBeenCalled()
            })

            // Open assignment dropdown
            const assignSelect = screen.getByLabelText(/assign to/i)
            fireEvent.mouseDown(assignSelect)

            // Verify users are loaded
            await waitFor(() => {
                expect(screen.getByText(/John Checker/)).toBeInTheDocument()
                expect(screen.getByText(/Jane Admin/)).toBeInTheDocument()
            })
        })
    })
})