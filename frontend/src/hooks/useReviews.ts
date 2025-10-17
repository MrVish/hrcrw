import { useCallback, useEffect } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { apiClient } from '../services';
import type { ReviewFilters, Review, ReviewFormData } from '../types';

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes (shorter for more dynamic data)

export const useReviews = () => {
  const { state, dispatch } = useAppState();
  const { reviews } = state;

  const shouldRefetch = useCallback(() => {
    return !reviews.lastFetch || Date.now() - reviews.lastFetch > CACHE_DURATION;
  }, [reviews.lastFetch]);

  const fetchReviews = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && !shouldRefetch() && reviews.items && reviews.items.length > 0) {
      return;
    }

    dispatch({ type: 'REVIEWS_FETCH_START' });

    try {
      const response = await apiClient.getReviews(
        reviews.filters,
        reviews.pagination.page,
        reviews.pagination.size
      );

      dispatch({
        type: 'REVIEWS_FETCH_SUCCESS',
        payload: {
          items: response.reviews,
          total: response.total,
          page: response.page,
          size: response.per_page,
          pages: response.total_pages,
        },
      });
    } catch (error: any) {
      dispatch({
        type: 'REVIEWS_FETCH_ERROR',
        payload: error.message || 'Failed to fetch reviews',
      });
    }
  }, [reviews.filters, reviews.pagination.page, reviews.pagination.size, shouldRefetch, reviews.items.length, dispatch]);

  const createReview = useCallback(async (reviewData: ReviewFormData): Promise<Review> => {
    const newReview = await apiClient.createReview(reviewData);
    dispatch({ type: 'REVIEWS_ADD_ITEM', payload: newReview });
    return newReview;
  }, [dispatch]);

  const updateReview = useCallback(async (reviewId: number, reviewData: Partial<ReviewFormData>): Promise<Review> => {
    const updatedReview = await apiClient.updateReview(reviewId, reviewData);
    dispatch({ type: 'REVIEWS_UPDATE_ITEM', payload: updatedReview });
    return updatedReview;
  }, [dispatch]);

  const submitReview = useCallback(async (reviewId: number): Promise<Review> => {
    const submittedReview = await apiClient.submitReview(reviewId);
    dispatch({ type: 'REVIEWS_UPDATE_ITEM', payload: submittedReview });
    return submittedReview;
  }, [dispatch]);

  const approveReview = useCallback(async (reviewId: number, comments?: string): Promise<Review> => {
    const approvedReview = await apiClient.approveReview(reviewId, comments);
    dispatch({ type: 'REVIEWS_UPDATE_ITEM', payload: approvedReview });
    return approvedReview;
  }, [dispatch]);

  const rejectReview = useCallback(async (reviewId: number, comments: string): Promise<Review> => {
    const rejectedReview = await apiClient.rejectReview(reviewId, comments);
    dispatch({ type: 'REVIEWS_UPDATE_ITEM', payload: rejectedReview });
    return rejectedReview;
  }, [dispatch]);

  const setFilters = useCallback((filters: Partial<ReviewFilters>) => {
    dispatch({ type: 'REVIEWS_SET_FILTERS', payload: filters });
  }, [dispatch]);

  const setPage = useCallback((page: number) => {
    dispatch({ type: 'REVIEWS_SET_PAGE', payload: page });
  }, [dispatch]);

  const clearCache = useCallback(() => {
    dispatch({ type: 'REVIEWS_CLEAR_CACHE' });
  }, [dispatch]);

  const refreshReviews = useCallback(() => {
    return fetchReviews(true);
  }, [fetchReviews]);

  // Auto-fetch when filters or pagination change
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews: reviews.items || [],
    total: reviews.total,
    loading: reviews.loading,
    error: reviews.error,
    filters: reviews.filters,
    pagination: reviews.pagination,
    setFilters,
    setPage,
    refreshReviews,
    clearCache,
    createReview,
    updateReview,
    submitReview,
    approveReview,
    rejectReview,
  };
};