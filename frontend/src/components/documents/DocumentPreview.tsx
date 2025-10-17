import React, { useState, useEffect } from 'react'
import {
    X,
    Download,
    FileText,
    Image,
    Shield,
    Clock,
    User,
    Calendar,
    Eye,
    AlertTriangle,
    RefreshCw,
    ExternalLink
} from 'lucide-react'

interface DocumentDetail {
    id: number
    review_id: number
    uploaded_by: number
    filename: string
    file_size: number
    content_type: string
    document_type: string
    status: string
    version: number
    is_sensitive: boolean
    access_count: number
    created_at: string
    updated_at: string
    last_accessed_at?: string
    retention_date?: string
    checksum?: string
    file_size_mb: number
    is_image: boolean
    is_pdf: boolean
    is_expired: boolean
    file_extension: string
}

interface DocumentPreviewProps {
    documentId: number
    onClose: () => void
    onDownload?: (document: DocumentDetail) => void
    onDelete?: (documentId: number) => void
    className?: string
}

const DOCUMENT_TYPE_LABELS = {
    identity: 'Identity Document',
    financial: 'Financial Document',
    compliance: 'Compliance Document',
    legal: 'Legal Document',
    supporting: 'Supporting Document',
    other: 'Other Document'
}

const STATUS_COLORS = {
    active: 'text-green-600 bg-green-100',
    uploading: 'text-blue-600 bg-blue-100',
    archived: 'text-gray-600 bg-gray-100',
    deleted: 'text-red-600 bg-red-100'
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
    documentId,
    onClose,
    onDownload,
    onDelete,
    className = ''
}) => {
    const [document, setDocument] = useState<DocumentDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
    const [showImagePreview, setShowImagePreview] = useState(false)

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const fetchDocumentDetails = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/documents/${documentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Failed to fetch document details')
            }

            const data = await response.json()
            setDocument(data)

            // If it's an image, prepare preview
            if (data.is_image) {
                await loadImagePreview(data)
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load document'
            setError(errorMessage)
            console.error('Error fetching document details:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadImagePreview = async (doc: DocumentDetail) => {
        try {
            const response = await fetch('/api/documents/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    document_id: doc.id,
                    expiration: 3600
                })
            })

            if (response.ok) {
                const data = await response.json()
                setImagePreviewUrl(data.download_url)
            }
        } catch (err) {
            console.error('Error loading image preview:', err)
        }
    }

    const handleDownload = async () => {
        if (!document) return

        try {
            setDownloading(true)

            const response = await fetch('/api/documents/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    document_id: document.id,
                    expiration: 3600
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Failed to generate download URL')
            }

            const data = await response.json()

            // Create a temporary link and trigger download
            const link = document.createElement('a')
            link.href = data.download_url
            link.download = data.filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            if (onDownload) {
                onDownload(document)
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Download failed'
            setError(errorMessage)
            console.error('Error downloading document:', err)
        } finally {
            setDownloading(false)
        }
    }

    const handleDelete = async () => {
        if (!document) return

        if (!window.confirm(`Are you sure you want to delete "${document.filename}"?`)) {
            return
        }

        try {
            const response = await fetch(`/api/documents/${document.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Failed to delete document')
            }

            if (onDelete) {
                onDelete(document.id)
            }

            onClose()

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Delete failed'
            setError(errorMessage)
            console.error('Error deleting document:', err)
        }
    }

    useEffect(() => {
        fetchDocumentDetails()
    }, [documentId])

    if (loading) {
        return (
            <div className={`document-preview ${className}`}>
                <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                        <span className="ml-3 text-gray-600">Loading document details...</span>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !document) {
        return (
            <div className={`document-preview ${className}`}>
                <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Document Preview</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <span className="ml-2 text-red-700">{error || 'Document not found'}</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`document-preview fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        {document.is_image ? (
                            <Image className="h-6 w-6 text-blue-500" />
                        ) : (
                            <FileText className="h-6 w-6 text-gray-500" />
                        )}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 truncate">
                                {document.filename}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {DOCUMENT_TYPE_LABELS[document.document_type] || document.document_type}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {downloading ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            <span>Download</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* Status and Warnings */}
                    <div className="mb-6 space-y-2">
                        <div className="flex items-center space-x-4">
                            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[document.status] || STATUS_COLORS.active}`}>
                                {document.status}
                            </span>

                            {document.is_sensitive && (
                                <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-amber-700 bg-amber-100 rounded-full">
                                    <Shield className="h-4 w-4 mr-1" />
                                    Sensitive
                                </span>
                            )}

                            {document.version > 1 && (
                                <span className="inline-flex px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-full">
                                    Version {document.version}
                                </span>
                            )}
                        </div>

                        {document.is_expired && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    <span className="ml-2 text-red-700 font-medium">Document Expired</span>
                                </div>
                                <p className="mt-1 text-sm text-red-600">
                                    This document expired on {document.retention_date && formatDate(document.retention_date)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Image Preview */}
                    {document.is_image && imagePreviewUrl && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-gray-900">Preview</h3>
                                <button
                                    onClick={() => setShowImagePreview(!showImagePreview)}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    {showImagePreview ? 'Hide Preview' : 'Show Preview'}
                                </button>
                            </div>

                            {showImagePreview && (
                                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <img
                                        src={imagePreviewUrl}
                                        alt={document.filename}
                                        className="max-w-full max-h-96 mx-auto rounded-lg shadow-sm"
                                        onError={() => setImagePreviewUrl(null)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Document Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* File Information */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-3">File Information</h3>
                            <dl className="space-y-2">
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-500">File Size</dt>
                                    <dd className="text-sm text-gray-900">{document.file_size_mb} MB</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-500">File Type</dt>
                                    <dd className="text-sm text-gray-900">{document.content_type}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-500">Extension</dt>
                                    <dd className="text-sm text-gray-900">.{document.file_extension}</dd>
                                </div>
                                {document.checksum && (
                                    <div className="flex justify-between">
                                        <dt className="text-sm text-gray-500">Checksum</dt>
                                        <dd className="text-sm text-gray-900 font-mono text-xs">{document.checksum.substring(0, 16)}...</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* Upload Information */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Upload Information</h3>
                            <dl className="space-y-2">
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-500">Uploaded</dt>
                                    <dd className="text-sm text-gray-900">{formatDate(document.created_at)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-500">Last Modified</dt>
                                    <dd className="text-sm text-gray-900">{formatDate(document.updated_at)}</dd>
                                </div>
                                {document.last_accessed_at && (
                                    <div className="flex justify-between">
                                        <dt className="text-sm text-gray-500">Last Accessed</dt>
                                        <dd className="text-sm text-gray-900">{formatDate(document.last_accessed_at)}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-500">Access Count</dt>
                                    <dd className="text-sm text-gray-900">{document.access_count} downloads</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Retention Information */}
                        {document.retention_date && (
                            <div className="md:col-span-2">
                                <h3 className="text-sm font-medium text-gray-900 mb-3">Retention Policy</h3>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">
                                            Document expires on {formatDate(document.retention_date)}
                                        </span>
                                    </div>
                                    {document.is_expired && (
                                        <p className="mt-2 text-sm text-red-600">
                                            This document has expired and may be subject to automatic deletion.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Document ID: {document.id}
                            </div>

                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                                >
                                    Delete Document
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DocumentPreview