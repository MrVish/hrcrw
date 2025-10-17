import { ApiError } from '../services/apiClient';
import type { MakerCheckerError } from '../services/makerCheckerErrors';
import { MAKER_CHECKER_ERROR_CODES } from '../services/makerCheckerErrors';

/**
 * Comprehensive error categories for maker-checker workflow
 */
export const ErrorCategory = {
  PERMISSION: 'permission',
  NETWORK: 'network',
  VALIDATION: 'validation',
  SESSION: 'session',
  BUSINESS_RULE: 'business_rule',
  WORKFLOW: 'workflow',
  SYSTEM: 'system',
  UNKNOWN: 'unknown'
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

/**
 * Enhanced error context for better categorization and handling
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: number;
  reviewId?: number;
  exceptionId?: number;
  clientId?: number;
  workflowContext?: 'review' | 'exception' | 'document' | 'kyc' | 'client';
  userRole?: 'maker' | 'checker' | 'admin';
  itemStatus?: string;
  timestamp?: string;
  userAgent?: string;
  url?: string;
  sessionId?: string;
  requestId?: string;
}

/**
 * Categorized error information
 */
export interface CategorizedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  errorCode: string;
  context: ErrorContext;
  recoverySuggestions: string[];
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

/**
 * Error logging configuration
 */
export interface ErrorLogConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxLogEntries: number;
  remoteEndpoint?: string;
}

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  errorCode: string;
  message: string;
  context: ErrorContext;
  stackTrace?: string;
  userAgent: string;
  url: string;
  sessionId?: string;
  userId?: number;
}

/**
 * Enhanced error categorization functions
 */
export class ErrorCategorizer {
  /**
   * Categorize error based on error type, message, and context
   */
  static categorizeError(error: Error | ApiError, context: ErrorContext = {}): CategorizedError {
    // Handle API errors first
    if (this.isApiError(error)) {
      return this.categorizeApiError(error, context);
    }

    // Handle JavaScript errors
    return this.categorizeJavaScriptError(error, context);
  }

  /**
   * Categorize API errors based on status codes and error codes
   */
  private static categorizeApiError(error: ApiError, context: ErrorContext): CategorizedError {
    const { code, message } = error;
    const status = (error as any).status;
    const lowerMessage = message.toLowerCase();

    // Permission errors
    if (status === 401 || status === 403 || 
        code.includes('UNAUTHORIZED') || code.includes('FORBIDDEN') ||
        lowerMessage.includes('permission') || lowerMessage.includes('access denied')) {
      return {
        category: ErrorCategory.PERMISSION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        userMessage: this.getPermissionErrorMessage(code, context),
        technicalMessage: message,
        errorCode: code,
        context,
        recoverySuggestions: this.getPermissionRecoverySuggestions(code, context)
      };
    }

    // Session errors
    if (status === 401 || code.includes('SESSION') || code.includes('TOKEN') ||
        lowerMessage.includes('session') || lowerMessage.includes('expired')) {
      return {
        category: ErrorCategory.SESSION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        userMessage: 'Your session has expired. Please log in again to continue.',
        technicalMessage: message,
        errorCode: code,
        context,
        recoverySuggestions: ['Log in again', 'Clear browser cache if login issues persist'],
        actions: [{
          label: 'Log In',
          action: () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
          },
          primary: true
        }]
      };
    }

