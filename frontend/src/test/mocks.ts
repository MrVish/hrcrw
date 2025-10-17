import type { User, AuthResponse } from '../types'

export const mockUser: User = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'Maker',
  is_active: true,
}

export const mockAdminUser: User = {
  id: 2,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'Admin',
  is_active: true,
}

export const mockCheckerUser: User = {
  id: 3,
  name: 'Checker User',
  email: 'checker@example.com',
  role: 'Checker',
  is_active: true,
}

export const mockAuthResponse: AuthResponse = {
  access_token: 'mock-token',
  token_type: 'bearer',
  user: mockUser,
}

// Mock localStorage
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock axios
export const mockAxios = {
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  create: vi.fn(() => mockAxios),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}