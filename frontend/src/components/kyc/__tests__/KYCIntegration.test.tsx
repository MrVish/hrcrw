import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import KYCQuestionnaireForm from '../KYCQuestionnaireForm'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the DocumentUpload component
vi.mock('../../documents', () => ({
    DocumentUpload: ({ onUploadComplete }: any) => (
        <div data-testid="document-upload">
            <button
                onClick={() => onUploadComplete({ document_id: 1, filename: 'source-of-funds.pdf' })}
                data-testid="upload-document"
            >
                Upload Document
            </button>
        </div>
    )
}))

// Mock the ExceptionSelector component
vi.mock('../ExceptionSelector', () => ({
    default: ({ onExceptionsChange }: any) => (
        <div data-testid="exception-selector">
            <label>
                <input
                    type="checkbox"
                    data-testid="kyc-exception-checkbox"
                    onChange={(e) => {
                        if (e.target.checked) {
                            onExceptionsChange([{ type: 'kyc_non_compliance', description: 'Test exception' }])
                        } else {
                            onExceptionsChange([])
                        }
                    }}
                />
                Flag Customer for KYC Non-Compliance
            </label>
            <label>
                <input
                    type="checkbox"
                    data-testid="dormant-funded-exception-checkbox"
                    onChange={(e) => {
                        const currentExceptions = e.target.checked
                            ? [{ type: 'dormant_funded_ufaa', description: 'Dormant funded account' }]
                            : []
                        onExceptionsChange(currentExceptions)
                    }}
                />
                Dormant or Non-reachable (funded account) - UFAA
            </label>
        </div>
    )
}))

