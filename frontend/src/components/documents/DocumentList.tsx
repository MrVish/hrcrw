import React, { useState, useEffect } from 'react'
import {
    FileText,
    Download,
    Eye,
    Trash2,
    AlertTriangle,
    Clock,
    Shield,
    ExternalLink,
    MoreVertical,
    RefreshCw
} from 'lucide-react'

interface Document {
    id: number
    review_id: number
    uploaded_by: number
    filename: string
    file_size: number
    content_type: string
    document_type: string
    status: string
    version: int
    is_sensitive: boolean
    access_count: number
    created_at: string
    updated_at: string
    last_accessed_at?: string
    retention_date?: string
}

interface DocumentListProps {
    reviewId: number
    onDocumentSelect?: (document: Document) => void
    onDocumentDelete?: (documentId: number) => void
    onRefresh?: () => void
    className?: string
    showActions?: boolean
    compact?: boolean
}

const DOCUMENT_TYPE_LABELS = {
    identity: 'Identity',
    financial: 'Financial',
    compliance: 'Compliance',
    legal: 'Legal',
    supporting: 'Supporting',
    other: 'Other'
}

const STATUS_COLORS = {
    active: 'text-green-600 bg-green-100',
    uploading: 'text-blue-600 bg-blue-100',
    archived: 'text-gray-600 bg-gray-100',
    deleted: 'text-red-600 bg-red-100'
}

export const DocumentList: React.FC<DocumentListProps> = ({
    reviewId,
    onDocumentSelect,
    onDocumentDelete,
    onRefresh,
    className = '',
    showActions = true,
    compact = false
}) => {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedDocument, setSelectedDocument] = useState<number | null>(null)
    const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set())

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getFileIcon = (contentType: string) => {
        if (contentType.startsWith('image/')) {
            return <Eye className="h-4 w-4" />
        }
        return <FileText className="h-4 w-4" />
    }

    const fetchDocuments = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/documents/review/${reviewId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Failed to fetch documents')
            }

            const data = await response.json()
            setDocuments(data.documents || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load documents'
            setError(errorMessage)
            console.error('Error fetching documents:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = async (document: Document) => {
        try {
            setDownloadingIds(prev => new Set(prev).add(document.id))

            const response = await fetch('/api/documents/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    document_id: document.id,
                    expiration: 3600 // 1 hour
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

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Download failed'
            setError(errorMessage)
            console.error('Error downloading document:', err)
        } finally {
            setDownloadingIds(prev => {
                const updated = new Set(prev)
                updated.delete(document.id)
                return updated
            })
        }
    }

    const handleDelete = async (document: Document) => {
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

            // Remove from local state
            setDocuments(prev => prev.filter(doc => doc.id !== document.id))

            if (onDocumentDelete) {
                onDocumentDelete(document.id)
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Delete failed'
            setError(errorMessage)
            console.error('Error deleting document:', err)
        }
    }

    const handleDocumentClick = (document: Document) => {
        setSelectedDocument(document.id)
        if (onDocumentSelect) {
            onDocumentSelect(document)
        }
    }

    const handleRefresh = () => {
        fetchDocuments()
        if (onRefresh) {
            onRefresh()
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [reviewId])

    if (loading) {
        return (
            <div className={`document-list ${className}`}>
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-600">Loading documents...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={`document-list ${className}`}>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="ml-2 text-red-700">{error}</span>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                    >
                        Try again
                    </button>
                </div>
            </div>
        )
    }

    if (documents.length === 0) {
        return (
            <div className={`document-list ${className}`}>
                <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        No documents have been uploaded for this review yet.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className={`document-list ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                    Documents ({documents.length})
                </h3>
                <button
                    onClick={handleRefresh}
                    className="text-gray-400 hover:text-gray-600"
                    title="Refresh documents"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {/* Document List */}
            <div className="space-y-2">
                {documents.map((document) => (
                    <div
                        key={document.id}
                        className={`
              border rounded-lg p-4 transition-colors cursor-pointer
              ${selectedDocument === document.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }
              ${compact ? 'p-2' : 'p-4'}
            `}
                        onClick={() => handleDocumentClick(document)}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                                {/* File Icon */}
                                <div className="flex-shrink-0 mt-1">
                                    {getFileIcon(document.content_type)}
                                </div>

                                {/* Document Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h4 className="text-sm font-medium text-gray-900 truncate">
                                            {document.filename}
                                        </h4>

                                        {document.is_sensitive && (
                                            <Shield className="h-4 w-4 text-amber-500" title="Sensitive Document" />
                                        )}

                                        {document.version > 1 && (
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                v{document.version}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                        <span>{formatFileSize(document.file_size)}</span>
                                        <span>{DOCUMENT_TYPE_LABELS[document.document_type] || document.document_type}</span>
                                        <span>Uploaded {formatDate(document.created_at)}</span>
                                        {document.access_count > 0 && (
                                            <span>{document.access_count} downloads</span>
                                        )}
                                    </div>

                                    {!compact && (
                                        <div className="mt-2 flex items-center space-x-2">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[document.status] || STATUS_COLORS.active}`}>
                                                {document.status}
                                            </span>

                                            {document.retention_date && (
                                                <span className="text-xs text-gray-500 flex items-center">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Expires {formatDate(document.retention_date)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            {showActions && (
                                <div className="flex items-center space-x-2 ml-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDownload(document)
                                        }}
                                        disabled={downloadingIds.has(document.id)}
                                        className="text-gray-400 hover:text-blue-600 disabled:opacity-50"
                                        title="Download document"
                                    >
                                        {downloadingIds.has(document.id) ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}
                                    </button>

                                    {document.content_type.startsWith('image/') && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDownload(document) // For now, download to view
                                            }}
                                            className="text-gray-400 hover:text-green-600"
                                            title="Preview image"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDelete(document)
                                        }}
                                        className="text-gray-400 hover:text-red-600"
                                        title="Delete document"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default DocumentList