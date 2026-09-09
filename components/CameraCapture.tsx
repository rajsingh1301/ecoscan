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
  label = "Scan item",
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
        setCameraError("This browser can't open the camera. Upload a photo instead.");
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
        setCameraError("Camera access is blocked. Allow it in your browser, or upload a photo.");
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
    <div className="flex flex-col gap-4">
      <div className="viewfinder">
        {!cameraError ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted />
            {!cameraReady && (
              <div className="viewfinder-empty">
                <span className="eyebrow">Starting camera</span>
                <p>If your browser asks for permission, allow it — the photo never leaves your device unless you share it.</p>
              </div>
            )}
          </>
        ) : (
          <div className="viewfinder-empty">
            <span className="eyebrow">No camera</span>
            <p>{cameraError}</p>
          </div>
        )}

        <div className="brackets" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        {cameraReady && !cameraError && (
          <span className="viewfinder-tag">
            <span className="live-dot" aria-hidden="true" />
            Live
          </span>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={capturePhoto}
          disabled={disabled || !cameraReady}
          className="btn btn-primary shutter"
        >
          {label}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="btn btn-quiet"
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
