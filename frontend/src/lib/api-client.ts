// API Client for GigStream Backend Integration

// Use Next.js environment variable naming
const API_BASE_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787')
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787');

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || 'An error occurred',
        data.error?.details
      );
    }

    return data;
  }

  // Auth Methods
  async login(email: string, password: string): Promise<{ success: boolean; data: { user: any; token: string } }> {
    return this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(name: string, email: string, password: string, role: 'worker' | 'platform'): Promise<{ success: boolean; data: { user: any; token: string } }> {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, type: role }), // Backend expects 'type' not 'role'
    });
  }

  async logout() {
    return this.request('/api/v1/auth/logout', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request('/api/v1/auth/me');
  }

  async refreshToken() {
    return this.request('/api/v1/auth/refresh', { method: 'POST' });
  }

  // Worker Methods
  async getWorkerBalance(workerId: string) {
    return this.request(`/api/v1/workers/${workerId}/balance`);
  }

  async getWorkerEarnings(workerId: string, period: string = '7days') {
    return this.request(`/api/v1/workers/${workerId}/earnings?period=${period}`);
  }

  async getWorkerReputation(workerId: string) {
    return this.request(`/api/v1/workers/${workerId}/reputation`);
  }

  async getWorkerTasks(workerId: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/api/v1/workers/${workerId}/tasks${query}`);
  }

  async getWorkerTransactions(workerId: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/v1/workers/${workerId}/transactions${query ? `?${query}` : ''}`);
  }

  async checkAdvanceEligibility(workerId: string) {
    return this.request(`/api/v1/workers/${workerId}/advance/eligibility`);
  }

  async requestAdvance(workerId: string, amount: string) {
    return this.request(`/api/v1/workers/${workerId}/advance`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async getActiveLoan(workerId: string) {
    return this.request(`/api/v1/workers/${workerId}/loans/active`);
  }

  async getWorkerLoans(workerId: string) {
    return this.request(`/api/v1/workers/${workerId}/loans`);
  }

  // Demo Methods
  async getDemoWorkers() {
    return this.request('/api/v1/demo/workers');
  }

  async getDemoTasks() {
    return this.request('/api/v1/demo/tasks');
  }

  async getDemoStatus() {
    return this.request('/api/v1/demo/status');
  }

  async completeTaskDemo(workerId: string, amount: number, taskType: 'fixed' | 'streaming' = 'fixed', description?: string) {
    return this.request('/api/v1/demo/complete-task', {
      method: 'POST',
      body: JSON.stringify({ workerId, amount, taskType, description }),
    });
  }

  async resetDemo() {
    return this.request('/api/v1/demo/reset', {
      method: 'POST',
    });
  }

  async getDemoTransactions(workerId?: string, limit: number = 10) {
    const query = new URLSearchParams();
    if (workerId) query.append('workerId', workerId);
    if (limit) query.append('limit', limit.toString());
    return this.request(`/api/v1/demo/transactions?${query.toString()}`);
  }

  // Platform Methods
  async registerPlatform(name: string, webhookUrl: string): Promise<{ success: boolean; data: { platform: any } }> {
    return this.request('/platforms/register', {
      method: 'POST',
      body: JSON.stringify({ name, webhookUrl }),
    });
  }

  async assignTask(apiKey: string, workerId: string, title: string, description: string, amount: number, taskType: string): Promise<{ success: boolean; data: { task: any } }> {
    return this.request('/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ workerId, title, description, amount, taskType }),
    });
  }

  async getPlatformAnalytics(platformId: string, days: number = 30) {
    return this.request(`/api/v1/platforms/${platformId}/analytics?days=${days}`);
  }

  async getPlatformWorkers(platformId: string, params?: { search?: string; status?: string; page?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/v1/platforms/${platformId}/workers${query ? `?${query}` : ''}`);
  }

  async getPlatformTransactions(platformId: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/v1/platforms/${platformId}/transactions${query ? `?${query}` : ''}`);
  }

  // Task Methods
  async completeTask(taskId: string, verificationData?: any) {
    return this.request('/api/v1/tasks/complete', {
      method: 'POST',
      body: JSON.stringify({ taskId, verificationData }),
    });
  }

  async startStream(taskId: string, streamParams: any) {
    return this.request('/api/v1/tasks/start-stream', {
      method: 'POST',
      body: JSON.stringify({ taskId, ...streamParams }),
    });
  }
}

export const apiClient = new APIClient();
