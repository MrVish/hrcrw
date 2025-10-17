import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuditLogViewer } from '../AuditLogViewer'
import { AuthContext } from '../../../contexts/AuthContext'

// Mock the child components
vi.mock('../AuditLogFilters', () => ({
    AuditLogFilters: ({ filters, onFilterChange }: any) => (
        <div data-testid="audit-log-filters">
            <div>Audit Log Filters Component</div>
            <button onClick={() => onFilterChange({ search_text: 'test' })}>
                Apply Filter
            </button>
        </div>
    )
}))

vi.mock('../AuditLogTable', () => ({
    AuditLogTable: ({ auditLogs, onLogSelect }: any) => (
        <div data-testid="audit-log-table">
            <div>Audit Log Table Component</div>
            {auditLogs.map((log: any) => (
                <div key={log.id} data-testid={`audit-log-${log.id}`}>
                    <span>{log.action}</span>
                    <button onClick={() => onLogSelect(log)}>View Details</button>
                </div>
            ))}
        </div>
    )
}))

vi.mock('../AuditLogStats', () => ({
    AuditLogStats: () => <div data-testid="audit-log-stats">Audit Log Stats Component</div>
}))

vi.mock('../AuditLogExport', () => ({
    AuditLogExport: () => <div data-testid="audit-log-export">Audit Log Export Component</div>
}))

