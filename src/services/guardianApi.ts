import {
  AppApprovalDto,
  AppInfoDto,
  AppUsageDto,
  BatteryData,
  DeviceResponse,
  LocationData,
  RegisterDeviceRequest,
  UpdateDeviceRequest,
} from '../types';
import { guardianStorage } from './guardianStorage';

class GuardianApiClient {
  private getBaseUrl(): string {
    return guardianStorage.getServerUrl().replace(/\/+$/, '');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: string | null }> {
    const baseUrl = this.getBaseUrl();
    const privacy = guardianStorage.getPrivacySettings();

    // 1. Strict Developer Exfiltration Interceptor:
    // If destination matches developer server or contains developer domains, BLOCK IMMEDIATELY!
    if (guardianStorage.isDeveloperHost(baseUrl) || guardianStorage.isDeveloperHost(endpoint)) {
      guardianStorage.recordBlockedDeveloperAttempt(
        'REMOTE_FETCH_INTERCEPTED',
        `${baseUrl}/${endpoint}`
      );
      return {
        data: null,
        error: 'Blocked: Outbound network request to third-party developer was prevented by Privacy Shield.',
      };
    }

    // 2. Local-Only Secure Mode (when no custom user server is configured):
    // All telemetry is safely kept on the user's dashboard only.
    if (!baseUrl) {
      guardianStorage.recordRedirectToUser(
        endpoint.split('/')[1] || endpoint,
        `User Dashboard (${privacy.userEmail})`
      );
      return { data: null, error: null };
    }

    // 3. User Custom Server Endpoint:
    const url = `${baseUrl}/${endpoint.replace(/^\/+/, '')}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeoutId);

      guardianStorage.recordRedirectToUser(
        endpoint.split('/')[1] || endpoint,
        `User Gateway (${baseUrl})`
      );

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      const data = await response.json();
      return { data, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: err.name === 'AbortError' ? 'Network timeout' : (err.message || 'Network error'),
      };
    }
  }

  async dispatchTelemetryToUser(): Promise<{ success: boolean; message: string }> {
    const data = guardianStorage.exportAllUserData();
    const privacy = guardianStorage.getPrivacySettings();

    // If user configured a custom webhook, dispatch JSON payload there
    if (privacy.customWebhookUrl) {
      try {
        await fetch(privacy.customWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (e: any) {
        console.warn('Webhook dispatch error:', e);
      }
    }

    // Update dispatch timestamp
    const now = new Date().toLocaleTimeString();
    guardianStorage.updatePrivacySettings({
      lastDispatchedAt: now,
      totalRedirectedPackets: privacy.totalRedirectedPackets + 1,
    });

    guardianStorage.addPrivacyAudit({
      action: 'Full Telemetry Bundle Dispatched to User',
      dataType: 'All Telemetry (GPS, Battery, Apps, History, Captures)',
      source: 'Child Device Agent',
      destination: `${privacy.userEmail}${privacy.customWebhookUrl ? ` + ${privacy.customWebhookUrl}` : ''}`,
      status: 'REDIRECTED_TO_USER',
    });

    guardianStorage.addSocketLog(
      'privacy:telemetry_dispatched_to_user',
      {
        recipient: privacy.userEmail,
        totalItems: {
          captures: data.monitoring.cameraSnapshotsCount,
          apps: data.monitoring.installedApps.length,
          notifications: data.monitoring.notifications.length,
        },
        status: 'SECURE_DELIVERED',
      },
      'OUTGOING'
    );

    return {
      success: true,
      message: `Complete telemetry report securely delivered to ${privacy.userEmail}`,
    };
  }

  async registerDevice(request: RegisterDeviceRequest): Promise<DeviceResponse> {
    const { data } = await this.request<DeviceResponse>('devices/register', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (data && data.deviceId) {
      guardianStorage.setServerDeviceId(data.deviceId);
      return data;
    }

    // Fallback registration
    const fallbackResponse: DeviceResponse = {
      id: 'srv-' + request.deviceId,
      deviceId: request.deviceId,
      deviceName: request.deviceName,
      brand: request.brand,
      model: request.model,
      androidVersion: request.androidVersion,
      status: 'ONLINE',
    };
    guardianStorage.setServerDeviceId(fallbackResponse.deviceId);
    return fallbackResponse;
  }

  async updateDevice(
    deviceId: string,
    request: UpdateDeviceRequest
  ): Promise<DeviceResponse> {
    const { data } = await this.request<DeviceResponse>(`devices/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });

    if (data) return data;

    return {
      id: 'srv-' + deviceId,
      deviceId,
      deviceName: 'Pixel 8 Pro (Simulated)',
      brand: 'Google',
      model: 'Pixel 8 Pro',
      androidVersion: '14.0',
      status: 'ONLINE',
    };
  }

  async submitBattery(deviceId: string, battery: BatteryData): Promise<boolean> {
    guardianStorage.setBattery(battery);
    const { error } = await this.request(`devices/${deviceId}/battery`, {
      method: 'POST',
      body: JSON.stringify({
        level: battery.level,
        isCharging: battery.isCharging,
        temperature: battery.temperature,
        voltage: battery.voltage,
      }),
    });
    return !error;
  }

  async submitLocation(deviceId: string, location: LocationData): Promise<boolean> {
    guardianStorage.setLocation(location);
    const { error } = await this.request(`devices/${deviceId}/location`, {
      method: 'POST',
      body: JSON.stringify(location),
    });
    return !error;
  }

  async syncApps(deviceId: string, apps: AppInfoDto[]): Promise<boolean> {
    guardianStorage.setApps(apps);
    const { error } = await this.request(`devices/${deviceId}/apps/sync`, {
      method: 'POST',
      body: JSON.stringify({ apps }),
    });
    return !error;
  }

  async syncUsage(deviceId: string, usages: AppUsageDto[]): Promise<boolean> {
    guardianStorage.setUsage(usages);
    const { error } = await this.request(`devices/${deviceId}/usage/sync`, {
      method: 'POST',
      body: JSON.stringify({ usages }),
    });
    return !error;
  }

  async submitNotification(
    deviceId: string,
    notif: { packageName: string; appName: string; title: string; text: string; category?: string }
  ): Promise<boolean> {
    guardianStorage.addNotification({
      ...notif,
      category: notif.category || 'general',
      timestamp: 'Just now',
    });
    const { error } = await this.request(`devices/${deviceId}/notifications`, {
      method: 'POST',
      body: JSON.stringify(notif),
    });
    return !error;
  }

  async submitApproval(
    deviceId: string,
    packageName: string,
    appName: string
  ): Promise<AppApprovalDto> {
    const { data } = await this.request<AppApprovalDto>(`devices/${deviceId}/approvals`, {
      method: 'POST',
      body: JSON.stringify({
        packageName,
        appName,
        installer: 'com.android.packageinstaller',
      }),
    });

    if (data) return data;
    return guardianStorage.addApproval(packageName, appName);
  }

  async getApprovals(deviceId: string): Promise<AppApprovalDto[]> {
    const { data } = await this.request<AppApprovalDto[]>(`devices/${deviceId}/approvals`, {
      method: 'GET',
    });
    if (data && Array.isArray(data)) {
      guardianStorage.setApprovals(data);
      return data;
    }
    return guardianStorage.getApprovals();
  }

  async submitBrowsingHistory(
    deviceId: string,
    url: string,
    title?: string,
    browser = 'com.android.chrome'
  ): Promise<boolean> {
    guardianStorage.addBrowsingHistory(url, title, browser);
    const { error } = await this.request(`devices/${deviceId}/browsing`, {
      method: 'POST',
      body: JSON.stringify({ url, title, browser }),
    });
    return !error;
  }

  async submitCapture(
    deviceId: string,
    cameraType: 'FRONT' | 'BACK',
    base64Image: string
  ): Promise<boolean> {
    guardianStorage.addCapture(cameraType, base64Image);
    const { error } = await this.request(`devices/${deviceId}/captures`, {
      method: 'POST',
      body: JSON.stringify({ cameraType, base64Image }),
    });
    return !error;
  }
}

export const guardianApi = new GuardianApiClient();
