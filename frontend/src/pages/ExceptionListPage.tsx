import React, { useState } from 'react'
import { Box } from '@mui/material'
import { ModernLayout } from '../components/layout/ModernLayout'
import { ExceptionList, ExceptionForm, ExceptionDetail } from '../components'
import type { Exception } from '../types'

type ViewMode = 'list' | 'create' | 'edit' | 'detail'

export const ExceptionListPage: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('list')
    const [selectedException, setSelectedException] = useState<Exception | null>(null)

    const handleCreateException = () => {
        setSelectedException(null)
        setViewMode('create')
    }

    const handleExceptionSelect = (exception: Exception) => {
        setSelectedException(exception)
        setViewMode('detail')
    }

    const handleEditException = (exception: Exception) => {
        setSelectedException(exception)
        setViewMode('edit')
    }

    const handleBackToList = () => {
        setSelectedException(null)
        setViewMode('list')
    }

    const handleExceptionSaved = (exceptionId: number) => {
        // Optionally refresh the list or show success message
        setViewMode('list')
    }

    const getPageTitle = () => {
        switch (viewMode) {
            case 'create':
                return 'Create Exception'
            case 'edit':
                return selectedException ? `Edit Exception #${selectedException.id}` : 'Edit Exception'
            case 'detail':
                return selectedException ? `Exception #${selectedException.id}` : 'Exception Details'
            default:
                return 'Exceptions'
        }
    }

    const renderContent = () => {
        switch (viewMode) {
            case 'create':
                return (
                    <ExceptionForm
                        onSave={handleExceptionSaved}
                        onCancel={handleBackToList}
                    />
                )

            case 'edit':
                return selectedException ? (
                    <ExceptionForm
                        exceptionId={selectedException.id}
                        onSave={handleExceptionSaved}
                        onCancel={handleBackToList}
                    />
                ) : null

            case 'detail':
                return selectedException ? (
                    <ExceptionDetail
                        exceptionId={selectedException.id}
                        onBack={handleBackToList}
                        onEdit={handleEditException}
                    />
                ) : null

            case 'list':
            default:
                return (
                    <ExceptionList
                        onExceptionSelect={handleExceptionSelect}
                        onCreateException={handleCreateException}
                    />
                )
        }
    }

    return (
        <ModernLayout title={getPageTitle()}>
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    p: { xs: 2, sm: 3, md: 3, lg: 4, xl: 5 },
                }}
            >
                {renderContent()}
            </Box>
        </ModernLayout>
    )
}