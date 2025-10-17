import { useCallback } from 'react';
import { 
  ErrorCategory, 
  ErrorSeverity, 
  comprehensiveErrorHandler,
  errorLogger
} from '../utils/errorHandling';
import type { 
  ErrorContext, 
  CategorizedError
} from '../utils/errorHandling';
import { ApiError } from '../services/apiClient';
// Note: AuthContext import will be added when AuthContext is properly exported

/**
 * Hook for comprehensive error handling in React components
 */
export function useErrorHandling() {
  // TODO: Replace with actual AuthContext when available
  const user = null; // const { user } = useContext(AuthContext);

  /**
   * Handle error with automatic context enrichment
   */
  const handleError = useCallback((
    error: Error | ApiError,
    additionalContext: Partial<ErrorContext> = {}
  ): CategorizedError => {
    // Enrich context with user and component information
    const enrichedContext: ErrorContext = {
      userId: (user as any)?.id,
      userRole: (user as any)?.role as 'maker' | 'checker' | 'admin',
      timestamp: new Date().toISOString(),
      ...additionalContext
    };

    return comprehensiveErrorHandler.handleError(error, enrichedContext);
  }, [user]);

  /**
   * Handle error with toast notification
   */
  const handleErrorWithToast = useCallback((
    error: Error | ApiError,
    additionalContext: Partial<ErrorContext> = {},
    showToast: (message: string, type: 'error' | 'warning' | 'info') => void
  ): CategorizedError => {
    const categorizedError = handleError(error, additionalContext);

    // Show appropriate toast based on severity
    const toastType = categorizedError.severity === ErrorSeverity.CRITICAL || categorizedError.severity === ErrorSeverity.HIGH 
      ? 'error' 
      : categorizedError.severity === ErrorSeverity.MEDIUM 
        ? 'warning' 
        : 'info';

    showToast(categorizedError.userMessage, toastType);

    return categorizedError;
  }, [handleError]);

  /**
   * Handle workflow-specific errors
   */
  const handleWorkflowError = useCallback((
    error: Error | ApiError,
    workflowContext: 'review' | 'exception' | 'document' | 'kyc' | 'client',
    itemId?: number,
    action?: string
  ): CategorizedError => {
    return handleError(error, {
      workflowContext,
      action,
      ...(workflowContext === 'review' && { reviewId: itemId }),
      ...(workflowContext === 'exception' && { exceptionId: itemId }),
      ...(workflowContext === 'client' && { clientId: itemId })
    });
  }, [handleError]);

  /**
   * Check if error should trigger retry
   */
  const shouldRetry = useCallback((categorizedError: CategorizedError): boolean => {
    return categorizedError.retryable && 
           (categorizedError.category === ErrorCategory.NETWORK || 
            categorizedError.category === ErrorCategory.SYSTEM);
  }, []);

  /**
   * Get error recovery suggestions
   */
  const getRecoverySuggestions = useCallback((categorizedError: CategorizedError): string[] => {
    return categorizedError.recoverySuggestions || [];
  }, []);

  /**
   * Log error for debugging
   */
  const logError = useCallback((
    error: Error | ApiError,
    context: Partial<ErrorContext> = {}
  ) => {
    const enrichedContext: ErrorContext = {
      userId: (user as any)?.id,
      userRole: (user as any)?.role as 'maker' | 'checker' | 'admin',
      ...context
    };

    return errorLogger.logError(error, enrichedContext);
  }, [user]);

  /**
   * Get error statistics
   */
  const getErrorStats = useCallback(() => {
    return errorLogger.getErrorStats();
  }, []);

  /**
   * Clear error logs
   */
  const clearErrorLogs = useCallback(() => {
    errorLogger.clearLogs();
  }, []);

  /**
   * Export error logs for debugging
   */
  const exportErrorLogs = useCallback(() => {
    return errorLogger.exportLogs();
  }, []);

  return {
    handleError,
    handleErrorWithToast,
    handleWorkflowError,
    shouldRetry,
    getRecoverySuggestions,
    logError,
    getErrorStats,
    clearErrorLogs,
    exportErrorLogs
  };
}

/**
 * Hook for error boundary integration
 */
export function useErrorBoundary() {
  const { handleError } = useErrorHandling();

  /**
   * Handle errors caught by error boundary
   */
  const handleBoundaryError = useCallback((
    error: Error,
    errorInfo: { componentStack: string }
  ) => {
    const categorizedError = handleError(error, {
      component: 'ErrorBoundary',
      action: 'render'
    });

    // Log additional error boundary specific information
    console.error('Error Boundary caught an error:', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      categorizedError
    });

    return categorizedError;
  }, [handleError]);

  return {
    handleBoundaryError
  };
}

/**
 * Hook for async operation error handling
 */
export function useAsyncErrorHandling() {
  const { handleError } = useErrorHandling();

  /**
   * Wrap async operation with error handling
   */
  const withErrorHandling = useCallback(<T>(
    asyncOperation: () => Promise<T>,
    context: Partial<ErrorContext> = {}
  ) => {
    return async (): Promise<T | null> => {
      try {
        return await asyncOperation();
      } catch (error) {
        handleError(error as Error | ApiError, context);
        return null;
      }
    };
  }, [handleError]);

  /**
   * Wrap async operation with error handling and custom error handler
   */
  const withCustomErrorHandling = useCallback(<T>(
    asyncOperation: () => Promise<T>,
    errorHandler: (categorizedError: CategorizedError) => void,
    context: Partial<ErrorContext> = {}
  ) => {
    return async (): Promise<T | null> => {
      try {
        return await asyncOperation();
      } catch (error) {
        const categorizedError = handleError(error as Error | ApiError, context);
        errorHandler(categorizedError);
        return null;
      }
    };
  }, [handleError]);

  return {
    withErrorHandling,
    withCustomErrorHandling
  };
}

export default useErrorHandling;