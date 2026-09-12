import {
  AppApprovalDto,
  AppInfoDto,
  AppUsageDto,
  BatteryData,
  BrowsingHistoryItem,
  CameraCaptureItem,
  LocationData,
  NotificationDto,
  PermissionStatus,
  PrivacyAuditEntry,
  PrivacySettings,
  SocketLogItem,
} from '../types';

const STORAGE_KEYS = {
  DEVICE_ID: 'guardian_device_id',
  SERVER_DEVICE_ID: 'guardian_server_device_id',
  SERVER_URL: 'guardian_server_url',
  BLOCKED_APPS: 'guardian_blocked_apps',
  ANTI_UNINSTALL: 'guardian_anti_uninstall_enabled',
  PERMISSIONS: 'guardian_permissions',
  BATTERY: 'guardian_battery_data',
  LOCATION: 'guardian_location_data',
  APPS: 'guardian_installed_apps',
  USAGE: 'guardian_usage_stats',
  NOTIFICATIONS: 'guardian_notifications',
  APPROVALS: 'guardian_approvals',
  BROWSING: 'guardian_browsing_history',
  CAPTURES: 'guardian_camera_captures',
  SOCKET_LOGS: 'guardian_socket_logs',
  IS_HIDDEN: 'guardian_app_hidden',
  PRIVACY_SETTINGS: 'guardian_privacy_settings',
  PRIVACY_AUDIT: 'guardian_privacy_audit',
};

// Known third-party developer hosts from SSA/Guardian repository to block
const DEVELOPER_DOMAINS = ['irnhakim.my.id', 'api.irnhakim.my.id', 'irnhakim'];

// Immediate auto-sanitize on load: Purge any previously stored developer URLs
try {
  const existingUrl = localStorage.getItem(STORAGE_KEYS.SERVER_URL);
  if (existingUrl && DEVELOPER_DOMAINS.some((d) => existingUrl.toLowerCase().includes(d))) {
    localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
  }
} catch {}

// Default pre-loaded apps to simulate child's phone
const INITIAL_APPS: AppInfoDto[] = [
  {
    packageName: 'com.zhiliaoapp.musically',
    appName: 'TikTok',
    versionName: '32.5.3',
    versionCode: 320503,
    isSystemApp: false,
    isBlocked: true,
  },
  {
    packageName: 'com.mobile.legends',
    appName: 'Mobile Legends: Bang Bang',
    versionName: '1.8.66',
    versionCode: 1866,
    isSystemApp: false,
    isBlocked: false,
  },
  {
    packageName: 'com.roblox.client',
    appName: 'Roblox',
    versionName: '2.615.541',
    versionCode: 2615541,
    isSystemApp: false,
    isBlocked: false,
  },
  {
    packageName: 'com.whatsapp',
    appName: 'WhatsApp Messenger',
    versionName: '2.24.5.17',
    versionCode: 2405170,
    isSystemApp: false,
    isBlocked: false,
  },
  {
    packageName: 'com.google.android.youtube',
    appName: 'YouTube',
    versionName: '19.09.37',
    versionCode: 190937,
    isSystemApp: true,
    isBlocked: false,
  },
  {
    packageName: 'com.android.chrome',
    appName: 'Google Chrome',
    versionName: '122.0.6261.94',
    versionCode: 6261094,
    isSystemApp: true,
    isBlocked: false,
  },
  {
    packageName: 'com.instagram.android',
    appName: 'Instagram',
    versionName: '318.0.0.30.110',
    versionCode: 31800030,
    isSystemApp: false,
    isBlocked: false,
  },
];

const INITIAL_USAGE: AppUsageDto[] = [
  {
    packageName: 'com.mobile.legends',
    appName: 'Mobile Legends: Bang Bang',
    usageMs: 2 * 3600 * 1000 + 45 * 60 * 1000, // 2h 45m
    date: new Date().toISOString().split('T')[0],
  },
  {
    packageName: 'com.zhiliaoapp.musically',
    appName: 'TikTok',
    usageMs: 1 * 3600 * 1000 + 15 * 60 * 1000, // 1h 15m
    date: new Date().toISOString().split('T')[0],
  },
  {
    packageName: 'com.google.android.youtube',
    appName: 'YouTube',
    usageMs: 52 * 60 * 1000, // 52m
    date: new Date().toISOString().split('T')[0],
  },
  {
    packageName: 'com.roblox.client',
    appName: 'Roblox',
    usageMs: 38 * 60 * 1000, // 38m
    date: new Date().toISOString().split('T')[0],
  },
  {
    packageName: 'com.whatsapp',
    appName: 'WhatsApp Messenger',
    usageMs: 24 * 60 * 1000, // 24m
    date: new Date().toISOString().split('T')[0],
  },
];

