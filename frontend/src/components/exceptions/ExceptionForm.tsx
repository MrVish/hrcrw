import React, { useState, useEffect, useMemo } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Stack,
    Alert,
    Divider,
    useTheme,
    Container,
    Paper,
    Autocomplete,
    FormHelperText
} from '@mui/material'
import {
    ArrowBack as ArrowBackIcon,
    ErrorOutline as ErrorIcon,
    CheckCircle as CheckIcon,
    Person as PersonIcon
} from '@mui/icons-material'
import { apiClient } from '../../services'
import { useAuth } from '../../contexts/AuthContext'
import ActionButtonGroup from '../common/ActionButtonGroup'
import RejectionDialog from '../common/RejectionDialog'
import { getAvailableActions, isOwner } from '../../utils/actionConfig'
import { approveException, rejectException } from '../../services/makerCheckerActions'
import type { ActionType, Exception } from '../../types'

interface ExceptionFormData {
    review_id: number | null
    client_id: string
    type: string
    title: string
    description: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    assigned_to: string
}

interface ReviewOption {
    review_id: number
    client_id: string
    client_name: string
}

interface User {
    id: number
    name: string
    email: string
    role: string
}

interface ExceptionFormProps {
    exceptionId?: number
    reviewId?: number
    onSave?: (exceptionId: number) => void
    onCancel?: () => void
}

const EXCEPTION_TYPES = [
    { value: 'DOCUMENTATION', label: 'Documentation Missing' },
    { value: 'COMPLIANCE', label: 'Regulatory Compliance' },
    { value: 'TECHNICAL', label: 'Risk Assessment Issue' },
    { value: 'REGULATORY', label: 'Client Information Incomplete' },
    { value: 'OPERATIONAL', label: 'Suspicious Activity' },
    { value: 'OTHER', label: 'Other' }
]

const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
]

