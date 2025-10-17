import React from 'react'
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    Info,
    Clock,
    Download,
    ExternalLink
} from 'lucide-react'
import type { KYCQuestionnaire, Document } from '../../types'
import './KYCResponseDisplay.css'

interface KYCResponseDisplayProps {
    questionnaire: KYCQuestionnaire
    documents?: Document[]
    className?: string
    showDocumentLinks?: boolean
}

interface QuestionDisplayProps {
    number: number
    question: string
    answer: string | undefined
    type: 'text' | 'dropdown' | 'conditional' | 'document'
    isConditional?: boolean
    conditionMet?: boolean
    conditionDescription?: string
    documents?: Document[]
    showDocumentLinks?: boolean
}

const formatYesNoNA = (value: string | undefined): string => {
    switch (value) {
        case 'yes': return 'Yes'
        case 'no': return 'No'
        case 'not_applicable': return 'Not Applicable'
        default: return 'Not Answered'
    }
}

const formatYesNo = (value: string | undefined): string => {
    switch (value) {
        case 'yes': return 'Yes'
        case 'no': return 'No'
        default: return 'Not Answered'
    }
}

const getAnswerIcon = (value: string | undefined, type: 'yesno' | 'text' | 'document') => {
    if (type === 'text') {
        return value && value.trim() ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
        )
    }

    if (type === 'document') {
        return <FileText className="h-4 w-4 text-blue-600" />
    }

    switch (value) {
        case 'yes':
            return <CheckCircle className="h-4 w-4 text-green-600" />
        case 'no':
            return <XCircle className="h-4 w-4 text-red-600" />
        case 'not_applicable':
            return <Info className="h-4 w-4 text-gray-500" />
        default:
            return <Clock className="h-4 w-4 text-orange-500" />
    }
}

