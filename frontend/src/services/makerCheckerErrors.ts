import { ApiError } from './apiClient';

export interface MakerCheckerError {
  code: string;
  title: string;
  message: string;
  actionable: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'workflow' | 'permission' | 'validation' | 'business_rule' | 'system';
}

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

/**
 * Maker-Checker specific error codes and their mappings
 */
export const MAKER_CHECKER_ERROR_CODES = {
  // Review workflow errors
  REVIEW_NOT_FOUND: 'REVIEW_NOT_FOUND',
  REVIEW_INVALID_STATUS: 'REVIEW_INVALID_STATUS',
  REVIEW_CANNOT_EDIT: 'REVIEW_CANNOT_EDIT',
  REVIEW_CANNOT_SUBMIT: 'REVIEW_CANNOT_SUBMIT',
  REVIEW_CANNOT_APPROVE: 'REVIEW_CANNOT_APPROVE',
  REVIEW_CANNOT_REJECT: 'REVIEW_CANNOT_REJECT',
  REVIEW_ALREADY_REVIEWED: 'REVIEW_ALREADY_REVIEWED',
  REVIEW_MISSING_DOCUMENTS: 'REVIEW_MISSING_DOCUMENTS',
  REVIEW_VALIDATION_FAILED: 'REVIEW_VALIDATION_FAILED',
  
  // Maker-Checker separation errors
  MAKER_CHECKER_VIOLATION: 'MAKER_CHECKER_VIOLATION',
  SELF_APPROVAL_DENIED: 'SELF_APPROVAL_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ROLE_MISMATCH: 'ROLE_MISMATCH',
  
  // Exception workflow errors
  EXCEPTION_NOT_FOUND: 'EXCEPTION_NOT_FOUND',
  EXCEPTION_INVALID_STATUS: 'EXCEPTION_INVALID_STATUS',
  EXCEPTION_CANNOT_APPROVE: 'EXCEPTION_CANNOT_APPROVE',
  EXCEPTION_CANNOT_REJECT: 'EXCEPTION_CANNOT_REJECT',
  EXCEPTION_MISSING_REASON: 'EXCEPTION_MISSING_REASON',
  
  // Document validation errors
  DOCUMENT_UPLOAD_FAILED: 'DOCUMENT_UPLOAD_FAILED',
  DOCUMENT_VALIDATION_FAILED: 'DOCUMENT_VALIDATION_FAILED',
  DOCUMENT_SIZE_EXCEEDED: 'DOCUMENT_SIZE_EXCEEDED',
  DOCUMENT_TYPE_INVALID: 'DOCUMENT_TYPE_INVALID',
  
  // KYC validation errors
  KYC_VALIDATION_FAILED: 'KYC_VALIDATION_FAILED',
  KYC_MISSING_REQUIRED_FIELDS: 'KYC_MISSING_REQUIRED_FIELDS',
  KYC_CONDITIONAL_VALIDATION_FAILED: 'KYC_CONDITIONAL_VALIDATION_FAILED',
  
  // Client validation errors
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  CLIENT_RISK_LEVEL_INVALID: 'CLIENT_RISK_LEVEL_INVALID',
  CLIENT_NOT_HIGH_RISK: 'CLIENT_NOT_HIGH_RISK',
  
  // System errors
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  WORKFLOW_STATE_CONFLICT: 'WORKFLOW_STATE_CONFLICT',
  AUDIT_LOG_FAILED: 'AUDIT_LOG_FAILED'
} as const;

/**
 * Error message mappings for maker-checker workflow
 */
