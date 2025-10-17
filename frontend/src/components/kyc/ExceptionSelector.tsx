import React, { useState, useCallback } from 'react'
import {
    Box,
    Typography,
    Checkbox,
    FormControlLabel,
    TextField,
    Chip,
    Alert,
    useTheme,
    Paper,
    Stack,
    IconButton,
    Collapse,
    Divider
} from '@mui/material'
import {
    Warning as AlertTriangleIcon,
    CheckCircle as CheckCircleIcon,
    Info as InfoIcon,
    Close as CloseIcon,
    ReportProblem as ReportIcon
} from '@mui/icons-material'

export type KYCExceptionType = 'kyc_non_compliance' | 'dormant_funded_ufaa' | 'dormant_overdrawn_exit'

interface ExceptionOption {
    type: KYCExceptionType
    label: string
    description: string
    severity: 'high' | 'medium' | 'low'
}

interface SelectedException {
    type: KYCExceptionType
    description: string
}

interface ExceptionSelectorProps {
    onExceptionsChange?: (exceptions: SelectedException[]) => void
    disabled?: boolean
}

const EXCEPTION_OPTIONS: ExceptionOption[] = [
    {
        type: 'kyc_non_compliance',
        label: 'Flag Customer for KYC Non-Compliance',
        description: 'Customer has incomplete or non-compliant KYC documentation that requires immediate attention.',
        severity: 'high'
    },
    {
        type: 'dormant_funded_ufaa',
        label: 'Dormant or Non-reachable (funded account) - UFAA',
        description: 'Account has funds but customer is dormant or unreachable, requiring UFAA (Unclaimed Financial Assets Authority) action.',
        severity: 'medium'
    },
    {
        type: 'dormant_overdrawn_exit',
        label: 'Dormant or non-reachable (overdrawn account) - Exit',
        description: 'Account is overdrawn and customer is dormant or unreachable, requiring account closure procedures.',
        severity: 'medium'
    }
]