vi.mock('../AuditLogDetail', () => ({
    AuditLogDetail: ({ log, onClose }: any) => (
        <div data-testid="audit-log-detail">
            <div>Audit Log Detail Component</div>
            <div>Log ID: {log.id}</div>
            <button onClick={onClose}>Close</button>
        </div>
    )
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockAuditLogs = [
    {
        id: 1,
        user_id: 1,
        entity_type: 'User',
        entity_id: '123',
        action: 'CREATE',
        created_at: '2024-01-01T10:30:00Z',
        details: { description: 'User created' },
        user_name: 'John Doe',
        user_email: 'john@example.com',
        user_role: 'Admin'
    },
    {
        id: 2,
        user_id: 2,
        entity_type: 'Review',
        entity_id: '456',
        action: 'UPDATE',
        created_at: '2024-01-02T15:45:00Z',
        details: { description: 'Review updated' },
        user_name: 'Jane Smith',
        user_email: 'jane@example.com',
        user_role: 'Maker'
    }
]

const mockAuditLogResponse = {
    audit_logs: mockAuditLogs,
    total: 2,
    page: 1,
    per_page: 50,
    total_pages: 1
}

const mockAuthContextValue = {
    user: {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'Admin',
        token: 'mock-token'
    },
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
}

const renderWithAuth = (component: React.ReactElement) => {
    return render(
        <AuthContext.Provider value={mockAuthContextValue}>
            {component}
        </AuthContext.Provider>
    )
}

describe('AuditLogViewer', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockAuditLogResponse)
        })
    })

    it('renders audit log viewer interface', async () => {
        renderWithAuth(<AuditLogViewer />)

        expect(screen.getByText('Audit Logs')).toBeInTheDocument()
        expect(screen.getByText('Comprehensive audit trail for compliance monitoring')).toBeInTheDocument()
        expect(screen.getByText('Refresh')).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByTestId('audit-log-filters')).toBeInTheDocument()
            expect(screen.getByTestId('audit-log-table')).toBeInTheDocument()
        })
    })

    it('fetches audit logs on component mount', async () => {
        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/audit/logs'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-token'
                    })
                })
            )
        })
    })

    it('shows and hides stats when stats button is clicked', async () => {
        renderWithAuth(<AuditLogViewer />)

        const statsButton = screen.getByText('Show Stats')
        fireEvent.click(statsButton)

        await waitFor(() => {
            expect(screen.getByTestId('audit-log-stats')).toBeInTheDocument()
            expect(screen.getByText('Hide Stats')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Hide Stats'))
        expect(screen.queryByTestId('audit-log-stats')).not.toBeInTheDocument()
    })

    it('shows export section for admin users', async () => {
        renderWithAuth(<AuditLogViewer />)

        const exportButton = screen.getByText('Export Logs')
        fireEvent.click(exportButton)

        await waitFor(() => {
            expect(screen.getByTestId('audit-log-export')).toBeInTheDocument()
        })
    })

    it('hides export section for non-admin users', async () => {
        const nonAdminAuthValue = {
            ...mockAuthContextValue,
            user: {
                ...mockAuthContextValue.user,
                role: 'Maker'
            }
        }

        render(
            <AuthContext.Provider value={nonAdminAuthValue}>
                <AuditLogViewer />
            </AuthContext.Provider>
        )

        expect(screen.queryByText('Export Logs')).not.toBeInTheDocument()
    })

    it('handles filter changes and refetches data', async () => {
        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByTestId('audit-log-filters')).toBeInTheDocument()
        })

        const applyFilterButton = screen.getByText('Apply Filter')
        fireEvent.click(applyFilterButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('search_text=test'),
                expect.any(Object)
            )
        })
    })

    it('uses advanced search endpoint when search text is provided', async () => {
        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByTestId('audit-log-filters')).toBeInTheDocument()
        })

        const applyFilterButton = screen.getByText('Apply Filter')
        fireEvent.click(applyFilterButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/audit/logs/advanced-search'),
                expect.any(Object)
            )
        })
    })

    it('displays audit log count information', async () => {
        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByText('Showing 2 of 2 audit logs')).toBeInTheDocument()
        })
    })

    it('shows pagination when multiple pages exist', async () => {
        const multiPageResponse = {
            ...mockAuditLogResponse,
            total: 100,
            total_pages: 2,
            page: 1
        }

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(multiPageResponse)
        })

        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByText('Showing 2 of 100 audit logs (Page 1 of 2)')).toBeInTheDocument()
            expect(screen.getByText('Previous')).toBeInTheDocument()
            expect(screen.getByText('Next')).toBeInTheDocument()
        })
    })

    it('handles pagination navigation', async () => {
        const multiPageResponse = {
            ...mockAuditLogResponse,
            total: 100,
            total_pages: 2,
            page: 1
        }

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(multiPageResponse)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ ...multiPageResponse, page: 2 })
            })

        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByText('Next')).toBeInTheDocument()
        })

        const nextButton = screen.getByText('Next')
        fireEvent.click(nextButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('page=2'),
                expect.any(Object)
            )
        })
    })

    it('opens audit log detail when log is selected', async () => {
        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByTestId('audit-log-1')).toBeInTheDocument()
        })

        const viewDetailsButton = screen.getByText('View Details')
        fireEvent.click(viewDetailsButton)

        expect(screen.getByTestId('audit-log-detail')).toBeInTheDocument()
        expect(screen.getByText('Log ID: 1')).toBeInTheDocument()
    })

    it('closes audit log detail when close is clicked', async () => {
        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByTestId('audit-log-1')).toBeInTheDocument()
        })

        const viewDetailsButton = screen.getByText('View Details')
        fireEvent.click(viewDetailsButton)

        expect(screen.getByTestId('audit-log-detail')).toBeInTheDocument()

        const closeButton = screen.getByText('Close')
        fireEvent.click(closeButton)

        expect(screen.queryByTestId('audit-log-detail')).not.toBeInTheDocument()
    })

    it('refreshes data when refresh button is clicked', async () => {
        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1)
        })

        const refreshButton = screen.getByText('Refresh')
        fireEvent.click(refreshButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(2)
        })
    })

    it('displays error message when API call fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('API Error'))

        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByText(/Error: API Error/)).toBeInTheDocument()
            expect(screen.getByText('Retry')).toBeInTheDocument()
        })
    })

    it('shows loading state during API calls', async () => {
        // Mock a delayed response
        mockFetch.mockImplementationOnce(() =>
            new Promise(resolve =>
                setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve(mockAuditLogResponse)
                }), 100)
            )
        )

        renderWithAuth(<AuditLogViewer />)

        const refreshButton = screen.getByText('Refresh')
        fireEvent.click(refreshButton)

        expect(screen.getByText('Refreshing...')).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByText('Refresh')).toBeInTheDocument()
        })
    })

    it('handles sorting when sort is triggered', async () => {
        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByTestId('audit-log-table')).toBeInTheDocument()
        })

        // This would be triggered by the AuditLogTable component
        // We can't directly test it without mocking the table component more extensively
        // But we can verify the initial sort parameters are set correctly
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('sort_by=created_at'),
            expect.any(Object)
        )
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('sort_order=desc'),
            expect.any(Object)
        )
    })

    it('resets page to 1 when filters change', async () => {
        const multiPageResponse = {
            ...mockAuditLogResponse,
            total: 100,
            total_pages: 2,
            page: 2
        }

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(multiPageResponse)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ ...multiPageResponse, page: 1 })
            })

        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByTestId('audit-log-filters')).toBeInTheDocument()
        })

        const applyFilterButton = screen.getByText('Apply Filter')
        fireEvent.click(applyFilterButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('page=1'),
                expect.any(Object)
            )
        })
    })

    it('handles empty audit log response', async () => {
        const emptyResponse = {
            audit_logs: [],
            total: 0,
            page: 1,
            per_page: 50,
            total_pages: 0
        }

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(emptyResponse)
        })

        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByText('Showing 0 of 0 audit logs')).toBeInTheDocument()
        })
    })

    it('handles network errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        renderWithAuth(<AuditLogViewer />)

        await waitFor(() => {
            expect(screen.getByText(/Error: Network error/)).toBeInTheDocument()
        })

        // Should be able to retry
        const retryButton = screen.getByText('Retry')
        expect(retryButton).toBeInTheDocument()

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockAuditLogResponse)
        })

        fireEvent.click(retryButton)

        await waitFor(() => {
            expect(screen.queryByText(/Error: Network error/)).not.toBeInTheDocument()
        })
    })
})