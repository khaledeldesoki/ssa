import React, { useState, useEffect, useCallback } from 'react';
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
  RemoteMessageCommand,
  SocketLogItem,
} from './types';
import { guardianStorage } from './services/guardianStorage';
import { guardianApi } from './services/guardianApi';
import { HomeScreen } from './components/HomeScreen';
import { ParentDashboard } from './components/ParentDashboard';
import { DeviceMessageOverlay } from './components/DeviceMessageOverlay';
import { AppBlockOverlay } from './components/AppBlockOverlay';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { Smartphone, Shield, Radio, Check } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation: Child Device Screen vs Parent Control Dashboard
  const [currentView, setCurrentView] = useState<'child' | 'parent'>('child');

  // Device Identifiers
  const [deviceId, setDeviceId] = useState<string>(() => guardianStorage.getDeviceId());
  const [serverDeviceId, setServerDeviceId] = useState<string | null>(() =>
    guardianStorage.getServerDeviceId()
  );
  const [serverUrl, setServerUrl] = useState<string>(() => guardianStorage.getServerUrl());

  // App & Device Telemetry States
  const [permissions, setPermissions] = useState<PermissionStatus>(() =>
    guardianStorage.getPermissions()
  );
  const [battery, setBattery] = useState<BatteryData>(() => guardianStorage.getBattery());
  const [location, setLocation] = useState<LocationData>(() => guardianStorage.getLocation());
  const [apps, setApps] = useState<AppInfoDto[]>(() => guardianStorage.getApps());
  const [usage, setUsage] = useState<AppUsageDto[]>(() => guardianStorage.getUsage());
  const [notifications, setNotifications] = useState<NotificationDto[]>(() =>
    guardianStorage.getNotifications()
  );
  const [approvals, setApprovals] = useState<AppApprovalDto[]>(() =>
    guardianStorage.getApprovals()
  );
  const [browsingHistory, setBrowsingHistory] = useState<BrowsingHistoryItem[]>(() =>
    guardianStorage.getBrowsingHistory()
  );
  const [captures, setCaptures] = useState<CameraCaptureItem[]>(() =>
    guardianStorage.getCaptures()
  );
  const [socketLogs, setSocketLogs] = useState<SocketLogItem[]>(() =>
    guardianStorage.getSocketLogs()
  );

  const [isAppHidden, setIsAppHidden] = useState<boolean>(() => guardianStorage.isAppHidden());
  const [isAntiUninstall, setIsAntiUninstall] = useState<boolean>(() =>
    guardianStorage.isAntiUninstallEnabled()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => new Date().toLocaleTimeString());

  // Overlays
  const [activeMessageCommand, setActiveMessageCommand] = useState<RemoteMessageCommand | null>(
    null
  );
  const [blockedAppTarget, setBlockedAppTarget] = useState<{
    packageName: string;
    appLabel: string;
  } | null>(null);
  const [cameraModalConfig, setCameraModalConfig] = useState<{
    isOpen: boolean;
    cameraType: 'FRONT' | 'BACK';
  }>({ isOpen: false, cameraType: 'BACK' });

  // Auto-register on startup (mimicking MainViewModel.autoRegister)
  useEffect(() => {
    async function autoRegister() {
      const id = guardianStorage.getDeviceId();
      setDeviceId(id);

      // Submit device registration to server
      const response = await guardianApi.registerDevice({
        deviceId: id,
        deviceName: 'Pixel 8 Pro (Simulated)',
        brand: 'Google',
        model: 'Pixel 8 Pro',
        androidVersion: '14.0',
        securityPatch: '2026-03-01',
        permissions: guardianStorage.getPermissions() as unknown as Record<string, boolean>,
      });

      setServerDeviceId(response.deviceId);
      guardianStorage.addSocketLog('device:registered', { deviceId: response.deviceId }, 'OUTGOING');
      setSocketLogs(guardianStorage.getSocketLogs());
    }

    autoRegister();
  }, []);

  // Try reading HTML5 Battery & Geolocation if allowed
  useEffect(() => {
    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery?.().then((bat: any) => {
        const update = () => {
          const newBat: BatteryData = {
            level: Math.round(bat.level * 100),
            isCharging: bat.charging,
            temperature: 31.8,
            voltage: 4150,
          };
          setBattery(newBat);
          guardianStorage.setBattery(newBat);
        };
        update();
        bat.addEventListener('levelchange', update);
        bat.addEventListener('chargingchange', update);
      }).catch(() => {});
    }

    // Geolocation API if permission granted
    if (permissions.location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: LocationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            bearing: pos.coords.heading,
            provider: 'fused',
          };
          setLocation(loc);
          guardianStorage.setLocation(loc);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [permissions.location]);

  // Permission Granter Handler
  const handleGrantPermission = async (key: keyof PermissionStatus) => {
    if (key === 'location' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: LocationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            bearing: pos.coords.heading,
            provider: 'gps',
          };
          setLocation(loc);
          guardianStorage.setLocation(loc);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }

    if (key === 'camera' && navigator.mediaDevices?.getUserMedia) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        s.getTracks().forEach((t) => t.stop());
      } catch {}
    }

    if (key === 'notification' && typeof Notification !== 'undefined') {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    const updated = guardianStorage.updateSinglePermission(key, true);
    setPermissions(updated);
    guardianStorage.addSocketLog('permissions:updated', { [key]: true }, 'OUTGOING');
    setSocketLogs(guardianStorage.getSocketLogs());
  };

  // Force Sync implementation (Battery, Location, Permissions, Apps, Usage)
  const handleForceSync = useCallback(async (target = 'all') => {
    setIsSyncing(true);
    const dId = guardianStorage.getDeviceId();

    try {
      if (target === 'all' || target === 'battery') {
        await guardianApi.submitBattery(dId, battery);
      }
      if (target === 'all' || target === 'location') {
        await guardianApi.submitLocation(dId, location);
      }
      if (target === 'all' || target === 'permissions') {
        await guardianApi.updateDevice(dId, {
          permissions: permissions as unknown as Record<string, boolean>,
        });
      }
      if (target === 'all' || target === 'apps') {
        await guardianApi.syncApps(dId, apps);
      }
      if (target === 'all' || target === 'usage') {
        await guardianApi.syncUsage(dId, usage);
      }

      guardianStorage.addSocketLog('force_sync', { target, status: 'COMPLETED' }, 'INCOMING');
      setSocketLogs(guardianStorage.getSocketLogs());
      setLastSyncTime(new Date().toLocaleTimeString());
    } finally {
      setIsSyncing(false);
    }
  }, [battery, location, permissions, apps, usage]);

  // App Click Simulator (Child phone launcher)
  const handleOpenApp = (packageName: string, appLabel: string) => {
    const blockedApps = guardianStorage.getBlockedApps();

    // If app is blocked, show the AppBlockActivity overlay
    if (blockedApps.has(packageName)) {
      setBlockedAppTarget({ packageName, appLabel });
      guardianStorage.addSocketLog('app:blocked_attempt', { packageName, appLabel }, 'INCOMING');
      setSocketLogs(guardianStorage.getSocketLogs());
      return;
    }

    // If Chrome is opened, simulate web browsing capture
    if (packageName === 'com.android.chrome') {
      const demoSites = [
        { url: 'https://en.wikipedia.org/wiki/Volcano', title: 'Volcanoes - Wikipedia' },
        { url: 'https://kids.nationalgeographic.com/animals', title: 'Animals for Kids - Nat Geo' },
        { url: 'https://scratch.mit.edu', title: 'Scratch Coding Community' },
      ];
      const randomSite = demoSites[Math.floor(Math.random() * demoSites.length)];
      guardianApi.submitBrowsingHistory(deviceId, randomSite.url, randomSite.title, packageName);
      setBrowsingHistory(guardianStorage.getBrowsingHistory());
    }

    // Increment screen time usage for this app
    const currentUsage = guardianStorage.getUsage();
    const existing = currentUsage.find((u) => u.packageName === packageName);
    if (existing) {
      existing.usageMs += 10 * 60 * 1000; // add 10 mins
    } else {
      currentUsage.push({
        packageName,
        appName: appLabel,
        usageMs: 15 * 60 * 1000,
        date: new Date().toISOString().split('T')[0],
      });
    }
    guardianStorage.setUsage(currentUsage);
    setUsage([...currentUsage]);
  };

  // Parental Approval Resolver
  const handleResolveApproval = (id: string, status: 'APPROVED' | 'REJECTED') => {
    const resolved = guardianStorage.resolveApproval(id, status);
    if (resolved) {
      setApprovals([...guardianStorage.getApprovals()]);
      setApps(guardianStorage.getApps());
      guardianStorage.addSocketLog(
        'approval:resolved',
        { packageName: resolved.packageName, status },
        'INCOMING'
      );
      setSocketLogs(guardianStorage.getSocketLogs());
    }
  };

  // Send Remote Message / Lock Screen command
  const handleSendMessage = (type: 'MESSAGE' | 'BLOCK', message: string, password?: string) => {
    const cmd: RemoteMessageCommand = { type, message, password };
    guardianStorage.addSocketLog('device:message', cmd, 'OUTGOING');
    setSocketLogs(guardianStorage.getSocketLogs());
    setActiveMessageCommand(cmd);
    // Switch to child view so the user immediately sees the lock overlay action!
    setCurrentView('child');
  };

  // Remote Camera Snapshot Trigger
  const handleTriggerCamera = (cameraType: 'FRONT' | 'BACK') => {
    guardianStorage.addSocketLog('camera:capture', { cameraType }, 'OUTGOING');
    setSocketLogs(guardianStorage.getSocketLogs());
    setCameraModalConfig({ isOpen: true, cameraType });
  };

  // Remote Anti-Uninstall Toggle
  const handleToggleAntiUninstall = (enabled: boolean) => {
    setIsAntiUninstall(enabled);
    guardianStorage.setAntiUninstallEnabled(enabled);
    guardianStorage.addSocketLog('protection:set', { enabled }, 'OUTGOING');
    setSocketLogs(guardianStorage.getSocketLogs());
  };

  // Remote App Visibility Toggle
  const handleToggleAppVisibility = (visible: boolean) => {
    setIsAppHidden(!visible);
    guardianStorage.setAppHidden(!visible);
    guardianStorage.addSocketLog(visible ? 'app:show' : 'app:hide', {}, 'OUTGOING');
    setSocketLogs(guardianStorage.getSocketLogs());
  };

  // Toggle App Block state
  const handleToggleAppBlock = (packageName: string) => {
    const blocked = guardianStorage.getBlockedApps();
    if (blocked.has(packageName)) {
      guardianStorage.removeBlockedApp(packageName);
    } else {
      guardianStorage.addBlockedApp(packageName);
    }
    setApps(guardianStorage.getApps());
  };

  // Reset Device Preferences (mirrors socket "device:deleted")
  const handleResetDevice = () => {
    guardianStorage.clear();
    setDeviceId(guardianStorage.getDeviceId());
    setServerDeviceId(null);
    setPermissions(guardianStorage.getPermissions());
    setBattery(guardianStorage.getBattery());
    setLocation(guardianStorage.getLocation());
    setApps(guardianStorage.getApps());
    setUsage(guardianStorage.getUsage());
    setApprovals(guardianStorage.getApprovals());
    setNotifications(guardianStorage.getNotifications());
    setBrowsingHistory(guardianStorage.getBrowsingHistory());
    setCaptures(guardianStorage.getCaptures());
    guardianStorage.addSocketLog('device:deleted', { action: 'WIPED' }, 'INCOMING');
    setSocketLogs(guardianStorage.getSocketLogs());
  };

  return (
    <div className="min-h-screen w-full bg-[#0F1117] text-slate-100 flex flex-col">
      {/* Top Application Mode Switcher Bar */}
      <div className="w-full bg-[#161B27] border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#5C7CFA] to-[#A78BFA] flex items-center justify-center text-xs shadow-xs">
            🛡️
          </div>
          <span className="text-xs font-bold text-slate-200">Guardian Workspace</span>
          <span className="hidden sm:inline text-[11px] text-slate-500 font-mono">
            v1.0.0
          </span>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 rounded-lg bg-[#0F1117] border border-slate-800">
          <button
            onClick={() => setCurrentView('child')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentView === 'child'
                ? 'bg-[#5C7CFA] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Child Device View</span>
          </button>

          <button
            onClick={() => setCurrentView('parent')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentView === 'parent'
                ? 'bg-[#5C7CFA] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Parent Dashboard</span>
            {approvals.filter((a) => a.status === 'PENDING').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Quick simulation status */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Service Active</span>
          </span>
          <span className="text-slate-600">•</span>
          <span>Device: {deviceId.slice(0, 10)}</span>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {currentView === 'child' ? (
          <HomeScreen
            permissions={permissions}
            battery={battery}
            location={location}
            onGrantPermission={handleGrantPermission}
            onForceSync={() => handleForceSync('all')}
            onOpenApp={handleOpenApp}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
            deviceId={deviceId}
          />
        ) : (
          <ParentDashboard
            deviceId={deviceId}
            serverDeviceId={serverDeviceId}
            serverUrl={serverUrl}
            onUpdateServerUrl={(url) => {
              setServerUrl(url);
              guardianStorage.setServerUrl(url);
            }}
            permissions={permissions}
            battery={battery}
            location={location}
            apps={apps}
            usage={usage}
            notifications={notifications}
            approvals={approvals}
            browsingHistory={browsingHistory}
            captures={captures}
            socketLogs={socketLogs}
            isAppHidden={isAppHidden}
            isAntiUninstall={isAntiUninstall}
            onSendMessage={handleSendMessage}
            onTriggerCamera={handleTriggerCamera}
            onTriggerSync={handleForceSync}
            onResolveApproval={handleResolveApproval}
            onToggleAntiUninstall={handleToggleAntiUninstall}
            onToggleAppVisibility={handleToggleAppVisibility}
            onToggleAppBlock={handleToggleAppBlock}
            onResetDevice={handleResetDevice}
          />
        )}
      </main>

      {/* OVERLAY 1: Remote Device Message / Parental Screen Lock */}
      {activeMessageCommand && (
        <DeviceMessageOverlay
          command={activeMessageCommand}
          onDismiss={() => setActiveMessageCommand(null)}
        />
      )}

      {/* OVERLAY 2: App Block Activity */}
      {blockedAppTarget && (
        <AppBlockOverlay
          packageName={blockedAppTarget.packageName}
          appLabel={blockedAppTarget.appLabel}
          onDismiss={() => setBlockedAppTarget(null)}
          onRequestApproval={async (pkg, label) => {
            const appr = await guardianApi.submitApproval(deviceId, pkg, label);
            setApprovals([...guardianStorage.getApprovals()]);
            guardianStorage.addSocketLog('approval:requested', appr, 'OUTGOING');
            setSocketLogs(guardianStorage.getSocketLogs());
          }}
        />
      )}

      {/* OVERLAY 3: Headless Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModalConfig.isOpen}
        cameraType={cameraModalConfig.cameraType}
        onCapture={async (base64) => {
          await guardianApi.submitCapture(deviceId, cameraModalConfig.cameraType, base64);
          setCaptures([...guardianStorage.getCaptures()]);
          setCameraModalConfig({ isOpen: false, cameraType: 'BACK' });
          guardianStorage.addSocketLog(
            'camera:uploaded',
            { cameraType: cameraModalConfig.cameraType, size: base64.length },
            'OUTGOING'
          );
          setSocketLogs(guardianStorage.getSocketLogs());
        }}
        onClose={() => setCameraModalConfig({ isOpen: false, cameraType: 'BACK' })}
      />
    </div>
  );
};

export default App;
