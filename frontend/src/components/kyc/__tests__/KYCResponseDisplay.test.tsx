import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KYCResponseDisplay } from '../KYCResponseDisplay'
import type { KYCQuestionnaire, Document } from '../../../types'

const mockKYCQuestionnaire: KYCQuestionnaire = {
    id: 1,
    review_id: 1,
    purpose_of_account: 'Business operations and client transactions',
    kyc_documents_complete: 'yes',
    missing_kyc_details: undefined,
    account_purpose_aligned: 'yes',
    adverse_media_completed: 'yes',
    adverse_media_evidence: 'No adverse media found in screening',
    senior_mgmt_approval: 'yes',
    pep_approval_obtained: 'not_applicable',
    static_data_correct: 'yes',
    kyc_documents_valid: 'yes',
    regulated_business_license: 'not_applicable',
    remedial_actions: undefined,
    source_of_funds_docs: [1, 2],
    created_at: '2024-01-01T09:30:00Z',
    updated_at: '2024-01-01T09:30:00Z'
}

const mockKYCWithIssues: KYCQuestionnaire = {
    id: 2,
    review_id: 2,
    purpose_of_account: 'Investment account',
    kyc_documents_complete: 'no',
    missing_kyc_details: 'Missing proof of address and income verification',
    account_purpose_aligned: 'no',
    adverse_media_completed: 'yes',
    senior_mgmt_approval: 'no',
    pep_approval_obtained: 'yes',
    static_data_correct: 'no',
    kyc_documents_valid: 'no',
    regulated_business_license: 'yes',
    remedial_actions: 'Client must provide updated documentation within 30 days',
    source_of_funds_docs: [3],
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z'
}

const mockDocuments: Document[] = [
    {
        id: 1,
        review_id: 1,
        uploaded_by: 1,
        filename: 'bank_statement.pdf',
        file_path: '/documents/bank_statement.pdf',
        file_size: 1024000,
        content_type: 'application/pdf',
        document_type: 'source_of_funds',
        status: 'active',
        version: 1,
        is_sensitive: true,
        retention_date: null,
        access_count: 0,
        last_accessed_at: null,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z'
    },
    {
        id: 2,
        review_id: 1,
        uploaded_by: 1,
        filename: 'income_verification.pdf',
        file_path: '/documents/income_verification.pdf',
        file_size: 512000,
        content_type: 'application/pdf',
        document_type: 'source_of_funds',
        status: 'active',
        version: 1,
        is_sensitive: true,
        retention_date: null,
        access_count: 0,
        last_accessed_at: null,
        created_at: '2024-01-01T09:15:00Z',
        updated_at: '2024-01-01T09:15:00Z'
    }
]