const INITIAL_PERMISSIONS: PermissionStatus = {
  location: true,
  camera: true,
  usageStats: true,
  notification: true,
  notificationAccess: true,
  overlay: true,
  deviceAdmin: true,
  accessibility: true,
};

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const guardianStorage = {
  getDeviceId(): string {
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = 'dev-' + generateUUID().slice(0, 8);
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  },

  getServerDeviceId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.SERVER_DEVICE_ID);
  },

  setServerDeviceId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.SERVER_DEVICE_ID, id);
  },

  getServerUrl(): string {
    const raw = localStorage.getItem(STORAGE_KEYS.SERVER_URL);
    const envUrl = (import.meta.env.VITE_API_BASE_URL as string) || '';
    const candidate = raw !== null ? raw : envUrl;

    // Check if candidate matches any blocked developer domain
    if (this.isDeveloperHost(candidate)) {
      this.recordBlockedDeveloperAttempt('ENDPOINT_BLOCKED', candidate);
      localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
      return '';
    }

    return candidate;
  },

  setServerUrl(url: string): void {
    if (this.isDeveloperHost(url)) {
      this.recordBlockedDeveloperAttempt('USER_ATTEMPT_TO_SET_DEV_URL', url);
      localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
      return;
    }
    localStorage.setItem(STORAGE_KEYS.SERVER_URL, url);
  },

  isDeveloperHost(url?: string | null): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return DEVELOPER_DOMAINS.some((d) => lower.includes(d));
  },

  getPermissions(): PermissionStatus {
    const raw = localStorage.getItem(STORAGE_KEYS.PERMISSIONS);
    if (!raw) return INITIAL_PERMISSIONS;
    try {
      return { ...INITIAL_PERMISSIONS, ...JSON.parse(raw) };
    } catch {
      return INITIAL_PERMISSIONS;
    }
  },

  setPermissions(perms: PermissionStatus): void {
    localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(perms));
  },

  updateSinglePermission(key: keyof PermissionStatus, value: boolean): PermissionStatus {
    const current = this.getPermissions();
    const updated = { ...current, [key]: value };
    this.setPermissions(updated);
    return updated;
  },

  getBlockedApps(): Set<string> {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOCKED_APPS);
    if (!raw) {
      // Default: TikTok is blocked initially to demonstrate AppBlockActivity
      return new Set(['com.zhiliaoapp.musically']);
    }
    try {
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set(['com.zhiliaoapp.musically']);
    }
  },

  setBlockedApps(packages: Set<string>): void {
    localStorage.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(Array.from(packages)));
  },

  addBlockedApp(packageName: string): void {
    const current = this.getBlockedApps();
    current.add(packageName);
    this.setBlockedApps(current);
  },

  removeBlockedApp(packageName: string): void {
    const current = this.getBlockedApps();
    current.delete(packageName);
    this.setBlockedApps(current);
  },

  isAntiUninstallEnabled(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.ANTI_UNINSTALL);
    return val !== null ? val === 'true' : true;
  },

  setAntiUninstallEnabled(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEYS.ANTI_UNINSTALL, String(enabled));
  },

  isAppHidden(): boolean {
    return localStorage.getItem(STORAGE_KEYS.IS_HIDDEN) === 'true';
  },

  setAppHidden(hidden: boolean): void {
    localStorage.setItem(STORAGE_KEYS.IS_HIDDEN, String(hidden));
  },

  getBattery(): BatteryData {
    const raw = localStorage.getItem(STORAGE_KEYS.BATTERY);
    if (!raw) {
      return {
        level: 84,
        isCharging: false,
        temperature: 32.4,
        voltage: 4120,
        updatedAt: new Date().toLocaleTimeString(),
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { level: 84, isCharging: false };
    }
  },

  setBattery(battery: BatteryData): void {
    localStorage.setItem(
      STORAGE_KEYS.BATTERY,
      JSON.stringify({ ...battery, updatedAt: new Date().toLocaleTimeString() })
    );
  },

  getLocation(): LocationData {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCATION);
    if (!raw) {
      return {
        latitude: -6.2088,
        longitude: 106.8456,
        accuracy: 12.5,
        altitude: 25.0,
        speed: 0.0,
        bearing: 145.0,
        provider: 'gps',
        timestamp: new Date().toLocaleTimeString(),
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { latitude: -6.2088, longitude: 106.8456 };
    }
  },

  setLocation(loc: LocationData): void {
    localStorage.setItem(
      STORAGE_KEYS.LOCATION,
      JSON.stringify({ ...loc, timestamp: new Date().toLocaleTimeString() })
    );
  },

  getApps(): AppInfoDto[] {
    const raw = localStorage.getItem(STORAGE_KEYS.APPS);
    const blocked = this.getBlockedApps();
    if (!raw) {
      return INITIAL_APPS.map((app) => ({
        ...app,
        isBlocked: blocked.has(app.packageName),
      }));
    }
    try {
      const list: AppInfoDto[] = JSON.parse(raw);
      return list.map((app) => ({
        ...app,
        isBlocked: blocked.has(app.packageName),
      }));
    } catch {
      return INITIAL_APPS;
    }
  },

  setApps(apps: AppInfoDto[]): void {
    localStorage.setItem(STORAGE_KEYS.APPS, JSON.stringify(apps));
  },

  getUsage(): AppUsageDto[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USAGE);
    if (!raw) return INITIAL_USAGE;
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USAGE;
    }
  },

  setUsage(usage: AppUsageDto[]): void {
    localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(usage));
  },

  getNotifications(): NotificationDto[] {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      return [
        {
          id: 'notif-1',
          packageName: 'com.whatsapp',
          appName: 'WhatsApp',
          title: 'Mom ❤️',
          text: 'Don’t forget to finish your math homework before dinner!',
          category: 'msg',
          timestamp: '10 mins ago',
        },
        {
          id: 'notif-2',
          packageName: 'com.google.android.youtube',
          appName: 'YouTube',
          title: 'National Geographic',
          text: 'New video: Mysteries of the Deep Ocean',
          category: 'recommendation',
          timestamp: '35 mins ago',
        },
      ];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addNotification(notif: Omit<NotificationDto, 'id'>): void {
    const current = this.getNotifications();
    const item: NotificationDto = {
      ...notif,
      id: 'notif-' + Date.now(),
    };
    current.unshift(item);
    if (current.length > 50) current.pop();
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(current));
  },

  getApprovals(): AppApprovalDto[] {
    const raw = localStorage.getItem(STORAGE_KEYS.APPROVALS);
    if (!raw) {
      return [
        {
          id: 'appr-1',
          deviceId: this.getDeviceId(),
          packageName: 'com.zhiliaoapp.musically',
          appName: 'TikTok',
          installer: 'com.android.vending',
          status: 'PENDING',
          requestedAt: new Date(Date.now() - 3600000).toLocaleString(),
        },
      ];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  setApprovals(approvals: AppApprovalDto[]): void {
    localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(approvals));
  },

  addApproval(packageName: string, appName: string): AppApprovalDto {
    const approvals = this.getApprovals();
    const newApproval: AppApprovalDto = {
      id: 'appr-' + Date.now(),
      deviceId: this.getDeviceId(),
      packageName,
      appName,
      installer: 'com.android.packageinstaller',
      status: 'PENDING',
      requestedAt: new Date().toLocaleString(),
    };
    approvals.unshift(newApproval);
    this.setApprovals(approvals);
    return newApproval;
  },

  resolveApproval(id: string, status: 'APPROVED' | 'REJECTED'): AppApprovalDto | null {
    const approvals = this.getApprovals();
    const target = approvals.find((a) => a.id === id);
    if (target) {
      target.status = status;
      target.resolvedAt = new Date().toLocaleString();
      if (status === 'APPROVED') {
        this.removeBlockedApp(target.packageName);
      } else {
        this.addBlockedApp(target.packageName);
      }
      this.setApprovals(approvals);
      return target;
    }
    return null;
  },

  getBrowsingHistory(): BrowsingHistoryItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BROWSING);
    if (!raw) {
      return [
        {
          id: 'hist-1',
          url: 'https://en.wikipedia.org/wiki/Solar_System',
          title: 'Solar System - Wikipedia',
          browser: 'com.android.chrome',
          timestamp: '20 mins ago',
        },
        {
          id: 'hist-2',
          url: 'https://scratch.mit.edu/projects/explore',
          title: 'Scratch Studio - Kids Programming',
          browser: 'com.android.chrome',
          timestamp: '1 hour ago',
        },
      ];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addBrowsingHistory(url: string, title?: string, browser = 'com.android.chrome'): void {
    const current = this.getBrowsingHistory();
    current.unshift({
      id: 'hist-' + Date.now(),
      url,
      title: title || url,
      browser,
      timestamp: 'Just now',
    });
    if (current.length > 50) current.pop();
    localStorage.setItem(STORAGE_KEYS.BROWSING, JSON.stringify(current));
  },

  getCaptures(): CameraCaptureItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CAPTURES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addCapture(cameraType: 'FRONT' | 'BACK', base64Image: string): void {
    const current = this.getCaptures();
    current.unshift({
      id: 'cap-' + Date.now(),
      cameraType,
      base64Image,
      timestamp: new Date().toLocaleString(),
    });
    if (current.length > 20) current.pop();
    localStorage.setItem(STORAGE_KEYS.CAPTURES, JSON.stringify(current));
  },

  getSocketLogs(): SocketLogItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SOCKET_LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addSocketLog(
    event: string,
    payload: any,
    direction: 'INCOMING' | 'OUTGOING' = 'INCOMING'
  ): void {
    const logs = this.getSocketLogs();
    logs.unshift({
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      event,
      payload,
      direction,
      timestamp: new Date().toLocaleTimeString(),
    });
    if (logs.length > 40) logs.pop();
    localStorage.setItem(STORAGE_KEYS.SOCKET_LOGS, JSON.stringify(logs));
  },

  // Privacy & Data Routing Management (Guarantees data sent to user only)
  getPrivacySettings(): PrivacySettings {
    const raw = localStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS);
    const defaultEmail =
      (import.meta.env.VITE_USER_EMAIL as string) || 'hackingforbug1@gmail.com';
    const initial: PrivacySettings = {
      blockDeveloperExfiltration: true,
      userEmail: defaultEmail,
      customWebhookUrl: '',
      routeToUserOnly: true,
      totalBlockedAttempts: 0,
      totalRedirectedPackets: 0,
      lastDispatchedAt: null,
    };
    if (!raw) return initial;
    try {
      return { ...initial, ...JSON.parse(raw) };
    } catch {
      return initial;
    }
  },

  setPrivacySettings(settings: PrivacySettings): void {
    localStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(settings));
  },

  updatePrivacySettings(patch: Partial<PrivacySettings>): PrivacySettings {
    const current = this.getPrivacySettings();
    const updated = { ...current, ...patch };
    this.setPrivacySettings(updated);
    return updated;
  },

  getPrivacyAudit(): PrivacyAuditEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRIVACY_AUDIT);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addPrivacyAudit(entry: Omit<PrivacyAuditEntry, 'id' | 'timestamp'>): void {
    const list = this.getPrivacyAudit();
    list.unshift({
      id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString(),
      ...entry,
    });
    if (list.length > 50) list.pop();
    localStorage.setItem(STORAGE_KEYS.PRIVACY_AUDIT, JSON.stringify(list));
  },

  recordBlockedDeveloperAttempt(action: string, attemptedUrl: string): void {
    const settings = this.getPrivacySettings();
    settings.totalBlockedAttempts += 1;
    this.setPrivacySettings(settings);

    this.addPrivacyAudit({
      action: `Blocked Outbound Leak: ${action}`,
      dataType: 'Network Request',
      source: 'Child Device Telemetry',
      destination: attemptedUrl || 'api.irnhakim.my.id (Developer Server)',
      status: 'BLOCKED',
    });

    this.addSocketLog(
      'privacy_shield:blocked_developer_leak',
      { attemptedDestination: attemptedUrl, protection: 'ENFORCED' },
      'INCOMING'
    );
  },

  recordRedirectToUser(dataType: string, destination: string): void {
    const settings = this.getPrivacySettings();
    settings.totalRedirectedPackets += 1;
    this.setPrivacySettings(settings);

    this.addPrivacyAudit({
      action: `Telemetry Redirected to User: ${dataType}`,
      dataType,
      source: 'Child Device Agent',
      destination,
      status: 'REDIRECTED_TO_USER',
    });
  },

  exportAllUserData(): Record<string, any> {
    const userEmail = this.getPrivacySettings().userEmail;
    return {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        ownerEmail: userEmail,
        deviceId: this.getDeviceId(),
        privacyStatus: 'Developer Exfiltration Blocked - Secured to User Only',
        version: '1.0.0',
      },
      telemetry: {
        battery: this.getBattery(),
        location: this.getLocation(),
        permissions: this.getPermissions(),
      },
      monitoring: {
        installedApps: this.getApps(),
        screenTimeUsage: this.getUsage(),
        approvals: this.getApprovals(),
        browsingHistory: this.getBrowsingHistory(),
        notifications: this.getNotifications(),
        cameraSnapshotsCount: this.getCaptures().length,
        cameraCaptures: this.getCaptures(),
      },
      security: {
        antiUninstall: this.isAntiUninstallEnabled(),
        appHidden: this.isAppHidden(),
        privacyAuditLogs: this.getPrivacyAudit(),
        socketEvents: this.getSocketLogs(),
      },
    };
  },

  clear(): void {
    localStorage.clear();
  },
};
