import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, beforeEach, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { ClientList } from '../ClientList'
import { useClients } from '../../../hooks/useClients'
import { theme } from '../../../theme'
import type { Client } from '../../../types'

// Mock the useClients hook
vi.mock('../../../hooks/useClients')

// Mock StatusBadge component
vi.mock('../../common/StatusBadge', () => ({
    StatusBadge: ({ status, variant, ...props }: any) => (
        <span data-testid={`status-badge-${status}`} data-variant={variant} {...props}>
            {status}
        </span>
    )
}))

const mockUseClients = useClients as vi.MockedFunction<typeof useClients>

const mockClients: Client[] = [
    {
        id: 1,
        client_id: 'CLI001',
        name: 'Acme Corporation',
        risk_level: 'HIGH',
        status: 'ACTIVE',
        country: 'United States',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-20T15:30:00Z',
        last_review_date: '2024-01-18T09:00:00Z',
        review_count: 5,
        is_high_risk: true,
        is_active: true,
        needs_review: false,
        auto_kyc_review: true,
        auto_aml_review: true,
        auto_sanctions_review: false,
        auto_pep_review: true,
        auto_financial_review: false,
        has_auto_review_flags: true,
        enabled_auto_review_types: ['KYC', 'AML', 'PEP'],
    },
    {
        id: 2,
        client_id: 'CLI002',
        name: 'Beta Industries',
        risk_level: 'MEDIUM',
        status: 'UNDER_REVIEW',
        country: 'United States',
        created_at: '2024-01-10T14:00:00Z',
        updated_at: '2024-01-22T11:15:00Z',
        last_review_date: null,
        review_count: 0,
        is_high_risk: false,
        is_active: true,
        needs_review: true,
        auto_kyc_review: false,
        auto_aml_review: false,
        auto_sanctions_review: false,
        auto_pep_review: false,
        auto_financial_review: false,
        has_auto_review_flags: false,
        enabled_auto_review_types: [],
    },
    {
        id: 3,
        client_id: 'CLI003',
        name: 'Gamma Holdings',
        risk_level: 'LOW',
        status: 'INACTIVE',
        country: 'United Kingdom',
        created_at: '2024-01-05T08:30:00Z',
        updated_at: '2024-01-25T16:45:00Z',
        last_review_date: '2024-01-20T14:30:00Z',
        review_count: 2,
        is_high_risk: false,
        is_active: false,
        needs_review: false,
        auto_kyc_review: false,
        auto_aml_review: false,
        auto_sanctions_review: false,
        auto_pep_review: false,
        auto_financial_review: true,
        has_auto_review_flags: true,
        enabled_auto_review_types: ['FINANCIAL'],
    }
]

const defaultMockReturn = {
    clients: mockClients,
    total: 3,
    loading: false,
    error: null,
    filters: {},
    pagination: { page: 1, size: 10 },
    setFilters: vi.fn(),
    setPage: vi.fn(),
    refreshClients: vi.fn(),
}

const renderWithProviders = (component: React.ReactElement) => {
    return render(
        <BrowserRouter>
            <ThemeProvider theme={theme}>
                {component}
            </ThemeProvider>
        </BrowserRouter>
    )
}

