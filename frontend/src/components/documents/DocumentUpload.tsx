import React, { useState, useCallback, useRef } from 'react'
import {
    Box,
    Typography,
    LinearProgress,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    useTheme,
    Paper,
    Stack,
    IconButton
} from '@mui/material'
import {
    CloudUpload as UploadIcon,
    Description as FileTextIcon,
    Error as AlertCircleIcon,
    CheckCircle as CheckCircleIcon,
    Refresh as LoaderIcon,
    Close as XIcon
} from '@mui/icons-material'

interface DocumentUploadProps {
    reviewId: number
    onUploadComplete?: (document: UploadedDocument) => void
    onUploadError?: (error: string) => void
    maxFileSize?: number // in MB
    allowedTypes?: string[]
    multiple?: boolean
}

interface UploadedDocument {
    document_id: number
    filename: string
    file_size: number
    content_type: string
    document_type: string
    created_at: string
}

interface UploadProgress {
    file: File
    progress: number
    status: 'uploading' | 'completed' | 'error'
    error?: string
    documentId?: number
}

const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
]

const DOCUMENT_TYPES = [
    { value: 'identity', label: 'Identity Document' },
    { value: 'financial', label: 'Financial Document' },
    { value: 'compliance', label: 'Compliance Document' },
    { value: 'legal', label: 'Legal Document' },
    { value: 'supporting', label: 'Supporting Document' },
    { value: 'other', label: 'Other' }
]

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
    reviewId,
    onUploadComplete,
    onUploadError,
    maxFileSize = 10, // 10MB default
    allowedTypes = ALLOWED_FILE_TYPES,
    multiple = true
}) => {
    const [isDragOver, setIsDragOver] = useState(false)
    const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
    const [selectedDocumentType, setSelectedDocumentType] = useState('supporting')
    const [isSensitive, setIsSensitive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const validateFile = (file: File): string | null => {
        // Check file size
        if (file.size > maxFileSize * 1024 * 1024) {
            return `File size exceeds ${maxFileSize}MB limit`
        }

        // Check file type
        if (!allowedTypes.includes(file.type)) {
            return 'File type not allowed'
        }

        // Check filename
        const invalidChars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
        if (invalidChars.some(char => file.name.includes(char))) {
            return 'Filename contains invalid characters'
        }

        return null
    }

    const uploadFile = async (file: File): Promise<void> => {
        const fileKey = `${file.name}-${Date.now()}`

        // Initialize upload progress
        setUploads(prev => new Map(prev.set(fileKey, {
            file,
            progress: 0,
            status: 'uploading'
        })))

        try {
            // Step 1: Prepare upload
            const prepareResponse = await fetch('/api/documents/upload/prepare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    review_id: reviewId,
                    filename: file.name,
                    content_type: file.type,
                    document_type: selectedDocumentType,
                    file_size: file.size,
                    is_sensitive: isSensitive
                })
            })

            if (!prepareResponse.ok) {
                const error = await prepareResponse.json()
                throw new Error(error.detail || 'Failed to prepare upload')
            }

            const uploadData = await prepareResponse.json()

            // Step 2: Upload to S3 using pre-signed URL
            const formData = new FormData()

            // Add all required fields from the response
            Object.entries(uploadData.upload_fields).forEach(([key, value]) => {
                formData.append(key, value as string)
            })

            // Add the file last
            formData.append('file', file)

            // Upload with progress tracking
            const uploadResponse = await new Promise<Response>((resolve, reject) => {
                const xhr = new XMLHttpRequest()

                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round((event.loaded / event.total) * 100)
                        setUploads(prev => {
                            const updated = new Map(prev)
                            const current = updated.get(fileKey)
                            if (current) {
                                updated.set(fileKey, { ...current, progress })
                            }
                            return updated
                        })
                    }
                })

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(new Response(xhr.responseText, { status: xhr.status }))
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`))
                    }
                })

                xhr.addEventListener('error', () => {
                    reject(new Error('Upload failed'))
                })

                xhr.open('POST', uploadData.upload_url)
                xhr.send(formData)
            })

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file to S3')
            }

            // Step 3: Confirm upload
            const confirmResponse = await fetch('/api/documents/upload/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    document_id: uploadData.document_id,
                    actual_file_size: file.size
                })
            })

            if (!confirmResponse.ok) {
                const error = await confirmResponse.json()
                throw new Error(error.detail || 'Failed to confirm upload')
            }

            // Update upload status to completed
            setUploads(prev => {
                const updated = new Map(prev)
                updated.set(fileKey, {
                    file,
                    progress: 100,
                    status: 'completed',
                    documentId: uploadData.document_id
                })
                return updated
            })

            // Notify parent component
            if (onUploadComplete) {
                onUploadComplete({
                    document_id: uploadData.document_id,
                    filename: file.name,
                    file_size: file.size,
                    content_type: file.type,
                    document_type: selectedDocumentType,
                    created_at: new Date().toISOString()
                })
            }

            // Remove from uploads after a delay
            setTimeout(() => {
                setUploads(prev => {
                    const updated = new Map(prev)
                    updated.delete(fileKey)
                    return updated
                })
            }, 3000)

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed'

            // Update upload status to error
            setUploads(prev => {
                const updated = new Map(prev)
                updated.set(fileKey, {
                    file,
                    progress: 0,
                    status: 'error',
                    error: errorMessage
                })
                return updated
            })

            if (onUploadError) {
                onUploadError(errorMessage)
            }

            // Remove from uploads after a delay
            setTimeout(() => {
                setUploads(prev => {
                    const updated = new Map(prev)
                    updated.delete(fileKey)
                    return updated
                })
            }, 5000)
        }
    }

    const handleFiles = useCallback(async (files: FileList) => {
        const fileArray = Array.from(files)

        for (const file of fileArray) {
            const validationError = validateFile(file)
            if (validationError) {
                if (onUploadError) {
                    onUploadError(`${file.name}: ${validationError}`)
                }
                continue
            }

            await uploadFile(file)
        }
    }, [reviewId, selectedDocumentType, isSensitive, maxFileSize, allowedTypes, onUploadComplete, onUploadError])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)

        if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files)
        }
    }, [handleFiles])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files)
        }
        // Reset input value to allow selecting the same file again
        e.target.value = ''
    }, [handleFiles])

    const handleClick = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const removeUpload = useCallback((fileKey: string) => {
        setUploads(prev => {
            const updated = new Map(prev)
            updated.delete(fileKey)
            return updated
        })
    }, [])

    const theme = useTheme()

    return (
        <Box>
            {/* Upload Configuration */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <FormControl fullWidth>
                    <InputLabel>Document Type</InputLabel>
                    <Select
                        value={selectedDocumentType}
                        onChange={(e) => setSelectedDocumentType(e.target.value)}
                        label="Document Type"
                        sx={{ borderRadius: 2 }}
                    >
                        {DOCUMENT_TYPES.map(type => (
                            <MenuItem key={type.value} value={type.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {type.value === 'financial' && '💰'}
                                    {type.value === 'identity' && '🆔'}
                                    {type.value === 'compliance' && '⚖️'}
                                    {type.value === 'legal' && '📋'}
                                    {type.value === 'supporting' && '📄'}
                                    {type.value === 'other' && '📌'}
                                    {type.label}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 'fit-content' }}>
                    <Chip
                        label="Sensitive Document"
                        variant={isSensitive ? "filled" : "outlined"}
                        color={isSensitive ? "error" : "default"}
                        onClick={() => setIsSensitive(!isSensitive)}
                        sx={{ cursor: 'pointer' }}
                    />
                </Box>
            </Stack>

            {/* Drop Zone */}
            <Paper
                elevation={0}
                sx={{
                    border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.grey[300]}`,
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragOver ? theme.palette.primary.main + '08' : 'transparent',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        borderColor: theme.palette.primary.main,
                        backgroundColor: theme.palette.primary.main + '04',
                    }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <UploadIcon sx={{ fontSize: 48, color: theme.palette.grey[400], mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Drop files here or click to browse
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {multiple ? 'Select multiple files' : 'Select a file'} up to {maxFileSize}MB each
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Supported formats: PDF, Images, Word, Excel, Text files
                </Typography>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple={multiple}
                    accept={allowedTypes.join(',')}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </Paper>

            {/* Upload Progress */}
            {uploads.size > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Uploading Files
                    </Typography>
                    <Stack spacing={2}>
                        {Array.from(uploads.entries()).map(([fileKey, upload]) => (
                            <Paper
                                key={fileKey}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    backgroundColor: theme.palette.grey[50],
                                    border: `1px solid ${theme.palette.grey[200]}`,
                                    borderRadius: 2
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                        <FileTextIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                                        <Typography
                                            variant="body2"
                                            fontWeight={500}
                                            sx={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: 200
                                            }}
                                        >
                                            {upload.file.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            ({formatFileSize(upload.file.size)})
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {upload.status === 'uploading' && (
                                            <LoaderIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                                        )}
                                        {upload.status === 'completed' && (
                                            <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                                        )}
                                        {upload.status === 'error' && (
                                            <AlertCircleIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
                                        )}

                                        <IconButton
                                            size="small"
                                            onClick={() => removeUpload(fileKey)}
                                            sx={{ color: theme.palette.grey[400] }}
                                        >
                                            <XIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Box>
                                </Box>

                                {upload.status === 'uploading' && (
                                    <LinearProgress
                                        variant="determinate"
                                        value={upload.progress}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: theme.palette.grey[200],
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 3,
                                            }
                                        }}
                                    />
                                )}

                                {upload.status === 'error' && upload.error && (
                                    <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                                        <Typography variant="caption">
                                            {upload.error}
                                        </Typography>
                                    </Alert>
                                )}

                                {upload.status === 'completed' && (
                                    <Alert severity="success" sx={{ mt: 1, py: 0.5 }}>
                                        <Typography variant="caption">
                                            Upload completed successfully
                                        </Typography>
                                    </Alert>
                                )}
                            </Paper>
                        ))}
                    </Stack>
                </Box>
            )}
        </Box>
    )
}

export default DocumentUpload