const getAnswerSeverity = (value: string | undefined, type: 'yesno' | 'text' | 'document'): 'success' | 'warning' | 'error' | 'info' => {
    if (type === 'text') {
        return value && value.trim() ? 'success' : 'warning'
    }

    if (type === 'document') {
        return 'info'
    }

    switch (value) {
        case 'yes': return 'success'
        case 'no': return 'error'
        case 'not_applicable': return 'info'
        default: return 'warning'
    }
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
    number,
    question,
    answer,
    type,
    isConditional = false,
    conditionMet = true,
    conditionDescription,
    documents = [],
    showDocumentLinks = true
}) => {
    const severity = getAnswerSeverity(answer, type === 'document' ? 'document' : type === 'text' ? 'text' : 'yesno')
    const icon = getAnswerIcon(answer, type === 'document' ? 'document' : type === 'text' ? 'text' : 'yesno')

    // Don't render conditional questions that don't meet their condition
    if (isConditional && !conditionMet) {
        return null
    }

    return (
        <div className={`kyc-question ${severity} ${isConditional ? 'conditional' : ''}`}>
            <div className="question-header">
                <div className="question-number">
                    <span className="number">{number}</span>
                    {isConditional && (
                        <span className="conditional-badge" title={conditionDescription}>
                            Conditional
                        </span>
                    )}
                </div>
                <div className="question-text">
                    <h4>{question}</h4>
                    {isConditional && conditionDescription && (
                        <p className="condition-description">
                            <Info className="h-3 w-3" />
                            {conditionDescription}
                        </p>
                    )}
                </div>
                <div className="answer-status">
                    {icon}
                </div>
            </div>

            <div className="question-answer">
                {type === 'document' ? (
                    <div className="document-answer">
                        {documents.length > 0 ? (
                            <div className="document-list">
                                <span className="document-count">
                                    {documents.length} document{documents.length > 1 ? 's' : ''} uploaded
                                </span>
                                {showDocumentLinks && (
                                    <div className="document-items">
                                        {documents.map((doc, index) => (
                                            <div key={doc.id || index} className="document-item">
                                                <FileText className="h-4 w-4" />
                                                <span className="document-name">{doc.filename}</span>
                                                <button
                                                    className="document-link"
                                                    title="View document"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="no-documents">No documents uploaded</span>
                        )}
                    </div>
                ) : type === 'text' ? (
                    <div className="text-answer">
                        {answer && answer.trim() ? (
                            <p className="answer-text">{answer}</p>
                        ) : (
                            <span className="no-answer">No response provided</span>
                        )}
                    </div>
                ) : (
                    <div className="dropdown-answer">
                        <span className="answer-value">
                            {type === 'dropdown' ? formatYesNoNA(answer) : formatYesNo(answer)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

export const KYCResponseDisplay: React.FC<KYCResponseDisplayProps> = ({
    questionnaire,
    documents = [],
    className = '',
    showDocumentLinks = true
}) => {
    // Filter documents for source of funds (Q12)
    const sourceOfFundsDocuments = documents.filter(doc =>
        questionnaire.source_of_funds_docs?.includes(doc.id)
    )

    // Determine conditional question visibility
    const showMissingKycDetails = questionnaire.kyc_documents_complete === 'no'
    const showRemedialActions = [
        questionnaire.kyc_documents_complete === 'no',
        questionnaire.account_purpose_aligned === 'no',
        questionnaire.static_data_correct === 'no',
        questionnaire.kyc_documents_valid === 'no'
    ].some(Boolean)

    const questions = [
        {
            number: 1,
            question: "What is the purpose of this account?",
            answer: questionnaire.purpose_of_account,
            type: 'text' as const
        },
        {
            number: 2,
            question: "Are all KYC documents complete and up to date?",
            answer: questionnaire.kyc_documents_complete,
            type: 'dropdown' as const
        },
        {
            number: 3,
            question: "What KYC details are missing or need to be updated?",
            answer: questionnaire.missing_kyc_details,
            type: 'text' as const,
            isConditional: true,
            conditionMet: showMissingKycDetails,
            conditionDescription: "Required when KYC documents are incomplete"
        },
        {
            number: 4,
            question: "Is the account purpose aligned with the client's business activities?",
            answer: questionnaire.account_purpose_aligned,
            type: 'dropdown' as const
        },
        {
            number: 5,
            question: "Has adverse media screening been completed?",
            answer: questionnaire.adverse_media_completed,
            type: 'dropdown' as const
        },
        {
            number: 6,
            question: "Has senior management approval been obtained (if required)?",
            answer: questionnaire.senior_mgmt_approval,
            type: 'conditional' as const
        },
        {
            number: 7,
            question: "Has PEP (Politically Exposed Person) approval been obtained?",
            answer: questionnaire.pep_approval_obtained,
            type: 'dropdown' as const
        },
        {
            number: 8,
            question: "Is all static data correct and up to date?",
            answer: questionnaire.static_data_correct,
            type: 'dropdown' as const
        },
        {
            number: 9,
            question: "Are all KYC documents valid and not expired?",
            answer: questionnaire.kyc_documents_valid,
            type: 'dropdown' as const
        },
        {
            number: 10,
            question: "Has regulated business license been obtained (if applicable)?",
            answer: questionnaire.regulated_business_license,
            type: 'dropdown' as const
        },
        {
            number: 11,
            question: "What remedial actions are required to address identified issues?",
            answer: questionnaire.remedial_actions,
            type: 'text' as const,
            isConditional: true,
            conditionMet: showRemedialActions,
            conditionDescription: "Required when critical issues are identified"
        },
        {
            number: 12,
            question: "Source of funds documentation",
            answer: `${sourceOfFundsDocuments.length} documents`,
            type: 'document' as const,
            documents: sourceOfFundsDocuments
        }
    ]

    // Additional evidence for Q5
    const hasAdverseMediaEvidence = questionnaire.adverse_media_evidence && questionnaire.adverse_media_evidence.trim()

    return (
        <div className={`kyc-response-display ${className}`}>
            <div className="response-header">
                <h3 className="response-title">KYC Assessment Responses</h3>
                <div className="response-meta">
                    <span className="completion-status">
                        {questions.filter(q => !q.isConditional || q.conditionMet).length} questions
                    </span>
                    <span className="timestamp">
                        {questionnaire.created_at && new Date(questionnaire.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="response-content">
                <div className="questions-list">
                    {questions.map((question) => (
                        <QuestionDisplay
                            key={question.number}
                            number={question.number}
                            question={question.question}
                            answer={question.answer}
                            type={question.type}
                            isConditional={question.isConditional}
                            conditionMet={question.conditionMet}
                            conditionDescription={question.conditionDescription}
                            documents={question.documents}
                            showDocumentLinks={showDocumentLinks}
                        />
                    ))}
                </div>

                {/* Additional Evidence Section */}
                {hasAdverseMediaEvidence && (
                    <div className="additional-evidence">
                        <h4 className="evidence-title">
                            <Info className="h-4 w-4" />
                            Additional Evidence (Q5)
                        </h4>
                        <div className="evidence-content">
                            <p>{questionnaire.adverse_media_evidence}</p>
                        </div>
                    </div>
                )}

                {/* Summary Section */}
                <div className="response-summary">
                    <div className="summary-stats">
                        <div className="stat-item success">
                            <CheckCircle className="h-4 w-4" />
                            <span>
                                {questions.filter(q =>
                                    (!q.isConditional || q.conditionMet) &&
                                    (q.answer === 'yes' || (q.type === 'text' && q.answer && q.answer.trim()) ||
                                        (q.type === 'document' && q.documents && q.documents.length > 0))
                                ).length} Positive
                            </span>
                        </div>
                        <div className="stat-item error">
                            <XCircle className="h-4 w-4" />
                            <span>
                                {questions.filter(q =>
                                    (!q.isConditional || q.conditionMet) && q.answer === 'no'
                                ).length} Issues
                            </span>
                        </div>
                        <div className="stat-item warning">
                            <AlertTriangle className="h-4 w-4" />
                            <span>
                                {questions.filter(q =>
                                    (!q.isConditional || q.conditionMet) &&
                                    (!q.answer || q.answer === '' ||
                                        (q.type === 'text' && (!q.answer || !q.answer.trim())))
                                ).length} Missing
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default KYCResponseDisplay