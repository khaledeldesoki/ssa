import React, { useState } from 'react';
import { RemoteMessageCommand } from '../types';

interface DeviceMessageOverlayProps {
  command: RemoteMessageCommand;
  onDismiss: () => void;
}

export const DeviceMessageOverlay: React.FC<DeviceMessageOverlayProps> = ({
  command,
  onDismiss,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [isError, setIsError] = useState(false);

  const isBlock = command.type === 'BLOCK';

  const handleUnlock = () => {
    // If password provided in command, verify it; otherwise fallback or empty check
    const expectedPassword = command.password || '1234';
    if (passwordInput.trim() === expectedPassword.trim()) {
      setIsError(false);
      onDismiss();
    } else {
      setIsError(true);
    }
  };

  if (isBlock) {
    return (
      <div
        id="device-block-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gradient-to-b from-[#0F1117] to-[#161B27]"
      >
        <div className="w-full max-w-sm flex flex-col items-center text-center animate-in fade-in duration-200">
          {/* Warning Icon Badge */}
          <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-[#EF4444] to-[#F59E0B] flex items-center justify-center shadow-lg shadow-red-500/20 mb-6">
            <span className="text-4xl select-none" role="img" aria-label="Warning">
              ⚠️
            </span>
          </div>

          {/* Title */}
          <h2 className="text-[22px] font-bold text-[#EF4444] tracking-tight">
            Layar Dikunci Orang Tua
          </h2>

          {/* Message */}
          <p className="text-[15px] text-[#94A3B8] mt-3 leading-relaxed max-w-xs">
            {command.message || 'Waktunya beristirahat! Layar telah dikunci sementara oleh orang tua.'}
          </p>

          {/* Hint if parent set a password */}
          {command.password && (
            <div className="mt-2 text-[11px] text-slate-500">
              (Parent unlock PIN hint: <span className="font-mono text-slate-400">{command.password}</span>)
            </div>
          )}

          {/* Password Input */}
          <div className="w-full max-w-[280px] mt-6 flex flex-col items-center">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (isError) setIsError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUnlock();
              }}
              placeholder="Masukkan Sandi Pembuka Kunci"
              className={`w-full px-4 py-3 rounded-[10px] bg-[#1C2333] text-white placeholder-[#64748B] text-sm focus:outline-hidden transition-all ${
                isError
                  ? 'border-2 border-[#EF4444] ring-2 ring-red-500/20'
                  : 'border border-[#334155] focus:border-[#5C7CFA]'
              }`}
            />

            {isError && (
              <p className="text-xs text-[#EF4444] font-medium mt-2">
                Sandi salah! Silakan coba lagi.
              </p>
            )}

            {/* Unlock Button */}
            <button
              onClick={handleUnlock}
              className="mt-5 w-full h-12 rounded-xl bg-[#EF4444] hover:bg-[#dc2626] active:bg-[#b91c1c] text-white text-[15px] font-semibold transition-colors shadow-lg shadow-red-500/20"
            >
              Buka Kunci Layar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard MESSAGE mode popup
  return (
    <div
      id="device-message-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-xs rounded-[20px] bg-[#1C2333] border border-[#334155] p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
        {/* Chat Emoji Icon */}
        <div className="w-[60px] h-[60px] rounded-[16px] bg-gradient-to-br from-[#5C7CFA] to-[#A78BFA] flex items-center justify-center shadow-md mb-4">
          <span className="text-2xl select-none" role="img" aria-label="Message">
            💬
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-[#F1F5F9]">Pesan Diterima</h3>

        {/* Message body */}
        <p className="text-sm text-[#94A3B8] mt-3 leading-relaxed">
          {command.message || 'Pesan dari orang tua.'}
        </p>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="mt-6 w-full h-11 rounded-[10px] bg-[#5C7CFA] hover:bg-[#4d6de8] active:bg-[#3b5998] text-white text-sm font-semibold transition-colors shadow-md shadow-indigo-500/20"
        >
          OK
        </button>
      </div>
    </div>
  );
};
