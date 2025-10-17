import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import DocumentList from '../DocumentList'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
    getItem: vi.fn(() => 'mock-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
})

// Mock window.confirm
global.confirm = vi.fn(() => true)

// Mock document.createElement and related DOM methods for download
const mockLink = {
    href: '',
    download: '',
    click: vi.fn(),
    remove: vi.fn(),
}
const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName) => {
    if (tagName === 'a') {
        return mockLink as any
    }
    return originalCreateElement.call(document, tagName)
})

const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
document.body.appendChild = mockAppendChild
document.body.removeChild = mockRemoveChild

describe('DocumentList', () => {
    const mockDocuments = [
        {
            id: 1,
            review_id: 123,
            uploaded_by: 1,
            filename: 'test-document.pdf',
            file_size: 1048576, // 1MB
            content_type: 'application/pdf',
            document_type: 'financial',
            status: 'active',
            version: 1,
            is_sensitive: false,
            access_count: 3,
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z',
            last_accessed_at: '2024-01-16T14:20:00Z',
            retention_date: '2025-01-15T10:30:00Z',
        },
        {
            id: 2,
            review_id: 123,
            uploaded_by: 2,
            filename: 'sensitive-data.xlsx',
            file_size: 2097152, // 2MB
            content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            document_type: 'compliance',
            status: 'active',
            version: 2,
            is_sensitive: true,
            access_count: 1,
            created_at: '2024-01-14T09:15:00Z',
            updated_at: '2024-01-15T11:45:00Z',
            last_accessed_at: null,
            retention_date: null,
        },
    ]

    const defaultProps = {
        reviewId: 123,
        onDocumentSelect: vi.fn(),
        onDocumentDelete: vi.fn(),
        onRefresh: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockClear()
        mockLink.click.mockClear()
        mockAppendChild.mockClear()
        mockRemoveChild.mockClear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders loading state initially', () => {
        mockFetch.mockImplementationOnce(() => new Promise(() => { })) // Never resolves

        render(<DocumentList {...defaultProps} />)

        expect(screen.getByText('Loading documents...')).toBeInTheDocument()
    })

    it('renders document list successfully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                documents: mockDocuments,
                total_count: 2,
                review_id: 123,
            }),
        })

        render(<DocumentList {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Documents (2)')).toBeInTheDocument()
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
            expect(screen.getByText('sensitive-data.xlsx')).toBeInTheDocument()
        })
    })

    it('displays document metadata correctly', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                documents: mockDocuments,
                total_count: 2,
                review_id: 123,
            }),
        })

        render(<DocumentList {...defaultProps} />)

        await waitFor(() => {
            // Check file sizes
            expect(screen.getByText('1.00 MB')).toBeInTheDocument()
            expect(screen.getByText('2.00 MB')).toBeInTheDocument()

            // Check document types
            expect(screen.getByText('Financial')).toBeInTheDocument()
            expect(screen.getByText('Compliance')).toBeInTheDocument()

            // Check sensitive indicator
            expect(screen.getByTitle('Sensitive Document')).toBeInTheDocument()

            // Check version indicator
            expect(screen.getByText('v2')).toBeInTheDocument()

            // Check download counts
            expect(screen.getByText('3 downloads')).toBeInTheDocument()
            expect(screen.getByText('1 downloads')).toBeInTheDocument()
        })
    })

    it('handles document selection', async () => {
        const onDocumentSelect = vi.fn()

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                documents: mockDocuments,
                total_count: 2,
                review_id: 123,
            }),
        })

        render(<DocumentList {...defaultProps} onDocumentSelect={onDocumentSelect} />)

        await waitFor(() => {
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
        })

        const documentRow = screen.getByText('test-document.pdf').closest('div')
        fireEvent.click(documentRow!)

        expect(onDocumentSelect).toHaveBeenCalledWith(mockDocuments[0])
    })

    it('handles document download', async () => {
        const user = userEvent.setup()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    documents: mockDocuments,
                    total_count: 2,
                    review_id: 123,
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    download_url: 'https://s3.example.com/download/test-document.pdf',
                    expires_in: 3600,
                    filename: 'test-document.pdf',
                }),
            })

        render(<DocumentList {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
        })

        const downloadButton = screen.getAllByTitle('Download document')[0]
        await user.click(downloadButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/documents/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer mock-token',
                },
                body: JSON.stringify({
                    document_id: 1,
                    expiration: 3600,
                }),
            })
        })

        // Check that download link was created and clicked
        expect(mockLink.href).toBe('https://s3.example.com/download/test-document.pdf')
        expect(mockLink.download).toBe('test-document.pdf')
        expect(mockLink.click).toHaveBeenCalled()
        expect(mockAppendChild).toHaveBeenCalledWith(mockLink)
        expect(mockRemoveChild).toHaveBeenCalledWith(mockLink)
    })

    it('handles document deletion', async () => {
        const user = userEvent.setup()
        const onDocumentDelete = vi.fn()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    documents: mockDocuments,
                    total_count: 2,
                    review_id: 123,
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })

        render(<DocumentList {...defaultProps} onDocumentDelete={onDocumentDelete} />)

        await waitFor(() => {
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
        })

        const deleteButton = screen.getAllByTitle('Delete document')[0]
        await user.click(deleteButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/documents/1', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer mock-token',
                },
            })
        })

        expect(onDocumentDelete).toHaveBeenCalledWith(1)
    })

    it('handles refresh action', async () => {
        const user = userEvent.setup()
        const onRefresh = vi.fn()

        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                documents: mockDocuments,
                total_count: 2,
                review_id: 123,
            }),
        })

        render(<DocumentList {...defaultProps} onRefresh={onRefresh} />)

        await waitFor(() => {
            expect(screen.getByText('Documents (2)')).toBeInTheDocument()
        })

        const refreshButton = screen.getByTitle('Refresh documents')
        await user.click(refreshButton)

        expect(onRefresh).toHaveBeenCalled()
        expect(mockFetch).toHaveBeenCalledTimes(2) // Initial load + refresh
    })

    it('displays error state when fetch fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        render(<DocumentList {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Failed to load documents')).toBeInTheDocument()
            expect(screen.getByText('Try again')).toBeInTheDocument()
        })
    })

    it('displays empty state when no documents', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                documents: [],
                total_count: 0,
                review_id: 123,
            }),
        })

        render(<DocumentList {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('No documents')).toBeInTheDocument()
            expect(screen.getByText('No documents have been uploaded for this review yet.')).toBeInTheDocument()
        })
    })

    it('handles download error gracefully', async () => {
        const user = userEvent.setup()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    documents: mockDocuments,
                    total_count: 2,
                    review_id: 123,
                }),
            })
            .mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ detail: 'Document not found' }),
            })

        render(<DocumentList {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
        })

        const downloadButton = screen.getAllByTitle('Download document')[0]
        await user.click(downloadButton)

        await waitFor(() => {
            expect(screen.getByText('Document not found')).toBeInTheDocument()
        })
    })

    it('handles delete error gracefully', async () => {
        const user = userEvent.setup()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    documents: mockDocuments,
                    total_count: 2,
                    review_id: 123,
                }),
            })
            .mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ detail: 'Permission denied' }),
            })

        render(<DocumentList {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
        })

        const deleteButton = screen.getAllByTitle('Delete document')[0]
        await user.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Permission denied')).toBeInTheDocument()
        })
    })

    it('renders in compact mode', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                documents: mockDocuments,
                total_count: 2,
                review_id: 123,
            }),
        })

        render(<DocumentList {...defaultProps} compact={true} />)

        await waitFor(() => {
            expect(screen.getByText('Documents (2)')).toBeInTheDocument()
        })

        // In compact mode, some details should be hidden
        const documentRows = screen.getAllByText(/test-document\.pdf|sensitive-data\.xlsx/)
        expect(documentRows).toHaveLength(2)
    })

    it('hides actions when showActions is false', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                documents: mockDocuments,
                total_count: 2,
                review_id: 123,
            }),
        })

        render(<DocumentList {...defaultProps} showActions={false} />)

        await waitFor(() => {
            expect(screen.getByText('Documents (2)')).toBeInTheDocument()
        })

        // Action buttons should not be present
        expect(screen.queryByTitle('Download document')).not.toBeInTheDocument()
        expect(screen.queryByTitle('Delete document')).not.toBeInTheDocument()
    })

    it('shows preview button for images', async () => {
        const imageDocument = {
            ...mockDocuments[0],
            id: 3,
            filename: 'screenshot.png',
            content_type: 'image/png',
        }

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                documents: [imageDocument],
                total_count: 1,
                review_id: 123,
            }),
        })

        render(<DocumentList {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('screenshot.png')).toBeInTheDocument()
            expect(screen.getByTitle('Preview image')).toBeInTheDocument()
        })
    })

    it('shows loading state during download', async () => {
        const user = userEvent.setup()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    documents: mockDocuments,
                    total_count: 2,
                    review_id: 123,
                }),
            })
            .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)))

        render(<DocumentList {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
        })

        const downloadButton = screen.getAllByTitle('Download document')[0]
        await user.click(downloadButton)

        // Should show loading spinner during download
        expect(screen.getByRole('button', { name: /downloading/i })).toBeInTheDocument()
    })
})