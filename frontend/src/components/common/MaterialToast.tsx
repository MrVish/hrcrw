import React from 'react'
import { Snackbar, Alert } from '@mui/material'
import type { ToastMessage } from './Toast'

type AlertColor = 'success' | 'error' | 'warning' | 'info'

interface MaterialToastProps {
    toasts: ToastMessage[]
    onDismiss: (id: string) => void
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export const MaterialToast: React.FC<MaterialToastProps> = ({
    toasts,
    onDismiss,
    position = 'top-right'
}) => {
    const getAnchorOrigin = () => {
        switch (position) {
            case 'top-left':
                return { vertical: 'top' as const, horizontal: 'left' as const }
            case 'bottom-right':
                return { vertical: 'bottom' as const, horizontal: 'right' as const }
            case 'bottom-left':
                return { vertical: 'bottom' as const, horizontal: 'left' as const }
            default:
                return { vertical: 'top' as const, horizontal: 'right' as const }
        }
    }

    return (
        <>
            {toasts.map((toast, index) => (
                <Snackbar
                    key={toast.id}
                    open={true}
                    autoHideDuration={toast.duration || 6000}
                    onClose={() => onDismiss(toast.id)}
                    anchorOrigin={getAnchorOrigin()}
                    sx={{
                        position: 'fixed',
                        top: position.includes('top') ? `${80 + index * 70}px` : undefined,
                        bottom: position.includes('bottom') ? `${20 + index * 70}px` : undefined,
                    }}
                >
                    <Alert
                        onClose={() => onDismiss(toast.id)}
                        severity={toast.type as AlertColor}
                        variant="filled"
                        sx={{
                            width: '100%',
                            minWidth: '300px',
                        }}
                    >
                        {toast.message || toast.title || 'Notification'}
                    </Alert>
                </Snackbar>
            ))}
        </>
    )
}

// For backward compatibility, also export as ToastContainer
export const ToastContainer = MaterialToast