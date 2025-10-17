import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface User {
    id: number
    name: string
    email: string
    role: 'Maker' | 'Checker' | 'Admin'
    is_active: boolean
    created_at: string
    updated_at: string
}

interface UserFormProps {
    user?: User | null
    onSave: () => void
    onCancel: () => void
}

interface FormData {
    name: string
    email: string
    password: string
    role: 'Maker' | 'Checker' | 'Admin'
    is_active: boolean
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSave, onCancel }) => {
    const { user: currentUser } = useAuth()
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        password: '',
        role: 'Maker',
        is_active: true
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    const isEditing = Boolean(user)

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                password: '', // Don't populate password for editing
                role: user.role,
                is_active: user.is_active
            })
        }
    }, [user])

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}

        if (!formData.name.trim()) {
            errors.name = 'Name is required'
        } else if (formData.name.length < 2) {
            errors.name = 'Name must be at least 2 characters'
        }

        if (!formData.email.trim()) {
            errors.email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address'
        }

        if (!isEditing && !formData.password) {
            errors.password = 'Password is required for new users'
        } else if (formData.password && formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters'
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }))

        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        if (!currentUser?.token) return

        setLoading(true)
        setError(null)

        try {
            const url = isEditing ? `/api/users/${user!.id}` : '/api/users'
            const method = isEditing ? 'PUT' : 'POST'

            // Prepare request body
            const requestBody: any = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                is_active: formData.is_active
            }

            // Only include password if it's provided
            if (formData.password) {
                requestBody.password = formData.password
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || `Failed to ${isEditing ? 'update' : 'create'} user`)
            }

            onSave()
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} user`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="user-form-overlay" onClick={onCancel}>
            <div className="user-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit User' : 'Create New User'}</h2>
                    <button onClick={onCancel} className="close-button">×</button>
                </div>

                <form onSubmit={handleSubmit} className="user-form">
                    <div className="form-content">
                        {error && (
                            <div className="error-message">
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="name">Full Name *</label>
                            <input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className={`form-input ${validationErrors.name ? 'error' : ''}`}
                                disabled={loading}
                                placeholder="Enter full name"
                            />
                            {validationErrors.name && (
                                <span className="field-error">{validationErrors.name}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email Address *</label>
                            <input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className={`form-input ${validationErrors.email ? 'error' : ''}`}
                                disabled={loading}
                                placeholder="Enter email address"
                            />
                            {validationErrors.email && (
                                <span className="field-error">{validationErrors.email}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">
                                Password {isEditing ? '(leave blank to keep current)' : '*'}
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                className={`form-input ${validationErrors.password ? 'error' : ''}`}
                                disabled={loading}
                                placeholder={isEditing ? 'Enter new password (optional)' : 'Enter password'}
                            />
                            {validationErrors.password && (
                                <span className="field-error">{validationErrors.password}</span>
                            )}
                            <small className="help-text">
                                Password must be at least 8 characters long
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="role">Role *</label>
                            <select
                                id="role"
                                value={formData.role}
                                onChange={(e) => handleInputChange('role', e.target.value as 'Maker' | 'Checker' | 'Admin')}
                                className="form-select"
                                disabled={loading}
                            >
                                <option value="Maker">Maker</option>
                                <option value="Checker">Checker</option>
                                <option value="Admin">Admin</option>
                            </select>
                            <small className="help-text">
                                <strong>Maker:</strong> Can create and submit reviews<br />
                                <strong>Checker:</strong> Can approve/reject reviews<br />
                                <strong>Admin:</strong> Full system access including user management
                            </small>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                                    disabled={loading}
                                />
                                <span>Active User</span>
                            </label>
                            <small className="help-text">
                                Inactive users cannot log in to the system
                            </small>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update User' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}