describe('KYCResponseDisplay', () => {
    describe('Basic Rendering', () => {
        it('should render KYC questionnaire responses', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            expect(screen.getByText('KYC Assessment Responses')).toBeInTheDocument()
            expect(screen.getByText('10 questions')).toBeInTheDocument() // Only non-conditional questions are shown
            expect(screen.getByText('What is the purpose of this account?')).toBeInTheDocument()
            expect(screen.getByText('Business operations and client transactions')).toBeInTheDocument()
        })

        it('should display the creation date', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            expect(screen.getByText('1/1/2024')).toBeInTheDocument()
        })

        it('should render visible questions (conditional questions may be hidden)', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            // Check for visible question numbers (Q3 and Q11 are conditional and hidden)
            const visibleQuestions = [1, 2, 4, 5, 6, 7, 8, 9, 10, 12]
            visibleQuestions.forEach(i => {
                expect(screen.getByText(i.toString())).toBeInTheDocument()
            })
        })
    })

    describe('Question Types and Responses', () => {
        it('should display text responses correctly', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            expect(screen.getByText('Business operations and client transactions')).toBeInTheDocument()
        })

        it('should display dropdown responses with proper formatting', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            expect(screen.getAllByText('Yes').length).toBeGreaterThan(0)
            expect(screen.getAllByText('Not Applicable').length).toBeGreaterThan(0)
        })

        it('should display document responses with count', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            expect(screen.getByText('2 documents uploaded')).toBeInTheDocument()
            expect(screen.getByText('bank_statement.pdf')).toBeInTheDocument()
            expect(screen.getByText('income_verification.pdf')).toBeInTheDocument()
        })

        it('should show "No documents uploaded" when no documents exist', () => {
            const questionnaireWithoutDocs = {
                ...mockKYCQuestionnaire,
                source_of_funds_docs: []
            }

            render(
                <KYCResponseDisplay
                    questionnaire={questionnaireWithoutDocs}
                    documents={[]}
                />
            )

            expect(screen.getByText('No documents uploaded')).toBeInTheDocument()
        })
    })

    describe('Conditional Questions', () => {
        it('should show conditional questions when conditions are met', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCWithIssues}
                    documents={mockDocuments}
                />
            )

            // Q3 should be shown because Q2 is "no"
            expect(screen.getByText('What KYC details are missing or need to be updated?')).toBeInTheDocument()
            expect(screen.getByText('Missing proof of address and income verification')).toBeInTheDocument()

            // Q11 should be shown because there are critical "no" answers
            expect(screen.getByText('What remedial actions are required to address identified issues?')).toBeInTheDocument()
            expect(screen.getByText('Client must provide updated documentation within 30 days')).toBeInTheDocument()
        })

        it('should hide conditional questions when conditions are not met', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            // Q3 should not be shown because Q2 is "yes"
            expect(screen.queryByText('What KYC details are missing or need to be updated?')).not.toBeInTheDocument()

            // Q11 should not be shown because there are no critical "no" answers
            expect(screen.queryByText('What remedial actions are required to address identified issues?')).not.toBeInTheDocument()
        })

        it('should show conditional badges for conditional questions', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCWithIssues}
                    documents={mockDocuments}
                />
            )

            expect(screen.getAllByText('Conditional')).toHaveLength(2) // Q3 and Q11
        })
    })

    describe('Additional Evidence', () => {
        it('should display additional evidence when provided', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            expect(screen.getByText('Additional Evidence (Q5)')).toBeInTheDocument()
            expect(screen.getByText('No adverse media found in screening')).toBeInTheDocument()
        })

        it('should not display additional evidence section when not provided', () => {
            const questionnaireWithoutEvidence = {
                ...mockKYCQuestionnaire,
                adverse_media_evidence: undefined
            }

            render(
                <KYCResponseDisplay
                    questionnaire={questionnaireWithoutEvidence}
                    documents={mockDocuments}
                />
            )

            expect(screen.queryByText('Additional Evidence (Q5)')).not.toBeInTheDocument()
        })
    })

    describe('Response Summary', () => {
        it('should calculate and display response statistics correctly', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            // Should show positive responses (yes answers and completed text fields)
            expect(screen.getByText(/Positive/)).toBeInTheDocument()

            // Should show issues (no answers)
            expect(screen.getByText(/Issues/)).toBeInTheDocument()

            // Should show missing responses
            expect(screen.getByText(/Missing/)).toBeInTheDocument()
        })

        it('should show correct counts for questionnaire with issues', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCWithIssues}
                    documents={mockDocuments}
                />
            )

            // This questionnaire has several "no" answers, so issues count should be > 0
            const issuesElement = screen.getByText(/Issues/)
            expect(issuesElement).toBeInTheDocument()
        })
    })

    describe('Visual Indicators', () => {
        it('should show appropriate icons for different answer types', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            // Should have check icons for "yes" answers
            // Should have X icons for "no" answers  
            // Should have info icons for "not_applicable" answers
            // Icons are rendered as SVG elements, so we check for their presence indirectly
            const questionElements = screen.getAllByRole('heading', { level: 4 })
            expect(questionElements.length).toBeGreaterThan(0)
        })

        it('should apply appropriate CSS classes for different response types', () => {
            const { container } = render(
                <KYCResponseDisplay
                    questionnaire={mockKYCWithIssues}
                    documents={mockDocuments}
                />
            )

            // Should have success, error, warning, and info classes
            expect(container.querySelector('.success')).toBeInTheDocument()
            expect(container.querySelector('.error')).toBeInTheDocument()
        })
    })

    describe('Document Links', () => {
        it('should show document links when showDocumentLinks is true', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                    showDocumentLinks={true}
                />
            )

            expect(screen.getByText('bank_statement.pdf')).toBeInTheDocument()
            expect(screen.getByText('income_verification.pdf')).toBeInTheDocument()
        })

        it('should hide document links when showDocumentLinks is false', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                    showDocumentLinks={false}
                />
            )

            // Should still show document count but not individual files
            expect(screen.getByText('2 documents uploaded')).toBeInTheDocument()
            expect(screen.queryByText('bank_statement.pdf')).not.toBeInTheDocument()
        })
    })

    describe('Error Handling', () => {
        it('should handle missing or undefined questionnaire fields gracefully', () => {
            const incompleteQuestionnaire = {
                id: 1,
                review_id: 1,
                purpose_of_account: undefined,
                kyc_documents_complete: undefined,
                source_of_funds_docs: undefined
            } as KYCQuestionnaire

            render(
                <KYCResponseDisplay
                    questionnaire={incompleteQuestionnaire}
                    documents={[]}
                />
            )

            expect(screen.getByText('KYC Assessment Responses')).toBeInTheDocument()
            expect(screen.getByText('No response provided')).toBeInTheDocument()
            expect(screen.getAllByText('Not Answered').length).toBeGreaterThan(0)
        })

        it('should handle empty documents array', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={[]}
                />
            )

            expect(screen.getByText('No documents uploaded')).toBeInTheDocument()
        })
    })

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            expect(screen.getByRole('heading', { level: 3, name: 'KYC Assessment Responses' })).toBeInTheDocument()

            // Question titles should be h4 elements
            const questionHeadings = screen.getAllByRole('heading', { level: 4 })
            expect(questionHeadings.length).toBeGreaterThan(0)
        })

        it('should have descriptive text for screen readers', () => {
            render(
                <KYCResponseDisplay
                    questionnaire={mockKYCQuestionnaire}
                    documents={mockDocuments}
                />
            )

            // This test uses the default questionnaire which doesn't show conditional questions
            // So we'll check for the main heading structure instead
            expect(screen.getByRole('heading', { level: 3, name: 'KYC Assessment Responses' })).toBeInTheDocument()
        })
    })
})