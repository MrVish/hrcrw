import { useCallback, useEffect } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { apiClient } from '../services';
import type { ExceptionFilters, Exception, ExceptionFormData } from '../types';

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

export const useExceptions = () => {
  const { state, dispatch } = useAppState();
  const { exceptions } = state;

  const shouldRefetch = useCallback(() => {
    return !exceptions.lastFetch || Date.now() - exceptions.lastFetch > CACHE_DURATION;
  }, [exceptions.lastFetch]);

  const fetchExceptions = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && !shouldRefetch() && exceptions.items && exceptions.items.length > 0) {
      return;
    }

    dispatch({ type: 'EXCEPTIONS_FETCH_START' });

    try {
      const response = await apiClient.getExceptions(
        exceptions.filters,
        exceptions.pagination.page,
        exceptions.pagination.size
      );

      dispatch({
        type: 'EXCEPTIONS_FETCH_SUCCESS',
        payload: {
          items: response.exceptions,
          total: response.total,
          page: response.page,
          size: response.per_page,
          pages: response.total_pages,
        },
      });
    } catch (error: any) {
      dispatch({
        type: 'EXCEPTIONS_FETCH_ERROR',
        payload: error.message || 'Failed to fetch exceptions',
      });
    }
  }, [exceptions.filters, exceptions.pagination.page, exceptions.pagination.size, shouldRefetch, exceptions.items?.length || 0, dispatch]);

  const createException = useCallback(async (exceptionData: ExceptionFormData): Promise<Exception> => {
    const newException = await apiClient.createException(exceptionData);
    dispatch({ type: 'EXCEPTIONS_ADD_ITEM', payload: newException });
    return newException;
  }, [dispatch]);

  const updateException = useCallback(async (exceptionId: number, exceptionData: Partial<ExceptionFormData>): Promise<Exception> => {
    const updatedException = await apiClient.updateException(exceptionId, exceptionData);
    dispatch({ type: 'EXCEPTIONS_UPDATE_ITEM', payload: updatedException });
    return updatedException;
  }, [dispatch]);

  const assignException = useCallback(async (exceptionId: number, userId: number): Promise<Exception> => {
    const assignedException = await apiClient.assignException(exceptionId, userId);
    dispatch({ type: 'EXCEPTIONS_UPDATE_ITEM', payload: assignedException });
    return assignedException;
  }, [dispatch]);

  const resolveException = useCallback(async (exceptionId: number, resolutionNotes: string): Promise<Exception> => {
    const resolvedException = await apiClient.resolveException(exceptionId, resolutionNotes);
    dispatch({ type: 'EXCEPTIONS_UPDATE_ITEM', payload: resolvedException });
    return resolvedException;
  }, [dispatch]);

  const setFilters = useCallback((filters: Partial<ExceptionFilters>) => {
    dispatch({ type: 'EXCEPTIONS_SET_FILTERS', payload: filters });
  }, [dispatch]);

  const setPage = useCallback((page: number) => {
    dispatch({ type: 'EXCEPTIONS_SET_PAGE', payload: page });
  }, [dispatch]);

  const clearCache = useCallback(() => {
    dispatch({ type: 'EXCEPTIONS_CLEAR_CACHE' });
  }, [dispatch]);

  const refreshExceptions = useCallback(() => {
    return fetchExceptions(true);
  }, [fetchExceptions]);

  // Auto-fetch when filters or pagination change
  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  return {
    exceptions: exceptions.items || [],
    total: exceptions.total,
    loading: exceptions.loading,
    error: exceptions.error,
    filters: exceptions.filters,
    pagination: exceptions.pagination,
    setFilters,
    setPage,
    refreshExceptions,
    clearCache,
    createException,
    updateException,
    assignException,
    resolveException,
  };
};