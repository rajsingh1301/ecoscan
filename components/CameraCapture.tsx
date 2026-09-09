"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  label?: string;
  disabled?: boolean;
}

function scaledSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION) return { width, height };
  const ratio = MAX_DIMENSION / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export default function CameraCapture({
  onCapture,
  label = "📸 Scan Item",
  disabled,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera not available in this browser — use upload instead.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch {
        setCameraError("Camera access denied — use upload instead.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const drawToDataUrl = useCallback(
    (source: CanvasImageSource, sourceWidth: number, sourceHeight: number): string | null => {
      const canvas = canvasRef.current;
      if (!canvas || sourceWidth === 0 || sourceHeight === 0) return null;

      const { width, height } = scaledSize(sourceWidth, sourceHeight);
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(source, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    },
    []
  );

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const dataUrl = drawToDataUrl(video, video.videoWidth, video.videoHeight);
    if (dataUrl) onCapture(dataUrl);
  }, [drawToDataUrl, onCapture]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;

        const image = new Image();
        image.onload = () => {
          const dataUrl = drawToDataUrl(image, image.naturalWidth, image.naturalHeight);
          onCapture(dataUrl ?? (reader.result as string));
        };
        image.onerror = () => onCapture(reader.result as string);
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    },
    [drawToDataUrl, onCapture]
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black/90 flex items-center justify-center">
        {!cameraError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <p className="text-white/80 text-sm text-center px-6">{cameraError}</p>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-3 w-full max-w-sm">
        <button
          type="button"
          onClick={capturePhoto}
          disabled={disabled || !cameraReady}
          className="flex-1 rounded-full bg-emerald-600 text-white font-medium py-3 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
        >
          {label}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="rounded-full border border-black/10 dark:border-white/20 px-4 py-3 text-sm font-medium disabled:opacity-40"
        >
          Upload
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
