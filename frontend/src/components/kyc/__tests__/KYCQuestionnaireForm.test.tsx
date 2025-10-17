import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import KYCQuestionnaireForm from '../KYCQuestionnaireForm'
import type { KYCQuestionnaire } from '../../../types'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the DocumentUpload component
vi.mock('../../documents', () => ({
    DocumentUpload: ({ onUploadComplete, onUploadError }: any) => (
        <div data-testid="document-upload">
            <button
                onClick={() => onUploadComplete({ document_id: 1, filename: 'test.pdf' })}
                data-testid="mock-upload-success"
            >
                Mock Upload Success
            </button>
            <button
                onClick={() => onUploadError('Upload failed')}
                data-testid="mock-upload-error"
            >
                Mock Upload Error
            </button>
        </div>
    )
}))

// Mock the ExceptionSelector component
vi.mock('../ExceptionSelector', () => ({
    default: ({ onExceptionsChange }: any) => (
        <div data-testid="exception-selector">
            <button
                onClick={() => onExceptionsChange([{ type: 'kyc_non_compliance', description: 'Test exception' }])}
                data-testid="mock-add-exception"
            >
                Add Exception
            </button>
        </div>
    )
}))

describe('KYCQuestionnaireForm', () => {
    const defaultProps = {
        reviewId: 1,
        onDataChange: vi.fn(),
        onValidationChange: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders all 12 questions', () => {
        render(<KYCQuestionnaireForm {...defaultProps} />)

        // Check for key questions
        expect(screen.getByLabelText(/purpose of this account/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/kyc documents complete/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/account purpose aligned/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/adverse media screening/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/senior management approval/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/pep.*approval/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/static data correct/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/kyc documents valid/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/regulated business license/i)).toBeInTheDocument()
        expect(screen.getByText(/source of funds/i)).toBeInTheDocument()
    })

    it('shows conditional fields when appropriate', async () => {
        const user = userEvent.setup()
        render(<KYCQuestionnaireForm {...defaultProps} />)

        // Initially, conditional fields should be visible due to validation errors
        // The form shows all fields but with validation errors
        expect(screen.getByLabelText(/missing kyc details/i)).toBeInTheDocument()

        // Select "No" for account purpose aligned to trigger remedial actions
        const accountPurposeSelect = screen.getByLabelText(/account purpose aligned/i)
        await user.selectOptions(accountPurposeSelect, 'no')

        // Remedial actions field should be visible
        await waitFor(() => {
            expect(screen.getByLabelText(/remedial actions/i)).toBeInTheDocument()
        })
    })

    it('validates required fields', async () => {
        const onValidationChange = vi.fn()
        render(<KYCQuestionnaireForm {...defaultProps} onValidationChange={onValidationChange} />)

        // Initially should be invalid due to missing required fields
        await waitFor(() => {
            expect(onValidationChange).toHaveBeenCalledWith(false, expect.arrayContaining([
                expect.stringContaining('Purpose of account is required')
            ]))
        })
    })

    it('validates conditional field requirements', async () => {
        const user = userEvent.setup()
        const onValidationChange = vi.fn()
        render(<KYCQuestionnaireForm {...defaultProps} onValidationChange={onValidationChange} />)

        // Fill in purpose of account
        const purposeField = screen.getByLabelText(/purpose of this account/i)
        await user.type(purposeField, 'Business operations')

        // Select "No" for KYC documents complete but don't fill missing details
        const kycCompleteSelect = screen.getByLabelText(/kyc documents complete/i)
        await user.selectOptions(kycCompleteSelect, 'no')

        await waitFor(() => {
            expect(onValidationChange).toHaveBeenCalledWith(false, expect.arrayContaining([
                expect.stringContaining('Missing KYC details are required')
            ]))
        })

        // Fill in the missing KYC details
        const missingDetailsField = screen.getByLabelText(/missing kyc details/i)
        await user.type(missingDetailsField, 'Missing passport copy')

        // Should still be invalid due to missing source of funds documents
        await waitFor(() => {
            expect(onValidationChange).toHaveBeenCalledWith(false, expect.arrayContaining([
                expect.stringContaining('source of funds document')
            ]))
        })
    })

    it('handles document upload for source of funds', async () => {
        const onDataChange = vi.fn()
        render(<KYCQuestionnaireForm {...defaultProps} onDataChange={onDataChange} />)

        // Mock successful document upload
        const uploadButton = screen.getByTestId('mock-upload-success')
        fireEvent.click(uploadButton)

        await waitFor(() => {
            expect(onDataChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    source_of_funds_docs: [1]
                }),
                expect.any(Array)
            )
        })
    })

    it('handles exception selection', async () => {
        const onDataChange = vi.fn()
        render(<KYCQuestionnaireForm {...defaultProps} onDataChange={onDataChange} />)

        // Mock exception selection
        const addExceptionButton = screen.getByTestId('mock-add-exception')
        fireEvent.click(addExceptionButton)

        await waitFor(() => {
            expect(onDataChange).toHaveBeenCalledWith(
                expect.any(Object),
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'kyc_non_compliance',
                        description: 'Test exception'
                    })
                ])
            )
        })
    })

    it('populates form with initial data', () => {
        const initialData: Partial<KYCQuestionnaire> = {
            purpose_of_account: 'Initial purpose',
            kyc_documents_complete: 'yes',
            account_purpose_aligned: 'yes'
        }

        render(<KYCQuestionnaireForm {...defaultProps} initialData={initialData} />)

        expect(screen.getByDisplayValue('Initial purpose')).toBeInTheDocument()
        // Check specific select elements by their IDs
        const kycSelect = screen.getByLabelText(/kyc documents complete/i)
        expect(kycSelect).toHaveValue('yes')
        const purposeSelect = screen.getByLabelText(/account purpose aligned/i)
        expect(purposeSelect).toHaveValue('yes')
    })

    it('disables form when disabled prop is true', () => {
        render(<KYCQuestionnaireForm {...defaultProps} disabled={true} />)

        const purposeField = screen.getByLabelText(/purpose of this account/i)
        const kycCompleteSelect = screen.getByLabelText(/kyc documents complete/i)

        expect(purposeField).toBeDisabled()
        expect(kycCompleteSelect).toBeDisabled()
    })

    it('shows validation summary when there are errors', async () => {
        render(<KYCQuestionnaireForm {...defaultProps} />)

        // Should show validation errors
        await waitFor(() => {
            expect(screen.getByText(/please address the following issues/i)).toBeInTheDocument()
        })
    })

    it('shows completion status when form is valid', async () => {
        const user = userEvent.setup()
        render(<KYCQuestionnaireForm {...defaultProps} />)

        // Fill in all required fields
        await user.type(screen.getByLabelText(/purpose of this account/i), 'Business operations')

        // Mock document upload to satisfy source of funds requirement
        fireEvent.click(screen.getByTestId('mock-upload-success'))

        await waitFor(() => {
            expect(screen.getByText(/kyc questionnaire is complete and valid/i)).toBeInTheDocument()
        })
    })

    it('handles all dropdown options correctly', async () => {
        const user = userEvent.setup()
        render(<KYCQuestionnaireForm {...defaultProps} />)

        // Test Yes/No/NA dropdown
        const kycCompleteSelect = screen.getByLabelText(/kyc documents complete/i)
        await user.selectOptions(kycCompleteSelect, 'not_applicable')
        expect(kycCompleteSelect).toHaveValue('not_applicable')

        // Test Yes/No dropdown
        const seniorMgmtSelect = screen.getByLabelText(/senior management approval/i)
        await user.selectOptions(seniorMgmtSelect, 'yes')
        expect(seniorMgmtSelect).toHaveValue('yes')
    })

    it('handles text area inputs correctly', async () => {
        const user = userEvent.setup()
        const onDataChange = vi.fn()
        render(<KYCQuestionnaireForm {...defaultProps} onDataChange={onDataChange} />)

        const purposeField = screen.getByLabelText(/purpose of this account/i)
        await user.type(purposeField, 'Test purpose')

        await waitFor(() => {
            expect(onDataChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    purpose_of_account: 'Test purpose'
                }),
                expect.any(Array)
            )
        })
    })

    it('validates remedial actions when critical issues are identified', async () => {
        const user = userEvent.setup()
        const onValidationChange = vi.fn()
        render(<KYCQuestionnaireForm {...defaultProps} onValidationChange={onValidationChange} />)

        // Fill required field
        await user.type(screen.getByLabelText(/purpose of this account/i), 'Business operations')

        // Select "No" for a critical question
        await user.selectOptions(screen.getByLabelText(/static data correct/i), 'no')

        // Should require remedial actions
        await waitFor(() => {
            expect(onValidationChange).toHaveBeenCalledWith(false, expect.arrayContaining([
                expect.stringContaining('Remedial actions are required')
            ]))
        })

        // Fill in remedial actions
        const remedialField = screen.getByLabelText(/remedial actions/i)
        await user.type(remedialField, 'Update client information')

        // Should still be invalid due to missing documents, but remedial actions error should be gone
        await waitFor(() => {
            const lastCall = onValidationChange.mock.calls[onValidationChange.mock.calls.length - 1]
            const errors = lastCall[1]
            expect(errors.some((error: string) => error.includes('Remedial actions'))).toBe(false)
        })
    })

    it('handles document deletion', async () => {
        const onDataChange = vi.fn()
        render(<KYCQuestionnaireForm {...defaultProps} onDataChange={onDataChange} />)

        // First upload a document
        fireEvent.click(screen.getByTestId('mock-upload-success'))

        await waitFor(() => {
            expect(screen.getByText('test.pdf')).toBeInTheDocument()
        })

        // Then remove it
        const removeButton = screen.getByText('Remove')
        fireEvent.click(removeButton)

        await waitFor(() => {
            expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
        })

        // Should update form data
        expect(onDataChange).toHaveBeenCalledWith(
            expect.objectContaining({
                source_of_funds_docs: []
            }),
            expect.any(Array)
        )
    })
})