export const ERROR_MESSAGES: Record<string, MakerCheckerError> = {
  [MAKER_CHECKER_ERROR_CODES.REVIEW_NOT_FOUND]: {
    code: MAKER_CHECKER_ERROR_CODES.REVIEW_NOT_FOUND,
    title: 'Review Not Found',
    message: 'The requested review could not be found. It may have been deleted or you may not have permission to access it.',
    actionable: true,
    actions: [
      {
        label: 'Go to Reviews List',
        action: () => window.location.href = '/reviews',
        primary: true
      },
      {
        label: 'Refresh Page',
        action: () => window.location.reload()
      }
    ],
    severity: 'medium',
    category: 'workflow'
  },

  [MAKER_CHECKER_ERROR_CODES.REVIEW_CANNOT_EDIT]: {
    code: MAKER_CHECKER_ERROR_CODES.REVIEW_CANNOT_EDIT,
    title: 'Cannot Edit Review',
    message: 'This review cannot be edited because it has already been submitted for approval. Only draft reviews can be modified.',
    actionable: true,
    actions: [
      {
        label: 'View Review Details',
        action: () => {}, // Will be set by caller
        primary: true
      },
      {
        label: 'Create New Review',
        action: () => window.location.href = '/reviews/new'
      }
    ],
    severity: 'medium',
    category: 'workflow'
  },

  [MAKER_CHECKER_ERROR_CODES.REVIEW_CANNOT_SUBMIT]: {
    code: MAKER_CHECKER_ERROR_CODES.REVIEW_CANNOT_SUBMIT,
    title: 'Cannot Submit Review',
    message: 'This review cannot be submitted. Please ensure all required fields are completed and documents are uploaded.',
    actionable: true,
    actions: [
      {
        label: 'Check Requirements',
        action: () => {}, // Will be set by caller
        primary: true
      },
      {
        label: 'Edit Review',
        action: () => {}, // Will be set by caller
      }
    ],
    severity: 'medium',
    category: 'validation'
  },

  [MAKER_CHECKER_ERROR_CODES.MAKER_CHECKER_VIOLATION]: {
    code: MAKER_CHECKER_ERROR_CODES.MAKER_CHECKER_VIOLATION,
    title: 'Maker-Checker Violation',
    message: 'You cannot review your own submission. The maker-checker principle requires different users for submission and approval.',
    actionable: false,
    severity: 'high',
    category: 'business_rule'
  },

  [MAKER_CHECKER_ERROR_CODES.SELF_APPROVAL_DENIED]: {
    code: MAKER_CHECKER_ERROR_CODES.SELF_APPROVAL_DENIED,
    title: 'Self-Approval Not Allowed',
    message: 'You cannot approve or reject your own review submission. Please assign this review to another checker.',
    actionable: true,
    actions: [
      {
        label: 'Find Another Checker',
        action: () => {}, // Will be set by caller
        primary: true
      }
    ],
    severity: 'high',
    category: 'business_rule'
  },

  [MAKER_CHECKER_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: {
    code: MAKER_CHECKER_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
    title: 'Insufficient Permissions',
    message: 'You do not have the required permissions to perform this action. Contact your administrator if you believe this is an error.',
    actionable: true,
    actions: [
      {
        label: 'Contact Administrator',
        action: () => {}, // Will be set by caller
        primary: true
      }
    ],
    severity: 'high',
    category: 'permission'
  },

  [MAKER_CHECKER_ERROR_CODES.ROLE_MISMATCH]: {
    code: MAKER_CHECKER_ERROR_CODES.ROLE_MISMATCH,
    title: 'Role Mismatch',
    message: 'Your current role does not allow this action. Makers can create and submit reviews, while Checkers can approve or reject them.',
    actionable: false,
    severity: 'medium',
    category: 'permission'
  },

  [MAKER_CHECKER_ERROR_CODES.REVIEW_MISSING_DOCUMENTS]: {
    code: MAKER_CHECKER_ERROR_CODES.REVIEW_MISSING_DOCUMENTS,
    title: 'Missing Required Documents',
    message: 'At least one document must be uploaded before submitting the review. Please upload the required documents and try again.',
    actionable: true,
    actions: [
      {
        label: 'Upload Documents',
        action: () => {}, // Will be set by caller
        primary: true
      }
    ],
    severity: 'medium',
    category: 'validation'
  },

  [MAKER_CHECKER_ERROR_CODES.REVIEW_VALIDATION_FAILED]: {
    code: MAKER_CHECKER_ERROR_CODES.REVIEW_VALIDATION_FAILED,
    title: 'Review Validation Failed',
    message: 'The review contains validation errors that must be fixed before submission. Please review the highlighted fields.',
    actionable: true,
    actions: [
      {
        label: 'Fix Validation Errors',
        action: () => {}, // Will be set by caller
        primary: true
      }
    ],
    severity: 'medium',
    category: 'validation'
  },

  [MAKER_CHECKER_ERROR_CODES.EXCEPTION_NOT_FOUND]: {
    code: MAKER_CHECKER_ERROR_CODES.EXCEPTION_NOT_FOUND,
    title: 'Exception Not Found',
    message: 'The requested exception could not be found. It may have been resolved or you may not have permission to access it.',
    actionable: true,
    actions: [
      {
        label: 'Go to Exceptions List',
        action: () => window.location.href = '/exceptions',
        primary: true
      }
    ],
    severity: 'medium',
    category: 'workflow'
  },

  [MAKER_CHECKER_ERROR_CODES.EXCEPTION_MISSING_REASON]: {
    code: MAKER_CHECKER_ERROR_CODES.EXCEPTION_MISSING_REASON,
    title: 'Rejection Reason Required',
    message: 'A detailed reason must be provided when rejecting a review or exception. This helps the submitter understand what needs to be corrected.',
    actionable: true,
    actions: [
      {
        label: 'Provide Reason',
        action: () => {}, // Will be set by caller
        primary: true
      }
    ],
    severity: 'medium',
    category: 'validation'
  },

  [MAKER_CHECKER_ERROR_CODES.CLIENT_NOT_HIGH_RISK]: {
    code: MAKER_CHECKER_ERROR_CODES.CLIENT_NOT_HIGH_RISK,
    title: 'Client Risk Level Restriction',
    message: 'Reviews can only be created for high-risk clients. This client does not meet the risk level requirement for formal review.',
    actionable: false,
    severity: 'medium',
    category: 'business_rule'
  },

  [MAKER_CHECKER_ERROR_CODES.KYC_VALIDATION_FAILED]: {
    code: MAKER_CHECKER_ERROR_CODES.KYC_VALIDATION_FAILED,
    title: 'KYC Validation Failed',
    message: 'The KYC questionnaire contains validation errors. Please review the conditional field requirements and complete all necessary information.',
    actionable: true,
    actions: [
      {
        label: 'Review KYC Form',
        action: () => {}, // Will be set by caller
        primary: true
      }
    ],
    severity: 'medium',
    category: 'validation'
  },

  [MAKER_CHECKER_ERROR_CODES.DOCUMENT_UPLOAD_FAILED]: {
    code: MAKER_CHECKER_ERROR_CODES.DOCUMENT_UPLOAD_FAILED,
    title: 'Document Upload Failed',
    message: 'The document upload failed due to a network or server error. Please check your connection and try uploading again.',
    actionable: true,
    actions: [
      {
        label: 'Retry Upload',
        action: () => {}, // Will be set by caller
        primary: true
      },
      {
        label: 'Check Connection',
        action: () => window.location.reload()
      }
    ],
    severity: 'medium',
    category: 'system'
  },

  [MAKER_CHECKER_ERROR_CODES.DOCUMENT_SIZE_EXCEEDED]: {
    code: MAKER_CHECKER_ERROR_CODES.DOCUMENT_SIZE_EXCEEDED,
    title: 'File Size Too Large',
    message: 'The selected file exceeds the maximum allowed size of 10MB. Please compress the file or select a smaller document.',
    actionable: true,
    actions: [
      {
        label: 'Select Different File',
        action: () => {}, // Will be set by caller
        primary: true
      }
    ],
    severity: 'low',
    category: 'validation'
  },

  [MAKER_CHECKER_ERROR_CODES.CONCURRENT_MODIFICATION]: {
    code: MAKER_CHECKER_ERROR_CODES.CONCURRENT_MODIFICATION,
    title: 'Concurrent Modification Detected',
    message: 'This record has been modified by another user since you loaded it. Please refresh the page to see the latest changes.',
    actionable: true,
    actions: [
      {
        label: 'Refresh Page',
        action: () => window.location.reload(),
        primary: true
      }
    ],
    severity: 'medium',
    category: 'system'
  },

  [MAKER_CHECKER_ERROR_CODES.WORKFLOW_STATE_CONFLICT]: {
    code: MAKER_CHECKER_ERROR_CODES.WORKFLOW_STATE_CONFLICT,
    title: 'Workflow State Conflict',
    message: 'The current workflow state does not allow this action. The review may have been processed by another user.',
    actionable: true,
    actions: [
      {
        label: 'Refresh and Retry',
        action: () => window.location.reload(),
        primary: true
      }
    ],
    severity: 'medium',
    category: 'workflow'
  }
};

/**
 * Enhanced error handler for maker-checker workflow
 */
export class MakerCheckerErrorHandler {
  private retryAttempts = new Map<string, number>();
  
  /**
   * Handle maker-checker specific errors
   */
  handleError(error: Error | ApiError, context: { action?: string; reviewId?: number; exceptionId?: number } = {}): MakerCheckerError {
    const errorCode = this.extractErrorCode(error);
    const baseError = ERROR_MESSAGES[errorCode];
    
    if (baseError) {
      return this.enhanceErrorWithContext(baseError, context);
    }
    
    // Fallback to generic error handling
    return this.createGenericError(error, context);
  }

  /**
   * Extract error code from API error or create one from error message
   */
  private extractErrorCode(error: Error | ApiError): string {
    if (this.isApiError(error)) {
      return error.code;
    }
    
    // Map common error messages to codes
    const message = error.message.toLowerCase();
    
    if (message.includes('not found')) {
      return MAKER_CHECKER_ERROR_CODES.REVIEW_NOT_FOUND;
    }
    if (message.includes('cannot edit') || message.includes('cannot be edited')) {
      return MAKER_CHECKER_ERROR_CODES.REVIEW_CANNOT_EDIT;
    }
    if (message.includes('cannot submit')) {
      return MAKER_CHECKER_ERROR_CODES.REVIEW_CANNOT_SUBMIT;
    }
    if (message.includes('maker-checker') || message.includes('self approval')) {
      return MAKER_CHECKER_ERROR_CODES.MAKER_CHECKER_VIOLATION;
    }
    if (message.includes('permission') || message.includes('access denied')) {
      return MAKER_CHECKER_ERROR_CODES.INSUFFICIENT_PERMISSIONS;
    }
    if (message.includes('validation')) {
      return MAKER_CHECKER_ERROR_CODES.REVIEW_VALIDATION_FAILED;
    }
    if (message.includes('document')) {
      return MAKER_CHECKER_ERROR_CODES.DOCUMENT_UPLOAD_FAILED;
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Enhance error with context-specific actions
   */
  private enhanceErrorWithContext(baseError: MakerCheckerError, context: { action?: string; reviewId?: number; exceptionId?: number }): MakerCheckerError {
    const enhancedError = { ...baseError };
    
    // Add context-specific actions
    if (enhancedError.actions) {
      enhancedError.actions = enhancedError.actions.map(action => ({
        ...action,
        action: this.createContextualAction(action.label, context)
      }));
    }
    
    return enhancedError;
  }

  /**
   * Create contextual actions based on error type and context
   */
  private createContextualAction(actionLabel: string, context: { action?: string; reviewId?: number; exceptionId?: number }): () => void {
    switch (actionLabel) {
      case 'View Review Details':
        return () => {
          if (context.reviewId) {
            window.location.href = `/reviews/${context.reviewId}`;
          }
        };
      
      case 'Edit Review':
        return () => {
          if (context.reviewId) {
            window.location.href = `/reviews/${context.reviewId}/edit`;
          }
        };
      
      case 'Check Requirements':
        return () => {
          if (context.reviewId) {
            // Scroll to validation section or open requirements modal
            const validationSection = document.getElementById('validation-section');
            if (validationSection) {
              validationSection.scrollIntoView({ behavior: 'smooth' });
            }
          }
        };
      
      case 'Upload Documents':
        return () => {
          if (context.reviewId) {
            // Focus on document upload section
            const uploadSection = document.getElementById('document-upload');
            if (uploadSection) {
              uploadSection.scrollIntoView({ behavior: 'smooth' });
              const uploadButton = uploadSection.querySelector('button, input[type="file"]') as HTMLElement;
              if (uploadButton) {
                uploadButton.focus();
              }
            }
          }
        };
      
      case 'Retry Upload':
        return () => {
          // Trigger retry mechanism
          const retryEvent = new CustomEvent('document:retry-upload', {
            detail: { reviewId: context.reviewId }
          });
          window.dispatchEvent(retryEvent);
        };
      
      case 'Fix Validation Errors':
        return () => {
          // Focus on first validation error
          const firstError = document.querySelector('.error, .invalid, [aria-invalid="true"]') as HTMLElement;
          if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth' });
            firstError.focus();
          }
        };
      
      case 'Review KYC Form':
        return () => {
          // Navigate to KYC section
          const kycSection = document.getElementById('kyc-questionnaire');
          if (kycSection) {
            kycSection.scrollIntoView({ behavior: 'smooth' });
          }
        };
      
      case 'Provide Reason':
        return () => {
          // Focus on reason input field
          const reasonField = document.querySelector('textarea[name="reason"], input[name="rejection_reason"]') as HTMLElement;
          if (reasonField) {
            reasonField.focus();
          }
        };
      
      default:
        return () => {
          console.warn(`No action handler defined for: ${actionLabel}`);
        };
    }
  }

  /**
   * Create generic error for unknown error types
   */
  private createGenericError(error: Error | ApiError, context: { action?: string }): MakerCheckerError {
    return {
      code: 'UNKNOWN_ERROR',
      title: 'Unexpected Error',
      message: error.message || 'An unexpected error occurred during the workflow operation.',
      actionable: true,
      actions: [
        {
          label: 'Try Again',
          action: () => {
            if (context.action) {
              // Retry the last action
              const retryEvent = new CustomEvent('workflow:retry-action', {
                detail: { action: context.action }
              });
              window.dispatchEvent(retryEvent);
            } else {
              window.location.reload();
            }
          },
          primary: true
        },
        {
          label: 'Report Issue',
          action: () => {
            // Open support/feedback mechanism
            const supportEvent = new CustomEvent('support:report-issue', {
              detail: { error: error.message, context }
            });
            window.dispatchEvent(supportEvent);
          }
        }
      ],
      severity: 'medium',
      category: 'system'
    };
  }

  /**
   * Implement retry mechanism with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    operationId: string,
    options: RetryOptions = { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 }
  ): Promise<T> {
    const currentAttempts = this.retryAttempts.get(operationId) || 0;
    
    try {
      const result = await operation();
      // Reset retry count on success
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      if (currentAttempts >= options.maxAttempts - 1) {
        // Max attempts reached, clear retry count and throw
        this.retryAttempts.delete(operationId);
        throw error;
      }
      
      // Increment retry count
      this.retryAttempts.set(operationId, currentAttempts + 1);
      
      // Calculate delay with exponential backoff
      const delay = options.delayMs * Math.pow(options.backoffMultiplier, currentAttempts);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Recursive retry
      return this.retryOperation(operation, operationId, options);
    }
  }

  /**
   * Check if error should trigger retry
   */
  shouldRetry(error: Error | ApiError): boolean {
    if (this.isApiError(error)) {
      const retryableCodes = [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'SERVER_ERROR',
        'SERVICE_UNAVAILABLE',
        'GATEWAY_TIMEOUT'
      ];
      return retryableCodes.includes(error.code);
    }
    
    // Retry on network-related JavaScript errors
    return error.message.includes('fetch') || 
           error.message.includes('network') ||
           error.message.includes('timeout');
  }

  /**
   * Get user-friendly error recovery suggestions
   */
  getRecoverySuggestions(errorCode: string): string[] {
    const suggestions: Record<string, string[]> = {
      [MAKER_CHECKER_ERROR_CODES.REVIEW_CANNOT_SUBMIT]: [
        'Ensure all required fields are completed',
        'Upload at least one document',
        'Complete the KYC questionnaire if required',
        'Check that the client is marked as high-risk'
      ],
      [MAKER_CHECKER_ERROR_CODES.REVIEW_VALIDATION_FAILED]: [
        'Review highlighted validation errors',
        'Check required field completion',
        'Verify document upload status',
        'Validate KYC questionnaire responses'
      ],
      [MAKER_CHECKER_ERROR_CODES.DOCUMENT_UPLOAD_FAILED]: [
        'Check your internet connection',
        'Ensure file size is under 10MB',
        'Verify file format is supported',
        'Try uploading a different file'
      ],
      [MAKER_CHECKER_ERROR_CODES.KYC_VALIDATION_FAILED]: [
        'Complete all required KYC fields',
        'Check conditional field requirements',
        'Ensure document references are valid',
        'Review business rule compliance'
      ]
    };
    
    return suggestions[errorCode] || [
      'Refresh the page and try again',
      'Check your internet connection',
      'Contact support if the issue persists'
    ];
  }

  /**
   * Clear retry attempts for an operation
   */
  clearRetryAttempts(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Get current retry attempt count
   */
  getRetryAttempts(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  private isApiError(error: any): error is ApiError {
    return error && typeof error === 'object' && 'code' in error && 'timestamp' in error;
  }
}

// Create singleton instance
export const makerCheckerErrorHandler = new MakerCheckerErrorHandler();

/**
 * React hook for maker-checker error handling
 */
export function useMakerCheckerErrorHandler() {
  const handleError = (error: Error | ApiError, context?: { action?: string; reviewId?: number; exceptionId?: number }) => {
    return makerCheckerErrorHandler.handleError(error, context);
  };

  const retryOperation = <T>(
    operation: () => Promise<T>,
    operationId: string,
    options?: RetryOptions
  ) => {
    return makerCheckerErrorHandler.retryOperation(operation, operationId, options);
  };

  const shouldRetry = (error: Error | ApiError) => {
    return makerCheckerErrorHandler.shouldRetry(error);
  };

  const getRecoverySuggestions = (errorCode: string) => {
    return makerCheckerErrorHandler.getRecoverySuggestions(errorCode);
  };

  return {
    handleError,
    retryOperation,
    shouldRetry,
    getRecoverySuggestions,
    clearRetryAttempts: makerCheckerErrorHandler.clearRetryAttempts.bind(makerCheckerErrorHandler),
    getRetryAttempts: makerCheckerErrorHandler.getRetryAttempts.bind(makerCheckerErrorHandler)
  };
}

export default makerCheckerErrorHandler;