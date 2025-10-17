import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import { withRetry, retryConfigs, defaultRetryCondition } from '../utils/retry';
import type { 
  User, 
  LoginCredentials, 
  AuthResponse,
  Client,
  ClientFilters,
  ClientListResponse,
  Review,
  ReviewDetail,
  ReviewFormData,
  ReviewFilters,
  ReviewListResponse,
  Exception,
  ExceptionFormData,
  ExceptionFilters,
  ExceptionListResponse,
  UserListResponse,
  Document,
  DocumentUploadRequest,
  DocumentUploadResponse,
  DocumentDownloadRequest,
  DocumentDownloadResponse,
  DocumentListResponse,
  DashboardMetrics,
  Notification
} from '../types';

export class ApiError extends Error {
  public code: string;
  public details?: any;
  public timestamp: string;
  public request_id?: string;

  constructor(code: string, message: string, details?: any, timestamp?: string, request_id?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.timestamp = timestamp || new Date().toISOString();
    this.request_id = request_id;
  }

  static fromAxiosError(error: AxiosError): ApiError {
    if (error.response?.data) {
      const errorData = error.response.data as any;
      
      // Handle FastAPI error format
      if (errorData.detail) {
        // Handle both string and object details
        const detailMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : JSON.stringify(errorData.detail, null, 2);
        
        return new ApiError(
          ApiClient.getErrorCodeFromStatus(error.response.status),
          detailMessage,
          errorData,
          new Date().toISOString()
        );
      }
      
      // Handle custom error format (legacy)
      return new ApiError(
        errorData.error?.code || ApiClient.getErrorCodeFromStatus(error.response.status),
        errorData.error?.message || error.message,
        errorData.error?.details,
        errorData.error?.timestamp,
        errorData.error?.request_id
      );
    }

    // Handle network and timeout errors
    if (error.code === 'ECONNABORTED') {
      return new ApiError(
        'TIMEOUT_ERROR',
        'Request timed out. Please try again.'
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new ApiError(
        'NETWORK_ERROR',
        'Unable to connect to the server. Please check your internet connection.'
      );
    }

    return new ApiError(
      'NETWORK_ERROR',
      error.message || 'Network error occurred'
    );
  }
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
  details: Record<string, any> | null;
}

export interface AuditFilters {
  user_id?: number;
  entity_type?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Handle 401 errors by clearing auth and redirecting to login
        if (error.response?.status === 401) {
          this.handleAuthError();
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }



  private handleAuthError(): void {
    this.clearAuth();
    // Dispatch custom event for auth error
    window.dispatchEvent(new CustomEvent('auth:error'));
  }

  private formatError(error: AxiosError): ApiError {
    return ApiError.fromAxiosError(error);
  }

