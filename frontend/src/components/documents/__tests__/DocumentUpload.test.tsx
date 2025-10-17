import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import DocumentUpload from '../DocumentUpload'

// Helper function to get file input
const getFileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement

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

// Mock XMLHttpRequest for upload progress
class MockXMLHttpRequest {
    upload = {
        addEventListener: vi.fn(),
    };
    addEventListener = vi.fn();
    open = vi.fn();
    send = vi.fn();
    status = 200;
    responseText = '';

    constructor() {
        // Simulate successful upload
        setTimeout(() => {
            this.upload.addEventListener.mock.calls.forEach(([event, callback]) => {
                if (event === 'progress') {
                    callback({ lengthComputable: true, loaded: 50, total: 100 })
                    callback({ lengthComputable: true, loaded: 100, total: 100 })
                }
            })
            this.addEventListener.mock.calls.forEach(([event, callback]) => {
                if (event === 'load') {
                    callback()
                }
            })
        }, 100)
    }
}

global.XMLHttpRequest = MockXMLHttpRequest as any

describe('DocumentUpload', () => {
    const defaultProps = {
        reviewId: 123,
        onUploadComplete: vi.fn(),
        onUploadError: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockClear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders upload component with default settings', () => {
        render(<DocumentUpload {...defaultProps} />)

        expect(screen.getByText('Document Type')).toBeInTheDocument()
        expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
        expect(screen.getByText('Supported formats: PDF, Images, Word, Excel, Text files')).toBeInTheDocument()
    })

    it('allows selecting document type', async () => {
        const user = userEvent.setup()
        render(<DocumentUpload {...defaultProps} />)

        const select = screen.getByLabelText('Document Type')
        await user.selectOptions(select, 'financial')

        expect(select).toHaveValue('financial')
    })

    it('allows toggling sensitive document checkbox', async () => {
        const user = userEvent.setup()
        render(<DocumentUpload {...defaultProps} />)

        const checkbox = screen.getByLabelText('Sensitive Document')
        expect(checkbox).not.toBeChecked()

        await user.click(checkbox)
        expect(checkbox).toBeChecked()
    })

    it('validates file size', async () => {
        const user = userEvent.setup()
        const onUploadError = vi.fn()
        render(<DocumentUpload {...defaultProps} onUploadError={onUploadError} maxFileSize={1} />)

        // Create a large file (2MB)
        const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.pdf', {
            type: 'application/pdf',
        })

        const input = getFileInput()
        await user.upload(input, largeFile)

        expect(onUploadError).toHaveBeenCalledWith('large.pdf: File size exceeds 1MB limit')
    })

    it('validates file type', async () => {
        const user = userEvent.setup()
        const onUploadError = vi.fn()
        render(<DocumentUpload {...defaultProps} onUploadError={onUploadError} />)

        // Create an invalid file type
        const invalidFile = new File(['content'], 'test.exe', {
            type: 'application/x-msdownload',
        })

        const input = getFileInput()
        await user.upload(input, invalidFile)

        await waitFor(() => {
            expect(onUploadError).toHaveBeenCalledWith('test.exe: File type not allowed')
        })
    })

    it('validates filename characters', async () => {
        const user = userEvent.setup()
        const onUploadError = vi.fn()
        render(<DocumentUpload {...defaultProps} onUploadError={onUploadError} />)

        // Create a file with invalid characters
        const invalidFile = new File(['content'], 'test<file>.pdf', {
            type: 'application/pdf',
        })

        const input = getFileInput()
        await user.upload(input, invalidFile)

        expect(onUploadError).toHaveBeenCalledWith('test<file>.pdf: Filename contains invalid characters')
    })

    it('handles successful file upload', async () => {
        const user = userEvent.setup()
        const onUploadComplete = vi.fn()

        // Mock the API responses
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    document_id: 456,
                    upload_url: 'https://s3.example.com/upload',
                    upload_fields: { key: 'test-key' },
                    file_key: 'documents/test.pdf',
                    expires_in: 3600,
                    max_file_size: 10485760,
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })

        render(<DocumentUpload {...defaultProps} onUploadComplete={onUploadComplete} />)

        const validFile = new File(['content'], 'test.pdf', {
            type: 'application/pdf',
        })

        const input = getFileInput()
        await user.upload(input, validFile)

        // Wait for upload to complete
        await waitFor(() => {
            expect(onUploadComplete).toHaveBeenCalledWith({
                document_id: 456,
                filename: 'test.pdf',
                file_size: 7,
                content_type: 'application/pdf',
                document_type: 'supporting',
                created_at: expect.any(String),
            })
        }, { timeout: 3000 })
    })

    it('handles upload preparation failure', async () => {
        const user = userEvent.setup()
        const onUploadError = vi.fn()

        // Mock failed preparation
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ detail: 'Invalid review ID' }),
        })

        render(<DocumentUpload {...defaultProps} onUploadError={onUploadError} />)

        const validFile = new File(['content'], 'test.pdf', {
            type: 'application/pdf',
        })

        const input = getFileInput()
        await user.upload(input, validFile)

        await waitFor(() => {
            expect(onUploadError).toHaveBeenCalledWith('Invalid review ID')
        })
    })

    it('handles drag and drop', async () => {
        const onUploadComplete = vi.fn()

        // Mock successful upload
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    document_id: 789,
                    upload_url: 'https://s3.example.com/upload',
                    upload_fields: { key: 'test-key' },
                    file_key: 'documents/dropped.pdf',
                    expires_in: 3600,
                    max_file_size: 10485760,
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })

        render(<DocumentUpload {...defaultProps} onUploadComplete={onUploadComplete} />)

        const dropZone = screen.getByText('Drop files here or click to browse').closest('div')
        const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' })

        // Simulate drag over
        fireEvent.dragOver(dropZone!, {
            dataTransfer: {
                files: [file],
            },
        })

        // Simulate drop
        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
            },
        })

        await waitFor(() => {
            expect(onUploadComplete).toHaveBeenCalledWith({
                document_id: 789,
                filename: 'dropped.pdf',
                file_size: 7,
                content_type: 'application/pdf',
                document_type: 'supporting',
                created_at: expect.any(String),
            })
        }, { timeout: 3000 })
    })

    it('shows upload progress', async () => {
        const user = userEvent.setup()

        // Mock successful upload with delay
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    document_id: 999,
                    upload_url: 'https://s3.example.com/upload',
                    upload_fields: { key: 'test-key' },
                    file_key: 'documents/progress.pdf',
                    expires_in: 3600,
                    max_file_size: 10485760,
                }),
            })
            .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 500)))
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })

        render(<DocumentUpload {...defaultProps} />)

        const validFile = new File(['content'], 'progress.pdf', {
            type: 'application/pdf',
        })

        const input = getFileInput()
        await user.upload(input, validFile)

        // Should show uploading state
        await waitFor(() => {
            expect(screen.getByText('Uploading Files')).toBeInTheDocument()
            expect(screen.getByText('progress.pdf')).toBeInTheDocument()
        })
    })

    it('allows removing files from upload queue', async () => {
        const user = userEvent.setup()

        // Mock upload that doesn't complete immediately
        mockFetch.mockImplementationOnce(() => new Promise(() => { })) // Never resolves

        render(<DocumentUpload {...defaultProps} />)

        const validFile = new File(['content'], 'remove-me.pdf', {
            type: 'application/pdf',
        })

        const input = getFileInput()
        await user.upload(input, validFile)

        // Wait for file to appear in upload queue
        await waitFor(() => {
            expect(screen.getByText('remove-me.pdf')).toBeInTheDocument()
        })

        // Click remove button (X icon)
        const removeButtons = screen.getAllByRole('button')
        const removeButton = removeButtons.find(btn => btn.querySelector('svg'))
        if (removeButton) {
            await user.click(removeButton)
        }

        // File should be removed from queue
        expect(screen.queryByText('remove-me.pdf')).not.toBeInTheDocument()
    })

    it('handles multiple file uploads', async () => {
        const user = userEvent.setup()
        const onUploadComplete = vi.fn()

        // Mock successful uploads for multiple files
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    document_id: 1001,
                    upload_url: 'https://s3.example.com/upload1',
                    upload_fields: { key: 'test-key-1' },
                }),
            })
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    document_id: 1002,
                    upload_url: 'https://s3.example.com/upload2',
                    upload_fields: { key: 'test-key-2' },
                }),
            })
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })

        render(<DocumentUpload {...defaultProps} onUploadComplete={onUploadComplete} multiple={true} />)

        const file1 = new File(['content1'], 'file1.pdf', { type: 'application/pdf' })
        const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' })

        const input = getFileInput()
        await user.upload(input, [file1, file2])

        await waitFor(() => {
            expect(onUploadComplete).toHaveBeenCalledTimes(2)
        }, { timeout: 10000 })
    })
})