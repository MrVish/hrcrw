import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { apiClient } from '../apiClient';
import type { LoginCredentials, User, Client, Review, Exception } from '../../types';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.dispatchEvent
const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

describe('ApiClient', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should login successfully and store tokens', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse = {
        data: {
          access_token: 'mock-token',
          token_type: 'bearer',
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            role: 'Maker' as const,
            is_active: true,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.login(credentials);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.data.user));
      expect(result).toEqual(mockResponse.data);
    });

    it('should get current user', async () => {
      const mockUser: User = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'Maker',
        is_active: true,
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockUser });

      const result = await apiClient.getCurrentUser();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should logout and clear storage', async () => {
      mockAxiosInstance.post.mockResolvedValue({});

      await apiClient.logout();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('Error Handling', () => {
    it('should format API errors correctly', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
              details: { field: 'email' },
              timestamp: '2024-01-01T00:00:00Z',
              request_id: 'req_123',
            },
          },
        },
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      try {
        await apiClient.getCurrentUser();
      } catch (error: any) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('Invalid input');
        expect(error.details).toEqual({ field: 'email' });
        expect(error.request_id).toBe('req_123');
      }
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get.mockRejectedValue(networkError);

      try {
        await apiClient.getCurrentUser();
      } catch (error: any) {
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.message).toBe('Network Error');
      }
    });

    it('should dispatch auth error event on 401', async () => {
      const authError = {
        response: { status: 401 },
        config: {},
      };

      // Mock the interceptor behavior
      const interceptorCallback = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      try {
        await interceptorCallback(authError);
      } catch (error) {
        expect(dispatchEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'auth:error',
          })
        );
      }
    });
  });

  describe('Client Management', () => {
    it('should fetch clients with filters and pagination', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              client_id: 'CLIENT001',
              name: 'Test Client',
              risk_level: 'High',
              country: 'US',
              status: 'Active',
            },
          ],
          total: 1,
          page: 1,
          size: 20,
          pages: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const filters = {
        search: 'test',
        risk_level: 'High',
        country: 'US',
        status: 'Active',
      };

      const result = await apiClient.getClients(filters, 1, 20);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/clients?search=test&risk_level=High&country=US&status=Active&page=1&size=20')
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should get single client', async () => {
      const mockClient: Client = {
        client_id: 'CLIENT001',
        name: 'Test Client',
        risk_level: 'High',
        country: 'US',
        last_review_date: '2024-01-01',
        status: 'Active',
        review_count: 5,
        pending_reviews: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockClient });

      const result = await apiClient.getClient('CLIENT001');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/clients/CLIENT001');
      expect(result).toEqual(mockClient);
    });
  });

  describe('Review Management', () => {
    it('should create review', async () => {
      const reviewData = {
        client_id: 'CLIENT001',
        risk_assessment: 'High risk due to...',
        compliance_notes: 'Additional notes',
        recommendations: 'Recommend enhanced monitoring',
        documents: [],
      };

      const mockReview: Review = {
        review_id: 1,
        client_id: 'CLIENT001',
        client_name: 'Test Client',
        client_risk_level: 'High',
        status: 'Draft',
        submitted_by: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        risk_assessment: 'High risk due to...',
        compliance_notes: 'Additional notes',
        recommendations: 'Recommend enhanced monitoring',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockReview });

      const result = await apiClient.createReview(reviewData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/reviews', reviewData);
      expect(result).toEqual(mockReview);
    });

    it('should approve review with comments', async () => {
      const mockReview: Review = {
        review_id: 1,
        client_id: 'CLIENT001',
        client_name: 'Test Client',
        client_risk_level: 'High',
        status: 'Approved',
        submitted_by: 'Test User',
        reviewed_by: 'Checker User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        comments: 'Approved with conditions',
      };

      mockAxiosInstance.patch.mockResolvedValue({ data: mockReview });

      const result = await apiClient.approveReview(1, 'Approved with conditions');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/reviews/1/approve', {
        comments: 'Approved with conditions',
      });
      expect(result).toEqual(mockReview);
    });

    it('should reject review with comments', async () => {
      const mockReview: Review = {
        review_id: 1,
        client_id: 'CLIENT001',
        client_name: 'Test Client',
        client_risk_level: 'High',
        status: 'Rejected',
        submitted_by: 'Test User',
        reviewed_by: 'Checker User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        comments: 'Insufficient documentation',
      };

      mockAxiosInstance.patch.mockResolvedValue({ data: mockReview });

      const result = await apiClient.rejectReview(1, 'Insufficient documentation');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/reviews/1/reject', {
        comments: 'Insufficient documentation',
      });
      expect(result).toEqual(mockReview);
    });
  });

  describe('Exception Management', () => {
    it('should create exception', async () => {
      const exceptionData = {
        review_id: 1,
        client_id: 'CLIENT001',
        type: 'Documentation Missing',
        description: 'Required KYC documents are missing',
        priority: 'High' as const,
        assigned_to: 'admin@example.com',
      };

      const mockException: Exception = {
        exception_id: 1,
        review_id: 1,
        client_name: 'Test Client',
        client_id: 'CLIENT001',
        type: 'Documentation Missing',
        description: 'Required KYC documents are missing',
        status: 'Open',
        priority: 'High',
        assigned_to: 'admin@example.com',
        created_by: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockException });

      const result = await apiClient.createException(exceptionData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/exceptions', exceptionData);
      expect(result).toEqual(mockException);
    });

    it('should resolve exception', async () => {
      const mockException: Exception = {
        exception_id: 1,
        review_id: 1,
        client_name: 'Test Client',
        client_id: 'CLIENT001',
        type: 'Documentation Missing',
        description: 'Required KYC documents are missing',
        status: 'Resolved',
        priority: 'High',
        assigned_to: 'admin@example.com',
        created_by: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        resolved_at: '2024-01-02T00:00:00Z',
        resolution_notes: 'Documents provided and verified',
      };

      mockAxiosInstance.patch.mockResolvedValue({ data: mockException });

      const result = await apiClient.resolveException(1, 'Documents provided and verified');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/exceptions/1/resolve', {
        resolution_notes: 'Documents provided and verified',
      });
      expect(result).toEqual(mockException);
    });
  });

  describe('Document Management', () => {
    it('should request document upload', async () => {
      const uploadRequest = {
        review_id: 1,
        filename: 'test-document.pdf',
        content_type: 'application/pdf',
        document_type: 'identity',
        file_size: 1024,
        is_sensitive: true,
      };

      const mockResponse = {
        document_id: 1,
        upload_url: 'https://s3.amazonaws.com/bucket/upload-url',
        upload_fields: { key: 'documents/test-document.pdf' },
        file_key: 'documents/test-document.pdf',
        expires_in: 3600,
        max_file_size: 10485760,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.requestDocumentUpload(uploadRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/documents/upload', uploadRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should request document download', async () => {
      const downloadRequest = {
        document_id: 1,
        expiration: 3600,
      };

      const mockResponse = {
        download_url: 'https://s3.amazonaws.com/bucket/download-url',
        expires_in: 3600,
        filename: 'test-document.pdf',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.requestDocumentDownload(downloadRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/documents/download', downloadRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Dashboard', () => {
    it('should fetch dashboard metrics', async () => {
      const mockMetrics = {
        pendingReviews: 5,
        approvedReviews: 20,
        rejectedReviews: 2,
        openExceptions: 3,
        activeUsers: 10,
        averageReviewTime: 2.5,
        reviewsByStatus: [
          { name: 'Pending', value: 5, color: '#fbbf24' },
          { name: 'Approved', value: 20, color: '#10b981' },
          { name: 'Rejected', value: 2, color: '#ef4444' },
        ],
        reviewsOverTime: [
          { date: '2024-01-01', submitted: 3, approved: 2, rejected: 1 },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockMetrics });

      const result = await apiClient.getDashboardMetrics();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/dashboard/metrics');
      expect(result).toEqual(mockMetrics);
    });

    it('should mark notification as read', async () => {
      mockAxiosInstance.patch.mockResolvedValue({});

      await apiClient.markNotificationRead('notification-123');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/notifications/notification-123/read');
    });
  });

  describe('Audit Logs', () => {
    it('should fetch audit logs with filters', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              audit_id: 1,
              user_id: 1,
              user_name: 'Test User',
              entity_type: 'Review',
              entity_id: '1',
              action: 'CREATE',
              timestamp: '2024-01-01T00:00:00Z',
              details: { review_id: 1 },
            },
          ],
          total: 1,
          page: 1,
          size: 20,
          pages: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const filters = {
        user_id: 1,
        entity_type: 'Review',
        action: 'CREATE',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      const result = await apiClient.getAuditLogs(filters, 1, 20);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/audit/logs?user_id=1&entity_type=Review&action=CREATE&start_date=2024-01-01&end_date=2024-01-31&page=1&size=20')
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should export audit logs', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      mockAxiosInstance.get.mockResolvedValue({ data: mockBlob });

      const filters = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      const result = await apiClient.exportAuditLogs(filters, 'csv');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/audit/logs/export?start_date=2024-01-01&end_date=2024-01-31&format=csv'),
        { responseType: 'blob' }
      );
      expect(result).toEqual(mockBlob);
    });
  });
});