import { ApiError } from '../services/apiClient';
import { ErrorCategory, categorizeError } from './errorHandling';
import type { ErrorContext } from './errorHandling';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  enableAutoRetry?: boolean;
  enableManualRetry?: boolean;
  context?: ErrorContext;
}

export interface RetryState {
  attempt: number;
  maxAttempts: number;
  lastError: any;
  canRetry: boolean;
  isAutoRetrying: boolean;
  nextRetryDelay: number;
}

export class RetryError extends Error {
  public readonly attempts: number;
  public readonly lastError: any;
  public readonly retryInfo?: {
    canRetry: boolean;
    maxAttempts: number;
    nextRetryDelay: number;
  };

  constructor(attempts: number, lastError: any, retryInfo?: {
    canRetry: boolean;
    maxAttempts: number;
    nextRetryDelay: number;
  }) {
    super(`Failed after ${attempts} attempts. Last error: ${lastError.message}`);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
    this.retryInfo = retryInfo;
  }

  /**
   * Check if this error can be retried
   */
  canRetry(): boolean {
    return this.retryInfo?.canRetry || false;
  }

  /**
   * Get next retry delay in milliseconds
   */
  getNextRetryDelay(): number {
    return this.retryInfo?.nextRetryDelay || 0;
  }
}

/**
 * Enhanced retry condition using error categorization
 */
export const defaultRetryCondition = (error: any, context?: ErrorContext): boolean => {
  const categorizedError = categorizeError(error, context || {});
  
  // Always retry network and system errors
  if (categorizedError.category === ErrorCategory.NETWORK || 
      categorizedError.category === ErrorCategory.SYSTEM) {
    return true;
  }

  // Check if it's an ApiError instance with specific retry codes
  if (error instanceof ApiError) {
    const retryableCodes = [
      'NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVER_ERROR',
      'BAD_GATEWAY', 'SERVICE_UNAVAILABLE', 'GATEWAY_TIMEOUT',
      'INTERNAL_SERVER_ERROR', 'CONNECTION_ERROR'
    ];
    return retryableCodes.some(code => error.code.includes(code));
  }

  // Retry on specific axios error codes
  if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return true;
  }

  // Retry on HTTP status codes that indicate temporary issues
  if (error.response?.status >= 500 || (error as any).status >= 500) {
    return true;
  }

  // Fallback for other network-related errors
  if (error.message && (
    error.message.includes('Network Error') ||
    error.message.includes('timeout') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('fetch')
  )) {
    return true;
  }

  return false;
};

/**
 * Session-aware retry condition
 */
export const sessionAwareRetryCondition = (error: any, context?: ErrorContext): boolean => {
  const categorizedError = categorizeError(error, context || {});
  
  // Don't retry session errors - redirect to login instead
  if (categorizedError.category === ErrorCategory.SESSION) {
    return false;
  }

  // Don't retry permission errors
  if (categorizedError.category === ErrorCategory.PERMISSION) {
    return false;
  }

  // Don't retry validation errors
  if (categorizedError.category === ErrorCategory.VALIDATION) {
    return false;
  }

  // Don't retry business rule violations
  if (categorizedError.category === ErrorCategory.BUSINESS_RULE) {
    return false;
  }

  // Use default retry condition for other errors
  return defaultRetryCondition(error, context);
};

/**
 * Exponential backoff delay calculation
 */
export const calculateDelay = (
  attempt: number, 
  baseDelay: number, 
  maxDelay: number, 
  backoffFactor: number
): number => {
  const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
  return Math.min(delay, maxDelay);
};

/**
 * Add jitter to delay to avoid thundering herd problem
 */
export const addJitter = (delay: number, jitterFactor = 0.1): number => {
  const jitter = delay * jitterFactor * Math.random();
  return delay + jitter;
};

