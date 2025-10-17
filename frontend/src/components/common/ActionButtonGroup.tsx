import React, { useState } from 'react'
import {
    Box,
    Button,
    CircularProgress,
    Tooltip
} from '@mui/material'
import {
    Save as SaveIcon,
    Send as SendIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material'
import type { ActionType, ActionButtonGroupProps } from '../../types'
import { ACTION_CONFIGS } from '../../utils/actionConfig'
import SimpleConfirmationDialog from './SimpleConfirmationDialog'

// Icon mapping for Material-UI icons
const ICON_MAP = {
    Save: SaveIcon,
    Send: SendIcon,
    Check: CheckIcon,
    Close: CloseIcon,
    Visibility: VisibilityIcon
}

const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
    actions,
    onSave,
    onSubmit,
    onAccept,
    onReject,
    loading = {},
    disabled = false
}) => {
    const [confirmationDialog, setConfirmationDialog] = useState<{
        open: boolean
        action: ActionType | null
        title: string
        message: string
    }>({
        open: false,
        action: null,
        title: '',
        message: ''
    })

    const handleActionClick = async (actionType: ActionType) => {
        const config = ACTION_CONFIGS[actionType]

        // Handle actions that require confirmation
        if (config.requiresConfirmation && !config.requiresReason) {
            setConfirmationDialog({
                open: true,
                action: actionType,
                title: `Confirm ${config.label}`,
                message: `Are you sure you want to ${config.label.toLowerCase()}?`
            })
            return
        }

        // Handle actions that require reason (rejection) - these will be handled by RejectionDialog
        if (config.requiresReason) {
            await executeAction(actionType)
            return
        }

        // Execute action directly
        await executeAction(actionType)
    }

    const executeAction = async (actionType: ActionType) => {
        try {
            switch (actionType) {
                case 'SAVE_DRAFT':
                    if (onSave) await onSave()
                    break
                case 'SUBMIT':
                    if (onSubmit) await onSubmit()
                    break
                case 'ACCEPT':
                    if (onAccept) await onAccept()
                    break
                case 'REJECT':
                    if (onReject) await onReject('')
                    break
                default:
                    break
            }
        } catch (error) {
            console.error(`Action ${actionType} failed:`, error)
        }
    }

    const handleConfirmationConfirm = async () => {
        if (confirmationDialog.action) {
            await executeAction(confirmationDialog.action)
        }
        setConfirmationDialog({ open: false, action: null, title: '', message: '' })
    }

    const handleConfirmationCancel = () => {
        setConfirmationDialog({ open: false, action: null, title: '', message: '' })
    }

    const renderButton = (actionType: ActionType) => {
        const config = ACTION_CONFIGS[actionType]
        const IconComponent = ICON_MAP[config.icon as keyof typeof ICON_MAP]
        const isLoading = loading[actionType.toLowerCase() as keyof typeof loading] || false
        const isDisabled = disabled || isLoading

        // Don't render VIEW_ONLY as a button
        if (actionType === 'VIEW_ONLY') {
            return null
        }

        const button = (
            <Button
                key={actionType}
                variant={config.variant}
                color={config.color}
                onClick={() => handleActionClick(actionType)}
                disabled={isDisabled}
                startIcon={
                    isLoading ? (
                        <CircularProgress size={16} />
                    ) : (
                        IconComponent && <IconComponent />
                    )
                }
                sx={{
                    minWidth: 120,
                    height: 40,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&.Mui-disabled': {
                        opacity: 0.6
                    }
                }}
            >
                {isLoading ? 'Processing...' : config.label}
            </Button>
        )

        // Wrap disabled buttons with tooltip
        if (isDisabled && !isLoading) {
            return (
                <Tooltip key={actionType} title="Action not available" arrow>
                    <span>{button}</span>
                </Tooltip>
            )
        }

        return button
    }

    // Filter out VIEW_ONLY for button rendering
    const renderableActions = actions.filter(action => action !== 'VIEW_ONLY')

    if (renderableActions.length === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <VisibilityIcon fontSize="small" />
                <span>Read Only</span>
            </Box>
        )
    }

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}
            >
                {renderableActions.map(renderButton)}
            </Box>

            <SimpleConfirmationDialog
                open={confirmationDialog.open}
                title={confirmationDialog.title}
                message={confirmationDialog.message}
                onConfirm={handleConfirmationConfirm}
                onCancel={handleConfirmationCancel}
                confirmText="Confirm"
                cancelText="Cancel"
            />
        </>
    )
}

export default ActionButtonGroup