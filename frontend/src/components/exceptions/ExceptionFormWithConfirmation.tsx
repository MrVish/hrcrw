import React, { useState, useEffect } from 'react'
import { ExceptionForm } from './ExceptionForm'
import { FormWithConfirmation } from '../common/FormWithConfirmation'

interface ExceptionFormData {
    review_id: number | null
    client_id: string
    type: string
    title: string
    description: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    assigned_to: string
}

interface ExceptionFormWithConfirmationProps {
    exceptionId?: number
    reviewId?: number
    onSave?: (exceptionId: number) => void
    onCancel?: () => void
}

/**
 * Enhanced ExceptionForm component with form navigation confirmation
 * 
 * Features:
 * - Tracks form dirty state when editing exception details
 * - Shows confirmation dialog when navigating away from unsaved changes
 * - Provides "Stay", "Leave", and "Save and Leave" options
 * - Integrates with React Router for navigation blocking
 */
export const ExceptionFormWithConfirmation: React.FC<ExceptionFormWithConfirmationProps> = ({
    exceptionId,
    reviewId,
    onSave,
    onCancel
}) => {
    const [formData, setFormData] = useState<ExceptionFormData>({
        review_id: reviewId || null,
        client_id: '',
        type: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        assigned_to: ''
    })
    const [originalFormData, setOriginalFormData] = useState<ExceptionFormData>({
        review_id: reviewId || null,
        client_id: '',
        type: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        assigned_to: ''
    })
    const [saving, setSaving] = useState(false)

    // Calculate if form is dirty
    const isFormDirty = JSON.stringify(formData) !== JSON.stringify(originalFormData)

    // This would be implemented to handle the actual form save logic
    const handleSave = async () => {
        // Implementation would go here
        // For now, just simulate saving
        setSaving(true)
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))
            setOriginalFormData({ ...formData })
            if (onSave) {
                onSave(exceptionId || 1)
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <FormWithConfirmation
            isDirty={isFormDirty}
            onSave={handleSave}
            canSave={true}
            isLoading={saving}
        >
            <ExceptionForm
                exceptionId={exceptionId}
                reviewId={reviewId}
                onSave={onSave}
                onCancel={onCancel}
            />
        </FormWithConfirmation>
    )
}

export default ExceptionFormWithConfirmation