/**
 * Sleep utility function
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Enhanced retry function with automatic and manual retry support
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = sessionAwareRetryCondition,
    onRetry,
    enableAutoRetry = true,
    context
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Handle session expiration immediately
      if (isSessionExpired(error)) {
        handleSessionExpiration(context);
        throw error;
      }

      // Don't retry if this is the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Check if we should retry this error
      if (!retryCondition(error, context)) {
        throw error;
      }

      // If auto-retry is disabled, throw with retry information
      if (!enableAutoRetry) {
        throw new RetryError(attempt, error, {
          canRetry: true,
          maxAttempts,
          nextRetryDelay: calculateDelay(attempt, baseDelay, maxDelay, backoffFactor)
        });
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Calculate delay with jitter
      const delay = calculateDelay(attempt, baseDelay, maxDelay, backoffFactor);
      const delayWithJitter = addJitter(delay);

      // Wait before retrying
      await sleep(delayWithJitter);
    }
  }

  throw new RetryError(maxAttempts, lastError);
}

/**
 * Manual retry function that returns retry state instead of throwing
 */
export async function withManualRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<{ result?: T; retryState: RetryState }> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = sessionAwareRetryCondition,
    context
  } = options;

  let lastError: any;
  let attempt = 1;

  try {
    const result = await fn();
    return {
      result,
      retryState: {
        attempt,
        maxAttempts,
        lastError: null,
        canRetry: false,
        isAutoRetrying: false,
        nextRetryDelay: 0
      }
    };
  } catch (error) {
    lastError = error;

    // Handle session expiration
    if (isSessionExpired(error)) {
      handleSessionExpiration(context);
    }

    const canRetry = attempt < maxAttempts && retryCondition(error, context);
    const nextRetryDelay = canRetry 
      ? calculateDelay(attempt, baseDelay, maxDelay, backoffFactor)
      : 0;

    return {
      retryState: {
        attempt,
        maxAttempts,
        lastError,
        canRetry,
        isAutoRetrying: false,
        nextRetryDelay
      }
    };
  }
}

/**
 * Check if error indicates session expiration
 */
export function isSessionExpired(error: any): boolean {
  if (error instanceof ApiError) {
    return error.code === 'SESSION_EXPIRED' || 
           error.code === 'TOKEN_EXPIRED' ||
           error.code === 'UNAUTHORIZED' ||
           ((error as any).status === 401 && error.message.toLowerCase().includes('session'));
  }

  return (error as any).status === 401 || 
         (error.message && error.message.toLowerCase().includes('session expired'));
}

/**
 * Handle session expiration with state preservation
 */
export function handleSessionExpiration(context?: ErrorContext): void {
  // Preserve current state for restoration after login
  const currentState = {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    context: context || {},
    formData: preserveFormData()
  };

  // Store state in sessionStorage
  try {
    sessionStorage.setItem('preLoginState', JSON.stringify(currentState));
  } catch (e) {
    console.warn('Failed to preserve state before login redirect:', e);
  }

  // Clear authentication data
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  // Redirect to login with return URL
  const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?returnUrl=${returnUrl}`;
}

/**
 * Preserve form data from current page
 */
function preserveFormData(): Record<string, any> {
  const formData: Record<string, any> = {};
  
  try {
    // Find all form inputs on the page
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input: any) => {
      if (input.name && input.value) {
        formData[input.name] = input.value;
      }
    });
  } catch (e) {
    console.warn('Failed to preserve form data:', e);
  }

  return formData;
}

/**
 * Restore state after login
 */
export function restorePreLoginState(): {
  url?: string;
  context?: ErrorContext;
  formData?: Record<string, any>;
} | null {
  try {
    const stateJson = sessionStorage.getItem('preLoginState');
    if (stateJson) {
      sessionStorage.removeItem('preLoginState');
      return JSON.parse(stateJson);
    }
  } catch (e) {
    console.warn('Failed to restore pre-login state:', e);
  }
  
  return null;
}

/**
 * Create a retry wrapper for API functions
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}

/**
 * Retry hook for React components
 */
export function useRetry() {
  const retry = async <T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    return withRetry(fn, {
      ...options,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt} after error:`, error);
        if (options.onRetry) {
          options.onRetry(attempt, error);
        }
      }
    });
  };

  return { retry };
}

/**
 * Enhanced retry configurations for different scenarios
 */
