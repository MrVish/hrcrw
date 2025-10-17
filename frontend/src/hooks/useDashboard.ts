import { useCallback, useEffect } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { apiClient } from '../services';
import type { DashboardMetrics, Notification } from '../types';

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (frequent updates for dashboard)

export const useDashboard = () => {
  const { state, dispatch } = useAppState();
  const { dashboard } = state;

  const shouldRefetch = useCallback(() => {
    return !dashboard.lastFetch || Date.now() - dashboard.lastFetch > CACHE_DURATION;
  }, [dashboard.lastFetch]);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && !shouldRefetch() && dashboard.metrics) {
      return;
    }

    dispatch({ type: 'DASHBOARD_FETCH_START' });

    try {
      const [metrics, notifications] = await Promise.all([
        apiClient.getDashboardMetrics(),
        apiClient.getNotifications(),
      ]);

      dispatch({
        type: 'DASHBOARD_FETCH_SUCCESS',
        payload: { metrics, notifications },
      });
    } catch (error: any) {
      dispatch({
        type: 'DASHBOARD_FETCH_ERROR',
        payload: error.message || 'Failed to fetch dashboard data',
      });
    }
  }, [shouldRefetch, dashboard.metrics, dispatch]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.markNotificationRead(notificationId);
      
      const updatedNotification = dashboard.notifications.find(n => n.id === notificationId);
      if (updatedNotification) {
        dispatch({
          type: 'DASHBOARD_UPDATE_NOTIFICATION',
          payload: { ...updatedNotification, read: true },
        });
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [dashboard.notifications, dispatch]);

  const clearCache = useCallback(() => {
    dispatch({ type: 'DASHBOARD_CLEAR_CACHE' });
  }, [dispatch]);

  const refreshDashboard = useCallback(() => {
    return fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Auto-fetch on mount and periodically
  useEffect(() => {
    fetchDashboardData();
    
    // Set up periodic refresh for real-time updates
    const interval = setInterval(() => {
      fetchDashboardData();
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return {
    metrics: dashboard.metrics,
    notifications: dashboard.notifications,
    loading: dashboard.loading,
    error: dashboard.error,
    refreshDashboard,
    clearCache,
    markNotificationRead,
  };
};