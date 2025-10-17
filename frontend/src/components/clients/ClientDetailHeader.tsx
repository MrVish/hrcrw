import React from 'react'
import {
    Box,
    Typography,
    Button,
    IconButton,
    Stack,
} from '@mui/material'
import {
    ArrowBack,
    Edit,
    Save,
    Close,
    Add,
} from '@mui/icons-material'
import { StatusBadge } from '../common/StatusBadge'
import { LoadingButton } from '../common/LoadingButton'
import { gradients } from '../../theme'
import type { Client } from '../../types'

interface ClientDetailHeaderProps {
    client: Client
    isEditing: boolean
    onBack: () => void
    onEdit: () => void
    onSave: () => void
    onCancel: () => void
    onCreateReview: () => void
    saving: boolean
}

export const ClientDetailHeader: React.FC<ClientDetailHeaderProps> = ({
    client,
    isEditing,
    onBack,
    onEdit,
    onSave,
    onCancel,
    onCreateReview,
    saving,
}) => {



    return (
        <Box
            sx={{
                background: gradients.primary,
                color: 'white',
                p: { xs: 2, sm: 3, lg: 4 },
                borderRadius: '12px 12px 0 0',
                mb: 3,
            }}
            role="banner"
        >
            {/* Back Button */}
            <Box sx={{ mb: 2 }}>
                <IconButton
                    onClick={onBack}
                    aria-label="Go back to client list"
                    sx={{
                        color: 'white',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                    }}
                >
                    <ArrowBack />
                </IconButton>
            </Box>

            {/* Header Content */}
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={3}
            >
                {/* Client Info */}
                <Box sx={{ flex: 1 }}>
                    <Typography
                        variant="h4"
                        component="h1"
                        id="client-detail-heading"
                        sx={{
                            fontWeight: 'bold',
                            mb: 1,
                            color: 'white',
                        }}
                    >
                        {client.name}
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            opacity: 0.9,
                            mb: 2,
                            fontSize: '1.1rem',
                        }}
                        aria-label={`Client ID ${client.client_id}`}
                    >
                        Client ID: {client.client_id}
                    </Typography>

                    {/* Status Badges */}
                    <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                        role="group"
                        aria-label="Client status information"
                    >
                        <StatusBadge
                            status={client.risk_level}
                            type="risk"
                            variant="filled"
                            showIcon={true}
                            aria-label={`Risk level: ${client.risk_level}`}
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '& .MuiChip-icon': {
                                    color: 'white',
                                },
                            }}
                        />
                        <StatusBadge
                            status={client.status}
                            type="client"
                            variant="filled"
                            showIcon={true}
                            aria-label={`Client status: ${client.status}`}
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '& .MuiChip-icon': {
                                    color: 'white',
                                },
                            }}
                        />
                        {client.aml_risk && (
                            <StatusBadge
                                status={client.aml_risk}
                                type="risk"
                                variant="filled"
                                showIcon={true}
                                aria-label={`AML risk level: ${client.aml_risk}`}
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                    },
                                    '& .MuiChip-icon': {
                                        color: 'white',
                                    },
                                }}
                            />
                        )}
                    </Stack>
                </Box>

                {/* Action Buttons */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ minWidth: { xs: '100%', md: 'auto' } }}
                    role="group"
                    aria-label="Client actions"
                >
                    {isEditing ? (
                        <>
                            <LoadingButton
                                variant="contained"
                                startIcon={<Save />}
                                onClick={onSave}
                                loading={saving}
                                loadingText="Saving..."
                                successText="Saved!"
                                aria-label="Save client changes"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                                    },
                                    '&:disabled': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                    },
                                }}
                            >
                                Save Changes
                            </LoadingButton>
                            <Button
                                variant="outlined"
                                startIcon={<Close />}
                                onClick={onCancel}
                                disabled={saving}
                                aria-label="Cancel editing client"
                                sx={{
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                    color: 'white',
                                    '&:hover': {
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        transform: 'translateY(-2px)',
                                    },
                                    '&:disabled': {
                                        borderColor: 'rgba(255, 255, 255, 0.2)',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                    },
                                    transition: 'all 0.2s ease-in-out',
                                }}
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<Edit />}
                                onClick={onEdit}
                                aria-label="Edit client information"
                                sx={{
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                    color: 'white',
                                    '&:hover': {
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        transform: 'translateY(-2px)',
                                    },
                                    transition: 'all 0.2s ease-in-out',
                                }}
                            >
                                Edit Client
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={onCreateReview}
                                aria-label="Create new review for this client"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                                    },
                                    transition: 'all 0.2s ease-in-out',
                                }}
                            >
                                Create Review
                            </Button>
                        </>
                    )}
                </Stack>
            </Stack>
        </Box>
    )
}

export default ClientDetailHeader