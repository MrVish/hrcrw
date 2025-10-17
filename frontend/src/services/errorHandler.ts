import { ApiError } from './apiClient';
import { makerCheckerErrorHandler, MAKER_CHECKER_ERROR_CODES } from './makerCheckerErrors';
import type { MakerCheckerError } from './makerCheckerErrors';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: number;
  timestamp?: string;
  userAgent?: string;
  url?: string;
  reviewId?: number;
  exceptionId?: number;
  workflowContext?: 'review' | 'exception' | 'document' | 'kyc';
}

export interface ErrorReport {
  error: Error | ApiError;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'validation' | 'authentication' | 'authorization' | 'business' | 'system';
}

export interface UserFriendlyError {
  title: string;
  message: string;
  actionable: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
}

class ErrorHandlerService {
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 100;

  /**
   * Handle and categorize errors
   */
  handleError(error: Error | ApiError, context: ErrorContext = {}): UserFriendlyError {
    // Check if this is a maker-checker workflow error
    if (this.isMakerCheckerError(error, context)) {
      const makerCheckerError = makerCheckerErrorHandler.handleError(error, {
        action: context.action,
        reviewId: context.reviewId,
        exceptionId: context.exceptionId
      });
      
      // Convert to UserFriendlyError format
      return this.convertMakerCheckerError(makerCheckerError);
    }
    
    const errorReport = this.createErrorReport(error, context);
    this.logError(errorReport);
    
    // Add to queue for potential reporting
    this.addToQueue(errorReport);
    
    return this.createUserFriendlyError(errorReport);
  }

  /**
   * Create error report with context
   */
  private createErrorReport(error: Error | ApiError, context: ErrorContext): ErrorReport {
    const enhancedContext: ErrorContext = {
      ...context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    return {
      error,
      context: enhancedContext,
      severity: this.determineSeverity(error),
      category: this.categorizeError(error),
    };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error | ApiError): ErrorReport['severity'] {
    if (this.isApiError(error)) {
      const apiError = error as ApiError;
      
      // Critical errors
      if (apiError.code.includes('SERVER_ERROR') || 
          apiError.code.includes('DATABASE_ERROR')) {
        return 'critical';
      }
      
      // High severity errors
      if (apiError.code.includes('AUTHENTICATION_FAILED') ||
          apiError.code.includes('AUTHORIZATION_DENIED') ||
          apiError.code.includes('DATA_CORRUPTION')) {
        return 'high';
      }
      
      // Medium severity errors
      if (apiError.code.includes('VALIDATION_ERROR') ||
          apiError.code.includes('BUSINESS_RULE_VIOLATION')) {
        return 'medium';
      }
      
      return 'low';
    }

    // JavaScript errors are typically high severity
    return 'high';
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error | ApiError): ErrorReport['category'] {
    if (this.isApiError(error)) {
      const apiError = error as ApiError;
      
      if (apiError.code.includes('NETWORK') || apiError.code.includes('TIMEOUT')) {
        return 'network';
      }
      
      if (apiError.code.includes('VALIDATION')) {
        return 'validation';
      }
      
      if (apiError.code.includes('AUTHENTICATION')) {
        return 'authentication';
      }
      
      if (apiError.code.includes('AUTHORIZATION')) {
        return 'authorization';
      }
      
      if (apiError.code.includes('BUSINESS_RULE')) {
        return 'business';
      }
      
      return 'system';
    }

    return 'system';
  }

  /**
   * Create user-friendly error message
   */
  private createUserFriendlyError(errorReport: ErrorReport): UserFriendlyError {
    const { error, category, severity } = errorReport;

    switch (category) {
      case 'network':
        return {
          title: 'Connection Problem',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          actionable: true,
          actions: [
            {
              label: 'Retry',
              action: () => window.location.reload(),
              primary: true
            }
          ]
        };

      case 'authentication':
        return {
          title: 'Authentication Required',
          message: 'Your session has expired. Please log in again to continue.',
          actionable: true,
          actions: [
            {
              label: 'Log In',
              action: () => {
                localStorage.clear();
                window.location.href = '/login';
              },
              primary: true
            }
          ]
        };

      case 'authorization':
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to perform this action. Contact your administrator if you believe this is an error.',
          actionable: false
        };

      case 'validation':
        const apiError = error as ApiError;
        return {
          title: 'Invalid Input',
          message: apiError.message || 'Please check your input and try again.',
          actionable: true
        };

      case 'business':
        return {
          title: 'Business Rule Violation',
          message: (error as ApiError).message || 'This action violates a business rule.',
          actionable: true
        };

      case 'system':
        if (severity === 'critical') {
          return {
            title: 'System Error',
            message: 'A critical system error occurred. Our team has been notified. Please try again later.',
            actionable: true,
            actions: [
              {
                label: 'Reload Page',
                action: () => window.location.reload(),
                primary: true
              }
            ]
          };
        }
        
        return {
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred. Please try again.',
          actionable: true,
          actions: [
            {
              label: 'Try Again',
              action: () => window.location.reload()
            }
          ]
        };

      default:
        return {
          title: 'Error',
          message: error.message || 'An error occurred.',
          actionable: false
        };
    }
  }

