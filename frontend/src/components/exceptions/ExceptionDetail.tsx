import React, { useState, useEffect } from 'react'
import {
    Box
} from '@mui/material'
import { apiClient } from '../../services'
import { useAuth } from '../../contexts'
import type { User } from '../../types'
import { DetailPageContainer } from '../common/DetailPageContainer'
import {
    DetailHeaderSkeleton,
    ExceptionInfoSkeleton
} from '../common/LoadingStates'
import {
    SuccessDisplay,
    CenteredError
} from '../common/ErrorHandling'
import { ExceptionDetailHeader } from './ExceptionDetailHeader'
import { ExceptionInfoCards } from './ExceptionInfoCards'
import { ExceptionStatusForm, type StatusUpdateData } from './ExceptionStatusForm'
import { useAnnouncement, useAccessibleLoading } from '../../hooks/useAccessibility'
import { useDetailFocusManagement } from '../../hooks/useDetailFocusManagement'

interface ExceptionDetailData {
    id: number
    review_id: number
    client_id?: string
    client_name?: string
    title: string
    type: 'DOCUMENTATION' | 'COMPLIANCE' | 'TECHNICAL' | 'REGULATORY' | 'OPERATIONAL' | 'OTHER'
    description: string
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    assigned_to: number | null
    assigned_user_name?: string | null
    assigned_to_name?: string | null
    created_by: number
    creator_name?: string
    created_at: string
    updated_at: string
    resolved_at: string | null
    resolution_notes: string | null
    due_date: string | null
}



interface ExceptionDetailProps {
    exceptionId: number
    onBack: () => void
    onEdit?: (exception: ExceptionDetailData) => void
    className?: string
}



export const ExceptionDetail: React.FC<ExceptionDetailProps> = ({
    exceptionId,
    onBack,
    onEdit,
    className = ''
}) => {
    const { user } = useAuth()
    const { announce } = useAnnouncement()
    const { getSkipLinkProps, getMainContentProps } = useDetailFocusManagement('exception')
    const [exception, setException] = useState<ExceptionDetailData | null>(null)
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [showStatusForm, setShowStatusForm] = useState(false)

    // Accessibility loading props
    const loadingProps = useAccessibleLoading(loading, 'Loading exception details')

    useEffect(() => {
        fetchExceptionDetails()
        fetchUsers()
    }, [exceptionId])

    const fetchExceptionDetails = async () => {
        try {
            setLoading(true)
            const exception = await apiClient.getException(exceptionId)
            setException(exception)
            setError(null)
            announce(`Exception details loaded for ${exception.title}`, 'polite')
        } catch (err) {
            const errorMessage = 'Failed to load exception details'
            setError(errorMessage)
            announce(errorMessage, 'assertive')
            console.error('Exception details error:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchUsers = async () => {
        try {
            const assignableUsers = await apiClient.getAssignableUsersList()
            setUsers(assignableUsers)
        } catch (err) {
            console.error('Users fetch error:', err)
            setUsers([]) // Set empty array so the component doesn't break
        }
    }

    const handleStatusUpdate = async (data: StatusUpdateData) => {
        if (!exception) return

        try {
            setUpdating(true)
            setError(null)
            setSuccess(null)
            announce('Updating exception status', 'polite')

            const payload: any = {
                status: data.status,
                assigned_to: data.assigned_to
            }

            // Add resolution notes if provided
            if (data.resolution_notes?.trim()) {
                payload.resolution_notes = data.resolution_notes.trim()
            }

            const updatedException = await apiClient.updateException(exceptionId, payload)
            setException(updatedException)
            const successMsg = 'Exception updated successfully'
            setSuccess(successMsg)
            setShowStatusForm(false)
            announce(successMsg, 'polite')

            // Clear success message after 5 seconds
            setTimeout(() => setSuccess(null), 5000)
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Failed to update exception'
            setError(errorMessage)
            announce(errorMessage, 'assertive')
            console.error('Update error:', err)
        } finally {
            setUpdating(false)
        }
    }

    const canEdit = () => {
        if (!exception || !user) return false

        // Admin can edit any exception
        if (user.role === 'admin') return true

        // Assigned user can edit
        if (exception.assigned_to === user.id) return true

        // Creator can edit if still open
        if (exception.created_by === user.id && exception.status === 'OPEN') return true

        return false
    }

    const canUpdateStatus = () => {
        return canEdit() && exception?.status !== 'CLOSED'
    }

    if (loading) {
        return (
            <DetailPageContainer className={className}>
                <Box
                    role="main"
                    aria-label="Exception details loading"
                    {...loadingProps}
                >
                    <DetailHeaderSkeleton />
                    <ExceptionInfoSkeleton />
                </Box>
            </DetailPageContainer>
        )
    }

    if (error && !exception) {
        return (
            <DetailPageContainer className={className}>
                <Box role="main" aria-label="Exception details error">
                    <CenteredError
                        error={error}
                        title="Failed to load exception"
                        onRetry={fetchExceptionDetails}
                        retryText="Retry"
                    />
                </Box>
            </DetailPageContainer>
        )
    }

    if (!exception) {
        return (
            <DetailPageContainer className={className}>
                <Box role="main" aria-label="Exception not found">
                    <CenteredError
                        error="Exception not found"
                        title="Exception Not Found"
                    />
                </Box>
            </DetailPageContainer>
        )
    }

    return (
        <DetailPageContainer className={className}>
            {/* Skip Link */}
            <a {...getSkipLinkProps()}>
                Skip to main content
            </a>

            <Box
                component="main"
                role="main"
                aria-labelledby="exception-detail-heading"
                aria-describedby="exception-detail-description"
                {...getMainContentProps()}
            >
                {/* Screen reader description */}
                <Box id="exception-detail-description" className="sr-only">
                    Exception detail page for {exception.title}. Use tab navigation to move between sections.
                </Box>

                {/* Header */}
                <header>
                    <ExceptionDetailHeader
                        exception={exception}
                        canEdit={canEdit()}
                        canUpdateStatus={canUpdateStatus()}
                        onBack={onBack}
                        onEdit={onEdit ? () => onEdit(exception) : undefined}
                        onUpdateStatus={() => setShowStatusForm(!showStatusForm)}
                    />
                </header>

                {/* Global Success Message */}
                {success && (
                    <Box sx={{ mb: 3 }} role="status" aria-live="polite">
                        <SuccessDisplay
                            message={success}
                            onDismiss={() => setSuccess(null)}
                        />
                    </Box>
                )}

                {/* Status Update Form */}
                <section aria-label="Exception status update form">
                    <ExceptionStatusForm
                        exception={exception}
                        users={users}
                        open={showStatusForm}
                        onUpdate={handleStatusUpdate}
                        onCancel={() => {
                            setShowStatusForm(false)
                            setError(null)
                        }}
                        updating={updating}
                        error={error}
                    />
                </section>

                {/* Exception Information Cards */}
                <section aria-label="Exception information">
                    <ExceptionInfoCards exception={exception} />
                </section>
            </Box>
        </DetailPageContainer>
    )
}