  static getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 400: return 'VALIDATION_ERROR';
      case 401: return 'AUTHENTICATION_FAILED';
      case 403: return 'AUTHORIZATION_DENIED';
      case 404: return 'RESOURCE_NOT_FOUND';
      case 409: return 'CONFLICT_ERROR';
      case 422: return 'VALIDATION_ERROR';
      case 429: return 'RATE_LIMIT_EXCEEDED';
      case 500: return 'SERVER_ERROR';
      case 502: return 'BAD_GATEWAY';
      case 503: return 'SERVICE_UNAVAILABLE';
      case 504: return 'GATEWAY_TIMEOUT';
      default: return 'UNKNOWN_ERROR';
    }
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  private setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  private clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig = retryConfigs.apiCall
  ): Promise<T> {
    return withRetry(operation, {
      ...retryConfig,
      retryCondition: (error) => {
        // Don't retry authentication errors or validation errors
        if (error.code === 'AUTHENTICATION_FAILED' || 
            error.code === 'AUTHORIZATION_DENIED' ||
            error.code === 'VALIDATION_ERROR') {
          return false;
        }
        return defaultRetryCondition(error);
      }
    });
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await this.client.post<AuthResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, user } = response.data;
    this.setToken(access_token);
    this.setUser(user);

    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearAuth();
    }
  }

  // Dashboard endpoints
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get<DashboardMetrics>('/dashboard/metrics');
      return response.data;
    });
  }

  async getNotifications(): Promise<Notification[]> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get<Notification[]>('/dashboard/notifications');
      return response.data;
    });
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.client.post(`/dashboard/notifications/${notificationId}/read`);
    });
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.client.post('/dashboard/notifications/mark-all-read');
    });
  }

  async dismissNotification(notificationId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.client.delete(`/dashboard/notifications/${notificationId}`);
    });
  }

  // Client management endpoints
  async getClients(filters?: ClientFilters, page = 1, size = 20): Promise<ClientListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.risk_level) params.append('risk_level', filters.risk_level);
    if (filters?.country) params.append('country', filters.country);
    if (filters?.status) params.append('status', filters.status);
    params.append('page', page.toString());
    params.append('per_page', size.toString());

    const response = await this.client.get<ClientListResponse>(`/clients?${params}`);
    return response.data;
  }

  async getClient(clientId: string): Promise<Client> {
    // First get all clients and find the one with matching client_id
    const response = await this.client.get<ClientListResponse>('/clients');
    const client = response.data.clients.find((c: Client) => c.client_id === clientId);
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    return client;
  }

  async getClientReviews(clientId: string): Promise<Review[]> {
    // Use the reviews endpoint with client_id filter
    const response = await this.client.get<ReviewListResponse>(`/reviews?client_id=${clientId}`);
    return response.data.reviews;
  }

  async updateClient(clientId: string, updateData: Partial<Client>): Promise<Client> {
    // First get all clients to find the internal ID
    const response = await this.client.get<ClientListResponse>('/clients');
    const client = response.data.clients.find((c: Client) => c.client_id === clientId);
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    
    // Update using the internal ID
    const updateResponse = await this.client.put<Client>(`/clients/${client.id}`, updateData);
    return updateResponse.data;
  }

  async getClientCountries(): Promise<string[]> {
    // Get unique countries from all clients
    const response = await this.client.get<ClientListResponse>('/clients');
    const countries = [...new Set(response.data.clients.map(client => client.country))];
    return countries.sort();
  }

  // Review management endpoints
  async getReviews(filters?: ReviewFilters, page = 1, size = 20): Promise<ReviewListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.client_risk_level) params.append('client_risk_level', filters.client_risk_level);
    if (filters?.date_range) params.append('date_range', filters.date_range);
    params.append('page', page.toString());
    params.append('per_page', size.toString());

    const response = await this.client.get<ReviewListResponse>(`/reviews?${params}`);
    return response.data;
  }

  async getReview(reviewId: number): Promise<ReviewDetail> {
    const response = await this.client.get<ReviewDetail>(`/reviews/${reviewId}`);
    return response.data;
  }

  async getReviewForChecking(reviewId: number): Promise<ReviewDetail> {
    // For checkers, we need to try multiple approaches to access reviews
    // since they may have different permissions for different review statuses
    
    try {
      // First, try to get all reviews with different status filters
      const statusesToTry = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DRAFT'];
      
      for (const status of statusesToTry) {
        try {
          const reviewsResponse = await this.getReviews({ status: status as any }, 1, 100);
          const review = reviewsResponse.reviews.find(r => r.id === reviewId);
          if (review) {
            return review as ReviewDetail;
          }
        } catch (statusError) {
          // Continue to next status if this one fails
          console.debug(`Failed to get review ${reviewId} with status ${status}:`, statusError);
        }
      }
      
      // If status-specific searches fail, try the general reviews endpoint
      try {
        const allReviewsResponse = await this.getReviews({}, 1, 100);
        const review = allReviewsResponse.reviews.find(r => r.id === reviewId);
        if (review) {
          return review as ReviewDetail;
        }
      } catch (generalError) {
        console.debug('Failed to get review from general endpoint:', generalError);
      }
      
      // If all else fails, try the checking-specific endpoint
      try {
        const checkingReviews = await this.getReviewsForChecking();
        const review = checkingReviews.find(r => r.id === reviewId);
        if (review) {
          return review as ReviewDetail;
        }
      } catch (checkingError) {
        console.debug('Failed to get review from checking endpoint:', checkingError);
      }
      
    } catch (error) {
      console.warn('Could not access review via any available endpoint:', error);
    }
    
    throw new Error(`Review ${reviewId} not accessible. This may be due to insufficient permissions or the review may not exist.`);
  }

  async createReview(reviewData: ReviewFormData): Promise<Review> {
    const response = await this.client.post<Review>('/reviews', reviewData);
    return response.data;
  }

  async updateReview(reviewId: number, reviewData: Partial<ReviewFormData>): Promise<Review> {
    const response = await this.client.patch<Review>(`/reviews/${reviewId}`, reviewData);
    return response.data;
  }

  async submitReview(reviewId: number, comments?: string, exceptions?: any[]): Promise<Review> {
    // Use the exceptions endpoint if exceptions are provided
    if (exceptions && exceptions.length > 0) {
      const response = await this.client.post<Review>(`/reviews/${reviewId}/submit-with-exceptions`, {
        comments: comments || null,
        exceptions: exceptions
      });
      return response.data;
    } else {
      // Use regular submit endpoint if no exceptions
      const response = await this.client.post<Review>(`/reviews/${reviewId}/submit`, {
        comments: comments || null
      });
      return response.data;
    }
  }

  async approveReview(reviewId: number, comments?: string): Promise<Review> {
    const response = await this.client.post<Review>(`/reviews/${reviewId}/approve`, {
      comments,
    });
    return response.data;
  }

  async rejectReview(reviewId: number, comments: string): Promise<Review> {
    const response = await this.client.post<Review>(`/reviews/${reviewId}/reject`, {
      rejection_reason: comments,
      comments,
    });
    return response.data;
  }

  async getReviewsForChecking(status?: string): Promise<Review[]> {
    const params = status ? { status } : {};
    const response = await this.client.get<Review[]>('/reviews/for-checking', { params });
    return response.data;
  }

  // KYC Questionnaire endpoints
  async getKYCQuestionnaire(reviewId: number): Promise<any> {
    const response = await this.client.get(`/reviews/${reviewId}/kyc-questionnaire`);
    return response.data;
  }

  async createKYCQuestionnaire(reviewId: number, questionnaireData: any): Promise<any> {
    const response = await this.client.post(`/reviews/${reviewId}/kyc-questionnaire`, questionnaireData);
    return response.data;
  }

  async updateKYCQuestionnaire(reviewId: number, questionnaireData: any): Promise<any> {
    const response = await this.client.patch(`/reviews/${reviewId}/kyc-questionnaire`, questionnaireData);
    return response.data;
  }

  // Review Exception endpoints
  async getReviewExceptions(reviewId: number): Promise<Exception[]> {
    const response = await this.client.get<Exception[]>(`/reviews/${reviewId}/exceptions`);
    return response.data;
  }

  async createReviewException(reviewId: number, exceptionData: any): Promise<Exception> {
    const response = await this.client.post<Exception>(`/reviews/${reviewId}/exceptions`, exceptionData);
    return response.data;
  }

  async updateExceptionStatus(exceptionId: number, status: string): Promise<Exception> {
    const response = await this.client.put<Exception>(`/exceptions/${exceptionId}/status`, {
      status
    });
    return response.data;
  }

  // Exception management endpoints
  async getExceptions(filters?: ExceptionFilters, page = 1, size = 20): Promise<ExceptionListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to.toString());
    if (filters?.type) params.append('type', filters.type);
    params.append('page', page.toString());
    params.append('per_page', size.toString());

    const response = await this.client.get<ExceptionListResponse>(`/exceptions?${params}`);
    return response.data;
  }

  async getException(exceptionId: number): Promise<Exception> {
    const response = await this.client.get<Exception>(`/exceptions/${exceptionId}`);
    return response.data;
  }

  async createException(exceptionData: ExceptionFormData): Promise<Exception> {
    const response = await this.client.post<Exception>('/exceptions', exceptionData);
    return response.data;
  }

  async updateException(exceptionId: number, exceptionData: Partial<ExceptionFormData>): Promise<Exception> {
    const response = await this.client.patch<Exception>(`/exceptions/${exceptionId}`, exceptionData);
    return response.data;
  }

  async assignException(exceptionId: number, userId: number): Promise<Exception> {
    const response = await this.client.post<Exception>(`/exceptions/${exceptionId}/assign`, {
      assignee_user_id: userId,
    });
    return response.data;
  }

  async resolveException(exceptionId: number, resolutionNotes: string): Promise<Exception> {
    const response = await this.client.post<Exception>(`/exceptions/${exceptionId}/resolve`, {
      resolution_notes: resolutionNotes,
    });
    return response.data;
  }

  async approveException(exceptionId: number, comments?: string): Promise<Exception> {
    const response = await this.client.post<Exception>(`/exceptions/${exceptionId}/approve`, {
      comments,
    });
    return response.data;
  }

  async rejectException(exceptionId: number, rejectionReason: string, comments?: string): Promise<Exception> {
    const response = await this.client.post<Exception>(`/exceptions/${exceptionId}/reject`, {
      rejection_reason: rejectionReason,
      comments,
    });
    return response.data;
  }

  // Document management endpoints
  async getDocuments(reviewId: number): Promise<DocumentListResponse> {
    const response = await this.client.get<DocumentListResponse>(`/documents/review/${reviewId}`);
    return response.data;
  }

  async getDocument(documentId: number): Promise<Document> {
    const response = await this.client.get<Document>(`/documents/${documentId}`);
    return response.data;
  }

  async requestDocumentUpload(uploadRequest: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    const response = await this.client.post<DocumentUploadResponse>('/documents/upload', uploadRequest);
    return response.data;
  }

  async requestDocumentDownload(downloadRequest: DocumentDownloadRequest): Promise<DocumentDownloadResponse> {
    const response = await this.client.post<DocumentDownloadResponse>('/documents/download', downloadRequest);
    return response.data;
  }

  async deleteDocument(documentId: number): Promise<void> {
    await this.client.delete(`/documents/${documentId}`);
  }

  // Audit log endpoints
  async testAuditCors(): Promise<any> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get('/audit/cors-test');
      return response.data;
    });
  }

  async getAuditLogsSimple(page = 1, per_page = 20): Promise<any> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`/audit/logs-simple?page=${page}&per_page=${per_page}`);
      return response.data;
    });
  }

  async getAuditLogsMock(page = 1, per_page = 20): Promise<any> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`/audit/mock-logs?page=${page}&per_page=${per_page}`);
      return response.data;
    });
  }

  async testAuditDb(): Promise<any> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get('/audit/db-test');
      return response.data;
    });
  }

  async getAuditLogs(filters?: AuditFilters, page = 1, per_page = 20): Promise<{ items: AuditLog[], total: number, page: number, per_page: number, total_pages: number }> {
    const params = new URLSearchParams();
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.search) params.append('search', filters.search);
    params.append('page', page.toString());
    params.append('per_page', per_page.toString());

    const response = await this.client.get<{
      audit_logs: AuditLog[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>(`/audit/logs?${params}`);
    
    return {
      items: response.data.audit_logs,
      total: response.data.total,
      page: response.data.page,
      per_page: response.data.per_page,
      total_pages: response.data.total_pages
    };
  }

  async exportAuditLogs(filters?: AuditFilters, format = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.search) params.append('search', filters.search);
    params.append('format', format);

    const response = await this.client.get(`/audit/logs/export?${params}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // User management endpoints (Admin only)
  async getUsers(page = 1, size = 20): Promise<UserListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', size.toString());

    const response = await this.client.get<UserListResponse>(`/users?${params}`);
    return response.data;
  }

  async getUser(userId: number): Promise<User> {
    const response = await this.client.get<User>(`/users/${userId}`);
    return response.data;
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const response = await this.client.post<User>('/users', userData);
    return response.data;
  }

  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    const response = await this.client.patch<User>(`/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: number): Promise<void> {
    await this.client.delete(`/users/${userId}`);
  }

  async activateUser(userId: number): Promise<User> {
    const response = await this.client.patch<User>(`/users/${userId}/activate`);
    return response.data;
  }

  async deactivateUser(userId: number): Promise<User> {
    const response = await this.client.patch<User>(`/users/${userId}/deactivate`);
    return response.data;
  }
  async getAssignableUsers(): Promise<User[]> {
    const response = await this.client.get<User[]>('/users/assignable');
    return response.data;
  }

  async getAssignableUsersForExceptions(): Promise<User[]> {
    const response = await this.client.get<User[]>('/exceptions/assignable-users');
    return response.data;
  }

  async getAssignableUsersList(): Promise<User[]> {
    const response = await this.client.get<User[]>('/users-test/assignable-list');
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
export default apiClient;