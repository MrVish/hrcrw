import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Select,
    MenuItem,
    FormControl,
    Alert,
    Divider,
    useTheme,
    Paper,
    Stack,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    FormHelperText
} from '@mui/material'
import {
    Warning as AlertTriangleIcon,
    CheckCircle as CheckCircleIcon,
    Description as FileTextIcon,
    CloudUpload as UploadIcon,
    Info as InfoIcon,
    Delete as DeleteIcon,
    Quiz as QuizIcon
} from '@mui/icons-material'
import { DocumentUpload } from '../documents'
import { ExceptionSelector } from './'
import type { KYCQuestionnaire, YesNoNA, Document } from '../../types'
import type { KYCExceptionType } from './ExceptionSelector'

interface SelectedException {
    type: KYCExceptionType
    description: string
}

interface KYCQuestionnaireFormProps {
    reviewId: number
    initialData?: Partial<KYCQuestionnaire>
    initialExceptions?: SelectedException[]
    onDataChange?: (data: KYCQuestionnaire, exceptions: SelectedException[]) => void
    onValidationChange?: (isValid: boolean, errors: string[]) => void
    disabled?: boolean
    readOnly?: boolean
}

interface ValidationErrors {
    [key: string]: string[]
}

const YES_NO_NA_OPTIONS = [
    { value: '', label: 'Select an option...', icon: '❓' },
    { value: 'yes', label: 'Yes', icon: '✅' },
    { value: 'no', label: 'No', icon: '❌' },
    { value: 'not_applicable', label: 'Not Applicable', icon: '➖' }
]

const YES_NO_OPTIONS = [
    { value: '', label: 'Select an option...', icon: '❓' },
    { value: 'yes', label: 'Yes', icon: '✅' },
    { value: 'no', label: 'No', icon: '❌' }
]