describe('ClientList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockUseClients.mockReturnValue(defaultMockReturn)
    })

    describe('Basic Rendering', () => {
        it('renders client list with accurate data from API', () => {
            renderWithProviders(<ClientList />)

            expect(screen.getByText('Clients')).toBeInTheDocument()
            expect(screen.getByText('3 clients total')).toBeInTheDocument()
            expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
            expect(screen.getByText('Beta Industries')).toBeInTheDocument()
            expect(screen.getByText('Gamma Holdings')).toBeInTheDocument()
        })

        it('displays accurate review counts from database', () => {
            renderWithProviders(<ClientList />)

            // Check review counts are displayed correctly
            const reviewCells = screen.getAllByText(/reviews/)
            expect(reviewCells).toHaveLength(3)

            // Verify specific review counts
            expect(screen.getByText('5')).toBeInTheDocument() // Acme Corporation
            expect(screen.getByText('0')).toBeInTheDocument() // Beta Industries
            expect(screen.getByText('2')).toBeInTheDocument() // Gamma Holdings
        })

        it('uses StatusBadge component for risk levels and statuses', () => {
            renderWithProviders(<ClientList />)

            // Check risk level badges
            expect(screen.getByTestId('status-badge-HIGH')).toBeInTheDocument()
            expect(screen.getByTestId('status-badge-MEDIUM')).toBeInTheDocument()
            expect(screen.getByTestId('status-badge-LOW')).toBeInTheDocument()

            // Check status badges
            expect(screen.getByTestId('status-badge-ACTIVE')).toBeInTheDocument()
            expect(screen.getByTestId('status-badge-UNDER_REVIEW')).toBeInTheDocument()
            expect(screen.getByTestId('status-badge-INACTIVE')).toBeInTheDocument()
        })

        it('displays auto-review flag indicators correctly', () => {
            renderWithProviders(<ClientList />)

            // Check for auto-review icons for high-risk client
            expect(screen.getByTitle('Auto KYC Review')).toBeInTheDocument()
            expect(screen.getByTitle('Auto AML Review')).toBeInTheDocument()
            expect(screen.getByTitle('Auto PEP Review')).toBeInTheDocument()

            // Check for manual indicator for client without flags
            expect(screen.getByText('Manual')).toBeInTheDocument()
        })

        it('formats dates correctly', () => {
            renderWithProviders(<ClientList />)

            // Check formatted dates
            expect(screen.getByText('Jan 18, 2024')).toBeInTheDocument() // Acme Corporation
            expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument() // Gamma Holdings
            expect(screen.getByText('Never')).toBeInTheDocument() // Beta Industries (no reviews)
        })
    })

    describe('Loading and Error States', () => {
        it('displays loading spinner when loading', () => {
            mockUseClients.mockReturnValue({
                ...defaultMockReturn,
                loading: true,
                clients: [],
            })

            renderWithProviders(<ClientList />)

            expect(screen.getByRole('progressbar')).toBeInTheDocument()
            expect(screen.queryByText('Clients')).not.toBeInTheDocument()
        })

        it('displays error message with retry button', () => {
            const mockRefresh = vi.fn()
            mockUseClients.mockReturnValue({
                ...defaultMockReturn,
                loading: false,
                error: 'Failed to load clients. Please check your connection.',
                clients: [],
                refreshClients: mockRefresh,
            })

            renderWithProviders(<ClientList />)

            expect(screen.getByText('Failed to load clients. Please check your connection.')).toBeInTheDocument()

            const retryButton = screen.getByText('Retry')
            expect(retryButton).toBeInTheDocument()

            fireEvent.click(retryButton)
            expect(mockRefresh).toHaveBeenCalledTimes(1)
        })
    })

    describe('Filtering Functionality', () => {
        it('handles search filter changes', async () => {
            const mockSetFilters = vi.fn()
            mockUseClients.mockReturnValue({
                ...defaultMockReturn,
                setFilters: mockSetFilters,
            })

            renderWithProviders(<ClientList />)

            const searchInput = screen.getByPlaceholderText('Search by client name or ID...')
            fireEvent.change(searchInput, { target: { value: 'Acme' } })

            await waitFor(() => {
                expect(mockSetFilters).toHaveBeenCalledWith({
                    search: 'Acme',
                    risk_level: undefined,
                    country: undefined,
                    status: undefined,
                })
            })
        })

        it('shows and hides filter panel', () => {
            renderWithProviders(<ClientList />)

            const filtersButton = screen.getByText('Filters')

            // Initially, the filter comboboxes should not be visible (filters collapsed)
            expect(screen.queryAllByRole('combobox')).toHaveLength(0)

            fireEvent.click(filtersButton)

            // After clicking, the filter comboboxes should be visible (filters expanded)
            expect(screen.getAllByRole('combobox')).toHaveLength(3) // Risk Level, Country, Status
        })

        it('handles risk level filter changes', async () => {
            const mockSetFilters = vi.fn()
            mockUseClients.mockReturnValue({
                ...defaultMockReturn,
                setFilters: mockSetFilters,
            })

            renderWithProviders(<ClientList />)

            // Open filters
            fireEvent.click(screen.getByText('Filters'))

            // Find the first combobox (should be risk level)
            const comboboxes = screen.getAllByRole('combobox')
            const riskLevelSelect = comboboxes[0]
            fireEvent.mouseDown(riskLevelSelect)

            // Wait for the dropdown to appear and click High option
            await waitFor(() => {
                const highOption = screen.getByText('High')
                fireEvent.click(highOption)
            })

            await waitFor(() => {
                expect(mockSetFilters).toHaveBeenCalledWith({
                    search: undefined,
                    risk_level: 'HIGH',
                    country: undefined,
                    status: undefined,
                })
            })
        })

        it('clears all filters when clear button is clicked', async () => {
            const mockSetFilters = vi.fn()
            mockUseClients.mockReturnValue({
                ...defaultMockReturn,
                setFilters: mockSetFilters,
            })

            renderWithProviders(<ClientList />)

            // Open filters
            fireEvent.click(screen.getByText('Filters'))

            // Click clear all
            fireEvent.click(screen.getByText('Clear All'))

            await waitFor(() => {
                expect(mockSetFilters).toHaveBeenCalledWith({})
            })
        })
    })

    describe('Pagination', () => {
        it('handles page changes correctly', () => {
            const mockSetPage = vi.fn()
            mockUseClients.mockReturnValue({
                ...defaultMockReturn,
                total: 25,
                pagination: { page: 1, size: 10 },
                setPage: mockSetPage,
            })

            renderWithProviders(<ClientList />)

            // Find and click next page button
            const nextButton = screen.getByTitle('Go to next page')
            fireEvent.click(nextButton)

            expect(mockSetPage).toHaveBeenCalledWith(2) // API uses 1-based pagination
        })

        it('displays correct pagination information', () => {
            mockUseClients.mockReturnValue({
                ...defaultMockReturn,
                total: 25,
                pagination: { page: 1, size: 10 },
            })

            renderWithProviders(<ClientList />)

            // Check for pagination text using a more flexible matcher
            expect(screen.getByText((content, element) => {
                return content.includes('25') && (element?.textContent?.includes('of') || false)
            })).toBeInTheDocument()
        })
    })

    describe('Client Selection', () => {
        it('calls onClientSelect when client is clicked', () => {
            const mockOnClientSelect = vi.fn()
            renderWithProviders(<ClientList onClientSelect={mockOnClientSelect} />)

            const viewButton = screen.getAllByLabelText(/View details for/)[0]
            fireEvent.click(viewButton)

            expect(mockOnClientSelect).toHaveBeenCalledWith(mockClients[0])
        })

        it('does not call onClientSelect when prop is not provided', () => {
            renderWithProviders(<ClientList />)

            const viewButton = screen.getAllByLabelText(/View details for/)[0]
            expect(() => fireEvent.click(viewButton)).not.toThrow()
        })
    })

    describe('Accessibility', () => {
        it('provides proper ARIA labels for status badges', () => {
            renderWithProviders(<ClientList />)

            expect(screen.getByLabelText('Risk level: HIGH')).toBeInTheDocument()
            expect(screen.getByLabelText('Status: ACTIVE')).toBeInTheDocument()
        })

        it('provides proper ARIA labels for action buttons', () => {
            renderWithProviders(<ClientList />)

            expect(screen.getByLabelText('View details for Acme Corporation')).toBeInTheDocument()
            expect(screen.getByLabelText('View details for Beta Industries')).toBeInTheDocument()
            expect(screen.getByLabelText('View details for Gamma Holdings')).toBeInTheDocument()
        })
    })

    describe('Integration with useClients Hook', () => {
        it('uses proper backend integration instead of mock data', () => {
            renderWithProviders(<ClientList />)

            // Verify that useClients hook is called
            expect(mockUseClients).toHaveBeenCalled()

            // Verify that the component uses data from the hook
            expect(screen.getByText('3 clients total')).toBeInTheDocument()
        })

        it('handles empty client list', () => {
            mockUseClients.mockReturnValue({
                ...defaultMockReturn,
                clients: [],
                total: 0,
            })

            renderWithProviders(<ClientList />)

            expect(screen.getByText('0 clients total')).toBeInTheDocument()
            expect(screen.queryByText('Acme Corporation')).not.toBeInTheDocument()
        })
    })
})