  /**
   * Log error to console and potentially external service
   */
  private logError(errorReport: ErrorReport): void {
    const { error, context, severity, category } = errorReport;
    
    // Console logging with appropriate level
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    console[logLevel]('Error handled:', {
      error: error.message,
      category,
      severity,
      context
    });

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production' && severity === 'critical') {
      this.reportToExternalService(errorReport);
    }
  }

  /**
   * Add error to queue for batch reporting
   */
  private addToQueue(errorReport: ErrorReport): void {
    this.errorQueue.push(errorReport);
    
    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  /**
   * Report critical errors to external service
   */
  private reportToExternalService(errorReport: ErrorReport): void {
    // This would integrate with services like Sentry, LogRocket, etc.
    // For now, we'll just log it
    console.error('Critical error reported:', errorReport);
    
    // Example Sentry integration:
    // Sentry.captureException(errorReport.error, {
    //   tags: {
    //     category: errorReport.category,
    //     severity: errorReport.severity
    //   },
    //   extra: errorReport.context
    // });
  }

  /**
   * Check if error is an API error
   */
  private isApiError(error: any): error is ApiError {
    return error && typeof error === 'object' && 'code' in error && 'timestamp' in error;
  }

  /**
   * Check if this is a maker-checker workflow error
   */
  private isMakerCheckerError(error: Error | ApiError, context: ErrorContext): boolean {
    // Check if context indicates workflow operation
    if (context.workflowContext) {
      return true;
    }
    
    // Check if error code is maker-checker specific
    if (this.isApiError(error)) {
      const makerCheckerCodes = Object.values(MAKER_CHECKER_ERROR_CODES);
      return makerCheckerCodes.includes(error.code as any);
    }
    
    // Check if error message contains workflow-related keywords
    const workflowKeywords = [
      'maker-checker', 'self approval', 'cannot edit', 'cannot submit',
      'cannot approve', 'cannot reject', 'review not found', 'exception not found',
      'validation failed', 'missing documents', 'kyc validation'
    ];
    
    return workflowKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Convert MakerCheckerError to UserFriendlyError format
   */
  private convertMakerCheckerError(makerCheckerError: MakerCheckerError): UserFriendlyError {
    return {
      title: makerCheckerError.title,
      message: makerCheckerError.message,
      actionable: makerCheckerError.actionable,
      actions: makerCheckerError.actions?.map(action => ({
        label: action.label,
        action: action.action,
        primary: action.primary
      }))
    };
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const stats = {
      total: this.errorQueue.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };

    this.errorQueue.forEach(report => {
      stats.byCategory[report.category] = (stats.byCategory[report.category] || 0) + 1;
      stats.bySeverity[report.severity] = (stats.bySeverity[report.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error queue
   */
  clearErrorQueue(): void {
    this.errorQueue = [];
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): ErrorReport[] {
    return this.errorQueue.slice(-limit);
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandlerService();

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  const handleError = (error: Error | ApiError, context?: ErrorContext) => {
    return errorHandler.handleError(error, context);
  };

  return { handleError };
}

export default errorHandler;