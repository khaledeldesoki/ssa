// DTOs and Data Models matching Guardian Android app

export interface RegisterDeviceRequest {
  deviceId: string;
  deviceName: string;
  brand: string;
  model: string;
  androidVersion: string;
  securityPatch?: string;
  fcmToken?: string;
  permissions?: Record<string, boolean>;
}

export interface UpdateDeviceRequest {
  permissions?: Record<string, boolean>;
  fcmToken?: string;
}

export interface DeviceResponse {
  id: string;
  deviceId: string;
  deviceName: string;
  brand: string;
  model: string;
  androidVersion: string;
  status: string; // 'ONLINE' | 'OFFLINE' | 'ACTIVE'
}

export interface BatteryData {
  level: number;
  isCharging: boolean;
  temperature?: number | null; // Celsius
  voltage?: number | null; // mV
  updatedAt?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  bearing?: number | null;
  provider?: string | null;
  timestamp?: string;
}

export interface AppInfoDto {
  packageName: string;
  appName: string;
  versionName?: string;
  versionCode?: number;
  isSystemApp: boolean;
  isBlocked?: boolean;
}

export interface AppUsageDto {
  packageName: string;
  appName: string;
  usageMs: number;
  date: string; // YYYY-MM-DD
}

export interface NotificationDto {
  id: string;
  packageName: string;
  appName: string;
  title: string | null;
  text: string | null;
  category: string | null;
  timestamp: string;
}

export interface AppApprovalDto {
  id: string;
  deviceId: string;
  packageName: string;
  appName: string;
  installer?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  resolvedAt?: string | null;
}

export interface BrowsingHistoryItem {
  id: string;
  url: string;
  title?: string | null;
  browser?: string | null;
  timestamp: string;
}

export interface CameraCaptureItem {
  id: string;
  cameraType: 'FRONT' | 'BACK';
  base64Image: string;
  timestamp: string;
}

export interface PermissionStatus {
  location: boolean;
  camera: boolean;
  usageStats: boolean;
  notification: boolean;
  notificationAccess: boolean;
  overlay: boolean;
  deviceAdmin: boolean;
  accessibility: boolean;
}

export interface RemoteMessageCommand {
  type: 'MESSAGE' | 'BLOCK';
  message: string;
  password?: string;
}

export interface SocketLogItem {
  id: string;
  event: string;
  payload: any;
  direction: 'INCOMING' | 'OUTGOING';
  timestamp: string;
}

export interface PrivacySettings {
  blockDeveloperExfiltration: boolean;
  userEmail: string;
  customWebhookUrl: string;
  routeToUserOnly: boolean;
  totalBlockedAttempts: number;
  totalRedirectedPackets: number;
  lastDispatchedAt?: string | null;
}

export interface PrivacyAuditEntry {
  id: string;
  action: string;
  dataType: string;
  source: string;
  destination: string;
  timestamp: string;
  status: 'BLOCKED' | 'REDIRECTED_TO_USER' | 'SECURED_LOCAL';
}