export const ExceptionSelector: React.FC<ExceptionSelectorProps> = ({
    onExceptionsChange,
    disabled = false
}) => {
    const theme = useTheme()
    const [selectedExceptions, setSelectedExceptions] = useState<SelectedException[]>([])
    const [customDescriptions, setCustomDescriptions] = useState<Record<KYCExceptionType, string>>({
        kyc_non_compliance: '',
        dormant_funded_ufaa: '',
        dormant_overdrawn_exit: ''
    })

    const handleExceptionToggle = useCallback((option: ExceptionOption) => {
        const isSelected = selectedExceptions.some(ex => ex.type === option.type)

        let newExceptions: SelectedException[]

        if (isSelected) {
            // Remove exception
            newExceptions = selectedExceptions.filter(ex => ex.type !== option.type)
        } else {
            // Add exception with default or custom description
            const description = customDescriptions[option.type] || option.description
            newExceptions = [...selectedExceptions, { type: option.type, description }]
        }

        setSelectedExceptions(newExceptions)

        if (onExceptionsChange) {
            onExceptionsChange(newExceptions)
        }
    }, [selectedExceptions, customDescriptions, onExceptionsChange])

    const handleDescriptionChange = useCallback((type: KYCExceptionType, description: string) => {
        const newDescriptions = { ...customDescriptions, [type]: description }
        setCustomDescriptions(newDescriptions)

        // Update selected exception description if it's already selected
        const updatedExceptions = selectedExceptions.map(ex =>
            ex.type === type ? { ...ex, description } : ex
        )

        if (updatedExceptions.some(ex => ex.type === type)) {
            setSelectedExceptions(updatedExceptions)
            if (onExceptionsChange) {
                onExceptionsChange(updatedExceptions)
            }
        }
    }, [customDescriptions, selectedExceptions, onExceptionsChange])

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return theme.palette.error.main
            case 'medium': return theme.palette.warning.main
            case 'low': return theme.palette.info.main
            default: return theme.palette.grey[500]
        }
    }

    const getSeverityBgColor = (severity: string) => {
        switch (severity) {
            case 'high': return theme.palette.error.main + '08'
            case 'medium': return theme.palette.warning.main + '08'
            case 'low': return theme.palette.info.main + '08'
            default: return theme.palette.grey[50]
        }
    }

    const getSeverityIcon = (severity: string) => {
        const color = getSeverityColor(severity)
        switch (severity) {
            case 'high': return <AlertTriangleIcon sx={{ color, fontSize: 20 }} />
            case 'medium': return <ReportIcon sx={{ color, fontSize: 20 }} />
            case 'low': return <InfoIcon sx={{ color, fontSize: 20 }} />
            default: return <InfoIcon sx={{ color, fontSize: 20 }} />
        }
    }

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select any exceptions that need to be flagged for this review. Multiple exceptions can be selected.
            </Typography>

            <Stack spacing={2}>
                {EXCEPTION_OPTIONS.map((option) => {
                    const isSelected = selectedExceptions.some(ex => ex.type === option.type)

                    return (
                        <Paper
                            key={option.type}
                            elevation={0}
                            sx={{
                                border: `2px solid ${isSelected ? getSeverityColor(option.severity) : theme.palette.grey[200]}`,
                                borderRadius: 3,
                                backgroundColor: isSelected ? getSeverityBgColor(option.severity) : 'white',
                                transition: 'all 0.2s ease-in-out',
                                cursor: 'pointer',
                                '&:hover': {
                                    borderColor: getSeverityColor(option.severity),
                                    backgroundColor: getSeverityBgColor(option.severity),
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                }
                            }}
                            onClick={() => !disabled && handleExceptionToggle(option)}
                        >
                            <Box sx={{ p: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => handleExceptionToggle(option)}
                                            disabled={disabled}
                                            sx={{
                                                color: getSeverityColor(option.severity),
                                                '&.Mui-checked': {
                                                    color: getSeverityColor(option.severity),
                                                },
                                            }}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                {getSeverityIcon(option.severity)}
                                                <Typography variant="body2" fontWeight={600}>
                                                    {option.label}
                                                </Typography>
                                                <Chip
                                                    label={option.severity.toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: getSeverityColor(option.severity),
                                                        color: 'white',
                                                        fontSize: '0.7rem',
                                                        height: 20,
                                                    }}
                                                />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {option.description}
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{ alignItems: 'flex-start', width: '100%', m: 0 }}
                                />

                                <Collapse in={isSelected}>
                                    <Box sx={{ mt: 2, pt: 2 }}>
                                        <Divider sx={{ mb: 2 }} />
                                        <Typography variant="caption" fontWeight={500} gutterBottom display="block">
                                            Additional Details (Optional)
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={2}
                                            size="small"
                                            value={customDescriptions[option.type]}
                                            onChange={(e) => handleDescriptionChange(option.type, e.target.value)}
                                            disabled={disabled}
                                            placeholder="Provide additional context or specific details about this exception..."
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                },
                                            }}
                                        />
                                    </Box>
                                </Collapse>
                            </Box>
                        </Paper>
                    )
                })}
            </Stack>

            {/* Selected Exceptions Summary */}
            {selectedExceptions.length > 0 && (
                <Alert
                    severity="success"
                    icon={<CheckCircleIcon />}
                    sx={{ mt: 3, borderRadius: 3 }}
                >
                    <Box>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            ✅ {selectedExceptions.length} Exception{selectedExceptions.length > 1 ? 's' : ''} Selected
                        </Typography>
                        <Stack spacing={1}>
                            {selectedExceptions.map((exception) => {
                                const option = EXCEPTION_OPTIONS.find(opt => opt.type === exception.type)
                                return (
                                    <Box key={exception.type} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">
                                            • {option?.label}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleExceptionToggle(option!)
                                            }}
                                            disabled={disabled}
                                            sx={{
                                                color: theme.palette.success.main,
                                                '&:hover': {
                                                    backgroundColor: theme.palette.success.main + '10',
                                                }
                                            }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                )
                            })}
                        </Stack>
                    </Box>
                </Alert>
            )}

            {/* Empty State */}
            {selectedExceptions.length === 0 && (
                <Alert
                    severity="info"
                    icon={<InfoIcon />}
                    sx={{ mt: 3, borderRadius: 3 }}
                >
                    <Typography variant="body2">
                        ℹ️ No exceptions selected. Review will be submitted without exceptions.
                    </Typography>
                </Alert>
            )}
        </Box>
    )
}

export default ExceptionSelector