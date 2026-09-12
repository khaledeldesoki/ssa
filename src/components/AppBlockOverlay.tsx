import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

interface AppBlockOverlayProps {
  packageName: string;
  appLabel: string;
  onDismiss: () => void;
  onRequestApproval: (packageName: string, appLabel: string) => Promise<void>;
}

export const AppBlockOverlay: React.FC<AppBlockOverlayProps> = ({
  packageName,
  appLabel,
  onDismiss,
  onRequestApproval,
}) => {
  const [hasRequested, setHasRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequest = async () => {
    setIsSubmitting(true);
    try {
      await onRequestApproval(packageName, appLabel);
      setHasRequested(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="app-block-screen"
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gradient-to-b from-[#0F1117] to-[#161B27]"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center animate-in fade-in duration-200">
        {/* Lock Icon Box */}
        <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-[#EF4444] to-[#F59E0B] flex items-center justify-center shadow-lg shadow-red-500/25 mb-6">
          <span className="text-4xl select-none" role="img" aria-label="Locked App">
            🔒
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-[#EF4444] tracking-tight">
          Aplikasi Diblokir
        </h2>

        {/* Description */}
        <p className="text-[15px] text-[#94A3B8] mt-3 leading-relaxed max-w-xs">
          Aplikasi <span className="font-semibold text-slate-200">&lsquo;{appLabel}&rsquo;</span> dipasang dari luar Google Play Store.
          <br className="my-1" />
          Untuk keamanan Anda, aplikasi ini memerlukan persetujuan orang tua terlebih dahulu sebelum dapat digunakan.
        </p>

        {/* Package identifier badge */}
        <div className="mt-3 px-2.5 py-1 rounded-md bg-[#1C2333] border border-slate-800 text-[11px] font-mono text-slate-400">
          {packageName}
        </div>

        {/* Actions */}
        <div className="w-full max-w-[280px] mt-8 flex flex-col gap-3">
          {hasRequested ? (
            <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Permintaan terkirim ke Orang Tua</span>
            </div>
          ) : (
            <button
              onClick={handleRequest}
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-[#1C2333] hover:bg-[#232b3e] border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Mengirim...' : 'Minta Persetujuan Orang Tua'}</span>
            </button>
          )}

          <button
            onClick={onDismiss}
            className="w-full h-12 rounded-xl bg-[#EF4444] hover:bg-[#dc2626] active:bg-[#b91c1c] text-white text-[15px] font-semibold transition-colors shadow-lg shadow-red-500/20"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};
