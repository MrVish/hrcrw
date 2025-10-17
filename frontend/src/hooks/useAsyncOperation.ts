import { useState, useCallback } from 'react';
import { useToast, useLoading } from '../contexts/UIContext';
import { useErrorHandler } from '../services/errorHandler';
import { ApiError } from '../services/apiClient';

interface AsyncOperationOptions {
  loadingKey?: string;
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: Error | ApiError) => void;
}

interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | ApiError | null;
}

export function useAsyncOperation<T = any>(
  operation: (...args: any[]) => Promise<T>,
  options: AsyncOperationOptions = {}
) {
  const {
    loadingKey,
    successMessage,
    errorMessage,
    showSuccessToast = false,
    showErrorToast = true,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { showSuccess, showError } = useToast();
  const { startLoading, stopLoading } = useLoading(loadingKey);
  const { handleError } = useErrorHandler();

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      startLoading();

      const result = await operation(...args);

      setState(prev => ({ ...prev, data: result, loading: false }));
      stopLoading();

      // Show success message if configured
      if (showSuccessToast && successMessage) {
        showSuccess('Success', successMessage);
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      const apiError = error as Error | ApiError;
      
      setState(prev => ({ ...prev, error: apiError, loading: false }));
      stopLoading();

      // Handle error with error handler service
      const userFriendlyError = handleError(apiError, {
        component: 'AsyncOperation',
        action: operation.name || 'unknown'
      });

      // Show error toast if configured
      if (showErrorToast) {
        const title = errorMessage || userFriendlyError.title;
        const message = userFriendlyError.message;
        showError(title, message);
      }

      // Call error callback
      if (onError) {
        onError(apiError);
      }

      return null;
    }
  }, [operation, startLoading, stopLoading, showSuccess, showError, handleError, successMessage, errorMessage, showSuccessToast, showErrorToast, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hook for form submissions
export function useFormSubmission<T = any>(
  submitOperation: (data: any) => Promise<T>,
  options: AsyncOperationOptions & {
    resetOnSuccess?: boolean;
  } = {}
) {
  const { resetOnSuccess = false, ...asyncOptions } = options;
  
  const asyncOp = useAsyncOperation(submitOperation, {
    showSuccessToast: true,
    successMessage: 'Operation completed successfully',
    ...asyncOptions,
  });

  const submit = useCallback(async (formData: any) => {
    const result = await asyncOp.execute(formData);
    
    if (result && resetOnSuccess) {
      // Reset form state after successful submission
      setTimeout(() => {
        asyncOp.reset();
      }, 100);
    }
    
    return result;
  }, [asyncOp, resetOnSuccess]);

  return {
    ...asyncOp,
    submit,
  };
}

// Hook for data fetching with loading states
export function useDataFetching<T = any>(
  fetchOperation: (...args: any[]) => Promise<T>,
  options: AsyncOperationOptions = {}
) {
  return useAsyncOperation(fetchOperation, {
    showErrorToast: true,
    showSuccessToast: false,
    ...options,
  });
}

// Hook for delete operations with confirmation
export function useDeleteOperation<T = any>(
  deleteOperation: (id: string | number) => Promise<T>,
  options: AsyncOperationOptions & {
    confirmMessage?: string;
    itemName?: string;
  } = {}
) {
  const { confirmMessage, itemName = 'item', ...asyncOptions } = options;
  
  const asyncOp = useAsyncOperation(deleteOperation, {
    showSuccessToast: true,
    successMessage: `${itemName} deleted successfully`,
    ...asyncOptions,
  });

  const deleteWithConfirmation = useCallback(async (id: string | number) => {
    const message = confirmMessage || `Are you sure you want to delete this ${itemName}?`;
    
    if (window.confirm(message)) {
      return await asyncOp.execute(id);
    }
    
    return null;
  }, [asyncOp, confirmMessage, itemName]);

  return {
    ...asyncOp,
    delete: deleteWithConfirmation,
  };
}

// Hook for batch operations with progress tracking
export function useBatchOperation<T = any>(
  batchOperation: (items: any[]) => Promise<T[]>,
  options: AsyncOperationOptions & {
    onProgress?: (completed: number, total: number) => void;
  } = {}
) {
  const { onProgress, ...asyncOptions } = options;
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const asyncOp = useAsyncOperation(batchOperation, asyncOptions);

  const executeBatch = useCallback(async (items: any[]) => {
    setProgress({ completed: 0, total: items.length });
    
    if (onProgress) {
      onProgress(0, items.length);
    }

    try {
      const results = await asyncOp.execute(items);
      
      setProgress({ completed: items.length, total: items.length });
      
      if (onProgress) {
        onProgress(items.length, items.length);
      }
      
      return results;
    } catch (error) {
      setProgress({ completed: 0, total: 0 });
      throw error;
    }
  }, [asyncOp, onProgress]);

  return {
    ...asyncOp,
    executeBatch,
    progress,
  };
}

export default useAsyncOperation;