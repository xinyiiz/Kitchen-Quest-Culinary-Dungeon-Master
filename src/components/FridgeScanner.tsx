// components/FridgeScanner.tsx
import React, { useState, useRef, useEffect } from "react";
import { scanFridgeLoot } from "../services/geminiService";
import { Ingredient } from "../types";

interface FridgeScannerProps {
  inventory: Ingredient[];
  onInventoryUpdated: (inv: Ingredient[], cdmSpeech: string) => void;
  onBack: () => void;
  onSpeakCdm: (audioData: { narration?: string; speakNow?: boolean }) => Promise<void>;
  isDemoMode: boolean;
}

const FridgeScanner: React.FC<FridgeScannerProps> = ({
  inventory,
  onInventoryUpdated,
  onBack,
  onSpeakCdm,
  isDemoMode,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Prevent double start (StrictMode + fast clicks)
  const cameraStartInFlightRef = useRef(false);

  useEffect(() => {
    if (isCameraActive && !isDemoMode) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive, isDemoMode]);

  const startCamera = async () => {
    if (cameraStartInFlightRef.current) return;
    cameraStartInFlightRef.current = true;

    setCameraLoading(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      mediaStreamRef.current = stream;

      // Speak ONLY once - after success
      await onSpeakCdm({
        narration: "Camera activated, Chef! Point it at your fridge!",
        speakNow: true,
      });
    } catch (err) {
      console.error("Failed to start camera:", err);
      setCameraError(
        "🚫 Camera access denied or not available. Please allow camera permissions or try uploading a photo."
      );

      await onSpeakCdm({
        narration: "Camera failed to activate, Chef. Check permissions.",
        speakNow: true,
      });

      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
      cameraStartInFlightRef.current = false;
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setCameraError(null);

    await onSpeakCdm({ narration: "Analyzing your uploaded image, Chef!", speakNow: true });

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          const res = await scanFridgeLoot(base64, isDemoMode);
          onInventoryUpdated(res.inventory, res.cdmSpeech);
        } catch (e) {
          console.error(e);
          setCameraError("Scan failed, Chef. Try again!");
          await onSpeakCdm({ narration: "Scan failed, Chef. Try again!", speakNow: true });
        } finally {
          setIsScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setIsScanning(false);
      setCameraError("Scan failed, Chef. Try again!");
      await onSpeakCdm({ narration: "Scan failed, Chef. Try again!", speakNow: true });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError("No video feed to capture from!");
      await onSpeakCdm({ narration: "No camera feed, Chef!", speakNow: true });
      return;
    }

    setIsScanning(true);
    setCameraError(null);

    await onSpeakCdm({ narration: "Capturing your kitchen's bounty, Chef!", speakNow: true });

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) {
      setCameraError("Canvas context not available!");
      setIsScanning(false);
      return;
    }

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    const base64 = canvasRef.current.toDataURL("image/jpeg").split(",")[1];

    try {
      const res = await scanFridgeLoot(base64, isDemoMode);
      onInventoryUpdated(res.inventory, res.cdmSpeech);
    } catch (e) {
      console.error(e);
      setCameraError("Scan failed, Chef. Try again!");
      await onSpeakCdm({ narration: "Scan failed, Chef. Try again!", speakNow: true });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-full bg-[#1a1a1a] p-8 pixel-border mb-6">
        <h2 className="font-pixel text-sm text-blue-400 mb-6 uppercase">Action: The Inspect Skill</h2>

        {cameraError && (
          <div className="bg-red-900 border border-red-500 text-red-100 p-4 mb-6 font-pixel text-sm text-center">
            {cameraError}
          </div>
        )}

        {isCameraActive && !isDemoMode ? (
          <div className="flex flex-col items-center gap-4">
            {cameraLoading ? (
              <div className="w-full aspect-video bg-gray-900 flex items-center justify-center pixel-border mb-4">
                <span className="animate-spin text-4xl">🎥</span>
                <p className="font-pixel text-yellow-400 ml-4">ACTIVATING CAMERA...</p>
              </div>
            ) : (
              <video ref={videoRef} className="w-full h-auto max-w-full bg-black pixel-border mb-4" autoPlay playsInline />
            )}
            <canvas ref={canvasRef} className="hidden" />

            <button
              onClick={handleCapturePhoto}
              disabled={isScanning || cameraLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 p-8 pixel-border font-pixel text-lg flex items-center justify-center gap-4 transition-all"
            >
              {isScanning ? <span className="animate-spin">⚙️</span> : <span className="text-3xl">📸</span>}
              {isScanning ? "MAPPING PIXELS..." : "CAPTURE LOOT!"}
            </button>

            <button
              onClick={() => {
                stopCamera();
                setIsCameraActive(false);
              }}
              disabled={isScanning}
              className="font-pixel text-xs text-gray-500 hover:text-white transition-colors mt-2"
            >
              [ STOP CAMERA ]
            </button>

            <button
              onClick={() => {
                fileInputRef.current?.click();
                setIsCameraActive(false);
              }}
              disabled={isScanning}
              className="font-pixel text-xs text-gray-500 hover:text-white transition-colors mt-2"
            >
              [ UPLOAD PHOTO INSTEAD ]
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {!isDemoMode ? (
              <>
                <button
                  onClick={() => setIsCameraActive(true)}
                  disabled={isScanning}
                  className="w-full bg-green-600 hover:bg-green-500 p-8 pixel-border font-pixel text-lg flex items-center justify-center gap-4 transition-all"
                >
                  <span className="text-3xl">🎥</span>
                  ACTIVATE CAMERA
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="font-pixel text-xs text-gray-500 hover:text-white transition-colors mt-2"
                  aria-label="Upload a photo from your device instead"
                >
                  [ UPLOAD FRIDGE PHOTO INSTEAD ]
                </button>
              </>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="w-full bg-green-600 hover:bg-green-500 p-8 pixel-border font-pixel text-lg flex items-center justify-center gap-4 transition-all"
              >
                {isScanning ? <span className="animate-spin">⚙️</span> : <span className="text-3xl">⬆️</span>}
                {isScanning ? "MAPPING PIXELS..." : "UPLOAD LOOT! (DEMO)"}
              </button>
            )}

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

            <button
              onClick={() => {
                stopCamera();
                setIsCameraActive(false);
                onBack();
              }}
              disabled={isScanning}
              className="font-pixel text-[10px] text-gray-500 hover:text-white transition-colors mt-8 py-4 uppercase tracking-widest"
            >
              [ RETURN TO HUB ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FridgeScanner;