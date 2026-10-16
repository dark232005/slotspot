export type UserRole = 'STUDENT' | 'RESOURCE_MANAGER' | 'COLLEGE_ADMIN';

export type ResourceType = 'PROJECT_ROOM' | 'DISCUSSION_ROOM' | 'EQUIPMENT';

export type ResourceStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export type BookingStatus =
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'EXPIRED';

export interface UserSummary {
  id: string;
  college_id: string;
  college_name?: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserSummary;
}

export interface CollegeSettings {
  id: string;
  college_id: string;
  no_show_grace_minutes: number;
  operating_start_time: string;
  operating_end_time: string;
  max_booking_duration_minutes: number;
  max_advance_booking_days: number;
  updated_at: string;
}

export interface College {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  created_at: string;
  settings?: CollegeSettings;
}

export interface Resource {
  id: string;
  college_id: string;
  name: string;
  type: ResourceType;
  description: string;
  location: string;
  capacity?: number;
  operating_start_time: string;
  operating_end_time: string;
  max_booking_duration_minutes: number;
  slot_granularity_minutes: number;
  status: ResourceStatus;
  image_url?: string;
  created_at: string;
  active_maintenance?: boolean;
}

export interface SlotAvailability {
  start_time: string;
  end_time: string;
  is_available: boolean;
  status_label: 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE' | 'PAST' | 'CLOSED';
}

export interface Booking {
  id: string;
  college_id: string;
  resource_id: string;
  resource_name?: string;
  resource_type?: ResourceType;
  resource_location?: string;
  student_id: string;
  student_name?: string;
  student_email?: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  qr_lookup_code: string;
  check_in_time?: string;
  cancellation_time?: string;
  cancellation_reason?: string;
  no_show_time?: string;
  equipment_issued_at?: string;
  equipment_returned_at?: string;
  notes?: string;
  created_at: string;
}

export interface BookingWithQR extends Booking {
  qr_token?: string;
  qr_code_image_base64?: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  booking?: Booking;
}

export interface MaintenanceBlock {
  id: string;
  college_id: string;
  resource_id: string;
  resource_name?: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_by_user_id?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  college_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsOverview {
  total_resources: number;
  active_resources: number;
  today_bookings: number;
  upcoming_bookings: number;
  completed_bookings: number;
  cancellation_rate_percentage: number;
  no_show_rate_percentage: number;
  average_booking_duration_minutes: number;
  total_booking_count: number;
}

export interface DailyUtilization {
  date_str: string;
  available_operating_minutes: number;
  reserved_minutes: number;
  utilization_percentage: number;
}

export interface ResourcePopularity {
  resource_id: string;
  resource_name: string;
  resource_type: string;
  booking_count: number;
  total_reserved_minutes: number;
}

export interface PeakPeriod {
  hour: number;
  hour_label: string;
  booking_count: number;
}

export interface AnalyticsReport {
  overview: AnalyticsOverview;
  daily_utilization: DailyUtilization[];
  top_resources: ResourcePopularity[];
  peak_periods: PeakPeriod[];
}

export interface AuditLogItem {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  user_id?: string;
  user_name?: string;
  details: string;
  created_at: string;
}

export interface ManagerAssignment {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
}
