import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import KYCQuestionnaireForm from '../KYCQuestionnaireForm'
import ExceptionSelector from '../ExceptionSelector'
import ExceptionDisplay from '../ExceptionDisplay'
import type { ExceptionDisplayData } from '../ExceptionDisplay'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'
import { describe } from 'node:test'

// Mock the DocumentUpload component
vi.mock('../../documents', () => ({
    DocumentUpload: ({ onUploadComplete, onUploadError }: any) => (
        <div data-testid="document-upload">
            <button
                onClick={() => onUploadComplete({ document_id: 1, filename: 'test.pdf' })}
                data-testid="mock-upload-success"
            >
                Upload Document
            </button>
            <button
                onClick={() => onUploadError('Upload failed')}
                data-testid="mock-upload-error"
            >
                Upload Error
            </button>
        </div>
    )
}))

describe('KYC Components Integration', () => {
    describe('KYCQuestionnaireForm - Core Functionality', () => {
        const defaultProps = {
            reviewId: 1,
            onDataChange: vi.fn(),
            onValidationChange: vi.fn()
        }

        beforeEach(() => {
            vi.clearAllMocks()
        })

        it('renders questionnaire form with all essential elements', () => {
            render(<KYCQuestionnaireForm {...defaultProps} />)

            // Check for main form elements
            expect(screen.getByText('KYC Assessment Questionnaire')).toBeInTheDocument()
            expect(screen.getByLabelText(/purpose of this account/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/kyc documents complete/i)).toBeInTheDocument()
            expect(screen.getByText(/source of funds documentation/i)).toBeInTheDocument()
        })

        it('validates form and shows errors', async () => {
            const onValidationChange = vi.fn()
            render(<KYCQuestionnaireForm {...defaultProps} onValidationChange={onValidationChange} />)

            // Should be invalid initially
            await waitFor(() => {
                expect(onValidationChange).toHaveBeenCalledWith(false, expect.any(Array))
            })

            // Should show validation summary
            expect(screen.getByText(/please address the following issues/i)).toBeInTheDocument()
        })

        it('handles form input and data changes', async () => {
            const user = userEvent.setup()
            const onDataChange = vi.fn()
            render(<KYCQuestionnaireForm {...defaultProps} onDataChange={onDataChange} />)

            // Fill in purpose field
            const purposeField = screen.getByLabelText(/purpose of this account/i)
            await user.type(purposeField, 'Test purpose')

            // Verify data change callback
            await waitFor(() => {
                expect(onDataChange).toHaveBeenCalledWith(
                    expect.objectContaining({
                        purpose_of_account: 'Test purpose'
                    }),
                    expect.any(Array)
                )
            })
        })

        it('handles document upload', async () => {
            const onDataChange = vi.fn()
            render(<KYCQuestionnaireForm {...defaultProps} onDataChange={onDataChange} />)

            // Upload document
            const uploadButton = screen.getByTestId('mock-upload-success')
            fireEvent.click(uploadButton)

            // Verify document is added
            await waitFor(() => {
                expect(screen.getByText('test.pdf')).toBeInTheDocument()
            })

            // Verify data change
            expect(onDataChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    source_of_funds_docs: [1]
                }),
                expect.any(Array)
            )
        })

        it('shows completion status when valid', async () => {
            const user = userEvent.setup()
            render(<KYCQuestionnaireForm {...defaultProps} />)

            // Fill required fields
            await user.type(screen.getByLabelText(/purpose of this account/i), 'Valid purpose')
            fireEvent.click(screen.getByTestId('mock-upload-success'))

            // Should show completion status
            await waitFor(() => {
                expect(screen.getByText(/kyc questionnaire is complete and valid/i)).toBeInTheDocument()
            })
        })

        it('handles form disable state', () => {
            render(<KYCQuestionnaireForm {...defaultProps} disabled={true} />)

            const purposeField = screen.getByLabelText(/purpose of this account/i)
            expect(purposeField).toBeDisabled()
        })
    })

    describe('ExceptionSelector - Core Functionality', () => {
        const defaultProps = {
            onExceptionsChange: vi.fn()
        }

        beforeEach(() => {
            vi.clearAllMocks()
        })

        it('renders exception options', () => {
            render(<ExceptionSelector {...defaultProps} />)

            expect(screen.getByText(/Flag Customer for KYC Non-Compliance/i)).toBeInTheDocument()
            expect(screen.getByText(/Dormant or Non-reachable.*funded account.*UFAA/i)).toBeInTheDocument()
            expect(screen.getByText(/Dormant or non-reachable.*overdrawn account.*Exit/i)).toBeInTheDocument()
        })

        it('shows empty state initially', () => {
            render(<ExceptionSelector {...defaultProps} />)

            expect(screen.getByText(/No exceptions selected/i)).toBeInTheDocument()
        })

        it('handles exception selection', async () => {
            const user = userEvent.setup()
            const onExceptionsChange = vi.fn()
            render(<ExceptionSelector {...defaultProps} onExceptionsChange={onExceptionsChange} />)

            // Select an exception
            const checkbox = screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i)
            await user.click(checkbox)

            expect(onExceptionsChange).toHaveBeenCalledWith([
                expect.objectContaining({
                    type: 'kyc_non_compliance'
                })
            ])
        })

        it('shows custom description field when exception selected', async () => {
            const user = userEvent.setup()
            render(<ExceptionSelector {...defaultProps} />)

            // Select an exception
            await user.click(screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i))

            // Should show description field
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/Provide additional context/i)).toBeInTheDocument()
            })
        })

        it('handles multiple exception selections', async () => {
            const user = userEvent.setup()
            const onExceptionsChange = vi.fn()
            render(<ExceptionSelector {...defaultProps} onExceptionsChange={onExceptionsChange} />)

            // Select multiple exceptions
            await user.click(screen.getByLabelText(/Flag Customer for KYC Non-Compliance/i))
            await user.click(screen.getByLabelText(/Dormant or Non-reachable.*funded/i))

            expect(onExceptionsChange).toHaveBeenCalledWith([
                expect.objectContaining({ type: 'kyc_non_compliance' }),
                expect.objectContaining({ type: 'dormant_funded_ufaa' })
            ])
        })
    })

    describe('ExceptionDisplay - Core Functionality', () => {
        const mockExceptions: ExceptionDisplayData[] = [
            {
                id: 1,
                type: 'kyc_non_compliance',
                description: 'Customer has incomplete KYC documentation',
                status: 'open',
                created_at: '2024-01-15T10:00:00Z',
                created_by: 1,
                creator_name: 'John Doe'
            },
            {
                id: 2,
                type: 'dormant_funded_ufaa',
                description: 'Account is dormant with funds',
                status: 'resolved',
                created_at: '2024-01-10T09:00:00Z',
                created_by: 2,
                creator_name: 'Jane Smith',
                resolved_at: '2024-01-12T14:30:00Z',
                resolved_by: 3,
                resolver_name: 'Bob Johnson',
                resolution_notes: 'Customer contacted and account reactivated'
            }
        ]

        it('renders empty state when no exceptions', () => {
            render(<ExceptionDisplay exceptions={[]} />)

            expect(screen.getByText(/No exceptions raised for this review/i)).toBeInTheDocument()
        })

        it('displays exception list with correct information', () => {
            render(<ExceptionDisplay exceptions={mockExceptions} />)

            expect(screen.getByText(/Review Exceptions \(2\)/i)).toBeInTheDocument()
            expect(screen.getByText('KYC Non-Compliance')).toBeInTheDocument()
            expect(screen.getByText('Dormant Funded Account (UFAA)')).toBeInTheDocument()
            expect(screen.getByText('Customer has incomplete KYC documentation')).toBeInTheDocument()
            expect(screen.getByText('Account is dormant with funds')).toBeInTheDocument()
        })

        it('shows resolution information for resolved exceptions', () => {
            render(<ExceptionDisplay exceptions={mockExceptions} />)

            expect(screen.getByText('Resolved by Bob Johnson')).toBeInTheDocument()
            expect(screen.getByText('Customer contacted and account reactivated')).toBeInTheDocument()
        })

        it('handles exception click events', () => {
            const onExceptionClick = vi.fn()
            render(<ExceptionDisplay exceptions={mockExceptions} onExceptionClick={onExceptionClick} />)

            const firstException = screen.getByText('KYC Non-Compliance').closest('.exception-card')
            fireEvent.click(firstException!)

            expect(onExceptionClick).toHaveBeenCalledWith(mockExceptions[0])
        })

        it('displays action buttons when enabled', () => {
            render(<ExceptionDisplay exceptions={mockExceptions} showActions={true} onExceptionClick={vi.fn()} />)

            const actionButtons = screen.getAllByText('View Details')
            expect(actionButtons).toHaveLength(2)
        })
    })

    describe('Component Integration Tests', () => {
        it('integrates questionnaire form with document upload and validation', async () => {
            const user = userEvent.setup()
            const onDataChange = vi.fn()
            const onValidationChange = vi.fn()

            render(<KYCQuestionnaireForm reviewId={1} onDataChange={onDataChange} onValidationChange={onValidationChange} />)

            // Fill form and upload document
            await user.type(screen.getByLabelText(/purpose of this account/i), 'Integration test purpose')
            fireEvent.click(screen.getByTestId('mock-upload-success'))

            // Verify integrated data and validation
            await waitFor(() => {
                expect(onDataChange).toHaveBeenCalledWith(
                    expect.objectContaining({
                        purpose_of_account: 'Integration test purpose',
                        source_of_funds_docs: [1]
                    }),
                    expect.any(Array)
                )
            })

            // Should become valid
            await waitFor(() => {
                expect(onValidationChange).toHaveBeenCalledWith(true, [])
            })
        })

        it('validates complete workflow', async () => {
            const user = userEvent.setup()
            const onValidationChange = vi.fn()

            render(<KYCQuestionnaireForm reviewId={1} onValidationChange={onValidationChange} />)

            // Initially invalid
            await waitFor(() => {
                expect(onValidationChange).toHaveBeenCalledWith(false, expect.any(Array))
            })

            // Fill required fields
            await user.type(screen.getByLabelText(/purpose of this account/i), 'Complete workflow test')
            fireEvent.click(screen.getByTestId('mock-upload-success'))

            // Should become valid
            await waitFor(() => {
                expect(onValidationChange).toHaveBeenCalledWith(true, [])
            })
        })
    })
})