export const KYCQuestionnaireForm: React.FC<KYCQuestionnaireFormProps> = ({
    reviewId,
    initialData,
    initialExceptions = [],
    onDataChange,
    onValidationChange,
    disabled = false,
    readOnly = false
}) => {
    // Use refs to store the latest callbacks to avoid dependency issues
    const onDataChangeRef = useRef(onDataChange)
    const onValidationChangeRef = useRef(onValidationChange)

    // Store previous values to detect actual changes
    const prevFormDataRef = useRef<KYCQuestionnaire | undefined>(undefined)
    const prevExceptionsRef = useRef<SelectedException[] | undefined>(undefined)
    const prevValidationRef = useRef<{ isValid: boolean; errors: string[] } | undefined>(undefined)

    // Update refs when callbacks change (only if they actually changed)
    useEffect(() => {
        if (onDataChangeRef.current !== onDataChange) {
            onDataChangeRef.current = onDataChange
        }
    }, [onDataChange])

    useEffect(() => {
        if (onValidationChangeRef.current !== onValidationChange) {
            onValidationChangeRef.current = onValidationChange
        }
    }, [onValidationChange])
    const [formData, setFormData] = useState<KYCQuestionnaire>({
        review_id: reviewId,
        purpose_of_account: '',
        kyc_documents_complete: undefined,
        missing_kyc_details: '',
        account_purpose_aligned: undefined,
        adverse_media_completed: undefined,
        adverse_media_evidence: '',
        senior_mgmt_approval: undefined,
        pep_approval_obtained: undefined,
        static_data_correct: undefined,
        kyc_documents_valid: undefined,
        regulated_business_license: undefined,
        remedial_actions: '',
        source_of_funds_docs: [],
        ...initialData
    })

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
    const [sourceOfFundsDocuments, setSourceOfFundsDocuments] = useState<Document[]>([])
    const [selectedExceptions, setSelectedExceptions] = useState<SelectedException[]>(initialExceptions)



    // Initialize form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData(prev => {
                // Only update if initialData actually contains different values
                const merged = { ...prev, ...initialData }
                const hasChanges = JSON.stringify(prev) !== JSON.stringify(merged)
                return hasChanges ? merged : prev
            })
        }
    }, [initialData])

    // Validate form and notify parent of changes with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            // Check if formData actually changed
            const formDataChanged = JSON.stringify(prevFormDataRef.current) !== JSON.stringify(formData)
            const exceptionsChanged = JSON.stringify(prevExceptionsRef.current) !== JSON.stringify(selectedExceptions)

            if (!formDataChanged && !exceptionsChanged) {
                return // No changes, skip processing
            }

            // Inline validation to avoid dependency issues
            const errors: ValidationErrors = {}

            // Q1: Purpose of account (always required)
            if (!formData.purpose_of_account?.trim()) {
                errors.purpose_of_account = ['Purpose of account is required']
            }

            // Q3: Missing KYC details (required if Q2 is "no")
            if (formData.kyc_documents_complete === 'no' && !formData.missing_kyc_details?.trim()) {
                errors.missing_kyc_details = ['Missing KYC details are required when KYC documents are incomplete']
            }

            // Q11: Remedial actions (required if any critical questions are "no")
            const criticalNos = [
                formData.kyc_documents_complete === 'no',
                formData.account_purpose_aligned === 'no',
                formData.static_data_correct === 'no',
                formData.kyc_documents_valid === 'no'
            ]

            if (criticalNos.some(Boolean) && !formData.remedial_actions?.trim()) {
                errors.remedial_actions = ['Remedial actions are required when critical issues are identified']
            }

            setValidationErrors(prevErrors => {
                // Only update if errors actually changed
                const errorsChanged = JSON.stringify(prevErrors) !== JSON.stringify(errors)
                return errorsChanged ? errors : prevErrors
            })

            const errorMessages = Object.values(errors).flat()
            const isValid = errorMessages.length === 0

            // Check if validation state changed
            const validationChanged = !prevValidationRef.current ||
                prevValidationRef.current.isValid !== isValid ||
                JSON.stringify(prevValidationRef.current.errors) !== JSON.stringify(errorMessages)

            // Only call validation callback if validation state changed
            if (validationChanged && onValidationChangeRef.current) {
                onValidationChangeRef.current(isValid, errorMessages)
                prevValidationRef.current = { isValid, errors: errorMessages }
            }

            // Only call data callback if data actually changed (prevent infinite loops)
            if ((formDataChanged || exceptionsChanged) && onDataChangeRef.current) {
                onDataChangeRef.current(formData, selectedExceptions)
                prevFormDataRef.current = { ...formData }
                prevExceptionsRef.current = [...selectedExceptions]
            }
        }, 300) // Increased debounce to 300ms to reduce frequency

        return () => clearTimeout(timeoutId)
    }, [formData, selectedExceptions])

    const handleInputChange = useCallback((field: keyof KYCQuestionnaire, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }, [])

    const handleDocumentUpload = useCallback((document: any) => {
        const newDocuments = [...sourceOfFundsDocuments, document]
        setSourceOfFundsDocuments(newDocuments)

        // Update form data with document IDs directly
        const documentIds = newDocuments.map(doc => doc.id)
        setFormData(prev => ({
            ...prev,
            source_of_funds_docs: documentIds
        }))
    }, [sourceOfFundsDocuments])

    const handleDocumentDelete = useCallback((documentId: number) => {
        const updatedDocuments = sourceOfFundsDocuments.filter(doc => doc.id !== documentId)
        setSourceOfFundsDocuments(updatedDocuments)

        // Update form data directly
        const documentIds = updatedDocuments.map(doc => doc.id)
        setFormData(prev => ({
            ...prev,
            source_of_funds_docs: documentIds
        }))
    }, [sourceOfFundsDocuments])

    const handleExceptionsChange = useCallback((exceptions: SelectedException[]) => {
        setSelectedExceptions(exceptions)
    }, [])

    const theme = useTheme()

    const renderFieldError = (fieldName: string) => {
        const errors = validationErrors[fieldName]
        if (!errors || errors.length === 0) return null

        return (
            <FormHelperText error sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <AlertTriangleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                {errors[0]}
            </FormHelperText>
        )
    }

    const renderConditionalInfo = (condition: string) => (
        <FormHelperText sx={{ display: 'flex', alignItems: 'center', mt: 1, color: theme.palette.info.main }}>
            <InfoIcon sx={{ fontSize: 16, mr: 0.5 }} />
            {condition}
        </FormHelperText>
    )

    // Determine if conditional fields should be shown
    const showMissingKycDetails = formData.kyc_documents_complete === 'no'
    const showRemedialActions = [
        formData.kyc_documents_complete === 'no',
        formData.account_purpose_aligned === 'no',
        formData.static_data_correct === 'no',
        formData.kyc_documents_valid === 'no'
    ].some(Boolean)

    return (
        <Box>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    background: readOnly
                        ? `linear-gradient(135deg, ${theme.palette.grey[600]} 0%, ${theme.palette.grey[700]} 100%)`
                        : `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                    color: 'white',
                    p: 3,
                    borderRadius: 2,
                    mb: 3,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <QuizIcon />
                    <Typography variant="h6" fontWeight={600}>
                        KYC Assessment Questionnaire
                        {readOnly && (
                            <Box component="span" sx={{
                                ml: 2,
                                px: 1.5,
                                py: 0.5,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 500
                            }}>
                                READ ONLY
                            </Box>
                        )}
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {readOnly
                        ? 'Viewing completed KYC assessment - all fields are read-only'
                        : 'Complete all 12 questions to provide a comprehensive KYC assessment'
                    }
                </Typography>
            </Paper>

            <Stack spacing={3}>
                {/* Q1: Purpose of Account */}
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            1. What is the purpose of this account? *
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={formData.purpose_of_account || ''}
                            onChange={(e) => handleInputChange('purpose_of_account', e.target.value)}
                            disabled={disabled || readOnly}
                            placeholder="Describe the intended use and purpose of the account..."
                            error={!!validationErrors.purpose_of_account}
                            helperText="Provide a detailed explanation of how the account will be used"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />
                        {renderFieldError('purpose_of_account')}
                    </CardContent>
                </Card>

                {/* Q2: KYC Documents Complete */}
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            2. Are all KYC documents complete and up to date?
                        </Typography>
                        <FormControl fullWidth error={!!validationErrors.kyc_documents_complete}>
                            <Select
                                value={formData.kyc_documents_complete || ''}
                                onChange={(e) => handleInputChange('kyc_documents_complete', e.target.value as YesNoNA)}
                                disabled={disabled || readOnly}
                                displayEmpty
                                sx={{ borderRadius: 2 }}
                            >
                                {YES_NO_NA_OPTIONS.map(option => (
                                    <MenuItem key={option.value} value={option.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <span>{option.icon}</span>
                                            {option.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Select the appropriate status for KYC document completeness</FormHelperText>
                        </FormControl>
                        {renderFieldError('kyc_documents_complete')}
                    </CardContent>
                </Card>

                {/* Q3: Missing KYC Details (Conditional) */}
                {showMissingKycDetails && (
                    <Card
                        elevation={0}
                        sx={{
                            border: `2px solid ${theme.palette.warning.main}`,
                            borderRadius: 2,
                            backgroundColor: theme.palette.warning.main + '08'
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <AlertTriangleIcon color="warning" />
                                <Typography variant="subtitle1" fontWeight={600}>
                                    3. What KYC details are missing or need to be updated? *
                                </Typography>
                            </Box>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                value={formData.missing_kyc_details || ''}
                                onChange={(e) => handleInputChange('missing_kyc_details', e.target.value)}
                                disabled={disabled || readOnly}
                                placeholder="Specify which KYC documents or information are missing..."
                                error={!!validationErrors.missing_kyc_details}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />
                            {renderConditionalInfo('Required because KYC documents are incomplete')}
                            {renderFieldError('missing_kyc_details')}
                        </CardContent>
                    </Card>
                )}

                {/* Q4: Account Purpose Aligned */}
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            4. Is the account purpose aligned with the client's business activities?
                        </Typography>
                        <FormControl fullWidth error={!!validationErrors.account_purpose_aligned}>
                            <Select
                                value={formData.account_purpose_aligned || ''}
                                onChange={(e) => handleInputChange('account_purpose_aligned', e.target.value as YesNoNA)}
                                disabled={disabled || readOnly}
                                displayEmpty
                                sx={{ borderRadius: 2 }}
                            >
                                {YES_NO_NA_OPTIONS.map(option => (
                                    <MenuItem key={option.value} value={option.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <span>{option.icon}</span>
                                            {option.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Verify alignment between stated purpose and business activities</FormHelperText>
                        </FormControl>
                        {renderFieldError('account_purpose_aligned')}
                    </CardContent>
                </Card>

                {/* Q5: Adverse Media Completed */}
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            5. Has adverse media screening been completed?
                        </Typography>
                        <FormControl fullWidth error={!!validationErrors.adverse_media_completed} sx={{ mb: 3 }}>
                            <Select
                                value={formData.adverse_media_completed || ''}
                                onChange={(e) => handleInputChange('adverse_media_completed', e.target.value as YesNoNA)}
                                disabled={disabled || readOnly}
                                displayEmpty
                                sx={{ borderRadius: 2 }}
                            >
                                {YES_NO_NA_OPTIONS.map(option => (
                                    <MenuItem key={option.value} value={option.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <span>{option.icon}</span>
                                            {option.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Confirm completion of adverse media screening process</FormHelperText>
                        </FormControl>

                        <Divider sx={{ mb: 2 }} />

                        <Typography variant="body2" fontWeight={500} gutterBottom>
                            Additional Information (Screenshots, Evidence, etc.)
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.adverse_media_evidence || ''}
                            onChange={(e) => handleInputChange('adverse_media_evidence', e.target.value)}
                            disabled={disabled || readOnly}
                            placeholder="Provide additional details about adverse media screening results..."
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />
                        {renderFieldError('adverse_media_completed')}
                    </CardContent>
                </Card>

                {/* Q6-Q10: Standard Questions */}
                {[
                    { id: 6, field: 'senior_mgmt_approval', question: 'Has senior management approval been obtained (if required)?', options: YES_NO_OPTIONS, info: 'Required for high-risk clients or specific business types' },
                    { id: 7, field: 'pep_approval_obtained', question: 'Has PEP (Politically Exposed Person) approval been obtained?', options: YES_NO_NA_OPTIONS },
                    { id: 8, field: 'static_data_correct', question: 'Is all static data correct and up to date?', options: YES_NO_NA_OPTIONS },
                    { id: 9, field: 'kyc_documents_valid', question: 'Are all KYC documents valid and not expired?', options: YES_NO_NA_OPTIONS },
                    { id: 10, field: 'regulated_business_license', question: 'Has regulated business license been obtained (if applicable)?', options: YES_NO_NA_OPTIONS }
                ].map((q) => (
                    <Card key={q.id} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                {q.id}. {q.question}
                            </Typography>
                            <FormControl fullWidth error={!!validationErrors[q.field]}>
                                <Select
                                    value={formData[q.field as keyof KYCQuestionnaire] || ''}
                                    onChange={(e) => handleInputChange(q.field as keyof KYCQuestionnaire, e.target.value)}
                                    disabled={disabled || readOnly}
                                    displayEmpty
                                    sx={{ borderRadius: 2 }}
                                >
                                    {q.options.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <span>{option.icon}</span>
                                                {option.label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                                {q.info && <FormHelperText>{q.info}</FormHelperText>}
                            </FormControl>
                            {q.info && renderConditionalInfo(q.info)}
                            {renderFieldError(q.field)}
                        </CardContent>
                    </Card>
                ))}

                {/* Q11: Remedial Actions (Conditional) */}
                {showRemedialActions && (
                    <Card
                        elevation={0}
                        sx={{
                            border: `2px solid ${theme.palette.error.main}`,
                            borderRadius: 2,
                            backgroundColor: theme.palette.error.main + '08'
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <AlertTriangleIcon color="error" />
                                <Typography variant="subtitle1" fontWeight={600}>
                                    11. What remedial actions are required to address identified issues? *
                                </Typography>
                            </Box>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                value={formData.remedial_actions || ''}
                                onChange={(e) => handleInputChange('remedial_actions', e.target.value)}
                                disabled={disabled || readOnly}
                                placeholder="Describe the specific actions needed to resolve the identified issues..."
                                error={!!validationErrors.remedial_actions}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />
                            {renderConditionalInfo('Required because critical issues were identified')}
                            {renderFieldError('remedial_actions')}
                        </CardContent>
                    </Card>
                )}

                {/* Q12: Source of Funds Documents */}
                <Card
                    elevation={0}
                    sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 3,
                        overflow: 'hidden'
                    }}
                >
                    <CardContent sx={{ p: 0 }}>
                        {/* Header */}
                        <Box sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            color: 'white',
                            p: 4
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <UploadIcon />
                                <Typography variant="h6" fontWeight={600}>
                                    12. Upload source of funds documentation *
                                </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Upload supporting documents that verify the source of funds for this account
                            </Typography>
                        </Box>

                        {/* Content */}
                        <Box sx={{ p: 4 }}>

                            <Paper
                                elevation={0}
                                sx={{
                                    border: `2px dashed ${theme.palette.primary.main}`,
                                    borderRadius: 3,
                                    p: 4,
                                    backgroundColor: theme.palette.primary.main + '04',
                                    textAlign: 'center',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        borderColor: theme.palette.primary.dark,
                                        backgroundColor: theme.palette.primary.main + '08',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                    }
                                }}
                            >
                                <UploadIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Drop files here or click to browse
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Select multiple files up to 10MB each
                                </Typography>

                                {!readOnly && !disabled && (
                                    <DocumentUpload
                                        reviewId={reviewId}
                                        onUploadComplete={handleDocumentUpload}
                                        onUploadError={(error) => console.error('Document upload error:', error)}
                                        maxFileSize={10}
                                        multiple={true}
                                    />
                                )}

                                {(readOnly || disabled) && (
                                    <Box sx={{
                                        p: 3,
                                        textAlign: 'center',
                                        color: 'text.secondary',
                                        fontStyle: 'italic'
                                    }}>
                                        Document upload is disabled in read-only mode
                                    </Box>
                                )}

                                <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>Supported formats:</strong> PDF, Images, Word, Excel, Text files
                                    </Typography>
                                </Box>
                            </Paper>

                            {sourceOfFundsDocuments.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <CheckCircleIcon color="success" />
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            Uploaded Documents ({sourceOfFundsDocuments.length})
                                        </Typography>
                                    </Box>
                                    <List dense>
                                        {sourceOfFundsDocuments.map((doc, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{
                                                    backgroundColor: theme.palette.success.main + '08',
                                                    borderRadius: 2,
                                                    mb: 1,
                                                    border: `1px solid ${theme.palette.success.main}20`,
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.success.main + '12',
                                                    }
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <FileTextIcon color="success" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body2" fontWeight={500}>
                                                            {doc.filename}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Typography variant="caption" color="text.secondary">
                                                            Document ID: {doc.id} • {doc.document_type || 'Financial Document'}
                                                        </Typography>
                                                    }
                                                />
                                                <ListItemSecondaryAction>
                                                    <IconButton
                                                        edge="end"
                                                        onClick={() => handleDocumentDelete(doc.id)}
                                                        disabled={disabled}
                                                        size="small"
                                                        sx={{
                                                            color: theme.palette.error.main,
                                                            '&:hover': {
                                                                backgroundColor: theme.palette.error.main + '10',
                                                            }
                                                        }}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}

                            {sourceOfFundsDocuments.length === 0 && (
                                <Alert
                                    severity="warning"
                                    icon={<AlertTriangleIcon />}
                                    sx={{ mt: 2, borderRadius: 2 }}
                                >
                                    <Typography variant="body2">
                                        At least one source of funds document is required
                                    </Typography>
                                </Alert>
                            )}
                        </Box>
                        {renderFieldError('source_of_funds_docs')}
                    </CardContent>
                </Card>

                {/* Exception Management */}
                <Card
                    elevation={0}
                    sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 3,
                        overflow: 'hidden'
                    }}
                >
                    <CardContent sx={{ p: 0 }}>
                        {/* Header */}
                        <Box sx={{
                            background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                            color: 'white',
                            p: 4
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <AlertTriangleIcon />
                                <Typography variant="h6" fontWeight={600}>
                                    Exception Management
                                </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Select any exceptions that need to be flagged for this review
                            </Typography>
                        </Box>

                        {/* Content */}
                        <Box sx={{ p: 4 }}>
                            <ExceptionSelector
                                initialExceptions={selectedExceptions}
                                onExceptionsChange={handleExceptionsChange}
                                disabled={disabled || readOnly}
                            />
                        </Box>
                    </CardContent>
                </Card>

                {/* Validation Summary */}
                {Object.keys(validationErrors).length > 0 && (
                    <Alert
                        severity="error"
                        icon={<AlertTriangleIcon />}
                        sx={{ borderRadius: 2 }}
                    >
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            Please address the following issues:
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                            {Object.values(validationErrors).flat().map((error, index) => (
                                <Typography component="li" key={index} variant="body2">
                                    {error}
                                </Typography>
                            ))}
                        </Box>
                    </Alert>
                )}

                {/* Completion Status */}
                {Object.keys(validationErrors).length === 0 && (
                    <Alert
                        severity="success"
                        icon={<CheckCircleIcon />}
                        sx={{ borderRadius: 2 }}
                    >
                        <Typography variant="body2" fontWeight={600}>
                            KYC questionnaire is complete and valid
                        </Typography>
                    </Alert>
                )}
            </Stack>
        </Box >
    )
}

export default KYCQuestionnaireForm