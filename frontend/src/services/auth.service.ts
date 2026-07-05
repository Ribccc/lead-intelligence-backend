import apiClient from '../api/client';
import { User } from '../api/types';

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export class AuthService {
  static async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    
    localStorage.setItem('lead_intelligence_token', response.data.token);
    localStorage.setItem('lead_intelligence_user', JSON.stringify(response.data.user));
    
    return response.data;
  }

  static async register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    
    localStorage.setItem('lead_intelligence_token', response.data.token);
    localStorage.setItem('lead_intelligence_user', JSON.stringify(response.data.user));
    
    return response.data;
  }

  static logout(): void {
    localStorage.removeItem('lead_intelligence_token');
    localStorage.removeItem('lead_intelligence_user');
    localStorage.removeItem('lead_intelligence_workspace_id');
  }

  static getCurrentUser(): User | null {
    const userData = localStorage.getItem('lead_intelligence_user');
    if (!userData) return null;
    try {
      return JSON.parse(userData) as User;
    } catch {
      return null;
    }
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem('lead_intelligence_token');
  }
}
