import { useCallback, useEffect } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { apiClient } from '../services';
import type { User } from '../types';

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (less frequent updates for user data)

export const useUsers = () => {
  const { state, dispatch } = useAppState();
  const { users } = state;

  const shouldRefetch = useCallback(() => {
    return !users.lastFetch || Date.now() - users.lastFetch > CACHE_DURATION;
  }, [users.lastFetch]);

  const fetchUsers = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && !shouldRefetch() && users.items && users.items.length > 0) {
      return;
    }

    dispatch({ type: 'USERS_FETCH_START' });

    try {
      const response = await apiClient.getUsers(
        users.pagination.page,
        users.pagination.size
      );

      dispatch({
        type: 'USERS_FETCH_SUCCESS',
        payload: {
          items: response.users,
          total: response.total,
          page: response.page,
          size: response.per_page,
          pages: response.total_pages,
        },
      });
    } catch (error: any) {
      dispatch({
        type: 'USERS_FETCH_ERROR',
        payload: error.message || 'Failed to fetch users',
      });
    }
  }, [users.pagination.page, users.pagination.size, shouldRefetch, users.items?.length || 0, dispatch]);

  const createUser = useCallback(async (userData: Omit<User, 'id'>): Promise<User> => {
    const newUser = await apiClient.createUser(userData);
    dispatch({ type: 'USERS_ADD_ITEM', payload: newUser });
    return newUser;
  }, [dispatch]);

  const updateUser = useCallback(async (userId: number, userData: Partial<User>): Promise<User> => {
    const updatedUser = await apiClient.updateUser(userId, userData);
    dispatch({ type: 'USERS_UPDATE_ITEM', payload: updatedUser });
    return updatedUser;
  }, [dispatch]);

  const deleteUser = useCallback(async (userId: number): Promise<void> => {
    await apiClient.deleteUser(userId);
    dispatch({ type: 'USERS_REMOVE_ITEM', payload: userId });
  }, [dispatch]);

  const activateUser = useCallback(async (userId: number): Promise<User> => {
    const activatedUser = await apiClient.activateUser(userId);
    dispatch({ type: 'USERS_UPDATE_ITEM', payload: activatedUser });
    return activatedUser;
  }, [dispatch]);

  const deactivateUser = useCallback(async (userId: number): Promise<User> => {
    const deactivatedUser = await apiClient.deactivateUser(userId);
    dispatch({ type: 'USERS_UPDATE_ITEM', payload: deactivatedUser });
    return deactivatedUser;
  }, [dispatch]);

  const setPage = useCallback((page: number) => {
    dispatch({ type: 'USERS_SET_PAGE', payload: page });
  }, [dispatch]);

  const clearCache = useCallback(() => {
    dispatch({ type: 'USERS_CLEAR_CACHE' });
  }, [dispatch]);

  const refreshUsers = useCallback(() => {
    return fetchUsers(true);
  }, [fetchUsers]);

  // Auto-fetch when pagination changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users: users.items || [],
    total: users.total,
    loading: users.loading,
    error: users.error,
    pagination: users.pagination,
    setPage,
    refreshUsers,
    clearCache,
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
  };
};