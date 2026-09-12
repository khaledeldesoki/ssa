import React, { useState } from 'react';
import { PermissionStatus, BatteryData, LocationData } from '../types';
import { Shield, RefreshCw, Smartphone, ExternalLink, Check, AlertTriangle } from 'lucide-react';

interface HomeScreenProps {
  permissions: PermissionStatus;
  battery: BatteryData;
  location: LocationData;
  onGrantPermission: (key: keyof PermissionStatus) => void;
  onForceSync: () => Promise<void>;
  onOpenApp: (packageName: string, appName: string) => void;
  isSyncing: boolean;
  lastSyncTime: string | null;
  deviceId: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  permissions,
  battery,
  location,
  onGrantPermission,
  onForceSync,
  onOpenApp,
  isSyncing,
  lastSyncTime,
  deviceId,
}) => {
  const [showMiuiModal, setShowMiuiModal] = useState(false);

  const allGranted =
    permissions.location &&
    permissions.camera &&
    permissions.usageStats &&
    permissions.notification &&
    permissions.notificationAccess &&
    permissions.overlay &&
    permissions.deviceAdmin &&
    permissions.accessibility;

  return (
    <div
      id="guardian-home-screen"
      className="min-h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#0F1117] to-[#161B27] text-slate-100"
    >
      <div className="w-full max-w-md flex flex-col items-center py-6">
        {/* Shield Icon Badge */}
        <div
          id="guardian-shield-badge"
          className="w-[72px] h-[72px] rounded-[20px] bg-gradient-to-br from-[#5C7CFA] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4"
        >
          <span className="text-3xl select-none" role="img" aria-label="Guardian Shield">
            🛡️
          </span>
        </div>

        {/* Title & Subtitle */}
        <h1
          id="guardian-title"
          className="text-2xl font-bold text-[#5C7CFA] tracking-tight text-center"
        >
          Guardian Active
        </h1>
        <p id="guardian-subtitle" className="text-sm text-[#94A3B8] mt-1 text-center">
          This device is being monitored
        </p>

        {/* Device ID pill */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C2333] border border-[#334155]/60 text-xs text-slate-400">
          <Smartphone className="w-3.5 h-3.5 text-[#5C7CFA]" />
          <span>Device ID: {deviceId}</span>
        </div>

        {/* Status Indicators (matching StatusRow from HomeScreen.kt) */}
        <div id="status-rows-container" className="w-full flex flex-col items-center gap-2 mt-6">
          <StatusRow label="Location Tracking" active={permissions.location} />
          <StatusRow label="Camera Access" active={permissions.camera} />
          <StatusRow
            label={`Battery Monitoring (${battery.level}%)`}
            active={true}
            extraText={battery.isCharging ? '⚡ Charging' : undefined}
          />
          <StatusRow label="App & Usage Monitoring" active={permissions.usageStats} />
          <StatusRow label="Notification Access" active={permissions.notificationAccess} />
          <StatusRow label="Display Over Other Apps" active={permissions.overlay} />
          <StatusRow label="Device Protection (Admin)" active={permissions.deviceAdmin} />
          <StatusRow label="Uninstall Prevention (A11y)" active={permissions.accessibility} />
        </div>

        {/* Autostart MIUI / HyperOS button */}
        <button
          id="btn-autostart-miui"
          onClick={() => setShowMiuiModal(true)}
          className="mt-3 w-full max-w-[280px] sm:max-w-[320px] py-2.5 px-4 rounded-lg border border-[#5C7CFA]/40 bg-[#1C2333]/60 hover:bg-[#1C2333] text-xs font-medium text-slate-300 transition-colors flex items-center justify-center gap-2"
        >
          <span>Aktifkan Mulai Otomatis (MIUI/HyperOS)</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Required Permissions Panel if any missing */}
        {!allGranted && (
          <div
            id="required-permissions-card"
            className="w-full max-w-[320px] sm:max-w-[340px] mt-6 p-4 rounded-xl bg-[#5C7CFA]/10 border border-[#5C7CFA]/30 flex flex-col items-center"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-[15px] font-bold text-[#F1F5F9]">Required Permissions</h2>
            </div>
            <p className="text-xs text-[#94A3B8] text-center mt-1 mb-4 leading-relaxed">
              Please grant these permissions to ensure full synchronization with the parent dashboard.
            </p>

            <div className="w-full flex flex-col gap-2">
              {!permissions.location && (
                <button
                  id="btn-grant-location"
                  onClick={() => onGrantPermission('location')}
                  className="w-full h-[42px] rounded-lg bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs sm:text-[13px] font-medium transition-colors"
                >
                  Grant Location Access
                </button>
              )}

              {!permissions.camera && (
                <button
                  id="btn-grant-camera"
                  onClick={() => onGrantPermission('camera')}
                  className="w-full h-[42px] rounded-lg bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs sm:text-[13px] font-medium transition-colors"
                >
                  Grant Camera Access
                </button>
              )}

              {!permissions.usageStats && (
                <button
                  id="btn-grant-usage"
                  onClick={() => onGrantPermission('usageStats')}
                  className="w-full h-[42px] rounded-lg bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs sm:text-[13px] font-medium transition-colors"
                >
                  Grant Usage Stats Access
                </button>
              )}

              {!permissions.notification && (
                <button
                  id="btn-grant-notification"
                  onClick={() => onGrantPermission('notification')}
                  className="w-full h-[42px] rounded-lg bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs sm:text-[13px] font-medium transition-colors"
                >
                  Grant Notification Access
                </button>
              )}

              {!permissions.notificationAccess && (
                <button
                  id="btn-grant-notification-access"
                  onClick={() => onGrantPermission('notificationAccess')}
                  className="w-full h-[42px] rounded-lg bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs sm:text-[13px] font-medium transition-colors"
                >
                  Grant Notification Listener Access
                </button>
              )}

              {!permissions.overlay && (
                <button
                  id="btn-grant-overlay"
                  onClick={() => onGrantPermission('overlay')}
                  className="w-full h-[42px] rounded-lg bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs sm:text-[13px] font-medium transition-colors"
                >
                  Grant Display Over Other Apps
                </button>
              )}

              {!permissions.deviceAdmin && (
                <button
                  id="btn-grant-device-admin"
                  onClick={() => onGrantPermission('deviceAdmin')}
                  className="w-full h-[42px] rounded-lg bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs sm:text-[13px] font-medium transition-colors"
                >
                  Activate Device Protection (Admin)
                </button>
              )}

              {!permissions.accessibility && (
                <button
                  id="btn-grant-accessibility"
                  onClick={() => onGrantPermission('accessibility')}
                  className="w-full h-[42px] rounded-lg bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs sm:text-[13px] font-medium transition-colors"
                >
                  Enable Uninstall Prevention (A11y)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Force Sync Button if all or any permissions granted */}
        <div className="mt-6 flex flex-col items-center">
          <button
            id="btn-force-sync"
            onClick={() => onForceSync()}
            disabled={isSyncing}
            className="w-[220px] py-2.5 px-4 rounded-[10px] border border-[#5C7CFA] text-[#5C7CFA] hover:bg-[#5C7CFA]/10 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Force Sync Now'}</span>
          </button>
          {lastSyncTime && (
            <span className="text-[11px] text-slate-500 mt-2">
              Last synced: {lastSyncTime}
            </span>
          )}
        </div>

        {/* Interactive App Launcher Simulation (Simulates Child tapping an app on home screen) */}
        <div
          id="launcher-simulation-section"
          className="w-full max-w-[320px] sm:max-w-[340px] mt-8 pt-6 border-t border-slate-800/80 flex flex-col items-center"
        >
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Child Phone Apps Simulator
          </div>
          <p className="text-[11px] text-slate-500 text-center mb-3">
            Tap an app below to simulate user activity or verify the App Blocker and URL monitoring:
          </p>

          <div className="grid grid-cols-4 gap-2 w-full">
            <button
              id="app-sim-tiktok"
              onClick={() => onOpenApp('com.zhiliaoapp.musically', 'TikTok')}
              className="flex flex-col items-center p-2 rounded-xl bg-[#1C2333] hover:bg-[#232b3e] border border-slate-700/50 transition-transform active:scale-95 text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-lg shadow relative">
                🎵
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white">
                  🔒
                </span>
              </div>
              <span className="text-[11px] text-slate-300 mt-1 truncate w-full font-medium">TikTok</span>
            </button>

            <button
              id="app-sim-mlbb"
              onClick={() => onOpenApp('com.mobile.legends', 'Mobile Legends')}
              className="flex flex-col items-center p-2 rounded-xl bg-[#1C2333] hover:bg-[#232b3e] border border-slate-700/50 transition-transform active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-900/60 flex items-center justify-center text-lg shadow">
                ⚔️
              </div>
              <span className="text-[11px] text-slate-300 mt-1 truncate w-full font-medium">MLBB</span>
            </button>

            <button
              id="app-sim-roblox"
              onClick={() => onOpenApp('com.roblox.client', 'Roblox')}
              className="flex flex-col items-center p-2 rounded-xl bg-[#1C2333] hover:bg-[#232b3e] border border-slate-700/50 transition-transform active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-red-950/60 flex items-center justify-center text-lg shadow">
                🟥
              </div>
              <span className="text-[11px] text-slate-300 mt-1 truncate w-full font-medium">Roblox</span>
            </button>

            <button
              id="app-sim-chrome"
              onClick={() => onOpenApp('com.android.chrome', 'Chrome')}
              className="flex flex-col items-center p-2 rounded-xl bg-[#1C2333] hover:bg-[#232b3e] border border-slate-700/50 transition-transform active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 flex items-center justify-center text-lg shadow">
                🌐
              </div>
              <span className="text-[11px] text-slate-300 mt-1 truncate w-full font-medium">Chrome</span>
            </button>
          </div>
        </div>
      </div>

      {/* Autostart MIUI / HyperOS Dialog */}
      {showMiuiModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1C2333] border border-slate-700 p-5 shadow-2xl text-slate-200">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>⚙️ Autostart Management</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              On Xiaomi / MIUI / HyperOS devices, battery optimization kills background services unless Autostart is allowed.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-[#0F1117] text-xs text-slate-300 space-y-1.5 border border-slate-800">
              <div className="font-semibold text-[#5C7CFA]">Manual Steps:</div>
              <div>1. Go to Settings → Apps → Manage Apps → Guardian</div>
              <div>2. Enable <strong>Autostart</strong> toggle</div>
              <div>3. Set Battery Saver to <strong>No Restrictions</strong></div>
            </div>
            <button
              onClick={() => setShowMiuiModal(false)}
              className="mt-4 w-full py-2 rounded-lg bg-[#5C7CFA] text-white text-xs font-semibold hover:bg-[#4d6de8]"
            >
              Mengerti (Understood)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Recreates StatusRow from HomeScreen.kt
interface StatusRowProps {
  label: string;
  active: boolean;
  extraText?: string;
}

const StatusRow: React.FC<StatusRowProps> = ({ label, active, extraText }) => {
  return (
    <div className="w-full max-w-[280px] sm:max-w-[320px] rounded-[10px] bg-[#1C2333] border border-[#334155]/50 px-4 py-3 flex items-center justify-between shadow-xs">
      <span className="text-[13px] sm:text-sm text-[#F1F5F9] font-normal truncate mr-2">
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-[11px] font-medium ${
            active ? 'text-[#10B981]' : 'text-[#F59E0B]'
          }`}
        >
          {extraText ? `${extraText} • ` : ''}
          {active ? 'Active' : 'Missing Permission'}
        </span>
        <div
          className={`w-2 h-2 rounded-full ${
            active ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
          }`}
        />
      </div>
    </div>
  );
};
