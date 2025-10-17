import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  withRetry, 
  withManualRetry, 
  RetryError,
  retryConfigs,
  retryManager,
  isSessionExpired,
  handleSessionExpiration
} from '../utils/retry';
import type { 
  RetryOptions, 
  RetryState
} from '../utils/retry';
import type { ErrorContext } from '../utils/errorHandling';
import { ApiError } from '../services/apiClient';

/**
 * Hook for automatic retry functionality
 */
export function useAutoRetry() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | ApiError | null>(null);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    setIsRetrying(true);
    setRetryCount(0);
    setLastError(null);

    const enhancedOptions: RetryOptions = {
      ...retryConfigs.apiCall,
      ...options,
      onRetry: (attempt, error) => {
        setRetryCount(attempt);
        setLastError(error);
        options.onRetry?.(attempt, error);
      }
    };

    try {
      const result = await withRetry(operation, enhancedOptions);
      setIsRetrying(false);
      return result;
    } catch (error) {
      setIsRetrying(false);
      setLastError(error as Error | ApiError);
      throw error;
    }
  }, []);

  return {
    executeWithRetry,
    isRetrying,
    retryCount,
    lastError
  };
}

/**
 * Hook for manual retry functionality
 */
export function useManualRetry() {
  const [retryState, setRetryState] = useState<RetryState | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const operationRef = useRef<(() => Promise<any>) | null>(null);
  const optionsRef = useRef<RetryOptions>({});

  const executeWithManualRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T | null> => {
    setIsExecuting(true);
    operationRef.current = operation;
    optionsRef.current = { ...retryConfigs.manualOnly, ...options };

    try {
      const { result, retryState: newRetryState } = await withManualRetry(operation, optionsRef.current);
      setRetryState(newRetryState);
      setIsExecuting(false);
      
      if (result !== undefined) {
        return result;
      }
      
      return null;
    } catch (error) {
      setIsExecuting(false);
      throw error;
    }
  }, []);

  const retry = useCallback(async () => {
    if (!operationRef.current || !retryState?.canRetry) {
      return null;
    }

    setIsExecuting(true);
    
    try {
      const { result, retryState: newRetryState } = await withManualRetry(
        operationRef.current,
        optionsRef.current
      );
      setRetryState(newRetryState);
      setIsExecuting(false);
      return result || null;
    } catch (error) {
      setIsExecuting(false);
      throw error;
    }
  }, [retryState]);

  const reset = useCallback(() => {
    setRetryState(null);
    operationRef.current = null;
    optionsRef.current = {};
  }, []);

  return {
    executeWithManualRetry,
    retry,
    reset,
    retryState,
    isExecuting,
    canRetry: retryState?.canRetry || false
  };
}

/**
 * Hook for managed retry operations with unique IDs
 */
