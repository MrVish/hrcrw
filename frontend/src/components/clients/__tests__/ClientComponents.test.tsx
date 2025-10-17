import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientList } from '../ClientList'
import { ClientDetail } from '../ClientDetail'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'
import type { Client, Review } from '../../../types'

// Mock the API client
const mockGetClients = vi.fn()
const mockGetClient = vi.fn()
const mockGetClientReviews = vi.fn()
const mockUpdateClient = vi.fn()

vi.mock('../../../services', () => ({
    apiClient: {
        getClients: () => mockGetClients(),
        getClient: (id: string) => mockGetClient(id),
        getClientReviews: (id: string) => mockGetClientReviews(id),
        updateClient: (id: string, data: any) => mockUpdateClient(id, data),
    },
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

const renderWithRouter = (component: React.ReactElement) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    )
}

// Define the Client interface as used in ClientList component
interface ClientListClient {
    client_id: string
    name: string
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW'
    country: string
    last_review_date: string | null
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW'
    review_count: number
    pending_reviews: number
    // Enhanced client fields
    domicile_branch?: string | null
    relationship_manager?: string | null
    business_unit?: string | null
    aml_risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | null
}

const mockListClients: ClientListClient[] = [
    {
        client_id: 'CLI001',
        name: 'Test Client 1',
        risk_level: 'HIGH',
        country: 'USA',
        status: 'ACTIVE',
        last_review_date: '2024-01-15T10:00:00Z',
        review_count: 5,
        pending_reviews: 1,
        domicile_branch: 'New York Branch',
        relationship_manager: 'John Smith',
        business_unit: 'Corporate Banking',
        aml_risk: 'HIGH'
    },
    {
        client_id: 'CLI002',
        name: 'Test Client 2',
        risk_level: 'MEDIUM',
        country: 'UK',
        status: 'UNDER_REVIEW',
        last_review_date: null,
        review_count: 2,
        pending_reviews: 0,
        domicile_branch: 'London Branch',
        relationship_manager: 'Jane Doe',
        business_unit: 'Private Banking',
        aml_risk: 'MEDIUM'
    }
]

const mockDetailClient: Client = {
    id: 1,
    client_id: 'CLI001',
    name: 'Test Client 1',
    risk_level: 'HIGH',
    country: 'USA',
    status: 'ACTIVE',
    last_review_date: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    is_high_risk: true,
    is_active: true,
    needs_review: false,
    domicile_branch: 'New York Branch',
    relationship_manager: 'John Smith',
    business_unit: 'Corporate Banking',
    aml_risk: 'HIGH'
}

const mockReviews: Review[] = [
    {
        id: 1,
        client_id: 'CLI001',
        submitted_by: 1,
        reviewed_by: 2,
        status: 'APPROVED',
        comments: 'Review approved',
        rejection_reason: null,
        submitted_at: '2024-01-15T10:00:00Z',
        reviewed_at: '2024-01-15T12:00:00Z',
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T12:00:00Z',
        is_draft: false,
        is_submitted: false,
        is_pending_review: false,
        is_completed: true,
        is_approved: true,
        is_rejected: false
    }
]

describe('Enhanced Client Components', () => {
    const user = userEvent.setup()

    beforeEach(() => {
        vi.clearAllMocks()
        mockGetClients.mockResolvedValue({
            clients: mockListClients
        })
        mockGetClient.mockResolvedValue(mockDetailClient)
        mockGetClientReviews.mockResolvedValue(mockReviews)
        mockUpdateClient.mockResolvedValue(mockDetailClient)
    })

    describe('ClientList', () => {
        it('displays enhanced client fields in list view', async () => {
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Check if enhanced fields are displayed
            expect(screen.getByText('CLI001')).toBeInTheDocument()
            expect(screen.getByText('HIGH')).toBeInTheDocument()
            expect(screen.getByText('USA')).toBeInTheDocument()
            expect(screen.getByText('ACTIVE')).toBeInTheDocument()
        })

        it('allows filtering by new enhanced fields', async () => {
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Open filters
            const filtersButton = screen.getByText('Filters')
            await user.click(filtersButton)

            // Check that filter options are available
            expect(screen.getByDisplayValue('All Risk Levels')).toBeInTheDocument()
            expect(screen.getByDisplayValue('All Countries')).toBeInTheDocument()
            expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument()
        })

        it('handles search functionality for client names and IDs', async () => {
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            const searchInput = screen.getByPlaceholderText('Search by client name or ID...')
            expect(searchInput).toBeInTheDocument()

            await user.type(searchInput, 'CLI001')

            // Should filter results
            await waitFor(() => {
                expect(screen.getByText('High-Risk Clients (1 of 2)')).toBeInTheDocument()
            })
        })

        it('shows loading and error states correctly', async () => {
            // Test loading state
            mockGetClients.mockImplementation(() => new Promise(() => { })) // Never resolves
            renderWithRouter(<ClientList />)
            expect(screen.getByText('Loading clients...')).toBeInTheDocument()

            // Test error state
            mockGetClients.mockRejectedValue(new Error('API Error'))
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Failed to load clients')).toBeInTheDocument()
            })
        })
    })

    describe('ClientDetail', () => {
        const mockOnBack = vi.fn()

        it('displays enhanced client information correctly', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            // Wait for the component to load and display client data
            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Check basic information
            expect(screen.getByText('CLI001')).toBeInTheDocument()
            expect(screen.getByText('HIGH Risk')).toBeInTheDocument()
            expect(screen.getByText('ACTIVE')).toBeInTheDocument()

            // Check enhanced fields
            expect(screen.getByText('New York Branch')).toBeInTheDocument()
            expect(screen.getByText('John Smith')).toBeInTheDocument()
            expect(screen.getByText('Corporate Banking')).toBeInTheDocument()
        })

        it('handles null enhanced fields correctly', async () => {
            const clientWithNulls = {
                ...mockDetailClient,
                domicile_branch: null,
                relationship_manager: null,
                business_unit: null,
                aml_risk: null
            }
            mockGetClient.mockResolvedValue(clientWithNulls)

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Check that null fields show appropriate defaults
            expect(screen.getByText('Not specified')).toBeInTheDocument() // domicile_branch
            expect(screen.getByText('Not assigned')).toBeInTheDocument() // relationship_manager
            expect(screen.getByText('Not assessed')).toBeInTheDocument() // aml_risk
        })

        it('enables editing mode for enhanced fields', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Click edit button
            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Check that form fields are displayed with current values
            expect(screen.getByDisplayValue('Test Client 1')).toBeInTheDocument()
            expect(screen.getByDisplayValue('New York Branch')).toBeInTheDocument()
            expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument()
            expect(screen.getByDisplayValue('Corporate Banking')).toBeInTheDocument()
        })

        it('validates enhanced field inputs during editing', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Click edit button
            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Clear required field
            const nameInput = screen.getByDisplayValue('Test Client 1')
            await user.clear(nameInput)

            // Try to save
            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            // Should show validation error
            await waitFor(() => {
                expect(screen.getByText('Client name is required')).toBeInTheDocument()
            })
        })

        it('successfully updates enhanced client fields', async () => {
            const updatedClient = {
                ...mockDetailClient,
                domicile_branch: 'Updated Branch'
            }
            mockUpdateClient.mockResolvedValue(updatedClient)

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Click edit button
            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Update field
            const domicileBranchInput = screen.getByDisplayValue('New York Branch')
            await user.clear(domicileBranchInput)
            await user.type(domicileBranchInput, 'Updated Branch')

            // Save changes
            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            // Should call update API
            await waitFor(() => {
                expect(mockUpdateClient).toHaveBeenCalledWith('CLI001', expect.objectContaining({
                    domicile_branch: 'Updated Branch'
                }))
            })
        })

        it('handles API errors during update', async () => {
            mockUpdateClient.mockRejectedValue({
                response: {
                    data: {
                        detail: 'Update failed'
                    }
                }
            })

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Click edit button
            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Try to save
            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            // Should show error message
            await waitFor(() => {
                expect(screen.getByText('Failed to update client: Update failed')).toBeInTheDocument()
            })
        })

        it('navigates correctly when buttons are clicked', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Test back button
            const backButton = screen.getByText('Back to Clients')
            await user.click(backButton)
            expect(mockOnBack).toHaveBeenCalled()

            // Test create review button
            const createReviewButton = screen.getByText('Create Review')
            await user.click(createReviewButton)
            expect(mockNavigate).toHaveBeenCalledWith('/reviews/create?client_id=CLI001')
        })
    })
})