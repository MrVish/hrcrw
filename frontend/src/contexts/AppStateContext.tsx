import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import type {
    Client,
    Review,
    Exception,
    DashboardMetrics,
    Notification,
    User
} from '../types'
import { apiClient } from '../services'

// State interfaces
export interface AppState {
    clients: {
        items: Client[]
        total: number
        loading: boolean
        error: string | null
        lastFetch: number | null
        filters: {
            search: string
            risk_level: string
            country: string
            status: string
        }
        pagination: {
            page: number
            size: number
            pages: number
        }
    }
    reviews: {
        items: Review[]
        total: number
        loading: boolean
        error: string | null
        lastFetch: number | null
        filters: {
            search: string
            status: string
            client_risk_level: string
            date_range: string
        }
        pagination: {
            page: number
            size: number
            pages: number
        }
    }
    exceptions: {
        items: Exception[]
        total: number
        loading: boolean
        error: string | null
        lastFetch: number | null
        filters: {
            search: string
            status: string
            priority: string
            assigned_to: string
            type: string
        }
        pagination: {
            page: number
            size: number
            pages: number
        }
    }
    dashboard: {
        metrics: DashboardMetrics | null
        notifications: Notification[]
        loading: boolean
        error: string | null
        lastFetch: number | null
    }
    users: {
        items: User[]
        total: number
        loading: boolean
        error: string | null
        lastFetch: number | null
        pagination: {
            page: number
            size: number
            pages: number
        }
    }
}

// Action types
export type AppAction =
    // Client actions
    | { type: 'CLIENTS_FETCH_START' }
    | { type: 'CLIENTS_FETCH_SUCCESS'; payload: { items: Client[]; total: number; page: number; size: number; pages: number } }
    | { type: 'CLIENTS_FETCH_ERROR'; payload: string }
    | { type: 'CLIENTS_SET_FILTERS'; payload: Partial<AppState['clients']['filters']> }
    | { type: 'CLIENTS_SET_PAGE'; payload: number }
    | { type: 'CLIENTS_UPDATE_ITEM'; payload: Client }
    | { type: 'CLIENTS_CLEAR_CACHE' }
    // Review actions
    | { type: 'REVIEWS_FETCH_START' }
    | { type: 'REVIEWS_FETCH_SUCCESS'; payload: { items: Review[]; total: number; page: number; size: number; pages: number } }
    | { type: 'REVIEWS_FETCH_ERROR'; payload: string }
    | { type: 'REVIEWS_SET_FILTERS'; payload: Partial<AppState['reviews']['filters']> }
    | { type: 'REVIEWS_SET_PAGE'; payload: number }
    | { type: 'REVIEWS_UPDATE_ITEM'; payload: Review }
    | { type: 'REVIEWS_ADD_ITEM'; payload: Review }
    | { type: 'REVIEWS_CLEAR_CACHE' }
    // Exception actions
    | { type: 'EXCEPTIONS_FETCH_START' }
    | { type: 'EXCEPTIONS_FETCH_SUCCESS'; payload: { items: Exception[]; total: number; page: number; size: number; pages: number } }
    | { type: 'EXCEPTIONS_FETCH_ERROR'; payload: string }
    | { type: 'EXCEPTIONS_SET_FILTERS'; payload: Partial<AppState['exceptions']['filters']> }
    | { type: 'EXCEPTIONS_SET_PAGE'; payload: number }
    | { type: 'EXCEPTIONS_UPDATE_ITEM'; payload: Exception }
    | { type: 'EXCEPTIONS_ADD_ITEM'; payload: Exception }
    | { type: 'EXCEPTIONS_CLEAR_CACHE' }
    // Dashboard actions
    | { type: 'DASHBOARD_FETCH_START' }
    | { type: 'DASHBOARD_FETCH_SUCCESS'; payload: { metrics: DashboardMetrics; notifications: Notification[] } }
    | { type: 'DASHBOARD_FETCH_ERROR'; payload: string }
    | { type: 'DASHBOARD_UPDATE_NOTIFICATION'; payload: Notification }
    | { type: 'DASHBOARD_CLEAR_CACHE' }
    // User actions
    | { type: 'USERS_FETCH_START' }
    | { type: 'USERS_FETCH_SUCCESS'; payload: { items: User[]; total: number; page: number; size: number; pages: number } }
    | { type: 'USERS_FETCH_ERROR'; payload: string }
    | { type: 'USERS_SET_PAGE'; payload: number }
    | { type: 'USERS_UPDATE_ITEM'; payload: User }
    | { type: 'USERS_ADD_ITEM'; payload: User }
    | { type: 'USERS_REMOVE_ITEM'; payload: number }
    | { type: 'USERS_CLEAR_CACHE' }
    // Global actions
    | { type: 'CLEAR_ALL_CACHE' }