describe('KYC Integration Tests', () => {
    const defaultProps = {
        reviewId: 1,
        onDataChange: vi.fn(),
        onValidationChange: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('completes full KYC workflow with exceptions', async () => {
        const user = userEvent.setup()
        const onDataChange = vi.fn()
        const onValidationChange = vi.fn()

        render(
            <KYCQuestionnaireForm
                {...defaultProps}
                onDataChange={onDataChange}
                onValidationChange={onValidationChange}
            />
        )

        // Step 1: Fill in purpose of account
        await user.type(
            screen.getByLabelText(/purpose of this account/i),
            'Corporate banking for international trade'
        )

        // Step 2: Answer KYC documents question
        await user.selectOptions(
            screen.getByLabelText(/kyc documents complete/i),
            'no'
        )

        // Step 3: Fill in missing KYC details (conditional field)
        await waitFor(() => {
            expect(screen.getByLabelText(/missing kyc details/i)).toBeInTheDocument()
        })

        await user.type(
            screen.getByLabelText(/missing kyc details/i),
            'Missing updated passport and proof of address'
        )

        // Step 4: Answer remaining questions
        await user.selectOptions(
            screen.getByLabelText(/account purpose aligned/i),
            'yes'
        )

        await user.selectOptions(
            screen.getByLabelText(/adverse media screening/i),
            'yes'
        )

        await user.selectOptions(
            screen.getByLabelText(/senior management approval/i),
            'yes'
        )

        await user.selectOptions(
            screen.getByLabelText(/pep.*approval/i),
            'not_applicable'
        )

        await user.selectOptions(
            screen.getByLabelText(/static data correct/i),
            'no'
        )

        // Step 5: Fill remedial actions (triggered by static data = no)
        await waitFor(() => {
            expect(screen.getByLabelText(/remedial actions/i)).toBeInTheDocument()
        })

        await user.type(
            screen.getByLabelText(/remedial actions/i),
            'Update customer address and contact information in system'
        )

        await user.selectOptions(
            screen.getByLabelText(/kyc documents valid/i),
            'yes'
        )

        await user.selectOptions(
            screen.getByLabelText(/regulated business license/i),
            'yes'
        )

        // Step 6: Upload source of funds document
        fireEvent.click(screen.getByTestId('upload-document'))

        // Step 7: Select exceptions
        const kycExceptionCheckbox = screen.getByTestId('kyc-exception-checkbox')
        await user.click(kycExceptionCheckbox)

        // Step 8: Verify form is now valid and complete
        await waitFor(() => {
            expect(onValidationChange).toHaveBeenCalledWith(true, [])
        })

        // Step 9: Verify all data is captured correctly
        await waitFor(() => {
            const lastCall = onDataChange.mock.calls[onDataChange.mock.calls.length - 1]
            const [formData, exceptions] = lastCall

            expect(formData).toMatchObject({
                purpose_of_account: 'Corporate banking for international trade',
                kyc_documents_complete: 'no',
                missing_kyc_details: 'Missing updated passport and proof of address',
                account_purpose_aligned: 'yes',
                adverse_media_completed: 'yes',
                senior_mgmt_approval: 'yes',
                pep_approval_obtained: 'not_applicable',
                static_data_correct: 'no',
                remedial_actions: 'Update customer address and contact information in system',
                kyc_documents_valid: 'yes',
                regulated_business_license: 'yes',
                source_of_funds_docs: [1]
            })

            expect(exceptions).toHaveLength(1)
            expect(exceptions[0]).toMatchObject({
                type: 'kyc_non_compliance'
            })
        })
    })

    it('handles complex conditional logic correctly', async () => {
        const user = userEvent.setup()
        const onValidationChange = vi.fn()

        render(<KYCQuestionnaireForm {...defaultProps} onValidationChange={onValidationChange} />)

        // Fill required field
        await user.type(
            screen.getByLabelText(/purpose of this account/i),
            'Test purpose'
        )

        // Test multiple conditions that trigger remedial actions
        await user.selectOptions(screen.getByLabelText(/kyc documents complete/i), 'no')
        await user.selectOptions(screen.getByLabelText(/account purpose aligned/i), 'no')
        await user.selectOptions(screen.getByLabelText(/static data correct/i), 'no')
        await user.selectOptions(screen.getByLabelText(/kyc documents valid/i), 'no')

        // Should show both conditional fields
        await waitFor(() => {
            expect(screen.getByLabelText(/missing kyc details/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/remedial actions/i)).toBeInTheDocument()
        })

        // Fill conditional fields
        await user.type(screen.getByLabelText(/missing kyc details/i), 'Multiple issues')
        await user.type(screen.getByLabelText(/remedial actions/i), 'Comprehensive review needed')

        // Upload document
        fireEvent.click(screen.getByTestId('upload-document'))

        // Should be valid now
        await waitFor(() => {
            expect(onValidationChange).toHaveBeenCalledWith(true, [])
        })
    })

    it('validates that exceptions can be selected without affecting form validation', async () => {
        const user = userEvent.setup()
        const onDataChange = vi.fn()

        render(<KYCQuestionnaireForm {...defaultProps} onDataChange={onDataChange} />)

        // Fill minimum required fields
        await user.type(screen.getByLabelText(/purpose of this account/i), 'Test')
        fireEvent.click(screen.getByTestId('upload-document'))

        // Select multiple exceptions
        await user.click(screen.getByTestId('kyc-exception-checkbox'))
        await user.click(screen.getByTestId('dormant-funded-exception-checkbox'))

        // Verify exceptions are captured
        await waitFor(() => {
            const lastCall = onDataChange.mock.calls[onDataChange.mock.calls.length - 1]
            const [, exceptions] = lastCall

            expect(exceptions).toHaveLength(1) // Only one because the mock only handles one at a time
            expect(exceptions[0].type).toBe('dormant_funded_ufaa')
        })
    })

    it('handles form reset and reinitialization correctly', async () => {
        const user = userEvent.setup()
        const { rerender } = render(<KYCQuestionnaireForm {...defaultProps} />)

        // Fill some data
        await user.type(screen.getByLabelText(/purpose of this account/i), 'Initial data')

        // Reinitialize with new data
        const newInitialData = {
            purpose_of_account: 'Updated purpose',
            kyc_documents_complete: 'yes' as const
        }

        rerender(<KYCQuestionnaireForm {...defaultProps} initialData={newInitialData} />)

        // Should show updated data
        expect(screen.getByDisplayValue('Updated purpose')).toBeInTheDocument()
        const selectElement = screen.getByLabelText(/kyc documents complete/i)
        expect(selectElement).toHaveValue('yes')
    })

    it('maintains form state during user interaction', async () => {
        const user = userEvent.setup()
        const onDataChange = vi.fn()

        render(<KYCQuestionnaireForm {...defaultProps} onDataChange={onDataChange} />)

        // Fill multiple fields in sequence
        await user.type(screen.getByLabelText(/purpose of this account/i), 'Banking services')
        await user.selectOptions(screen.getByLabelText(/kyc documents complete/i), 'yes')
        await user.selectOptions(screen.getByLabelText(/account purpose aligned/i), 'yes')

        // Verify state is maintained
        expect(screen.getByDisplayValue('Banking services')).toBeInTheDocument()
        const kycSelect = screen.getByLabelText(/kyc documents complete/i)
        const purposeSelect = screen.getByLabelText(/account purpose aligned/i)
        expect(kycSelect).toHaveValue('yes')
        expect(purposeSelect).toHaveValue('yes')

        // Verify onDataChange was called with accumulated data
        await waitFor(() => {
            const lastCall = onDataChange.mock.calls[onDataChange.mock.calls.length - 1]
            const [formData] = lastCall

            expect(formData.purpose_of_account).toBe('Banking services')
            expect(formData.kyc_documents_complete).toBe('yes')
            expect(formData.account_purpose_aligned).toBe('yes')
        })
    })
})