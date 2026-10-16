import {
  AuthResponse,
  UserSummary,
  College,
  CollegeSettings,
  Resource,
  SlotAvailability,
  Booking,
  BookingWithQR,
  CheckInResponse,
  MaintenanceBlock,
  NotificationItem,
  AnalyticsReport,
  AuditLogItem,
  ManagerAssignment,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('slotspot_token');
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem('slotspot_token', token);
    } else {
      localStorage.removeItem('slotspot_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback to status text
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<UserSummary> {
    return this.request<UserSummary>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // --- Colleges & Settings ---
  async getColleges(): Promise<College[]> {
    return this.request<College[]>('/colleges');
  }

  async getCollegeSettings(): Promise<CollegeSettings> {
    return this.request<CollegeSettings>('/colleges/settings');
  }

  async updateCollegeSettings(data: Partial<CollegeSettings>): Promise<CollegeSettings> {
    return this.request<CollegeSettings>('/colleges/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Resources ---
  async getResources(params?: {
    type?: string;
    status?: string;
    search?: string;
    assigned_to_me?: boolean;
  }): Promise<Resource[]> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.assigned_to_me) query.append('assigned_to_me', 'true');
    const qs = query.toString();
    return this.request<Resource[]>(`/resources${qs ? `?${qs}` : ''}`);
  }

  async getResource(id: string): Promise<Resource> {
    return this.request<Resource>(`/resources/${id}`);
  }

  async createResource(data: Partial<Resource>): Promise<Resource> {
    return this.request<Resource>('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateResource(id: string, data: Partial<Resource>): Promise<Resource> {
    return this.request<Resource>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteResource(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/resources/${id}`, {
      method: 'DELETE',
    });
  }

  async getAvailability(resourceId: string, date: string): Promise<SlotAvailability[]> {
    return this.request<SlotAvailability[]>(`/resources/${resourceId}/availability?date=${date}`);
  }

  async getResourceManagers(resourceId: string): Promise<ManagerAssignment[]> {
    return this.request<ManagerAssignment[]>(`/resources/${resourceId}/managers`);
  }

  async assignResourceManager(resourceId: string, userId: string): Promise<ManagerAssignment> {
    return this.request<ManagerAssignment>(`/resources/${resourceId}/managers`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async removeResourceManager(resourceId: string, userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/resources/${resourceId}/managers/${userId}`, {
      method: 'DELETE',
    });
  }

  // --- Bookings ---
  async createBooking(data: {
    resource_id: string;
    start_time: string;
    end_time: string;
    notes?: string;
  }): Promise<BookingWithQR> {
    return this.request<BookingWithQR>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBookings(params?: {
    status?: string;
    resource_id?: string;
    scope?: 'upcoming' | 'past' | 'today';
  }): Promise<Booking[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.resource_id) query.append('resource_id', params.resource_id);
    if (params?.scope) query.append('scope', params.scope);
    const qs = query.toString();
    return this.request<Booking[]>(`/bookings${qs ? `?${qs}` : ''}`);
  }

  async getBooking(id: string): Promise<BookingWithQR> {
    return this.request<BookingWithQR>(`/bookings/${id}`);
  }

  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Cancelled by user' }),
    });
  }

  async triggerManualNoShowRelease(graceMinutes?: number): Promise<{ message: string; released_count: number }> {
    const qs = graceMinutes ? `?grace_minutes=${graceMinutes}` : '';
    return this.request<{ message: string; released_count: number }>(`/bookings/manual-release-test${qs}`, {
      method: 'POST',
    });
  }

  // --- Check-in & Equipment ---
  async checkIn(data: { qr_token?: string; lookup_code?: string }): Promise<CheckInResponse> {
    return this.request<CheckInResponse>('/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async equipmentAction(bookingId: string, action: 'ISSUE' | 'RETURN', notes?: string): Promise<Booking> {
    return this.request<Booking>(`/checkin/equipment/${bookingId}`, {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    });
  }

  // --- Maintenance ---
  async getMaintenanceBlocks(resourceId?: string): Promise<MaintenanceBlock[]> {
    const qs = resourceId ? `?resource_id=${resourceId}` : '';
    return this.request<MaintenanceBlock[]>(`/maintenance${qs}`);
  }

  async createMaintenanceBlock(data: {
    resource_id: string;
    start_time: string;
    end_time: string;
    reason: string;
  }): Promise<MaintenanceBlock> {
    return this.request<MaintenanceBlock>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMaintenanceBlock(blockId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/maintenance/${blockId}`, {
      method: 'DELETE',
    });
  }

  // --- Users (Admin) ---
  async getUsers(role?: string): Promise<UserSummary[]> {
    const qs = role ? `?role=${role}` : '';
    return this.request<UserSummary[]>(`/users${qs}`);
  }

  async createUser(data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
  }): Promise<UserSummary> {
    return this.request<UserSummary>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: Partial<UserSummary> & { password?: string }): Promise<UserSummary> {
    return this.request<UserSummary>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Analytics & Audit ---
  async getAnalytics(days: number = 14): Promise<AnalyticsReport> {
    return this.request<AnalyticsReport>(`/analytics/overview?days=${days}`);
  }

  getExportCsvUrl(): string {
    const token = this.getToken();
    return `${API_BASE}/analytics/export${token ? `?token=${token}` : ''}`;
  }

  async downloadCsvReport(): Promise<void> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/analytics/export`, { headers });
    if (!res.ok) throw new Error('Failed to download CSV export');
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slotspot_bookings_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLogItem[]> {
    return this.request<AuditLogItem[]>(`/analytics/audit-logs?limit=${limit}`);
  }

  // --- Notifications ---
  async getNotifications(): Promise<NotificationItem[]> {
    return this.request<NotificationItem[]>('/notifications');
  }

  async markNotificationRead(id: string): Promise<NotificationItem> {
    return this.request<NotificationItem>(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/notifications/read-all', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
