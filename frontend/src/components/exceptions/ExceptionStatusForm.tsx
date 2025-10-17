import React, { useState, useEffect } from 'react'
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
    Collapse,
    Divider,
    useTheme
} from '@mui/material'
import {
    Save,
    Cancel,
    Update
} from '@mui/icons-material'
import { FormFeedback } from '../common/FormFeedback'
import { LoadingButton } from '../common/LoadingButton'
import { useDetailModalFocus } from '../../hooks/useDetailFocusManagement'
import type { Exception, User } from '../../types'

interface ExceptionStatusFormProps {
    exception: Exception
    users: User[]
    open: boolean
    onUpdate: (data: StatusUpdateData) => Promise<void>
    onCancel: () => void
    updating: boolean
    error?: string | null
    success?: string | null
}

export interface StatusUpdateData {
    status: Exception['status']
    assigned_to: number | null
    resolution_notes?: string
}

const statusOptions: { value: Exception['status']; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
    { value: 'escalated', label: 'Escalated' }
]

export const ExceptionStatusForm: React.FC<ExceptionStatusFormProps> = ({
    exception,
    users,
    open,
    onUpdate,
    onCancel,
    updating,
    error,
    success
}) => {
    const theme = useTheme()
    const { getModalProps } = useDetailModalFocus(open)
    const [formData, setFormData] = useState<StatusUpdateData>({
        status: exception.status,
        assigned_to: exception.assigned_to || null,
        resolution_notes: exception.resolution_notes || ''
    })
    const [validationErrors, setValidationErrors] = useState<string[]>([])

    // Reset form when exception changes
    useEffect(() => {
        setFormData({
            status: exception.status,
            assigned_to: exception.assigned_to || null,
            resolution_notes: exception.resolution_notes || ''
        })
        setValidationErrors([])
    }, [exception])

    const validateForm = (): boolean => {
        const errors: string[] = []

        // Require resolution notes when resolving or closing
        if ((formData.status === 'resolved' || formData.status === 'closed') &&
            !formData.resolution_notes?.trim()) {
            errors.push('Resolution notes are required when resolving or closing an exception')
        }

        // Require assignee for in-progress status
        if (formData.status === 'in_progress' && !formData.assigned_to) {
            errors.push('An assignee is required when setting status to In Progress')
        }

        setValidationErrors(errors)
        return errors.length === 0
    }

    const handleSubmit = async () => {
        if (!validateForm()) {
            return
        }

        try {
            await onUpdate(formData)
        } catch (err) {
            // Error handling is done in parent component
        }
    }

    const handleStatusChange = (status: Exception['status']) => {
        setFormData(prev => ({
            ...prev,
            status,
            // Clear resolution notes if not resolving/closing
            resolution_notes: (status === 'resolved' || status === 'closed')
                ? prev.resolution_notes
                : ''
        }))
        setValidationErrors([])
    }

    const handleAssigneeChange = (assigned_to: number | null) => {
        setFormData(prev => ({
            ...prev,
            assigned_to
        }))
        setValidationErrors([])
    }

    const handleResolutionNotesChange = (resolution_notes: string) => {
        setFormData(prev => ({
            ...prev,
            resolution_notes
        }))
        setValidationErrors([])
    }

    const requiresResolutionNotes = formData.status === 'resolved' || formData.status === 'closed'
    const hasChanges = (
        formData.status !== exception.status ||
        formData.assigned_to !== exception.assigned_to ||
        formData.resolution_notes !== (exception.resolution_notes || '')
    )

    return (
        <Collapse in={open} timeout="auto" unmountOnExit>
            <Card
                elevation={0}
                sx={{
                    border: `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 3,
                    mb: 4,
                    overflow: 'visible'
                }}
                {...(open ? getModalProps() : {})}
            >
                <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                    {/* Form Header */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 3,
                            gap: 1
                        }}
                    >
                        <Update color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Update Exception Status
                        </Typography>
                    </Box>

                    {/* Form Feedback */}
                    <FormFeedback
                        loading={updating}
                        success={success}
                        error={error || (validationErrors.length > 0 ? validationErrors.join('. ') : null)}
                        loadingText="Updating exception status..."
                        autoHideDuration={3000}
                    />

                    {/* Form Fields */}
                    <Stack spacing={3}>
                        {/* Status and Assignee Row */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                gap: 3
                            }}
                        >
                            {/* Status Selection */}
                            <FormControl fullWidth>
                                <InputLabel id="status-select-label">Status</InputLabel>
                                <Select
                                    labelId="status-select-label"
                                    value={formData.status}
                                    label="Status"
                                    onChange={(e) => handleStatusChange(e.target.value as Exception['status'])}
                                    disabled={updating}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: theme.palette.primary.main,
                                                },
                                            },
                                        },
                                    }}
                                >
                                    {statusOptions.map((option) => (
                                        <MenuItem
                                            key={option.value}
                                            value={option.value}
                                            sx={{
                                                transition: 'all 0.2s ease-in-out',
                                                '&:hover': {
                                                    backgroundColor: theme.palette.primary.main + '10',
                                                },
                                            }}
                                        >
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Assignee Selection */}
                            <FormControl fullWidth>
                                <InputLabel id="assignee-select-label">Assign To</InputLabel>
                                <Select
                                    labelId="assignee-select-label"
                                    value={formData.assigned_to || ''}
                                    label="Assign To"
                                    onChange={(e) => handleAssigneeChange(e.target.value ? Number(e.target.value) : null)}
                                    disabled={updating}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: theme.palette.primary.main,
                                                },
                                            },
                                        },
                                    }}
                                >
                                    <MenuItem
                                        value=""
                                        sx={{
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                backgroundColor: theme.palette.primary.main + '10',
                                            },
                                        }}
                                    >
                                        <em>Unassigned</em>
                                    </MenuItem>
                                    {users.map((user) => (
                                        <MenuItem
                                            key={user.id}
                                            value={user.id}
                                            sx={{
                                                transition: 'all 0.2s ease-in-out',
                                                '&:hover': {
                                                    backgroundColor: theme.palette.primary.main + '10',
                                                },
                                            }}
                                        >
                                            {user.name} ({user.role})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Resolution Notes - Conditional */}
                        {requiresResolutionNotes && (
                            <TextField
                                label="Resolution Notes"
                                multiline
                                rows={4}
                                value={formData.resolution_notes}
                                onChange={(e) => handleResolutionNotesChange(e.target.value)}
                                placeholder="Describe how this exception was resolved..."
                                disabled={updating}
                                required
                                error={requiresResolutionNotes && !formData.resolution_notes?.trim()}
                                helperText={
                                    requiresResolutionNotes && !formData.resolution_notes?.trim()
                                        ? 'Resolution notes are required when resolving or closing an exception'
                                        : 'Provide details about how this exception was resolved'
                                }
                                fullWidth
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: theme.palette.primary.main,
                                            },
                                        },
                                        '&.Mui-focused': {
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderWidth: '2px',
                                            },
                                        },
                                    },
                                }}
                            />
                        )}

                        <Divider />

                        {/* Form Actions */}
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            sx={{ justifyContent: 'flex-end' }}
                        >
                            <Button
                                variant="outlined"
                                onClick={onCancel}
                                disabled={updating}
                                startIcon={<Cancel />}
                                sx={{
                                    minWidth: 120,
                                    order: { xs: 2, sm: 1 },
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        borderColor: theme.palette.primary.main,
                                        backgroundColor: theme.palette.primary.main + '08',
                                        transform: 'translateY(-1px)',
                                    },
                                }}
                            >
                                Cancel
                            </Button>

                            <LoadingButton
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={!hasChanges}
                                loading={updating}
                                success={!!success}
                                startIcon={<Save />}
                                loadingText="Updating..."
                                successText="Updated!"
                                sx={{
                                    minWidth: 120,
                                    order: { xs: 1, sm: 2 },
                                    background: theme.palette.mode === 'light'
                                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                                        : undefined,
                                }}
                            >
                                Update Exception
                            </LoadingButton>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        </Collapse>
    )
}