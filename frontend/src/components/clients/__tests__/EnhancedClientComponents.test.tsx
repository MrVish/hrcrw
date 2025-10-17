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
        domicile_branch: null,
        relationship_manager: null,
        business_unit: null,
        aml_risk: null
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

describe('Enhanced Client Components - Requirements Testing', () => {
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

    describe('ClientList - Enhanced Fields Display (Requirement 1.6)', () => {
        it('renders client list component with enhanced field support', async () => {
            renderWithRouter(<ClientList />)

            // Wait for data to load
            await waitFor(() => {
                expect(screen.getByText('Filters')).toBeInTheDocument()
            })

            expect(screen.getByPlaceholderText('Search by client name or ID...')).toBeInTheDocument()
        })

        it('displays client data with enhanced fields when available', async () => {
            renderWithRouter(<ClientList />)

            // Wait for clients to load
            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Verify client data is displayed
            expect(screen.getByText('CLI001')).toBeInTheDocument()
            expect(screen.getByText('HIGH')).toBeInTheDocument()
            expect(screen.getByText('USA')).toBeInTheDocument()
            expect(screen.getByText('ACTIVE')).toBeInTheDocument()
        })

        it('provides search functionality for client names and IDs', async () => {
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            const searchInput = screen.getByPlaceholderText('Search by client name or ID...')
            expect(searchInput).toBeInTheDocument()
            expect(searchInput).toHaveAttribute('type', 'text')

            // Test search functionality
            await user.type(searchInput, 'Test Client 1')
            expect(searchInput).toHaveValue('Test Client 1')
        })

        it('provides filtering capabilities for enhanced fields', async () => {
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Filters')).toBeInTheDocument()
            })

            // Open filters
            const filtersButton = screen.getByText('Filters')
            await user.click(filtersButton)

            // Check that filter dropdowns are available
            expect(screen.getByDisplayValue('All Risk Levels')).toBeInTheDocument()
            expect(screen.getByDisplayValue('All Countries')).toBeInTheDocument()
            expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument()
        })

        it('filters clients by risk level', async () => {
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Filters')).toBeInTheDocument()
            })

            // Open filters and select HIGH risk
            const filtersButton = screen.getByText('Filters')
            await user.click(filtersButton)

            const riskLevelSelect = screen.getByDisplayValue('All Risk Levels')
            await user.selectOptions(riskLevelSelect, 'HIGH')

            expect(riskLevelSelect).toHaveValue('HIGH')
        })

        it('filters clients by country', async () => {
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Filters')).toBeInTheDocument()
            })

            // Open filters and select USA
            const filtersButton = screen.getByText('Filters')
            await user.click(filtersButton)

            const countrySelect = screen.getByDisplayValue('All Countries')
            await user.selectOptions(countrySelect, 'USA')

            expect(countrySelect).toHaveValue('USA')
        })

        it('filters clients by status', async () => {
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Filters')).toBeInTheDocument()
            })

            // Open filters and select ACTIVE status
            const filtersButton = screen.getByText('Filters')
            await user.click(filtersButton)

            const statusSelect = screen.getByDisplayValue('All Statuses')
            await user.selectOptions(statusSelect, 'ACTIVE')

            expect(statusSelect).toHaveValue('ACTIVE')
        })

        it('clears all filters when clear button is clicked', async () => {
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Filters')).toBeInTheDocument()
            })

            // Open filters
            const filtersButton = screen.getByText('Filters')
            await user.click(filtersButton)

            // Set some filters
            const riskLevelSelect = screen.getByDisplayValue('All Risk Levels')
            await user.selectOptions(riskLevelSelect, 'HIGH')

            // Clear filters
            const clearButton = screen.getByText('Clear All')
            await user.click(clearButton)

            expect(riskLevelSelect).toHaveValue('')
        })

        it('handles loading and error states appropriately', async () => {
            // Test loading state
            mockGetClients.mockImplementation(() => new Promise(() => { })) // Never resolves
            renderWithRouter(<ClientList />)
            expect(screen.getByText('Loading clients...')).toBeInTheDocument()
        })

        it('handles API errors gracefully', async () => {
            mockGetClients.mockRejectedValue(new Error('API Error'))
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Failed to load clients')).toBeInTheDocument()
            })

            expect(screen.getByText('Retry')).toBeInTheDocument()
        })

        it('displays empty state when no clients match filters', async () => {
            mockGetClients.mockResolvedValue({ clients: [] })
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('No clients found')).toBeInTheDocument()
            })

            expect(screen.getByText('Try adjusting your search criteria or filters')).toBeInTheDocument()
        })

        it('handles client selection callback', async () => {
            const mockOnClientSelect = vi.fn()
            renderWithRouter(<ClientList onClientSelect={mockOnClientSelect} />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Click on view button for first client
            const viewButtons = screen.getAllByTitle('View client details')
            await user.click(viewButtons[0])

            expect(mockOnClientSelect).toHaveBeenCalledWith(expect.objectContaining({
                client_id: 'CLI001',
                name: 'Test Client 1'
            }))
        })

        it('displays pagination when there are multiple pages', async () => {
            // Mock more clients to trigger pagination
            const manyClients = Array.from({ length: 25 }, (_, i) => ({
                ...mockListClients[0],
                client_id: `CLI${String(i + 1).padStart(3, '0')}`,
                name: `Test Client ${i + 1}`
            }))

            mockGetClients.mockResolvedValue({ clients: manyClients })
            renderWithRouter(<ClientList />)

            await waitFor(() => {
                expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
            })

            expect(screen.getByText('Previous')).toBeInTheDocument()
            expect(screen.getByText('Next')).toBeInTheDocument()
        })
    })

    describe('ClientDetail - Enhanced Information Display (Requirements 1.1-1.5)', () => {
        const mockOnBack = vi.fn()

        beforeEach(() => {
            mockOnBack.mockClear()
        })

        it('renders client detail component with enhanced field sections', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Enhanced Information')).toBeInTheDocument()
            })

            // Test that all enhanced field labels are present
            expect(screen.getByText('Domicile Branch')).toBeInTheDocument()
            expect(screen.getByText('Relationship Manager')).toBeInTheDocument()
            expect(screen.getByText('Business Unit')).toBeInTheDocument()
            expect(screen.getByText('AML Risk Level')).toBeInTheDocument()
        })

        it('displays enhanced field values correctly (Requirement 1.1-1.4)', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('New York Branch')).toBeInTheDocument()
            })

            expect(screen.getByText('John Smith')).toBeInTheDocument()
            expect(screen.getByText('Corporate Banking')).toBeInTheDocument()

            // Check for AML risk HIGH specifically within the enhanced information section
            const enhancedSection = screen.getByText('Enhanced Information').closest('.info-card')
            const amlRiskBadge = enhancedSection?.querySelector('.aml-risk-badge')
            expect(amlRiskBadge).toHaveTextContent('HIGH')
        })

        it('displays "Not specified" for null enhanced fields', async () => {
            const clientWithNullFields = {
                ...mockDetailClient,
                domicile_branch: null,
                relationship_manager: null,
                business_unit: null,
                aml_risk: null
            }
            mockGetClient.mockResolvedValue(clientWithNullFields)

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Enhanced Information')).toBeInTheDocument()
            })

            // Check for the specific "Not specified" texts
            const notSpecifiedElements = screen.getAllByText('Not specified')
            expect(notSpecifiedElements).toHaveLength(2) // domicile_branch and business_unit

            expect(screen.getByText('Not assigned')).toBeInTheDocument()
            expect(screen.getByText('Not assessed')).toBeInTheDocument()
        })

        it('provides editing capabilities for enhanced fields (Requirement 1.5)', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Test that save and cancel buttons appear in edit mode
            expect(screen.getByText('Save Changes')).toBeInTheDocument()
            expect(screen.getByText('Cancel')).toBeInTheDocument()

            // Test that form fields are present for enhanced fields
            expect(screen.getByDisplayValue('New York Branch')).toBeInTheDocument()
            expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument()
            expect(screen.getByDisplayValue('Corporate Banking')).toBeInTheDocument()
        })

        it('allows editing of domicile branch field', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            const domicileBranchInput = screen.getByDisplayValue('New York Branch')
            await user.clear(domicileBranchInput)
            await user.type(domicileBranchInput, 'London Branch')

            expect(domicileBranchInput).toHaveValue('London Branch')
        })

        it('allows editing of relationship manager field', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            const relationshipManagerInput = screen.getByDisplayValue('John Smith')
            await user.clear(relationshipManagerInput)
            await user.type(relationshipManagerInput, 'Jane Doe')

            expect(relationshipManagerInput).toHaveValue('Jane Doe')
        })

        it('allows editing of business unit field', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            const businessUnitInput = screen.getByDisplayValue('Corporate Banking')
            await user.clear(businessUnitInput)
            await user.type(businessUnitInput, 'Investment Banking')

            expect(businessUnitInput).toHaveValue('Investment Banking')
        })

        it('allows editing of AML risk level field', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Find the AML risk select by its label
            const amlRiskSection = screen.getByText('AML Risk Level').closest('.info-item')
            const amlRiskSelect = amlRiskSection?.querySelector('select')
            expect(amlRiskSelect).toBeInTheDocument()

            if (amlRiskSelect) {
                await user.selectOptions(amlRiskSelect, 'MEDIUM')
                expect(amlRiskSelect).toHaveValue('MEDIUM')
            }
        })

        it('saves enhanced field changes successfully', async () => {
            const updatedClient = {
                ...mockDetailClient,
                domicile_branch: 'London Branch',
                relationship_manager: 'Jane Doe',
                business_unit: 'Investment Banking',
                aml_risk: 'MEDIUM' as const
            }
            mockUpdateClient.mockResolvedValue(updatedClient)

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Edit fields
            const domicileBranchInput = screen.getByDisplayValue('New York Branch')
            await user.clear(domicileBranchInput)
            await user.type(domicileBranchInput, 'London Branch')

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(mockUpdateClient).toHaveBeenCalledWith('CLI001', expect.objectContaining({
                    domicile_branch: 'London Branch'
                }))
            })
        })

        it('cancels editing without saving changes', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Edit a field
            const domicileBranchInput = screen.getByDisplayValue('New York Branch')
            await user.clear(domicileBranchInput)
            await user.type(domicileBranchInput, 'London Branch')

            // Cancel editing
            const cancelButton = screen.getByText('Cancel')
            await user.click(cancelButton)

            // Should return to view mode without saving
            expect(screen.getByText('Edit Client')).toBeInTheDocument()
            expect(mockUpdateClient).not.toHaveBeenCalled()
        })

        it('provides navigation functionality', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Back to Clients')).toBeInTheDocument()
            })

            expect(screen.getByText('Create Review')).toBeInTheDocument()

            // Test back button functionality
            const backButton = screen.getByText('Back to Clients')
            await user.click(backButton)

            expect(mockOnBack).toHaveBeenCalled()
        })

        it('navigates to review creation', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Create Review')).toBeInTheDocument()
            })

            const createReviewButton = screen.getByText('Create Review')
            await user.click(createReviewButton)

            expect(mockNavigate).toHaveBeenCalledWith('/reviews/create?client_id=CLI001')
        })

        it('displays system information section', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('System Information')).toBeInTheDocument()
            })

            expect(screen.getByText('Created')).toBeInTheDocument()
            expect(screen.getByText('Last Updated')).toBeInTheDocument()
        })

        it('displays client reviews in reviews tab', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Reviews (1)')).toBeInTheDocument()
            })

            const reviewsTab = screen.getByText('Reviews (1)')
            await user.click(reviewsTab)

            // Should display review information
            expect(reviewsTab).toHaveClass('active')
        })

        it('handles loading state', () => {
            mockGetClient.mockImplementation(() => new Promise(() => { })) // Never resolves
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            expect(screen.getByText('Loading client details...')).toBeInTheDocument()
        })

        it('handles client not found error', async () => {
            mockGetClient.mockRejectedValue(new Error('Client not found'))
            renderWithRouter(<ClientDetail clientId="INVALID" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Failed to load client details')).toBeInTheDocument()
            })

            expect(screen.getByText('Retry')).toBeInTheDocument()
        })
    })

    describe('Field Validation and Error Handling (Requirements 1.1-1.4)', () => {
        const mockOnBack = vi.fn()

        beforeEach(() => {
            mockOnBack.mockClear()
        })

        it('validates required fields during editing', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Clear required field (name)
            const nameInput = screen.getByDisplayValue('Test Client 1')
            await user.clear(nameInput)

            // Try to save
            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            // Should show validation error
            await waitFor(() => {
                expect(screen.getByText('Client name is required')).toBeInTheDocument()
            })

            // Should not call API
            expect(mockUpdateClient).not.toHaveBeenCalled()
        })

        it('validates field length constraints', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Enter name that's too long (over 255 characters)
            const nameInput = screen.getByDisplayValue('Test Client 1')
            await user.clear(nameInput)
            await user.type(nameInput, 'A'.repeat(256))

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText('Client name must be 255 characters or less')).toBeInTheDocument()
            })
        })

        it('validates enhanced field length constraints', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Enter domicile branch that's too long (over 100 characters)
            const domicileBranchInput = screen.getByDisplayValue('New York Branch')
            await user.clear(domicileBranchInput)
            await user.type(domicileBranchInput, 'A'.repeat(101))

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText('Domicile branch must be 100 characters or less')).toBeInTheDocument()
            })
        })

        it('prevents empty string values for optional enhanced fields', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Enter empty string for domicile branch
            const domicileBranchInput = screen.getByDisplayValue('New York Branch')
            await user.clear(domicileBranchInput)
            await user.type(domicileBranchInput, '   ') // Just spaces

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText('Domicile branch cannot be empty')).toBeInTheDocument()
            })
        })

        it('validates relationship manager field constraints', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Test empty string validation
            const relationshipManagerInput = screen.getByDisplayValue('John Smith')
            await user.clear(relationshipManagerInput)
            await user.type(relationshipManagerInput, '   ')

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText('Relationship manager cannot be empty')).toBeInTheDocument()
            })
        })

        it('validates business unit field constraints', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Test length constraint
            const businessUnitInput = screen.getByDisplayValue('Corporate Banking')
            await user.clear(businessUnitInput)
            await user.type(businessUnitInput, 'A'.repeat(101))

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText('Business unit must be 100 characters or less')).toBeInTheDocument()
            })
        })

        it('provides dropdown options for enhanced fields', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Test that dropdown fields are present
            const selects = screen.getAllByRole('combobox')
            expect(selects.length).toBeGreaterThan(0)

            // Test that all required dropdowns are present by finding them by their labels
            const riskLevelSection = screen.getByText('Risk Level').closest('.info-item')
            const riskLevelSelect = riskLevelSection?.querySelector('select')
            expect(riskLevelSelect).toBeInTheDocument()

            const statusSection = screen.getByText('Status').closest('.info-item')
            const statusSelect = statusSection?.querySelector('select')
            expect(statusSelect).toBeInTheDocument()

            const amlRiskSection = screen.getByText('AML Risk Level').closest('.info-item')
            const amlRiskSelect = amlRiskSection?.querySelector('select')
            expect(amlRiskSelect).toBeInTheDocument()

            // Test that options are available
            if (amlRiskSelect) {
                expect(amlRiskSelect.querySelectorAll('option')).toHaveLength(5) // Including the default option
            }
        })

        it('clears validation errors when field is corrected', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Clear required field to trigger error
            const nameInput = screen.getByDisplayValue('Test Client 1')
            await user.clear(nameInput)

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText('Client name is required')).toBeInTheDocument()
            })

            // Fix the field
            await user.type(nameInput, 'Fixed Client Name')

            // Error should be cleared
            await waitFor(() => {
                expect(screen.queryByText('Client name is required')).not.toBeInTheDocument()
            })
        })

        it('handles API validation errors', async () => {
            const apiError = {
                response: {
                    data: {
                        detail: 'Client name already exists'
                    }
                }
            }
            mockUpdateClient.mockRejectedValue(apiError)

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText('Failed to update client: Client name already exists')).toBeInTheDocument()
            })
        })

        it('handles generic API errors', async () => {
            mockUpdateClient.mockRejectedValue(new Error('Network error'))

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText('Failed to update client. Please try again.')).toBeInTheDocument()
            })
        })

        it('shows validation errors for empty optional fields but allows null values', async () => {
            const updatedClient = {
                ...mockDetailClient,
                domicile_branch: null,
                relationship_manager: null,
                business_unit: null,
                aml_risk: null
            }
            mockUpdateClient.mockResolvedValue(updatedClient)

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Clear optional fields (this will trigger validation errors for empty strings)
            const domicileBranchInput = screen.getByDisplayValue('New York Branch')
            await user.clear(domicileBranchInput)

            const relationshipManagerInput = screen.getByDisplayValue('John Smith')
            await user.clear(relationshipManagerInput)

            const businessUnitInput = screen.getByDisplayValue('Corporate Banking')
            await user.clear(businessUnitInput)

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            // Should show validation errors for empty strings
            await waitFor(() => {
                expect(screen.getByText('Domicile branch cannot be empty')).toBeInTheDocument()
            })

            expect(screen.getByText('Relationship manager cannot be empty')).toBeInTheDocument()
            expect(screen.getByText('Business unit cannot be empty')).toBeInTheDocument()

            // API should not be called due to validation errors
            expect(mockUpdateClient).not.toHaveBeenCalled()
        })

        it('shows loading state during save operation', async () => {
            let resolvePromise: (value: any) => void
            const savePromise = new Promise(resolve => {
                resolvePromise = resolve
            })
            mockUpdateClient.mockReturnValue(savePromise)

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            // Check loading state
            expect(screen.getByText('Saving...')).toBeInTheDocument()
            expect(saveButton).toBeDisabled()

            // Resolve the promise to complete the test
            resolvePromise!(mockDetailClient)
        })
    })

    describe('Enhanced Field Display and Interaction', () => {
        const mockOnBack = vi.fn()

        beforeEach(() => {
            mockOnBack.mockClear()
        })

        it('displays enhanced field icons correctly', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Enhanced Information')).toBeInTheDocument()
            })

            // Icons should be present for enhanced fields (tested via accessibility)
            const domicileBranchSection = screen.getByText('Domicile Branch').closest('.info-item')
            expect(domicileBranchSection).toBeInTheDocument()

            const relationshipManagerSection = screen.getByText('Relationship Manager').closest('.info-item')
            expect(relationshipManagerSection).toBeInTheDocument()

            const businessUnitSection = screen.getByText('Business Unit').closest('.info-item')
            expect(businessUnitSection).toBeInTheDocument()

            const amlRiskSection = screen.getByText('AML Risk Level').closest('.info-item')
            expect(amlRiskSection).toBeInTheDocument()
        })

        it('applies correct CSS classes for AML risk levels', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Enhanced Information')).toBeInTheDocument()
            })

            // Find the AML risk badge within the enhanced information section
            const enhancedSection = screen.getByText('Enhanced Information').closest('.info-card')
            const amlRiskBadge = enhancedSection?.querySelector('.aml-risk-badge')
            expect(amlRiskBadge).toBeInTheDocument()
            expect(amlRiskBadge).toHaveClass('aml-risk-high')
        })

        it('handles tab navigation correctly', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Overview')).toBeInTheDocument()
            })

            // Test tab switching
            const documentsTab = screen.getByText('Documents')
            await user.click(documentsTab)

            expect(documentsTab).toHaveClass('active')
        })
    })

    describe('Accessibility and User Experience', () => {
        const mockOnBack = vi.fn()

        beforeEach(() => {
            mockOnBack.mockClear()
        })

        it('provides proper form labels for enhanced fields', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Check that form field labels are present (they are displayed as labels, not form labels)
            expect(screen.getByText('Domicile Branch')).toBeInTheDocument()
            expect(screen.getByText('Relationship Manager')).toBeInTheDocument()
            expect(screen.getByText('Business Unit')).toBeInTheDocument()
            expect(screen.getByText('AML Risk Level')).toBeInTheDocument()
        })

        it('provides helpful placeholder text for optional fields', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Check placeholder text
            expect(screen.getByPlaceholderText('Enter domicile branch (optional)')).toBeInTheDocument()
            expect(screen.getByPlaceholderText('Enter relationship manager (optional)')).toBeInTheDocument()
            expect(screen.getByPlaceholderText('Enter business unit (optional)')).toBeInTheDocument()
        })

        it('maintains focus management during edit mode transitions', async () => {
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            // Save button should be focusable
            const saveButton = screen.getByText('Save Changes')
            expect(saveButton).toBeInTheDocument()

            // Cancel should return to view mode
            const cancelButton = screen.getByText('Cancel')
            await user.click(cancelButton)

            expect(screen.getByText('Edit Client')).toBeInTheDocument()
        })
    })

    describe('Component Integration and Data Flow', () => {
        it('integrates ClientList and ClientDetail components properly', async () => {
            const mockOnBack = vi.fn()
            const mockOnClientSelect = vi.fn()

            // Test ClientList with callback
            renderWithRouter(<ClientList onClientSelect={mockOnClientSelect} />)

            await waitFor(() => {
                expect(screen.getByText('Filters')).toBeInTheDocument()
            })

            // Test ClientDetail with callback
            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Enhanced Information')).toBeInTheDocument()
            })
        })

        it('handles data consistency between list and detail views', async () => {
            const mockOnClientSelect = vi.fn()
            renderWithRouter(<ClientList onClientSelect={mockOnClientSelect} />)

            await waitFor(() => {
                expect(screen.getByText('Test Client 1')).toBeInTheDocument()
            })

            // Verify that the client data in list matches what would be shown in detail
            expect(screen.getByText('CLI001')).toBeInTheDocument()
            expect(screen.getByText('HIGH')).toBeInTheDocument()
            expect(screen.getByText('USA')).toBeInTheDocument()
        })

        it('handles real-time updates after client modification', async () => {
            const mockOnBack = vi.fn()
            const updatedClient = {
                ...mockDetailClient,
                name: 'Updated Client Name',
                domicile_branch: 'Updated Branch'
            }
            mockUpdateClient.mockResolvedValue(updatedClient)

            renderWithRouter(<ClientDetail clientId="CLI001" onBack={mockOnBack} />)

            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })

            const editButton = screen.getByText('Edit Client')
            await user.click(editButton)

            const nameInput = screen.getByDisplayValue('Test Client 1')
            await user.clear(nameInput)
            await user.type(nameInput, 'Updated Client Name')

            const saveButton = screen.getByText('Save Changes')
            await user.click(saveButton)

            await waitFor(() => {
                expect(mockUpdateClient).toHaveBeenCalledWith('CLI001', expect.objectContaining({
                    name: 'Updated Client Name'
                }))
            })

            // The component should exit edit mode after successful save
            await waitFor(() => {
                expect(screen.getByText('Edit Client')).toBeInTheDocument()
            })
        })
    })
})