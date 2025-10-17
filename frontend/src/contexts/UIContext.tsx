import React, { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { ToastMessage } from '../components/common/Toast'

interface LoadingState {
    [key: string]: boolean
}

interface UIState {
    toasts: ToastMessage[]
    loading: LoadingState
    globalLoading: boolean
}

type UIAction =
    | { type: 'ADD_TOAST'; payload: ToastMessage }
    | { type: 'REMOVE_TOAST'; payload: string }
    | { type: 'CLEAR_TOASTS' }
    | { type: 'SET_LOADING'; payload: { key: string; loading: boolean } }
    | { type: 'SET_GLOBAL_LOADING'; payload: boolean }
    | { type: 'CLEAR_LOADING' }

interface UIContextType {
    state: UIState
    addToast: (toast: Omit<ToastMessage, 'id'>) => void
    removeToast: (id: string) => void
    clearToasts: () => void
    setLoading: (key: string, loading: boolean) => void
    setGlobalLoading: (loading: boolean) => void
    clearLoading: () => void
    isLoading: (key?: string) => boolean
    showSuccess: (title: string, message?: string, options?: Partial<ToastMessage>) => void
    showError: (title: string, message?: string, options?: Partial<ToastMessage>) => void
    showWarning: (title: string, message?: string, options?: Partial<ToastMessage>) => void
    showInfo: (title: string, message?: string, options?: Partial<ToastMessage>) => void
}

const initialState: UIState = {
    toasts: [],
    loading: {},
    globalLoading: false,
}

const uiReducer = (state: UIState, action: UIAction): UIState => {
    switch (action.type) {
        case 'ADD_TOAST':
            return {
                ...state,
                toasts: [...state.toasts, action.payload],
            }

        case 'REMOVE_TOAST':
            return {
                ...state,
                toasts: state.toasts.filter(toast => toast.id !== action.payload),
            }

        case 'CLEAR_TOASTS':
            return {
                ...state,
                toasts: [],
            }

        case 'SET_LOADING':
            return {
                ...state,
                loading: {
                    ...state.loading,
                    [action.payload.key]: action.payload.loading,
                },
            }

        case 'SET_GLOBAL_LOADING':
            return {
                ...state,
                globalLoading: action.payload,
            }

        case 'CLEAR_LOADING':
            return {
                ...state,
                loading: {},
                globalLoading: false,
            }

        default:
            return state
    }
}

const UIContext = createContext<UIContextType | undefined>(undefined)

interface UIProviderProps {
    children: ReactNode
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(uiReducer, initialState)

    const generateId = (): string => {
        return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    const addToast = (toast: Omit<ToastMessage, 'id'>) => {
        const toastWithId: ToastMessage = {
            ...toast,
            id: generateId(),
        }
        dispatch({ type: 'ADD_TOAST', payload: toastWithId })
    }

    const removeToast = (id: string) => {
        dispatch({ type: 'REMOVE_TOAST', payload: id })
    }

    const clearToasts = () => {
        dispatch({ type: 'CLEAR_TOASTS' })
    }

    const setLoading = (key: string, loading: boolean) => {
        dispatch({ type: 'SET_LOADING', payload: { key, loading } })
    }

    const setGlobalLoading = (loading: boolean) => {
        dispatch({ type: 'SET_GLOBAL_LOADING', payload: loading })
    }

    const clearLoading = () => {
        dispatch({ type: 'CLEAR_LOADING' })
    }

    const isLoading = (key?: string): boolean => {
        if (key) {
            return state.loading[key] || false
        }
        return state.globalLoading || Object.values(state.loading).some(Boolean)
    }

    const showSuccess = (title: string, message?: string, options?: Partial<ToastMessage>) => {
        addToast({
            type: 'success',
            title,
            message,
            ...options,
        })
    }

    const showError = (title: string, message?: string, options?: Partial<ToastMessage>) => {
        addToast({
            type: 'error',
            title,
            message,
            duration: 8000, // Longer duration for errors
            ...options,
        })
    }

    const showWarning = (title: string, message?: string, options?: Partial<ToastMessage>) => {
        addToast({
            type: 'warning',
            title,
            message,
            duration: 6000,
            ...options,
        })
    }

    const showInfo = (title: string, message?: string, options?: Partial<ToastMessage>) => {
        addToast({
            type: 'info',
            title,
            message,
            ...options,
        })
    }

    const value: UIContextType = {
        state,
        addToast,
        removeToast,
        clearToasts,
        setLoading,
        setGlobalLoading,
        clearLoading,
        isLoading,
        showSuccess,
        showError,
        showWarning,
        showInfo,
    }

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    )
}

export const useUI = (): UIContextType => {
    const context = useContext(UIContext)
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider')
    }
    return context
}

// Custom hooks for specific UI operations
export const useToast = () => {
    const { showSuccess, showError, showWarning, showInfo } = useUI()
    return { showSuccess, showError, showWarning, showInfo }
}

export const useLoading = (key?: string) => {
    const { setLoading, setGlobalLoading, isLoading } = useUI()

    const startLoading = () => {
        if (key) {
            setLoading(key, true)
        } else {
            setGlobalLoading(true)
        }
    }

    const stopLoading = () => {
        if (key) {
            setLoading(key, false)
        } else {
            setGlobalLoading(false)
        }
    }

    const loading = isLoading(key)

    return { startLoading, stopLoading, loading }
}

export default UIContext