import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  cameraType: 'FRONT' | 'BACK';
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  cameraType,
  onCapture,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      return;
    }

    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        setHasCameraError(false);
        const facingMode = cameraType === 'FRONT' ? 'user' : 'environment';
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.warn('Camera access error, fallback to simulated photo:', err);
        setHasCameraError(true);
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, cameraType]);

  const handleTakePhoto = () => {
    setIsCapturing(true);

    if (!hasCameraError && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Add timestamp watermark
        ctx.font = '16px monospace';
        ctx.fillStyle = '#00ffcc';
        ctx.fillText(
          `Guardian ${cameraType} • ${new Date().toLocaleTimeString()}`,
          16,
          canvas.height - 20
        );
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setTimeout(() => {
          onCapture(base64);
          setIsCapturing(false);
        }, 400);
        return;
      }
    }

    // Fallback: generate a simulated camera snapshot
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#1a1f2c');
      grad.addColorStop(1, '#0e131f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Grid lines
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 1;
      for (let i = 0; i < 640; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 480);
        ctx.stroke();
      }
      for (let i = 0; i < 480; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(640, i);
        ctx.stroke();
      }

      // Camera lens icon & text
      ctx.fillStyle = '#5C7CFA';
      ctx.beginPath();
      ctx.arc(320, 210, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Guardian Headless Camera Capture`, 320, 310);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px monospace';
      ctx.fillText(
        `Sensor: ${cameraType} CAMERA | Time: ${new Date().toLocaleTimeString()}`,
        320,
        340
      );

      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setTimeout(() => {
        onCapture(base64);
        setIsCapturing(false);
      }, 400);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-[#1C2333] border border-slate-700 p-5 shadow-2xl flex flex-col items-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-5 h-5 text-[#5C7CFA]" />
          <h3 className="text-base font-bold text-slate-100">
            Headless Camera: {cameraType} Camera
          </h3>
        </div>

        <p className="text-xs text-slate-400 text-center mb-4">
          Simulating Guardian headless camera snapshot triggered by the dashboard.
        </p>

        {/* Video preview / simulated view */}
        <div className="w-full aspect-4/3 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden relative flex items-center justify-center">
          {hasCameraError ? (
            <div className="flex flex-col items-center p-4 text-center">
              <Camera className="w-10 h-10 text-slate-600 mb-2" />
              <span className="text-xs text-slate-400 font-medium">
                Live webcam unavailable in this context.
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                A simulated capture will be generated automatically.
              </span>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Watermark overlay */}
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-[10px] font-mono text-cyan-400">
            GUARDIAN_{cameraType}_LENS
          </div>
        </div>

        {/* Action button */}
        <div className="w-full mt-4 flex gap-3">
          <button
            onClick={handleTakePhoto}
            disabled={isCapturing}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#5C7CFA] hover:bg-[#4d6de8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isCapturing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Capturing & Uploading...</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Capture & Upload Snapshot</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