// Initial state
const initialState: AppState = {
    clients: {
        items: [],
        total: 0,
        loading: false,
        error: null,
        lastFetch: null,
        filters: {
            search: '',
            risk_level: '',
            country: '',
            status: '',
        },
        pagination: {
            page: 1,
            size: 20,
            pages: 0,
        },
    },
    reviews: {
        items: [],
        total: 0,
        loading: false,
        error: null,
        lastFetch: null,
        filters: {
            search: '',
            status: '',
            client_risk_level: '',
            date_range: '',
        },
        pagination: {
            page: 1,
            size: 20,
            pages: 0,
        },
    },
    exceptions: {
        items: [],
        total: 0,
        loading: false,
        error: null,
        lastFetch: null,
        filters: {
            search: '',
            status: '',
            priority: '',
            assigned_to: '',
            type: '',
        },
        pagination: {
            page: 1,
            size: 20,
            pages: 0,
        },
    },
    dashboard: {
        metrics: null,
        notifications: [],
        loading: false,
        error: null,
        lastFetch: null,
    },
    users: {
        items: [],
        total: 0,
        loading: false,
        error: null,
        lastFetch: null,
        pagination: {
            page: 1,
            size: 20,
            pages: 0,
        },
    },
}

// Reducer
function appStateReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        // Client cases
        case 'CLIENTS_FETCH_START':
            return {
                ...state,
                clients: { ...state.clients, loading: true, error: null },
            }
        case 'CLIENTS_FETCH_SUCCESS':
            return {
                ...state,
                clients: {
                    ...state.clients,
                    items: action.payload.items,
                    total: action.payload.total,
                    loading: false,
                    error: null,
                    lastFetch: Date.now(),
                    pagination: {
                        page: action.payload.page,
                        size: action.payload.size,
                        pages: action.payload.pages,
                    },
                },
            }
        case 'CLIENTS_FETCH_ERROR':
            return {
                ...state,
                clients: { ...state.clients, loading: false, error: action.payload },
            }
        case 'CLIENTS_SET_FILTERS':
            return {
                ...state,
                clients: {
                    ...state.clients,
                    filters: { ...state.clients.filters, ...action.payload },
                    pagination: { ...state.clients.pagination, page: 1 },
                },
            }
        case 'CLIENTS_SET_PAGE':
            return {
                ...state,
                clients: {
                    ...state.clients,
                    pagination: { ...state.clients.pagination, page: action.payload },
                },
            }
        case 'CLIENTS_UPDATE_ITEM':
            return {
                ...state,
                clients: {
                    ...state.clients,
                    items: state.clients.items.map(item =>
                        item.client_id === action.payload.client_id ? action.payload : item
                    ),
                },
            }
        case 'CLIENTS_CLEAR_CACHE':
            return {
                ...state,
                clients: { ...initialState.clients, filters: state.clients.filters, pagination: state.clients.pagination },
            }

        // Review cases
        case 'REVIEWS_FETCH_START':
            return {
                ...state,
                reviews: { ...state.reviews, loading: true, error: null },
            }
        case 'REVIEWS_FETCH_SUCCESS':
            return {
                ...state,
                reviews: {
                    ...state.reviews,
                    items: action.payload.items,
                    total: action.payload.total,
                    loading: false,
                    error: null,
                    lastFetch: Date.now(),
                    pagination: {
                        page: action.payload.page,
                        size: action.payload.size,
                        pages: action.payload.pages,
                    },
                },
            }
        case 'REVIEWS_FETCH_ERROR':
            return {
                ...state,
                reviews: { ...state.reviews, loading: false, error: action.payload },
            }
        case 'REVIEWS_SET_FILTERS':
            return {
                ...state,
                reviews: {
                    ...state.reviews,
                    filters: { ...state.reviews.filters, ...action.payload },
                    pagination: { ...state.reviews.pagination, page: 1 },
                },
            }
        case 'REVIEWS_SET_PAGE':
            return {
                ...state,
                reviews: {
                    ...state.reviews,
                    pagination: { ...state.reviews.pagination, page: action.payload },
                },
            }
        case 'REVIEWS_UPDATE_ITEM':
            return {
                ...state,
                reviews: {
                    ...state.reviews,
                    items: state.reviews.items.map(item =>
                        item.review_id === action.payload.review_id ? action.payload : item
                    ),
                },
            }
        case 'REVIEWS_ADD_ITEM':
            return {
                ...state,
                reviews: {
                    ...state.reviews,
                    items: [action.payload, ...state.reviews.items],
                    total: state.reviews.total + 1,
                },
            }
        case 'REVIEWS_CLEAR_CACHE':
            return {
                ...state,
                reviews: { ...initialState.reviews, filters: state.reviews.filters, pagination: state.reviews.pagination },
            }

        // Exception cases
        case 'EXCEPTIONS_FETCH_START':
            return {
                ...state,
                exceptions: { ...state.exceptions, loading: true, error: null },
            }
        case 'EXCEPTIONS_FETCH_SUCCESS':
            return {
                ...state,
                exceptions: {
                    ...state.exceptions,
                    items: action.payload.items,
                    total: action.payload.total,
                    loading: false,
                    error: null,
                    lastFetch: Date.now(),
                    pagination: {
                        page: action.payload.page,
                        size: action.payload.size,
                        pages: action.payload.pages,
                    },
                },
            }
        case 'EXCEPTIONS_FETCH_ERROR':
            return {
                ...state,
                exceptions: { ...state.exceptions, loading: false, error: action.payload },
            }
        case 'EXCEPTIONS_SET_FILTERS':
            return {
                ...state,
                exceptions: {
                    ...state.exceptions,
                    filters: { ...state.exceptions.filters, ...action.payload },
                    pagination: { ...state.exceptions.pagination, page: 1 },
                },
            }
        case 'EXCEPTIONS_SET_PAGE':
            return {
                ...state,
                exceptions: {
                    ...state.exceptions,
                    pagination: { ...state.exceptions.pagination, page: action.payload },
                },
            }
        case 'EXCEPTIONS_UPDATE_ITEM':
            return {
                ...state,
                exceptions: {
                    ...state.exceptions,
                    items: state.exceptions.items.map(item =>
                        item.exception_id === action.payload.exception_id ? action.payload : item
                    ),
                },
            }
        case 'EXCEPTIONS_ADD_ITEM':
            return {
                ...state,
                exceptions: {
                    ...state.exceptions,
                    items: [action.payload, ...state.exceptions.items],
                    total: state.exceptions.total + 1,
                },
            }
        case 'EXCEPTIONS_CLEAR_CACHE':
            return {
                ...state,
                exceptions: { ...initialState.exceptions, filters: state.exceptions.filters, pagination: state.exceptions.pagination },
            }

        // Dashboard cases
        case 'DASHBOARD_FETCH_START':
            return {
                ...state,
                dashboard: { ...state.dashboard, loading: true, error: null },
            }
        case 'DASHBOARD_FETCH_SUCCESS':
            return {
                ...state,
                dashboard: {
                    ...state.dashboard,
                    metrics: action.payload.metrics,
                    notifications: action.payload.notifications,
                    loading: false,
                    error: null,
                    lastFetch: Date.now(),
                },
            }
        case 'DASHBOARD_FETCH_ERROR':
            return {
                ...state,
                dashboard: { ...state.dashboard, loading: false, error: action.payload },
            }
        case 'DASHBOARD_UPDATE_NOTIFICATION':
            return {
                ...state,
                dashboard: {
                    ...state.dashboard,
                    notifications: state.dashboard.notifications.map(notification =>
                        notification.id === action.payload.id ? action.payload : notification
                    ),
                },
            }
        case 'DASHBOARD_CLEAR_CACHE':
            return {
                ...state,
                dashboard: { ...initialState.dashboard },
            }

        // User cases
        case 'USERS_FETCH_START':
            return {
                ...state,
                users: { ...state.users, loading: true, error: null },
            }
        case 'USERS_FETCH_SUCCESS':
            return {
                ...state,
                users: {
                    ...state.users,
                    items: action.payload.items,
                    total: action.payload.total,
                    loading: false,
                    error: null,
                    lastFetch: Date.now(),
                    pagination: {
                        page: action.payload.page,
                        size: action.payload.size,
                        pages: action.payload.pages,
                    },
                },
            }
        case 'USERS_FETCH_ERROR':
            return {
                ...state,
                users: { ...state.users, loading: false, error: action.payload },
            }
        case 'USERS_SET_PAGE':
            return {
                ...state,
                users: {
                    ...state.users,
                    pagination: { ...state.users.pagination, page: action.payload },
                },
            }
        case 'USERS_UPDATE_ITEM':
            return {
                ...state,
                users: {
                    ...state.users,
                    items: state.users.items.map(item =>
                        item.id === action.payload.id ? action.payload : item
                    ),
                },
            }
        case 'USERS_ADD_ITEM':
            return {
                ...state,
                users: {
                    ...state.users,
                    items: [action.payload, ...state.users.items],
                    total: state.users.total + 1,
                },
            }
        case 'USERS_REMOVE_ITEM':
            return {
                ...state,
                users: {
                    ...state.users,
                    items: state.users.items.filter(item => item.id !== action.payload),
                    total: state.users.total - 1,
                },
            }
        case 'USERS_CLEAR_CACHE':
            return {
                ...state,
                users: { ...initialState.users, pagination: state.users.pagination },
            }

        // Global cases
        case 'CLEAR_ALL_CACHE':
            return initialState

        default:
            return state
    }
}

// Context
export interface AppStateContextType {
    state: AppState
    dispatch: React.Dispatch<AppAction>
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

// Provider
interface AppStateProviderProps {
    children: ReactNode
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(appStateReducer, initialState)

    // Clear cache on auth error
    useEffect(() => {
        const handleAuthError = () => {
            dispatch({ type: 'CLEAR_ALL_CACHE' })
        }

        window.addEventListener('auth:error', handleAuthError)
        return () => window.removeEventListener('auth:error', handleAuthError)
    }, [])

    const value: AppStateContextType = {
        state,
        dispatch,
    }

    return (
        <AppStateContext.Provider value={value}>
            {children}
        </AppStateContext.Provider>
    )
}

// Hook
export const useAppState = (): AppStateContextType => {
    const context = useContext(AppStateContext)
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppStateProvider')
    }
    return context
}