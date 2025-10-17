import { apiClient } from './apiClient'
import { withRetry, retryConfigs, isSessionExpired, handleSessionExpiration } from '../utils/retry'
import { comprehensiveErrorHandler } from '../utils/errorHandling'
import type { ErrorContext } from '../utils/errorHandling'

/**
 * Error categories for better error handling
 */
export const ErrorCategory = {
    PERMISSION: 'permission',
    NETWORK: 'network',
    VALIDATION: 'validation',
    SESSION: 'session',
    SERVER: 'server',
    UNKNOWN: 'unknown'
} as const

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory]

/**
 * Custom error class for maker-checker operations
 */
export class MakerCheckerError extends Error {
    public originalError?: Error
    public category: ErrorCategory
    public retryable: boolean

    constructor(message: string, originalError?: Error, category: ErrorCategory = ErrorCategory.UNKNOWN, retryable: boolean = false) {
        super(message)
        this.name = 'MakerCheckerError'
        this.originalError = originalError
        this.category = category
        this.retryable = retryable
    }
}



/**
 * Logs errors for debugging purposes
 */
const logError = (operation: string, error: Error, context?: any): void => {
    console.error(`[MakerChecker] ${operation} failed:`, {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
    })
}



/**
 * Enhanced retry logic using the comprehensive retry system
 */
const withEnhancedRetry = async <T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: ErrorContext
): Promise<T> => {
    try {
        return await withRetry(operation, {
            ...retryConfigs.apiCall,
            context: {
                component: 'makerCheckerActions',
                action: operationName,
                ...context
            },
            onRetry: (attempt, error) => {
                logError(`${operationName} (attempt ${attempt})`, error as Error, context)
                
                // Handle session expiration immediately
                if (isSessionExpired(error)) {
                    handleSessionExpiration(context)
                }
            }
        })
    } catch (error) {
        // Use comprehensive error handler for better error categorization
        const categorizedError = comprehensiveErrorHandler.handleError(error as Error, {
            component: 'makerCheckerActions',
            action: operationName,
            ...context
        })

        throw new MakerCheckerError(
            categorizedError.userMessage,
            error as Error,
            categorizedError.category as any,
            categorizedError.retryable
        )
    }
}

/**
 * Validates that an ID is a positive number
 */
const validateId = (id: number, type: string): void => {
    if (!Number.isInteger(id) || id <= 0) {
        throw new MakerCheckerError(
            `Invalid ${type} ID: must be a positive integer`,
            undefined,
            ErrorCategory.VALIDATION,
            false
        )
    }
}

/**
 * Trims whitespace from a string, returns undefined if empty
 */
const trimOrUndefined = (value?: string): string | undefined => {
    if (!value) return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Approve a review using the existing ApiClient method with enhanced retry
 */
export const approveReview = async (reviewId: number, comments?: string): Promise<any> => {
    validateId(reviewId, 'review')

    return withEnhancedRetry(
        () => apiClient.approveReview(reviewId, trimOrUndefined(comments)),
        'approveReview',
        { 
            reviewId, 
            workflowContext: 'review',
            action: 'approve'
        }
    )
}

/**
 * Reject a review with a required reason using the existing ApiClient method with enhanced retry
 */
export const rejectReview = async (reviewId: number, reason: string): Promise<any> => {
    validateId(reviewId, 'review')

    const trimmedReason = reason?.trim()
    if (!trimmedReason) {
        throw new MakerCheckerError(
            'Rejection reason is required',
            undefined,
            ErrorCategory.VALIDATION,
            false
        )
    }

    return withEnhancedRetry(
        () => apiClient.rejectReview(reviewId, trimmedReason),
        'rejectReview',
        { 
            reviewId, 
            workflowContext: 'review',
            action: 'reject'
        }
    )
}

/**
 * Approve an exception by updating its status to RESOLVED with enhanced retry
 */
export const approveException = async (exceptionId: number, comments?: string): Promise<any> => {
    validateId(exceptionId, 'exception')

    return withEnhancedRetry(
        () => apiClient.approveException(exceptionId, trimOrUndefined(comments)),
        'approveException',
        { 
            exceptionId, 
            workflowContext: 'exception',
            action: 'approve'
        }
    )
}

/**
 * Reject an exception with a required reason by updating its status to CLOSED with enhanced retry
 */
export const rejectException = async (exceptionId: number, reason: string): Promise<any> => {
    validateId(exceptionId, 'exception')

    const trimmedReason = reason?.trim()
    if (!trimmedReason) {
        throw new MakerCheckerError(
            'Rejection reason is required',
            undefined,
            ErrorCategory.VALIDATION,
            false
        )
    }

    return withEnhancedRetry(
        () => apiClient.rejectException(exceptionId, trimmedReason),
        'rejectException',
        { 
            exceptionId, 
            workflowContext: 'exception',
            action: 'reject'
        }
    )
}