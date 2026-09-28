"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CameraIcon, XIcon, RefreshCwIcon, CheckIcon } from "@/components/driver/today-run/icons";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: { name: string; url: string }) => void;
  title?: string;
  subtitle?: string;
}

export function CameraModal({
  isOpen,
  onClose,
  onCapture,
  title = "Take Photo",
  subtitle = "Align subject within the frame and capture",
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileFallbackRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Stop current active media stream tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (mode: "environment" | "user") => {
    stopStream();
    setCameraError(null);
    setIsInitializing(true);
    setCapturedPhotoUrl(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsInitializing(false);
    } catch (err: unknown) {
      console.warn("Camera access error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Unable to access device camera. Please check camera permissions.";
      setCameraError(message);
      setIsInitializing(false);
    }
  }, [stopStream]);

  // Handle open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedPhotoUrl(null);
      setCameraError(null);
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  // Toggle front/back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  // Capture current video frame to canvas
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If user-facing (selfie), mirror horizontally for natural feel
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setCapturedPhotoUrl(dataUrl);
    stopStream();
  };

  // Confirm photo and callback
  const handleConfirm = () => {
    if (!capturedPhotoUrl) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    onCapture({
      name: `Photo_${timestamp}.jpg`,
      url: capturedPhotoUrl,
    });
    onClose();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    startCamera(facingMode);
  };

  // Fallback file input change (direct camera capture on mobile OS)
  const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onCapture({
        name: file.name,
        url,
      });
      onClose();
    }
    e.target.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-lg bg-[#161A1D] rounded-2xl border border-white/10 shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#1F262B]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F97316] flex items-center justify-center text-white">
              <CameraIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-white/60">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors border-none cursor-pointer"
            aria-label="Close camera"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {capturedPhotoUrl ? (
            // Photo Preview
            <img
              src={capturedPhotoUrl}
              alt="Captured delivery proof"
              className="w-full h-full object-contain"
            />
          ) : cameraError ? (
            // Camera Error / Permission Fallback
            <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <CameraIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white/90">Direct Camera Access Notice</p>
              <p className="text-xs text-white/60 max-w-xs leading-relaxed">
                {cameraError.includes("Permission") || cameraError.includes("permission")
                  ? "Camera permission was not granted in your browser. You can still take or attach a photo using your device camera."
                  : "Live camera stream unavailable. Tap below to use your device camera directly."}
              </p>
              <button
                type="button"
                onClick={() => fileFallbackRef.current?.click()}
                className="mt-2 px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-xs shadow-md transition-all border-none cursor-pointer flex items-center gap-2"
              >
                <CameraIcon className="w-4 h-4" />
                <span>Open Device Camera / Photos</span>
              </button>
            </div>
          ) : (
            // Live Video Feed
            <>
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 gap-2">
                  <RefreshCwIcon className="w-6 h-6 text-[#F97316] animate-spin" />
                  <span className="text-xs text-white/70 font-medium">Starting camera...</span>
                </div>
              )}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />

              {/* Viewfinder Target Guidelines */}
              <div className="absolute inset-8 pointer-events-none border-2 border-white/30 rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 border-t-2 border-l-2 border-[#F97316] absolute -top-0.5 -left-0.5" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-[#F97316] absolute -top-0.5 -right-0.5" />
                <div className="w-6 h-6 border-b-2 border-l-2 border-[#F97316] absolute -bottom-0.5 -left-0.5" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-[#F97316] absolute -bottom-0.5 -right-0.5" />
              </div>

              {/* Camera Switcher Button (Environment vs User) */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white/90 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
                <span>{facingMode === "environment" ? "Flip: Front" : "Flip: Back"}</span>
              </button>
            </>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden Native File Input Fallback with capture="environment" */}
          <input
            type="file"
            ref={fileFallbackRef}
            accept="image/*"
            capture="environment"
            onChange={handleFallbackFileChange}
            className="hidden"
          />
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between p-4 bg-[#1F262B] border-t border-white/10">
          {capturedPhotoUrl ? (
            // After capture: Retake or Confirm
            <div className="flex items-center justify-between w-full gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm cursor-pointer transition-colors"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold text-sm cursor-pointer transition-colors flex items-center justify-center gap-2 border-none shadow-lg"
              >
                <CheckIcon className="w-4 h-4 text-white" />
                <span>Use Photo</span>
              </button>
            </div>
          ) : (
            // Before capture: Capture Shutter button
            <div className="flex items-center justify-between w-full gap-3">
              <button
                type="button"
                onClick={() => fileFallbackRef.current?.click()}
                className="text-xs text-white/60 hover:text-white underline cursor-pointer bg-transparent border-none"
              >
                Or select file / device camera
              </button>
              <button
                type="button"
                disabled={isInitializing || !!cameraError}
                onClick={handleCapture}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm cursor-pointer border-none shadow-lg transition-all"
              >
                <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span>Capture Photo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