export const ExceptionForm: React.FC<ExceptionFormProps> = ({
    exceptionId,
    reviewId,
    onSave,
    onCancel
}) => {
    const { user } = useAuth()
    const [formData, setFormData] = useState<ExceptionFormData>({
        review_id: reviewId || null,
        client_id: '',
        type: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        assigned_to: ''
    })
    const [exceptionData, setExceptionData] = useState<Exception | null>(null)
    const [reviews, setReviews] = useState<ReviewOption[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState({
        save: false,
        submit: false,
        accept: false,
        reject: false
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false)

    // Permission detection logic
    const permissions = useMemo(() => {
        console.log('Permission check:', { user: user?.role, exceptionData: exceptionData?.id, hasUser: !!user, hasExceptionData: !!exceptionData })

        if (!user || !exceptionData) {
            console.log('Missing user or exceptionData, returning VIEW_ONLY')
            return {
                actions: ['VIEW_ONLY'] as ActionType[],
                canEdit: false,
                canApproveReject: false,
                isOwner: false
            }
        }

        const ownerStatus = isOwner(user, exceptionData)
        const availableActions = getAvailableActions({
            user,
            item: exceptionData,
            isOwner: ownerStatus
        })

        const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'

        // For new exceptions (id === 0), allow admin and checker to create/edit
        const isNewException = exceptionData.id === 0
        const canEdit = isNewException
            ? ['admin', 'checker'].includes(userRole)
            : (userRole === 'maker' && ownerStatus && exceptionData.status === 'open')

        const canApproveReject = ['checker', 'admin'].includes(userRole) &&
            ['open', 'in_progress'].includes(exceptionData.status)

        console.log('Permission calculation:', {
            userRole,
            isNewException,
            canEdit,
            canApproveReject,
            availableActions,
            exceptionStatus: exceptionData.status
        })

        // For new exceptions, override actions for admin/checker users
        const finalActions = isNewException && ['admin', 'checker'].includes(userRole)
            ? ['SAVE_DRAFT', 'SUBMIT'] as ActionType[]
            : availableActions

        const result = {
            actions: finalActions,
            canEdit,
            canApproveReject,
            isOwner: ownerStatus
        }

        console.log('Final permissions:', result)
        return result
    }, [user, exceptionData])

    useEffect(() => {
        const loadData = async () => {
            try {
                await Promise.all([
                    fetchReviews(),
                    fetchUsers()
                ])

                if (exceptionId) {
                    await fetchExceptionData()
                } else {
                    // Create mock exception data for new exceptions to enable permission detection
                    setExceptionData({
                        id: 0,
                        review_id: reviewId || 0,
                        assigned_to: null,
                        created_by: user?.id || 0,
                        type: 'OTHER',
                        title: '',
                        description: '',
                        priority: 'MEDIUM',
                        status: 'open',
                        resolution_notes: null,
                        resolved_at: null,
                        due_date: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                }
            } catch (error) {
                console.error('Error loading form data:', error)
                setError('Failed to load form data')
            }
        }

        loadData()
    }, [exceptionId])

    const fetchReviews = async () => {
        try {
            const reviewsResponse = await apiClient.getReviews()

            console.log('Reviews response:', reviewsResponse)

            // Ensure reviewsResponse and reviews array exist
            if (!reviewsResponse || !reviewsResponse.reviews || !Array.isArray(reviewsResponse.reviews)) {
                console.warn('Invalid reviews response:', reviewsResponse)
                setReviews([])
                return
            }

            // Filter to show reviews that can have exceptions created for them
            // Include draft status so checkers can create exceptions for reviews being worked on
            const validStatuses = ['draft', 'submitted', 'under_review', 'approved']
            const availableReviews = reviewsResponse.reviews
                .filter((review: any) => {
                    if (!review || !review.status) {
                        return false
                    }
                    const statusString = String(review.status).toLowerCase()
                    const isValid = validStatuses.includes(statusString)
                    console.log('Review filter:', { id: review.id, status: review.status, statusString, isValid })
                    return isValid
                })
                .map((review: any) => ({
                    review_id: review.id,
                    client_id: review.client_id || '',
                    client_name: review.client_name || review.client?.name || 'Unknown Client'
                }))
                .filter(review => review.review_id) // Ensure we have valid review IDs

            setReviews(availableReviews)
        } catch (err: any) {
            console.error('Failed to fetch reviews:', err)
            setError('Failed to load reviews. Please try again.')
            setReviews([]) // Set empty array to prevent undefined errors
        }
    }

    const fetchUsers = async () => {
        try {
            const availableUsers = await apiClient.getAssignableUsersList()
            // Users are already filtered on the backend to only include Checkers/Admins
            setUsers(availableUsers)
        } catch (err) {
            console.error('Failed to fetch users:', err)
            setUsers([]) // Set empty array so the component doesn't break
        }
    }

    const fetchExceptionData = async () => {
        if (!exceptionId) return

        try {
            setLoading(true)
            const exception = await apiClient.getException(exceptionId)

            // Store the full exception data for permission detection
            setExceptionData(exception)

            setFormData({
                review_id: exception.review_id,
                client_id: exception.client_id || '',
                type: exception.type,
                title: exception.title,
                description: exception.description,
                priority: exception.priority,
                assigned_to: exception.assigned_to_name || exception.assigned_user_name || ''
            })
        } catch (err) {
            setError('Failed to load exception data')
            console.error('Exception fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: keyof ExceptionFormData, value: string | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError(null)
        setSuccess(null)
    }

    const handleReviewChange = (reviewId: string | number) => {
        const selectedReview = reviews.find(r => r.review_id.toString() === reviewId.toString())
        setFormData(prev => ({
            ...prev,
            review_id: reviewId ? (typeof reviewId === 'string' ? parseInt(reviewId) : reviewId) : null,
            client_id: selectedReview?.client_id || ''
        }))
    }

    const validateForm = (): boolean => {
        if (!formData.review_id) {
            setError('Please select a review')
            return false
        }

        if (!formData.type.trim()) {
            setError('Exception type is required')
            return false
        }

        if (!formData.title.trim()) {
            setError('Exception title is required')
            return false
        }

        if (!formData.description.trim()) {
            setError('Description is required')
            return false
        }

        if (formData.description.trim().length < 10) {
            setError('Description must be at least 10 characters long')
            return false
        }

        return true
    }

    const handleSave = async () => {
        if (!validateForm()) return

        try {
            setActionLoading(prev => ({ ...prev, save: true }))
            setError(null)

            const payload = {
                review_id: formData.review_id!,
                type: formData.type as any,
                title: formData.title.trim(),
                description: formData.description.trim(),
                priority: formData.priority as any,
                due_date: undefined
            }

            let response
            if (exceptionId) {
                response = await apiClient.updateException(exceptionId, payload)
            } else {
                response = await apiClient.createReviewException(formData.review_id!, payload)
            }

            setSuccess(exceptionId ? 'Exception updated successfully' : 'Exception created successfully')

            if (onSave) {
                onSave(response.id)
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save exception')
            console.error('Save error:', err)
        } finally {
            setActionLoading(prev => ({ ...prev, save: false }))
        }
    }

    const handleSubmit = async () => {
        if (!validateForm()) return

        try {
            setActionLoading(prev => ({ ...prev, submit: true }))
            setError(null)

            // For exceptions, submit means updating status to IN_PROGRESS
            if (exceptionId) {
                await apiClient.updateExceptionStatus(exceptionId, 'IN_PROGRESS')
                setSuccess('Exception submitted for review successfully')
            } else {
                // Create new exception and set status to IN_PROGRESS
                const payload = {
                    review_id: formData.review_id!,
                    type: formData.type as any,
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    priority: formData.priority as any,
                    due_date: undefined
                }

                const response = await apiClient.createReviewException(formData.review_id!, payload)
                await apiClient.updateExceptionStatus(response.id, 'IN_PROGRESS')
                setSuccess('Exception created and submitted for review successfully')

                if (onSave) {
                    onSave(response.id)
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to submit exception')
            console.error('Submit error:', err)
        } finally {
            setActionLoading(prev => ({ ...prev, submit: false }))
        }
    }

    const handleAccept = async (comments?: string) => {
        if (!exceptionId) return

        try {
            setActionLoading(prev => ({ ...prev, accept: true }))
            setError(null)

            await approveException(exceptionId, comments)
            setSuccess('Exception approved successfully')

            // Refresh exception data
            await fetchExceptionData()
        } catch (err: any) {
            setError(err.message || 'Failed to approve exception')
            console.error('Approve error:', err)
        } finally {
            setActionLoading(prev => ({ ...prev, accept: false }))
        }
    }

    const handleReject = async (reason: string) => {
        if (!exceptionId) return

        try {
            setActionLoading(prev => ({ ...prev, reject: true }))
            setError(null)

            await rejectException(exceptionId, reason)
            setSuccess('Exception rejected successfully')
            setRejectionDialogOpen(false)

            // Refresh exception data
            await fetchExceptionData()
        } catch (err: any) {
            setError(err.message || 'Failed to reject exception')
            console.error('Reject error:', err)
        } finally {
            setActionLoading(prev => ({ ...prev, reject: false }))
        }
    }

    const handleRejectClick = async (reason: string) => {
        // If reason is provided, handle the actual rejection
        if (reason) {
            await handleReject(reason)
        } else {
            // If no reason provided, open the dialog
            setRejectionDialogOpen(true)
        }
    }

    const selectedReview = reviews.find(r => r.review_id === formData.review_id)

    const theme = useTheme()

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return theme.palette.error.main
            case 'High': return theme.palette.warning.main
            case 'Medium': return theme.palette.info.main
            case 'Low': return theme.palette.success.main
            default: return theme.palette.grey[500]
        }
    }

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <Typography>Loading exception...</Typography>
                </Box>
            </Container>
        )
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: 'white',
                    p: 4,
                    borderRadius: 3,
                    mb: 3,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={onCancel}
                        sx={{
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                    >
                        Back
                    </Button>
                </Box>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                    {exceptionId ? 'Edit Exception' : 'Create New Exception'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Document and track compliance exceptions for review resolution
                </Typography>
            </Paper>

            {/* Success Message */}
            {success && (
                <Alert
                    severity="success"
                    sx={{ mb: 3, borderRadius: 2 }}
                    icon={<CheckIcon />}
                >
                    {success}
                </Alert>
            )}

            {/* Error Message */}
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 3, borderRadius: 2 }}
                    icon={<ErrorIcon />}
                >
                    {error}
                </Alert>
            )}

            {/* Form Card */}
            <Card
                elevation={0}
                sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 3,
                    overflow: 'hidden'
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSave() }}>
                        <Stack spacing={4}>
                            {/* Associated Review Section */}
                            <Box>
                                <Typography variant="h6" gutterBottom fontWeight={600}>
                                    Associated Review
                                </Typography>
                                <Divider sx={{ mb: 3 }} />

                                <Autocomplete
                                    options={reviews}
                                    getOptionLabel={(review) => `Review #${review.review_id} - ${review.client_name} (${review.client_id})`}
                                    value={reviews.find(r => r.review_id === formData.review_id) || null}
                                    onChange={(_, newValue) => {
                                        handleReviewChange(newValue?.review_id || '')
                                    }}
                                    disabled={!!reviewId || !!exceptionId}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Select Review"
                                            required
                                            helperText="Choose the review this exception relates to"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                },
                                            }}
                                        />
                                    )}
                                    renderOption={(props, review) => (
                                        <Box component="li" {...props}>
                                            <Box>
                                                <Typography variant="body1">
                                                    Review #{review.review_id} - {review.client_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Client ID: {review.client_id}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
                                />

                                {selectedReview && (
                                    <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Selected Review: <strong>#{selectedReview.review_id} - {selectedReview.client_name}</strong>
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Exception Details Section */}
                            <Box>
                                <Typography variant="h6" gutterBottom fontWeight={600}>
                                    Exception Details
                                </Typography>
                                <Divider sx={{ mb: 3 }} />

                                <Stack spacing={3}>
                                    {/* Title */}
                                    <TextField
                                        label="Exception Title"
                                        value={formData.title}
                                        onChange={(e) => handleInputChange('title', e.target.value)}
                                        required
                                        fullWidth
                                        placeholder="Enter a clear, descriptive title for the exception"
                                        helperText="Provide a concise title that summarizes the exception"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />

                                    {/* Type and Priority Row */}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                        <FormControl fullWidth>
                                            <InputLabel>Exception Type</InputLabel>
                                            <Select
                                                value={formData.type}
                                                onChange={(e) => handleInputChange('type', e.target.value)}
                                                label="Exception Type"
                                                required
                                                sx={{ borderRadius: 2 }}
                                            >
                                                {EXCEPTION_TYPES.map(type => (
                                                    <MenuItem key={type.value} value={type.value}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            {type.value === 'DOCUMENTATION' && '📄'}
                                                            {type.value === 'COMPLIANCE' && '⚖️'}
                                                            {type.value === 'TECHNICAL' && '🔧'}
                                                            {type.value === 'REGULATORY' && '📋'}
                                                            {type.value === 'OPERATIONAL' && '⚙️'}
                                                            {type.value === 'OTHER' && '📌'}
                                                            {type.label}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <FormHelperText>Select the type of exception</FormHelperText>
                                        </FormControl>

                                        <FormControl fullWidth>
                                            <InputLabel>Priority</InputLabel>
                                            <Select
                                                value={formData.priority}
                                                onChange={(e) => handleInputChange('priority', e.target.value as any)}
                                                label="Priority"
                                                required
                                                sx={{ borderRadius: 2 }}
                                            >
                                                {PRIORITY_OPTIONS.map(priority => (
                                                    <MenuItem key={priority.value} value={priority.value}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box
                                                                sx={{
                                                                    width: 12,
                                                                    height: 12,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: getPriorityColor(priority.label),
                                                                }}
                                                            />
                                                            {priority.label}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <FormHelperText>Set the priority level</FormHelperText>
                                        </FormControl>
                                    </Stack>

                                    {/* Description */}
                                    <TextField
                                        label="Description"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        required
                                        fullWidth
                                        multiline
                                        rows={4}
                                        placeholder="Provide detailed description of the exception..."
                                        helperText="Describe the specific issue, why it's an exception, and any relevant context. Minimum 10 characters required."
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                </Stack>
                            </Box>

                            {/* Assignment Section */}
                            <Box>
                                <Typography variant="h6" gutterBottom fontWeight={600}>
                                    Assignment
                                </Typography>
                                <Divider sx={{ mb: 3 }} />

                                <Autocomplete
                                    options={users}
                                    getOptionLabel={(user) => `${user.name} (${user.role})`}
                                    value={users.find(u => u.name === formData.assigned_to) || null}
                                    onChange={(_, newValue) => {
                                        handleInputChange('assigned_to', newValue?.name || '')
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Assign To (Optional)"
                                            helperText="Assign this exception to a team member for resolution"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                },
                                            }}
                                        />
                                    )}
                                    renderOption={(props, user) => (
                                        <Box component="li" {...props}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <PersonIcon color="action" />
                                                <Box>
                                                    <Typography variant="body1">{user.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {user.email} • {user.role}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    )}
                                />

                                {formData.assigned_to && (
                                    <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PersonIcon fontSize="small" />
                                            <Typography variant="body2">
                                                Assigned to: <strong>{formData.assigned_to}</strong>
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                            </Box>

                            {/* Action Buttons */}
                            <Box sx={{ pt: 2 }}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={2}
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Button
                                        variant="outlined"
                                        onClick={onCancel}
                                        disabled={Object.values(actionLoading).some(loading => loading)}
                                        sx={{
                                            borderRadius: 2,
                                            px: 4,
                                            py: 1.5,
                                        }}
                                    >
                                        Cancel
                                    </Button>

                                    <ActionButtonGroup
                                        actions={permissions.actions}
                                        onSave={handleSave}
                                        onSubmit={handleSubmit}
                                        onAccept={handleAccept}
                                        onReject={handleRejectClick}
                                        loading={actionLoading}
                                        disabled={!permissions.canEdit && !permissions.canApproveReject}
                                    />
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            {/* Rejection Dialog */}
            <RejectionDialog
                open={rejectionDialogOpen}
                onClose={() => setRejectionDialogOpen(false)}
                onConfirm={handleReject}
                title="Reject Exception"
                itemType="Exception"
                loading={actionLoading.reject}
            />
        </Container>
    )
}