    // Validation errors
    if (status === 400 || code.includes('VALIDATION') || code.includes('INVALID') ||
        lowerMessage.includes('validation') || lowerMessage.includes('required')) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        userMessage: this.getValidationErrorMessage(code, message, context),
        technicalMessage: message,
        errorCode: code,
        context,
        recoverySuggestions: this.getValidationRecoverySuggestions(code, context)
      };
    }

    // Business rule errors
    if (code.includes('BUSINESS_RULE') || code.includes('MAKER_CHECKER') ||
        Object.values(MAKER_CHECKER_ERROR_CODES).includes(code as any)) {
      return {
        category: ErrorCategory.BUSINESS_RULE,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        userMessage: this.getBusinessRuleErrorMessage(code, context),
        technicalMessage: message,
        errorCode: code,
        context,
        recoverySuggestions: this.getBusinessRuleRecoverySuggestions(code, context)
      };
    }

    // Workflow errors
    if (code.includes('WORKFLOW') || code.includes('STATUS') ||
        lowerMessage.includes('workflow') || lowerMessage.includes('state')) {
      return {
        category: ErrorCategory.WORKFLOW,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        userMessage: this.getWorkflowErrorMessage(code, context),
        technicalMessage: message,
        errorCode: code,
        context,
        recoverySuggestions: this.getWorkflowRecoverySuggestions(code, context)
      };
    }

    // Network errors
    if (status === 0 || status >= 500 || code.includes('NETWORK') || code.includes('TIMEOUT') ||
        lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
      return {
        category: ErrorCategory.NETWORK,
        severity: status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
        retryable: true,
        userMessage: 'Network error. Please check your connection and try again.',
        technicalMessage: message,
        errorCode: code,
        context,
        recoverySuggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Contact support if the issue persists'
        ],
        actions: [{
          label: 'Retry',
          action: () => window.location.reload(),
          primary: true
        }]
      };
    }

    // System errors
    if (status >= 500 || code.includes('SERVER') || code.includes('SYSTEM')) {
      return {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        retryable: true,
        userMessage: 'A system error occurred. Our team has been notified. Please try again later.',
        technicalMessage: message,
        errorCode: code,
        context,
        recoverySuggestions: [
          'Try again in a few minutes',
          'Contact support if the issue persists',
          'Check system status page'
        ]
      };
    }

    // Default to unknown
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: message || 'An unexpected error occurred.',
      technicalMessage: message,
      errorCode: code,
      context,
      recoverySuggestions: ['Try refreshing the page', 'Contact support if the issue persists']
    };
  }

  /**
   * Categorize JavaScript errors
   */
  private static categorizeJavaScriptError(error: Error, context: ErrorContext): CategorizedError {
    const message = error.message.toLowerCase();

    // Network-related JavaScript errors
    if (message.includes('fetch') || message.includes('network') || 
        message.includes('failed to fetch') || message.includes('networkerror')) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        userMessage: 'Network connection error. Please check your internet connection and try again.',
        technicalMessage: error.message,
        errorCode: 'JS_NETWORK_ERROR',
        context,
        recoverySuggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable browser extensions that might block requests'
        ]
      };
    }

    // Permission-related JavaScript errors
    if (message.includes('permission') || message.includes('access') || message.includes('cors')) {
      return {
        category: ErrorCategory.PERMISSION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        userMessage: 'Access denied. You may not have permission to perform this action.',
        technicalMessage: error.message,
        errorCode: 'JS_PERMISSION_ERROR',
        context,
        recoverySuggestions: [
          'Contact your administrator',
          'Check if you are logged in',
          'Verify your role permissions'
        ]
      };
    }

    // Validation-related JavaScript errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        userMessage: 'Please check your input and try again.',
        technicalMessage: error.message,
        errorCode: 'JS_VALIDATION_ERROR',
        context,
        recoverySuggestions: [
          'Check all required fields are completed',
          'Verify input formats are correct',
          'Review validation error messages'
        ]
      };
    }

    // Default JavaScript error
    return {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      userMessage: 'An unexpected error occurred. Please try refreshing the page.',
      technicalMessage: error.message,
      errorCode: 'JS_SYSTEM_ERROR',
      context,
      recoverySuggestions: [
        'Refresh the page',
        'Clear browser cache',
        'Try using a different browser',
        'Contact support if the issue persists'
      ]
    };
  }

  /**
   * Get user-friendly permission error messages
   */
  private static getPermissionErrorMessage(code: string, context: ErrorContext): string {
    if (code.includes('MAKER_CHECKER') || code.includes('SELF_APPROVAL')) {
      return 'You cannot review your own submission. The maker-checker principle requires different users for submission and approval.';
    }

    if (context.userRole === 'maker' && context.action?.includes('approve')) {
      return 'Only Checkers and Admins can approve or reject reviews. Your role is limited to creating and submitting reviews.';
    }

    if (context.userRole === 'checker' && context.action?.includes('edit')) {
      return 'Only the original creator can edit this item. As a Checker, you can approve or reject submitted items.';
    }

    return 'You do not have permission to perform this action. Contact your administrator if you believe this is an error.';
  }

  /**
   * Get user-friendly validation error messages
   */
  private static getValidationErrorMessage(code: string, message: string, context: ErrorContext): string {
    if (code.includes('MISSING_DOCUMENTS')) {
      return 'At least one document must be uploaded before submitting the review.';
    }

    if (code.includes('KYC_VALIDATION')) {
      return 'The KYC questionnaire contains validation errors. Please complete all required fields.';
    }

    if (code.includes('REQUIRED_FIELDS')) {
      return 'Please complete all required fields before proceeding.';
    }

    return message || 'Please check your input and try again.';
  }

  /**
   * Get user-friendly business rule error messages
   */
  private static getBusinessRuleErrorMessage(code: string, context: ErrorContext): string {
    if (code === MAKER_CHECKER_ERROR_CODES.CLIENT_NOT_HIGH_RISK) {
      return 'Reviews can only be created for high-risk clients. This client does not meet the risk level requirement.';
    }

    if (code === MAKER_CHECKER_ERROR_CODES.REVIEW_ALREADY_REVIEWED) {
      return 'This review has already been processed and cannot be modified.';
    }

    if (code === MAKER_CHECKER_ERROR_CODES.CONCURRENT_MODIFICATION) {
      return 'This record has been modified by another user. Please refresh the page to see the latest changes.';
    }

    return 'This action violates a business rule and cannot be completed.';
  }

  /**
   * Get user-friendly workflow error messages
   */
  private static getWorkflowErrorMessage(code: string, context: ErrorContext): string {
    if (code.includes('INVALID_STATUS')) {
      return 'This action cannot be performed due to the current status of the item.';
    }

    if (code.includes('WORKFLOW_STATE_CONFLICT')) {
      return 'The workflow state has changed. Please refresh the page and try again.';
    }

    return 'A workflow error occurred. Please try again or contact support.';
  }

  /**
   * Get recovery suggestions for permission errors
   */
  private static getPermissionRecoverySuggestions(code: string, context: ErrorContext): string[] {
    const suggestions = ['Contact your administrator for assistance'];

    if (code.includes('MAKER_CHECKER') || code.includes('SELF_APPROVAL')) {
      suggestions.unshift('Assign this review to another checker');
    }

    if (context.userRole === 'maker') {
      suggestions.unshift('Switch to a Checker account if you have one');
    }

    return suggestions;
  }

  /**
   * Get recovery suggestions for validation errors
   */
  private static getValidationRecoverySuggestions(code: string, context: ErrorContext): string[] {
    const suggestions = ['Review the highlighted validation errors'];

    if (code.includes('MISSING_DOCUMENTS')) {
      suggestions.unshift('Upload the required documents');
    }

    if (code.includes('KYC_VALIDATION')) {
      suggestions.unshift('Complete the KYC questionnaire');
    }

    if (code.includes('REQUIRED_FIELDS')) {
      suggestions.unshift('Fill in all required fields');
    }

    return suggestions;
  }

  /**
   * Get recovery suggestions for business rule errors
   */
  private static getBusinessRuleRecoverySuggestions(code: string, context: ErrorContext): string[] {
    if (code === MAKER_CHECKER_ERROR_CODES.CLIENT_NOT_HIGH_RISK) {
      return [
        'Update the client risk level to high-risk',
        'Contact compliance team for guidance',
        'Review client risk assessment criteria'
      ];
    }

    if (code === MAKER_CHECKER_ERROR_CODES.CONCURRENT_MODIFICATION) {
      return [
        'Refresh the page to see latest changes',
        'Coordinate with other users working on this item',
        'Try again after refreshing'
      ];
    }

    return [
      'Review the business rule requirements',
      'Contact your supervisor for guidance',
      'Check system documentation'
    ];
  }

  /**
   * Get recovery suggestions for workflow errors
   */
  private static getWorkflowRecoverySuggestions(code: string, context: ErrorContext): string[] {
    return [
      'Refresh the page to see current status',
      'Check if another user has processed this item',
      'Try the action again',
      'Contact support if the issue persists'
    ];
  }

  /**
   * Check if error is an API error
   */
  private static isApiError(error: any): error is ApiError {
    return error && typeof error === 'object' && 'code' in error && 'timestamp' in error;
  }
}
/**

 * Error logging service for debugging and monitoring
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private logEntries: ErrorLogEntry[] = [];
  private config: ErrorLogConfig = {
    enableConsoleLogging: true,
    enableRemoteLogging: import.meta.env.MODE === 'production',
    logLevel: import.meta.env.MODE === 'development' ? 'debug' : 'error',
    maxLogEntries: 1000,
    remoteEndpoint: import.meta.env.VITE_ERROR_LOGGING_ENDPOINT
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Configure error logging
   */
  configure(config: Partial<ErrorLogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log an error with full context
   */
  logError(error: Error | ApiError, context: ErrorContext = {}): ErrorLogEntry {
    const logEntry: ErrorLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      category: ErrorCategorizer.categorizeError(error, context).category,
      severity: ErrorCategorizer.categorizeError(error, context).severity,
      errorCode: this.extractErrorCode(error),
      message: error.message,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId()
      },
      stackTrace: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId(),
      userId: context.userId
    };

    // Add to local log entries
    this.addLogEntry(logEntry);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry);
    }

    // Remote logging
    if (this.config.enableRemoteLogging && this.shouldLogRemotely(logEntry)) {
      this.logToRemoteService(logEntry);
    }

    return logEntry;
  }

  /**
   * Log categorized error
   */
  logCategorizedError(categorizedError: CategorizedError): ErrorLogEntry {
    const logEntry: ErrorLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      category: categorizedError.category,
      severity: categorizedError.severity,
      errorCode: categorizedError.errorCode,
      message: categorizedError.technicalMessage,
      context: {
        ...categorizedError.context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId()
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId(),
      userId: categorizedError.context.userId
    };

    this.addLogEntry(logEntry);

    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry);
    }

    if (this.config.enableRemoteLogging && this.shouldLogRemotely(logEntry)) {
      this.logToRemoteService(logEntry);
    }

    return logEntry;
  }

  /**
   * Add log entry to local storage
   */
  private addLogEntry(logEntry: ErrorLogEntry): void {
    this.logEntries.push(logEntry);

    // Keep log entries within limit
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
    }

    // Persist to localStorage for debugging
    try {
      const recentLogs = this.logEntries.slice(-100); // Keep last 100 entries in localStorage
      localStorage.setItem('errorLogs', JSON.stringify(recentLogs));
    } catch (e) {
      // localStorage might be full, ignore
    }
  }

  /**
   * Log to console with appropriate level
   */
  private logToConsole(logEntry: ErrorLogEntry): void {
    const logData = {
      id: logEntry.id,
      category: logEntry.category,
      severity: logEntry.severity,
      code: logEntry.errorCode,
      message: logEntry.message,
      context: logEntry.context,
      timestamp: logEntry.timestamp
    };

    switch (logEntry.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('[ERROR]', logData);
        if (logEntry.stackTrace) {
          console.error('Stack trace:', logEntry.stackTrace);
        }
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('[WARN]', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('[INFO]', logData);
        break;
      default:
        console.log('[LOG]', logData);
    }
  }

  /**
   * Send error to remote logging service
   */
  private async logToRemoteService(logEntry: ErrorLogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...logEntry,
          environment: import.meta.env.MODE,
          appVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
          buildId: import.meta.env.VITE_BUILD_ID || 'unknown'
        })
      });
    } catch (error) {
      // Don't log remote logging errors to avoid infinite loops
      console.warn('Failed to send error to remote logging service:', error);
    }
  }

  /**
   * Determine if error should be logged remotely
   */
  private shouldLogRemotely(logEntry: ErrorLogEntry): boolean {
    // Always log critical and high severity errors
    if (logEntry.severity === ErrorSeverity.CRITICAL || logEntry.severity === ErrorSeverity.HIGH) {
      return true;
    }

    // Log medium severity errors in production
    if (logEntry.severity === ErrorSeverity.MEDIUM && import.meta.env.MODE === 'production') {
      return true;
    }

    // Log workflow and business rule errors for analysis
    if (logEntry.category === ErrorCategory.WORKFLOW || logEntry.category === ErrorCategory.BUSINESS_RULE) {
      return true;
    }

    return false;
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract error code from error object
   */
  private extractErrorCode(error: Error | ApiError): string {
    if ('code' in error && error.code) {
      return error.code;
    }

    // Generate code from error type and message
    const errorType = error.constructor.name;
    const messageHash = this.hashString(error.message);
    return `${errorType}_${messageHash}`;
  }

  /**
   * Get or generate session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('errorLogSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('errorLogSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(limit = 50): ErrorLogEntry[] {
    return this.logEntries.slice(-limit);
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: ErrorCategory, limit = 50): ErrorLogEntry[] {
    return this.logEntries
      .filter(entry => entry.category === category)
      .slice(-limit);
  }

  /**
   * Get logs by severity
   */
  getLogsBySeverity(severity: ErrorSeverity, limit = 50): ErrorLogEntry[] {
    return this.logEntries
      .filter(entry => entry.severity === severity)
      .slice(-limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: number;
  } {
    const stats = {
      total: this.logEntries.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recentErrors: 0
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count errors
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.logEntries.forEach(entry => {
      stats.byCategory[entry.category]++;
      stats.bySeverity[entry.severity]++;
      
      if (new Date(entry.timestamp) > oneHourAgo) {
        stats.recentErrors++;
      }
    });

    return stats;
  }

  /**
   * Clear log entries
   */
  clearLogs(): void {
    this.logEntries = [];
    localStorage.removeItem('errorLogs');
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }

  /**
   * Import logs from JSON string
   */
  importLogs(logsJson: string): void {
    try {
      const logs = JSON.parse(logsJson) as ErrorLogEntry[];
      this.logEntries = [...this.logEntries, ...logs];
      
      // Keep within limit
      if (this.logEntries.length > this.config.maxLogEntries) {
        this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
      }
    } catch (error) {
      console.error('Failed to import logs:', error);
    }
  }
}

/**
 * User-friendly error message mapper
 */
export class ErrorMessageMapper {
  private static readonly USER_FRIENDLY_MESSAGES: Record<string, string> = {
    // Network errors
    'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
    'TIMEOUT_ERROR': 'The request timed out. Please try again.',
    'CONNECTION_REFUSED': 'Cannot connect to the server. Please try again later.',
    
    // Permission errors
    'UNAUTHORIZED': 'You are not authorized to perform this action.',
    'FORBIDDEN': 'Access denied. You do not have permission to access this resource.',
    'SESSION_EXPIRED': 'Your session has expired. Please log in again.',
    
    // Validation errors
    'VALIDATION_ERROR': 'Please check your input and correct any errors.',
    'REQUIRED_FIELD': 'This field is required.',
    'INVALID_FORMAT': 'Please enter a valid value.',
    'FILE_TOO_LARGE': 'The file is too large. Please select a smaller file.',
    'INVALID_FILE_TYPE': 'This file type is not supported.',
    
    // Business rule errors
    'BUSINESS_RULE_VIOLATION': 'This action violates a business rule.',
    'MAKER_CHECKER_VIOLATION': 'You cannot review your own submission.',
    'WORKFLOW_VIOLATION': 'This action is not allowed in the current workflow state.',
    
    // System errors
    'SERVER_ERROR': 'A server error occurred. Please try again later.',
    'DATABASE_ERROR': 'A database error occurred. Please contact support.',
    'SYSTEM_UNAVAILABLE': 'The system is temporarily unavailable. Please try again later.'
  };

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(errorCode: string, originalMessage?: string): string {
    // Check for exact match
    if (this.USER_FRIENDLY_MESSAGES[errorCode]) {
      return this.USER_FRIENDLY_MESSAGES[errorCode];
    }

    // Check for partial matches
    for (const [code, message] of Object.entries(this.USER_FRIENDLY_MESSAGES)) {
      if (errorCode.includes(code)) {
        return message;
      }
    }

    // Fallback to original message or generic message
    return originalMessage || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Add custom error message mapping
   */
  static addCustomMapping(errorCode: string, userMessage: string): void {
    this.USER_FRIENDLY_MESSAGES[errorCode] = userMessage;
  }

  /**
   * Get all available mappings
   */
  static getAllMappings(): Record<string, string> {
    return { ...this.USER_FRIENDLY_MESSAGES };
  }
}

/**
 * Comprehensive error handling utility
 */
export class ComprehensiveErrorHandler {
  private static logger = ErrorLogger.getInstance();

  /**
   * Handle any error with full categorization, logging, and user-friendly messaging
   */
  static handleError(error: Error | ApiError, context: ErrorContext = {}): CategorizedError {
    // Categorize the error
    const categorizedError = ErrorCategorizer.categorizeError(error, context);

    // Log the error
    this.logger.logCategorizedError(categorizedError);

    // Enhance with user-friendly message if needed
    if (!categorizedError.userMessage || categorizedError.userMessage === categorizedError.technicalMessage) {
      categorizedError.userMessage = ErrorMessageMapper.getUserFriendlyMessage(
        categorizedError.errorCode,
        categorizedError.technicalMessage
      );
    }

    return categorizedError;
  }

  /**
   * Get error logger instance
   */
  static getLogger(): ErrorLogger {
    return this.logger;
  }

  /**
   * Configure error handling
   */
  static configure(config: Partial<ErrorLogConfig>): void {
    this.logger.configure(config);
  }
}

// Export singleton instances
export const errorLogger = ErrorLogger.getInstance();
export const comprehensiveErrorHandler = ComprehensiveErrorHandler;

// Export convenience functions
export const categorizeError = ErrorCategorizer.categorizeError;
export const getUserFriendlyMessage = ErrorMessageMapper.getUserFriendlyMessage;
export const handleError = ComprehensiveErrorHandler.handleError;