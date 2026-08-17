"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  SwitchCamera,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@attendly/ui/components";
import { FrameSelector } from "@/features/photos/components/frame-selector";
import { renderFrameOnPhoto } from "@/features/photos/lib/render-frame";
import type { BoothFrame } from "@/features/photo-booth/constants";
import { toast } from "sonner";

interface SelfieCaptureProps {
  frames: BoothFrame[];
  onCapture: (blob: Blob, frameId: string | null) => void;
  onCancel: () => void;
}

type CaptureState = "live" | "captured" | "processing";

export function SelfieCapture({
  frames,
  onCapture,
  onCancel,
}: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [captureState, setCaptureState] = useState<CaptureState>("live");
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permissions in your browser settings."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No camera found on this device."
            : "Could not access camera. Please check your permissions.";
      setCameraError(message);
    }
  }, []);

  // Initialize camera on mount
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleToggleCamera() {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    startCamera(newFacing);
  }

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;

    // If front camera, mirror the capture to match what user sees
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture photo");
          return;
        }
        setCapturedBlob(blob);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
        setCaptureState("captured");

        // Pause the video stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => (track.enabled = false));
        }
      },
      "image/jpeg",
      0.92
    );
  }

  function handleRetake() {
    setCapturedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCaptureState("live");

    // Re-enable stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => (track.enabled = true));
    } else {
      startCamera(facingMode);
    }
  }

  async function handleUsePhoto() {
    if (!capturedBlob) return;

    setCaptureState("processing");

    try {
      const selectedFrame = frames.find((f) => f.id === selectedFrameId) ?? null;

      let finalBlob = capturedBlob;
      if (selectedFrame) {
        const frameConfig = {
          template: selectedFrame.template,
          message: selectedFrame.message,
          color: selectedFrame.color,
        };
        finalBlob = await renderFrameOnPhoto(capturedBlob, frameConfig);
      }

      onCapture(finalBlob, selectedFrameId);
    } catch {
      toast.error("Failed to process photo");
      setCaptureState("captured");
    }
  }

  // Camera error state
  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-sm text-muted-foreground max-w-xs">{cameraError}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Go Back
          </Button>
          <Button onClick={() => startCamera(facingMode)}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Camera view / captured preview */}
      <div className="relative rounded-xl overflow-hidden bg-black">
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-2 right-2 z-20 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Live video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full aspect-[4/3] object-cover ${
            captureState !== "live" ? "hidden" : ""
          } ${facingMode === "user" ? "[transform:scaleX(-1)]" : ""}`}
        />

        {/* Captured preview */}
        {captureState !== "live" && previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Captured selfie"
            className="w-full aspect-[4/3] object-cover"
          />
        )}

        {/* Frame overlay preview (live mode) */}
        {captureState === "live" && selectedFrameId && (
          <FrameOverlay
            frame={frames.find((f) => f.id === selectedFrameId) ?? null}
          />
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Frame selector */}
      {frames.length > 0 && captureState === "live" && (
        <div>
          <label className="text-sm font-medium mb-2 block">
            Add a frame
          </label>
          <FrameSelector
            frames={frames}
            selectedFrameId={selectedFrameId}
            onSelect={setSelectedFrameId}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {captureState === "live" && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleCamera}
              title="Switch camera"
              className="rounded-full h-10 w-10"
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>

            <button
              type="button"
              onClick={handleCapture}
              className="flex items-center justify-center h-16 w-16 rounded-full bg-white border-4 border-primary shadow-lg hover:scale-105 transition-transform"
              title="Take photo"
            >
              <Camera className="h-7 w-7 text-primary" />
            </button>

            <div className="w-10" /> {/* Spacer for symmetry */}
          </>
        )}

        {captureState === "captured" && (
          <>
            <Button
              variant="outline"
              onClick={handleRetake}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Retake
            </Button>

            <Button onClick={handleUsePhoto} className="gap-1.5">
              <Check className="h-4 w-4" />
              Use Photo
            </Button>
          </>
        )}

        {captureState === "processing" && (
          <Button disabled>Processing...</Button>
        )}
      </div>
    </div>
  );
}

/** CSS-based frame overlay preview shown on top of the live video feed */
function FrameOverlay({ frame }: { frame: BoothFrame | null }) {
  if (!frame) return null;

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 10,
  };

  switch (frame.template) {
    case "banner_top":
      return (
        <div style={overlayStyle}>
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-center py-2 px-4"
            style={{ backgroundColor: frame.color, opacity: 0.85 }}
          >
            <span className="text-white text-sm font-bold truncate">
              {frame.message}
            </span>
          </div>
        </div>
      );

    case "banner_bottom":
      return (
        <div style={overlayStyle}>
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-2 px-4"
            style={{ backgroundColor: frame.color, opacity: 0.85 }}
          >
            <span className="text-white text-sm font-bold truncate">
              {frame.message}
            </span>
          </div>
        </div>
      );

    case "corner":
      return (
        <div style={overlayStyle}>
          <div
            className="absolute top-2 right-2 rounded-md px-3 py-1"
            style={{ backgroundColor: frame.color, opacity: 0.85 }}
          >
            <span className="text-white text-xs font-bold">
              {frame.message}
            </span>
          </div>
        </div>
      );

    case "border":
      return (
        <div style={overlayStyle}>
          <div
            className="absolute inset-1 rounded-lg"
            style={{
              border: `3px solid ${frame.color}`,
              opacity: 0.9,
            }}
          />
          <div
            className="absolute bottom-1 left-1 right-1 flex items-center justify-center py-1 px-3 rounded-b-lg"
            style={{ backgroundColor: frame.color, opacity: 0.85 }}
          >
            <span className="text-white text-xs font-bold truncate">
              {frame.message}
            </span>
          </div>
        </div>
      );

    default:
      return null;
  }
}