export const retryConfigs = {
  // Quick retry for user interactions
  userAction: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    enableAutoRetry: true,
    enableManualRetry: true,
    retryCondition: sessionAwareRetryCondition
  },

  // Standard retry for API calls
  apiCall: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
    enableAutoRetry: true,
    enableManualRetry: true,
    retryCondition: sessionAwareRetryCondition
  },

  // Aggressive retry for critical operations
  critical: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    enableAutoRetry: true,
    enableManualRetry: true,
    retryCondition: sessionAwareRetryCondition
  },

  // Conservative retry for background operations
  background: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 1.5,
    enableAutoRetry: true,
    enableManualRetry: false,
    retryCondition: sessionAwareRetryCondition
  },

  // Manual retry only for sensitive operations
  manualOnly: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
    enableAutoRetry: false,
    enableManualRetry: true,
    retryCondition: sessionAwareRetryCondition
  },

  // Network-specific retry configuration
  networkOperation: {
    maxAttempts: 4,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffFactor: 2.5,
    enableAutoRetry: true,
    enableManualRetry: true,
    retryCondition: (error: any, context?: ErrorContext) => {
      const categorized = categorizeError(error, context || {});
      return categorized.category === ErrorCategory.NETWORK;
    }
  }
} as const;

/**
 * Retry manager for handling multiple retry operations
 */
export class RetryManager {
  private activeRetries = new Map<string, {
    operation: () => Promise<any>;
    options: RetryOptions;
    state: RetryState;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  /**
   * Register a retry operation
   */
  registerRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.activeRetries.set(operationId, {
        operation,
        options,
        state: {
          attempt: 0,
          maxAttempts: options.maxAttempts || 3,
          lastError: null,
          canRetry: true,
          isAutoRetrying: false,
          nextRetryDelay: 0
        },
        resolve,
        reject
      });

      // Start the operation
      this.executeRetry(operationId);
    });
  }

  /**
   * Execute retry operation
   */
  private async executeRetry(operationId: string): Promise<void> {
    const retryInfo = this.activeRetries.get(operationId);
    if (!retryInfo) return;

    const { operation, options, state, resolve, reject } = retryInfo;
    state.attempt++;
    state.isAutoRetrying = true;

    try {
      const result = await operation();
      this.activeRetries.delete(operationId);
      resolve(result);
    } catch (error) {
      state.lastError = error;
      state.isAutoRetrying = false;

      // Handle session expiration
      if (isSessionExpired(error)) {
        handleSessionExpiration(options.context);
        this.activeRetries.delete(operationId);
        reject(error);
        return;
      }

      // Check if we can retry
      const retryCondition = options.retryCondition || sessionAwareRetryCondition;
      const canRetry = state.attempt < state.maxAttempts && retryCondition(error, options.context);
      state.canRetry = canRetry;

      if (!canRetry) {
        this.activeRetries.delete(operationId);
        reject(new RetryError(state.attempt, error));
        return;
      }

      // Calculate next retry delay
      const delay = calculateDelay(
        state.attempt,
        options.baseDelay || 1000,
        options.maxDelay || 10000,
        options.backoffFactor || 2
      );
      state.nextRetryDelay = delay;

      // Auto-retry if enabled
      if (options.enableAutoRetry !== false) {
        setTimeout(() => {
          if (this.activeRetries.has(operationId)) {
            this.executeRetry(operationId);
          }
        }, addJitter(delay));
      }
    }
  }

  /**
   * Manually retry an operation
   */
  async manualRetry(operationId: string): Promise<void> {
    const retryInfo = this.activeRetries.get(operationId);
    if (!retryInfo || !retryInfo.state.canRetry) {
      throw new Error(`Cannot retry operation ${operationId}`);
    }

    await this.executeRetry(operationId);
  }

  /**
   * Cancel a retry operation
   */
  cancelRetry(operationId: string): void {
    const retryInfo = this.activeRetries.get(operationId);
    if (retryInfo) {
      this.activeRetries.delete(operationId);
      retryInfo.reject(new Error('Retry operation cancelled'));
    }
  }

  /**
   * Get retry state for an operation
   */
  getRetryState(operationId: string): RetryState | null {
    const retryInfo = this.activeRetries.get(operationId);
    return retryInfo ? { ...retryInfo.state } : null;
  }

  /**
   * Get all active retry operations
   */
  getActiveRetries(): string[] {
    return Array.from(this.activeRetries.keys());
  }

  /**
   * Clear all retry operations
   */
  clearAll(): void {
    for (const [, retryInfo] of this.activeRetries) {
      retryInfo.reject(new Error('All retry operations cleared'));
    }
    this.activeRetries.clear();
  }
}

// Global retry manager instance
export const retryManager = new RetryManager();