export function useManagedRetry() {
  const [activeRetries, setActiveRetries] = useState<Record<string, RetryState>>({});
  const [isExecuting, setIsExecuting] = useState<Record<string, boolean>>({});

  const executeWithManagedRetry = useCallback(async <T>(
    operationId: string,
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    setIsExecuting(prev => ({ ...prev, [operationId]: true }));

    try {
      const result = await retryManager.registerRetry(operationId, operation, options);
      setIsExecuting(prev => ({ ...prev, [operationId]: false }));
      setActiveRetries(prev => {
        const newState = { ...prev };
        delete newState[operationId];
        return newState;
      });
      return result;
    } catch (error) {
      setIsExecuting(prev => ({ ...prev, [operationId]: false }));
      
      // Update retry state if it's a RetryError with retry info
      if (error instanceof RetryError && error.canRetry()) {
        const retryState = retryManager.getRetryState(operationId);
        if (retryState) {
          setActiveRetries(prev => ({ ...prev, [operationId]: retryState }));
        }
      }
      
      throw error;
    }
  }, []);

  const manualRetry = useCallback(async (operationId: string) => {
    if (!activeRetries[operationId]?.canRetry) {
      throw new Error(`Cannot retry operation ${operationId}`);
    }

    setIsExecuting(prev => ({ ...prev, [operationId]: true }));

    try {
      await retryManager.manualRetry(operationId);
      setIsExecuting(prev => ({ ...prev, [operationId]: false }));
      setActiveRetries(prev => {
        const newState = { ...prev };
        delete newState[operationId];
        return newState;
      });
    } catch (error) {
      setIsExecuting(prev => ({ ...prev, [operationId]: false }));
      throw error;
    }
  }, [activeRetries]);

  const cancelRetry = useCallback((operationId: string) => {
    retryManager.cancelRetry(operationId);
    setActiveRetries(prev => {
      const newState = { ...prev };
      delete newState[operationId];
      return newState;
    });
    setIsExecuting(prev => {
      const newState = { ...prev };
      delete newState[operationId];
      return newState;
    });
  }, []);

  const clearAllRetries = useCallback(() => {
    retryManager.clearAll();
    setActiveRetries({});
    setIsExecuting({});
  }, []);

  // Update active retries state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const activeOperations = retryManager.getActiveRetries();
      const newActiveRetries: Record<string, RetryState> = {};
      
      activeOperations.forEach(operationId => {
        const state = retryManager.getRetryState(operationId);
        if (state) {
          newActiveRetries[operationId] = state;
        }
      });
      
      setActiveRetries(newActiveRetries);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    executeWithManagedRetry,
    manualRetry,
    cancelRetry,
    clearAllRetries,
    activeRetries,
    isExecuting
  };
}

/**
 * Hook for session-aware operations with automatic session handling
 */
export function useSessionAwareRetry() {
  const [sessionExpired, setSessionExpired] = useState(false);
  const [preservedState, setPreservedState] = useState<any>(null);

  const executeWithSessionHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    options: RetryOptions = {}
  ): Promise<T> => {
    const enhancedOptions: RetryOptions = {
      ...retryConfigs.apiCall,
      ...options,
      context,
      onRetry: (attempt, error) => {
        if (isSessionExpired(error)) {
          setSessionExpired(true);
          handleSessionExpiration(context);
        }
        options.onRetry?.(attempt, error);
      }
    };

    try {
      return await withRetry(operation, enhancedOptions);
    } catch (error) {
      if (isSessionExpired(error)) {
        setSessionExpired(true);
        // Preserve current state before redirect
        const currentState = {
          context,
          timestamp: new Date().toISOString(),
          error: (error as Error).message
        };
        setPreservedState(currentState);
        handleSessionExpiration(context);
      }
      throw error;
    }
  }, []);

  const restoreSession = useCallback(() => {
    setSessionExpired(false);
    setPreservedState(null);
  }, []);

  return {
    executeWithSessionHandling,
    restoreSession,
    sessionExpired,
    preservedState
  };
}

/**
 * Hook for network-specific retry operations
 */
export function useNetworkRetry() {
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [pendingOperations, setPendingOperations] = useState<Array<{
    id: string;
    operation: () => Promise<any>;
    options: RetryOptions;
  }>>([]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('online');
      // Retry pending operations when back online
      pendingOperations.forEach(({ id, operation, options }) => {
        retryManager.registerRetry(id, operation, {
          ...retryConfigs.networkOperation,
          ...options
        }).catch((err: unknown) => {
          console.error('Failed to retry pending operation:', err);
        });
      });
      setPendingOperations([]);
    };

    const handleOffline = () => {
      setNetworkStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingOperations]);

  const executeWithNetworkRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    if (networkStatus === 'offline') {
      // Queue operation for when network is back
      const operationId = `network_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setPendingOperations(prev => [...prev, {
        id: operationId,
        operation,
        options
      }]);
      throw new Error('Network is offline. Operation queued for retry when connection is restored.');
    }

    return withRetry(operation, {
      ...retryConfigs.networkOperation,
      ...options
    });
  }, [networkStatus]);

  return {
    executeWithNetworkRetry,
    networkStatus,
    pendingOperationsCount: pendingOperations.length
  };
}

export default useAutoRetry;