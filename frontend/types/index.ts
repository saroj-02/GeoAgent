// ===== Auth Types =====

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  phone?: string;
  phone_verified?: boolean;
  is_admin?: boolean;
  location_history_enabled?: boolean;
  location_retention_days?: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

// ===== Device Types =====

export interface Device {
  id: string;
  name: string;
  device_type: "mobile" | "tablet" | "web" | "iot";
  unique_identifier: string;
  is_active: boolean;
  last_seen?: string | null;
  created_at: string;
}

export interface CreateDeviceRequest {
  name: string;
  device_type: string;
  unique_identifier: string;
}

// ===== Location Types =====

export interface LocationPoint {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  created_at: string;
  source: string;
  is_valid: boolean;
}

export interface LocationSubmitRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  source?: string;
}

export interface LocationHistory {
  device_id: string;
  points: LocationPoint[];
  count: number;
  period_start: string;
  period_end: string;
}

// ===== Permission Types =====

export interface LocationPermission {
  id: string;
  device_id: string;
  granted_by_id: string;
  granted_to_id: string;
  can_view_current: boolean;
  can_view_history: boolean;
  can_view_trail: boolean;
  status: string;
  permission_level: string;
  expires_at?: string;
  created_at: string;
}

export interface GrantPermissionRequest {
  device_id: string;
  granted_to_email: string;
  can_view_current?: boolean;
  can_view_history?: boolean;
  can_view_trail?: boolean;
  permission_level?: string;
  expires_at?: string;
}

export interface PermissionList {
  granted_by_me: LocationPermission[];
  granted_to_me: LocationPermission[];
}

// ===== Geofence Types =====

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
  is_active: boolean;
  created_at: string;
}

export interface GeofenceCreateRequest {
  name: string;
  description?: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  alert_on_enter?: boolean;
  alert_on_exit?: boolean;
}

// ===== Map & UI Types =====

export interface MapMarker {
  id: string;
  type: "current" | "history" | "geofence";
  latitude: number;
  longitude: number;
  label?: string;
  color?: string;
  animated?: boolean;
  radius?: number;
}

export interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

// ===== WebSocket Types =====

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export interface LocationUpdateMessage extends WebSocketMessage {
  type: "LOCATION_UPDATED";
  payload: {
    device_id: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp: string;
  };
}

export interface DeviceStatusMessage extends WebSocketMessage {
  type: "DEVICE_ONLINE" | "DEVICE_OFFLINE";
  payload: {
    device_id: string;
  };
}

// ===== Event Feed Types =====

export interface EventLogEntry {
  id: string;
  timestamp: string;
  type: string;
  device_id?: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
}

// ===== AI Agent Types =====

export interface AgentQueryRequest {
  query: string;
  context?: Record<string, unknown>;
}

export interface AgentQueryResponse {
  response: string;
  mode: "openai" | "local" | string;
  user_id: string;
  context: Record<string, unknown>;
}

export interface AgentStatus {
  status: string;
  mode: "openai" | "local" | string;
  model: string;
  message: string;
}