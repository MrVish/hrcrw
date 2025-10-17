import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import DocumentPreview from '../DocumentPreview'

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

describe('DocumentPreview', () => {
    const mockDocument = {
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
        checksum: 'abc123def456',
        file_size_mb: 1.0,
        is_image: false,
        is_pdf: true,
        is_expired: false,
        file_extension: 'pdf',
    }

    const mockImageDocument = {
        ...mockDocument,
        id: 2,
        filename: 'screenshot.png',
        content_type: 'image/png',
        is_image: true,
        is_pdf: false,
        file_extension: 'png',
    }

    const defaultProps = {
        documentId: 1,
        onClose: vi.fn(),
        onDownload: vi.fn(),
        onDelete: vi.fn(),
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

        render(<DocumentPreview {...defaultProps} />)

        expect(screen.getByText('Loading document details...')).toBeInTheDocument()
    })

    it('renders document preview successfully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockDocument),
        })

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
            expect(screen.getByText('Financial Document')).toBeInTheDocument()
            expect(screen.getByText('Download')).toBeInTheDocument()
        })
    })

    it('displays document metadata correctly', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockDocument),
        })

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            // File information
            expect(screen.getByText('1 MB')).toBeInTheDocument()
            expect(screen.getByText('application/pdf')).toBeInTheDocument()
            expect(screen.getByText('.pdf')).toBeInTheDocument()

            // Upload information
            expect(screen.getByText('January 15, 2024 at 10:30 AM')).toBeInTheDocument()
            expect(screen.getByText('3 downloads')).toBeInTheDocument()

            // Status badges
            expect(screen.getByText('active')).toBeInTheDocument()
            expect(screen.getByText('Version 1')).toBeInTheDocument()
        })
    })

    it('shows sensitive document indicator', async () => {
        const sensitiveDoc = { ...mockDocument, is_sensitive: true }

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(sensitiveDoc),
        })

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Sensitive')).toBeInTheDocument()
        })
    })

    it('shows expired document warning', async () => {
        const expiredDoc = {
            ...mockDocument,
            is_expired: true,
            retention_date: '2023-01-15T10:30:00Z',
        }

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(expiredDoc),
        })

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Document Expired')).toBeInTheDocument()
            expect(screen.getByText(/This document expired on/)).toBeInTheDocument()
        })
    })

    it('handles image preview for image documents', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockImageDocument),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    download_url: 'https://s3.example.com/preview/screenshot.png',
                    expires_in: 3600,
                    filename: 'screenshot.png',
                }),
            })

        render(<DocumentPreview {...defaultProps} documentId={2} />)

        await waitFor(() => {
            expect(screen.getByText('screenshot.png')).toBeInTheDocument()
            expect(screen.getByText('Preview')).toBeInTheDocument()
        })
    })

    it('handles document download', async () => {
        const user = userEvent.setup()
        const onDownload = vi.fn()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockDocument),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    download_url: 'https://s3.example.com/download/test-document.pdf',
                    expires_in: 3600,
                    filename: 'test-document.pdf',
                }),
            })

        render(<DocumentPreview {...defaultProps} onDownload={onDownload} />)

        await waitFor(() => {
            expect(screen.getByText('Download')).toBeInTheDocument()
        })

        const downloadButton = screen.getByText('Download')
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

        expect(onDownload).toHaveBeenCalledWith(mockDocument)
        expect(mockLink.click).toHaveBeenCalled()
    })

    it('handles document deletion', async () => {
        const user = userEvent.setup()
        const onDelete = vi.fn()
        const onClose = vi.fn()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockDocument),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })

        render(<DocumentPreview {...defaultProps} onDelete={onDelete} onClose={onClose} />)

        await waitFor(() => {
            expect(screen.getByText('Delete Document')).toBeInTheDocument()
        })

        const deleteButton = screen.getByText('Delete Document')
        await user.click(deleteButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/documents/1', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer mock-token',
                },
            })
        })

        expect(onDelete).toHaveBeenCalledWith(1)
        expect(onClose).toHaveBeenCalled()
    })

    it('handles close action', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockDocument),
        })

        render(<DocumentPreview {...defaultProps} onClose={onClose} />)

        await waitFor(() => {
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
        })

        const closeButton = screen.getAllByRole('button').find(btn =>
            btn.querySelector('svg') && btn.getAttribute('class')?.includes('text-gray-400')
        )

        if (closeButton) {
            await user.click(closeButton)
            expect(onClose).toHaveBeenCalled()
        }
    })

    it('displays error state when document fetch fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Document not found'))

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Document not found')).toBeInTheDocument()
        })
    })

    it('displays error state when API returns error', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ detail: 'Access denied' }),
        })

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Access denied')).toBeInTheDocument()
        })
    })

    it('handles download error gracefully', async () => {
        const user = userEvent.setup()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockDocument),
            })
            .mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ detail: 'Download failed' }),
            })

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Download')).toBeInTheDocument()
        })

        const downloadButton = screen.getByText('Download')
        await user.click(downloadButton)

        await waitFor(() => {
            expect(screen.getByText('Download failed')).toBeInTheDocument()
        })
    })

    it('handles delete error gracefully', async () => {
        const user = userEvent.setup()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockDocument),
            })
            .mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ detail: 'Permission denied' }),
            })

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Delete Document')).toBeInTheDocument()
        })

        const deleteButton = screen.getByText('Delete Document')
        await user.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Permission denied')).toBeInTheDocument()
        })
    })

    it('shows loading state during download', async () => {
        const user = userEvent.setup()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockDocument),
            })
            .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)))

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Download')).toBeInTheDocument()
        })

        const downloadButton = screen.getByText('Download')
        await user.click(downloadButton)

        // Should show loading state
        expect(screen.getByRole('button', { name: /downloading/i })).toBeInTheDocument()
    })

    it('toggles image preview visibility', async () => {
        const user = userEvent.setup()

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockImageDocument),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    download_url: 'https://s3.example.com/preview/screenshot.png',
                    expires_in: 3600,
                    filename: 'screenshot.png',
                }),
            })

        render(<DocumentPreview {...defaultProps} documentId={2} />)

        await waitFor(() => {
            expect(screen.getByText('Show Preview')).toBeInTheDocument()
        })

        const toggleButton = screen.getByText('Show Preview')
        await user.click(toggleButton)

        expect(screen.getByText('Hide Preview')).toBeInTheDocument()
        expect(screen.getByAltText('screenshot.png')).toBeInTheDocument()
    })

    it('displays retention information when available', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockDocument),
        })

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Retention Policy')).toBeInTheDocument()
            expect(screen.getByText(/Document expires on/)).toBeInTheDocument()
        })
    })

    it('shows document ID in footer', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockDocument),
        })

        render(<DocumentPreview {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Document ID: 1')).toBeInTheDocument()
        })
    })

    it('prevents deletion when user cancels confirmation', async () => {
        const user = userEvent.setup()
        const onDelete = vi.fn()

        // Mock user canceling confirmation
        global.confirm = vi.fn(() => false)

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockDocument),
        })

        render(<DocumentPreview {...defaultProps} onDelete={onDelete} />)

        await waitFor(() => {
            expect(screen.getByText('Delete Document')).toBeInTheDocument()
        })

        const deleteButton = screen.getByText('Delete Document')
        await user.click(deleteButton)

        // Should not call API or callback
        expect(mockFetch).toHaveBeenCalledTimes(1) // Only initial fetch
        expect(onDelete).not.toHaveBeenCalled()
    })
})