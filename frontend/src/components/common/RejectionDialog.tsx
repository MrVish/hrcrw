import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    CircularProgress,
    Alert
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import type { RejectionDialogProps } from '../../types'

const RejectionDialog: React.FC<RejectionDialogProps> = ({
    open,
    onClose,
    onConfirm,
    title,
    itemType,
    loading = false
}) => {
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setReason('')
            setError('')
        }
    }, [open])

    const handleReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        setReason(value)

        // Clear error when user starts typing
        if (error && value.trim().length > 0) {
            setError('')
        }
    }

    const handleConfirm = async () => {
        const trimmedReason = reason.trim()

        // Validation
        if (!trimmedReason) {
            setError('Rejection reason is required')
            return
        }

        if (trimmedReason.length < 10) {
            setError('Rejection reason must be at least 10 characters long')
            return
        }

        if (trimmedReason.length > 500) {
            setError('Rejection reason must be less than 500 characters')
            return
        }

        try {
            await onConfirm(trimmedReason)
            // Dialog will be closed by parent component on success
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to reject item')
        }
    }

    const handleCancel = () => {
        if (!loading) {
            onClose()
        }
    }

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && event.ctrlKey) {
            handleConfirm()
        }
    }

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown={loading}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 1
                }}
            >
                <Typography variant="h6" component="div">
                    {title}
                </Typography>
                {!loading && (
                    <Button
                        onClick={handleCancel}
                        size="small"
                        sx={{ minWidth: 'auto', p: 0.5 }}
                    >
                        <CloseIcon />
                    </Button>
                )}
            </DialogTitle>

            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Please provide a reason for rejecting this {itemType.toLowerCase()}.
                        This information will be shared with the submitter.
                    </Typography>
                </Box>

                <TextField
                    autoFocus
                    fullWidth
                    multiline
                    rows={4}
                    label="Rejection Reason"
                    placeholder={`Enter the reason for rejecting this ${itemType.toLowerCase()}...`}
                    value={reason}
                    onChange={handleReasonChange}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    error={!!error}
                    helperText={
                        error ||
                        `${reason.length}/500 characters (minimum 10 required)`
                    }
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                                borderColor: 'error.main'
                            }
                        }
                    }}
                />

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                        Tip: Press Ctrl+Enter to submit
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={handleCancel}
                    disabled={loading}
                    color="inherit"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    disabled={loading || !reason.trim() || reason.trim().length < 10}
                    variant="contained"
                    color="error"
                    startIcon={loading ? <CircularProgress size={16} /> : <CloseIcon />}
                >
                    {loading ? 'Rejecting...' : 'Reject'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default RejectionDialog