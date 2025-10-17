import { apiClient } from './apiClient';
import type { LoginCredentials, AuthResponse, User } from '../types';

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return await apiClient.login(credentials);
  }

  static async getCurrentUser(): Promise<User> {
    return await apiClient.getCurrentUser();
  }

  static setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  static getToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    return token;
  }

  static setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      return null;
    }
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      // If JSON parsing fails, clear the invalid data and return null
      localStorage.removeItem('user');
      return null;
    }
  }

  static clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  static cleanupInvalidAuth(): void {
    // Clean up any invalid localStorage data
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token === 'undefined' || token === 'null') {
      localStorage.removeItem('token');
    }
    
    if (user === 'undefined' || user === 'null') {
      localStorage.removeItem('user');
    }
  }
}