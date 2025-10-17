import React from 'react'
import { AlertTriangle, Clock, CheckCircle, User, Calendar, FileText } from 'lucide-react'

export interface ExceptionDisplayData {
    id: number
    type: string
    description: string
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
    created_at: string
    created_by?: number
    creator_name?: string
    resolved_at?: string
    resolved_by?: number
    resolver_name?: string
    resolution_notes?: string
}

interface ExceptionDisplayProps {
    exceptions: ExceptionDisplayData[]
    onExceptionClick?: (exception: ExceptionDisplayData) => void
    showActions?: boolean
    className?: string
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'open':
            return <AlertTriangle className="h-4 w-4" />
        case 'in_progress':
            return <Clock className="h-4 w-4" />
        case 'resolved':
        case 'closed':
            return <CheckCircle className="h-4 w-4" />
        default:
            return <AlertTriangle className="h-4 w-4" />
    }
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'open':
            return 'text-red-600 bg-red-50 border-red-200'
        case 'in_progress':
            return 'text-orange-600 bg-orange-50 border-orange-200'
        case 'resolved':
            return 'text-green-600 bg-green-50 border-green-200'
        case 'closed':
            return 'text-gray-600 bg-gray-50 border-gray-200'
        default:
            return 'text-gray-600 bg-gray-50 border-gray-200'
    }
}

const getExceptionTypeLabel = (type: string) => {
    switch (type) {
        case 'kyc_non_compliance':
            return 'KYC Non-Compliance'
        case 'dormant_funded_ufaa':
            return 'Dormant Funded Account (UFAA)'
        case 'dormant_overdrawn_exit':
            return 'Dormant Overdrawn Account (Exit)'
        default:
            return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export const ExceptionDisplay: React.FC<ExceptionDisplayProps> = ({
    exceptions,
    onExceptionClick,
    showActions = false,
    className = ''
}) => {
    if (!exceptions || exceptions.length === 0) {
        return (
            <div className={`exception-display ${className}`}>
                <div className="no-exceptions">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm text-gray-600">No exceptions raised for this review</span>
                </div>
            </div>
        )
    }

    return (
        <div className={`exception-display ${className}`}>
            <div className="exception-display-header">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Review Exceptions ({exceptions.length})
                </h4>
            </div>

            <div className="exception-list space-y-3">
                {exceptions.map((exception) => (
                    <div
                        key={exception.id}
                        className={`exception-card ${getStatusColor(exception.status)} border rounded-lg p-4 ${onExceptionClick ? 'cursor-pointer hover:shadow-md' : ''
                            }`}
                        onClick={() => onExceptionClick && onExceptionClick(exception)}
                    >
                        <div className="exception-header flex items-start justify-between mb-2">
                            <div className="exception-type">
                                <div className="flex items-center mb-1">
                                    {getStatusIcon(exception.status)}
                                    <span className="ml-2 font-medium text-sm">
                                        {getExceptionTypeLabel(exception.type)}
                                    </span>
                                </div>
                                <div className="flex items-center text-xs opacity-75">
                                    <span>Exception #{exception.id}</span>
                                    <span className="mx-2">•</span>
                                    <span className="capitalize">{exception.status.replace('_', ' ')}</span>
                                </div>
                            </div>

                            {showActions && onExceptionClick && (
                                <button
                                    className="text-xs px-2 py-1 border border-current rounded hover:bg-current hover:bg-opacity-10"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onExceptionClick(exception)
                                    }}
                                >
                                    View Details
                                </button>
                            )}
                        </div>

                        <div className="exception-description mb-3">
                            <p className="text-sm">
                                {exception.description}
                            </p>
                        </div>

                        <div className="exception-metadata">
                            <div className="flex items-center justify-between text-xs opacity-75">
                                <div className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    <span>Created by {exception.creator_name || `User ${exception.created_by}`}</span>
                                </div>
                                <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    <span>{formatDate(exception.created_at)}</span>
                                </div>
                            </div>

                            {exception.resolved_at && (
                                <div className="flex items-center justify-between text-xs opacity-75 mt-1">
                                    <div className="flex items-center">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        <span>Resolved by {exception.resolver_name || `User ${exception.resolved_by}`}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        <span>{formatDate(exception.resolved_at)}</span>
                                    </div>
                                </div>
                            )}

                            {exception.resolution_notes && (
                                <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                                    <div className="flex items-start">
                                        <FileText className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div className="text-xs font-medium mb-1">Resolution Notes:</div>
                                            <div className="text-xs opacity-90">{exception.resolution_notes}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ExceptionDisplay