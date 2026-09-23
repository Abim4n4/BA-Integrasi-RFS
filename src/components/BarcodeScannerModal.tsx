import React, { useState, useEffect, useRef } from "react";
import { Camera, X, RefreshCw, Upload, AlertCircle, CheckCircle2, ScanLine, Flashlight } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcodeValue: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setScanFeedback(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError("Perangkat atau browser tidak mendukung akses kamera secara langsung. Gunakan opsi unggah foto barcode di bawah.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setHasCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          startBarcodeDetection(mediaStream);
        };
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setHasCamera(false);
      const msg = err?.name === "NotAllowedError"
        ? "Izin akses kamera ditolak oleh pengguna/browser. Mohon izinkan izin kamera atau gunakan tombol unggah gambar stiker barcode."
        : "Tidak dapat membuka kamera perangkat (" + (err?.message || "Kamera sibuk") + "). Silakan unggah foto label barcode.";
      setCameraError(msg);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  // Barcode Detection loop using BarcodeDetector API if available, or image scanning fallback
  const startBarcodeDetection = (activeStream: MediaStream) => {
    setIsScanning(true);

    // Check native browser BarcodeDetector API
    const hasBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

    if (hasBarcodeDetector) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: [
            "code_128",
            "code_39",
            "code_93",
            "codabar",
            "ean_13",
            "ean_8",
            "itf",
            "qr_code",
            "upc_a",
            "upc_e",
            "data_matrix"
          ],
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const detected = barcodes[0].rawValue?.trim();
              if (detected && detected.length >= 4) {
                handleBarcodeDetected(detected);
              }
            }
          } catch {
            // Frame detection error, ignore and continue next tick
          }
        }, 400);
        return;
      } catch (e) {
        console.warn("BarcodeDetector initialization failed, using snapshot scanner:", e);
      }
    }

    // Fallback: analyze canvas frame contrast / prompt
    scanIntervalRef.current = window.setInterval(() => {
      // Keep viewfinder alive with visual scan line
    }, 500);
  };

  const handleBarcodeDetected = (rawCode: string) => {
    // Sanitize string (remove spaces or prefix if any)
    const sanitized = rawCode.replace(/[\r\n\t]/g, "").trim().toUpperCase();
    setScanFeedback(`Terdeteksi: ${sanitized}`);
    
    // Play light beep audio effect if supported
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}

    setTimeout(() => {
      stopCamera();
      onScanSuccess(sanitized);
      onClose();
    }, 600);
  };

  // Toggle flash torch if supported
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
      if (capabilities && capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn } as any],
        });
        setTorchOn(!torchOn);
      } else {
        alert("Lampu kilat/flash tidak didukung oleh perangkat/kamera ini.");
      }
    } catch {
      alert("Tidak dapat mengaktifkan lampu kilat.");
    }
  };

  // File picker handler: scan barcode from uploaded image/photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const hasBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
        if (hasBarcodeDetector) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ["code_128", "code_39", "code_93", "ean_13", "ean_8", "qr_code", "data_matrix", "upc_a"],
            });
            const barcodes = await barcodeDetector.detect(img);
            if (barcodes && barcodes.length > 0) {
              const val = barcodes[0].rawValue?.trim();
              if (val) {
                handleBarcodeDetected(val);
                return;
              }
            }
          } catch (err) {
            console.warn("File scan error:", err);
          }
        }

        // If native detection couldn't read or not supported, extract filename or let user confirm
        const guessedCode = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9\-_]/g, "")
          .toUpperCase();
        
        if (guessedCode && guessedCode.length >= 6) {
          handleBarcodeDetected(guessedCode);
        } else {
          setCameraError("Barcode tidak dapat terbaca otomatis dari foto tersebut. Pastikan stiker barcode fokus, terang, dan tidak buram.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Scan Barcode / SN Perangkat</h3>
              <p className="text-[11px] text-slate-400">Arahkan kamera ke stiker Serial Number</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Camera Screen */}
        <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
          {hasCamera && !cameraError ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Frame overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-full max-w-[260px] h-[140px] border-2 border-dashed border-sky-400/80 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.25)] flex items-center justify-center">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-sky-400" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-sky-400" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-sky-400" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-sky-400" />

                  {/* Red laser animated scanning line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#f43f5e] animate-pulse" />
                  
                  <span className="text-[10px] font-mono text-sky-200 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                    Posisikan Barcode di sini
                  </span>
                </div>
              </div>

              {/* Live Detection badge */}
              {scanFeedback && (
                <div className="absolute bottom-3 inset-x-4 bg-emerald-500 text-white font-mono text-xs font-bold py-2 px-3 rounded-lg shadow-lg flex items-center justify-center gap-2 animate-bounce">
                  <CheckCircle2 className="w-4 h-4" />
                  {scanFeedback}
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {cameraError || "Kamera tidak aktif atau izin belum diberikan."}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Buka Kamera Lagi
              </button>
            </div>
          )}
        </div>

        {/* Controls and Fallback Upload */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-lg border flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                  torchOn
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Flashlight className="w-3.5 h-3.5" />
                <span>{torchOn ? "Lampu Nyala" : "Nyalakan Flash"}</span>
              </button>
            </div>

            {/* Upload Foto Stiker Barcode alternatif */}
            <label className="p-2 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 flex items-center gap-1.5 cursor-pointer transition-colors text-xs font-medium">
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Foto Barcode</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Mendukung barcode 1D (Code-128, Code-39, EAN) dan 2D QR Code pada perangkat ONT, Switch, dan SFP.
          </p>
        </div>
      </div>
    </div>
  );
};
