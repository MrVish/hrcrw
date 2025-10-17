import { useCallback, useEffect } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { apiClient } from '../services';
import type { ClientFilters } from '../types';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useClients = () => {
  const { state, dispatch } = useAppState();
  const { clients } = state;

  const shouldRefetch = useCallback(() => {
    return !clients.lastFetch || Date.now() - clients.lastFetch > CACHE_DURATION;
  }, [clients.lastFetch]);

  const fetchClients = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && !shouldRefetch() && clients.items && clients.items.length > 0) {
      return;
    }

    dispatch({ type: 'CLIENTS_FETCH_START' });

    try {
      const response = await apiClient.getClients(
        clients.filters,
        clients.pagination.page,
        clients.pagination.size
      );

      dispatch({
        type: 'CLIENTS_FETCH_SUCCESS',
        payload: {
          items: response.clients,
          total: response.total,
          page: response.page,
          size: response.per_page,
          pages: response.total_pages,
        },
      });
    } catch (error: any) {
      dispatch({
        type: 'CLIENTS_FETCH_ERROR',
        payload: error.message || 'Failed to fetch clients',
      });
    }
  }, [clients.filters, clients.pagination.page, clients.pagination.size, shouldRefetch, clients.items?.length || 0, dispatch]);

  const setFilters = useCallback((filters: Partial<ClientFilters>) => {
    dispatch({ type: 'CLIENTS_SET_FILTERS', payload: filters });
  }, [dispatch]);

  const setPage = useCallback((page: number) => {
    dispatch({ type: 'CLIENTS_SET_PAGE', payload: page });
  }, [dispatch]);

  const clearCache = useCallback(() => {
    dispatch({ type: 'CLIENTS_CLEAR_CACHE' });
  }, [dispatch]);

  const refreshClients = useCallback(() => {
    return fetchClients(true);
  }, [fetchClients]);

  // Auto-fetch when filters or pagination change
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients: clients.items || [],
    total: clients.total,
    loading: clients.loading,
    error: clients.error,
    filters: clients.filters,
    pagination: clients.pagination,
    setFilters,
    setPage,
    refreshClients,
    clearCache,
  };
};