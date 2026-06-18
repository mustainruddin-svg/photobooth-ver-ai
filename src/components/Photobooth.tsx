import React, { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, Settings, Sliders, Sparkles, Wand2 } from "lucide-react";
import { FRAME_TEMPLATES } from "./FrameTemplates";
import { AppSettings, FrameTemplate } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface PhotoboothProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onPhotoCaptured: (imageBytes: string, frameId: string) => void;
}

export default function Photobooth({ settings, setSettings, onPhotoCaptured }: PhotoboothProps) {
  const [selectedFrame, setSelectedFrame] = useState<FrameTemplate>(FRAME_TEMPLATES[0]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Countdown and Flash States
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [currentCaptureIndex, setCurrentCaptureIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureFramesRef = useRef<string[]>([]);

  // Sound effects using Web Audio API (No files needed)
  const playBeep = (freq: number, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, duration);
    } catch (e) {
      console.warn("Audio Context failed to play sound", e);
    }
  };

  const playShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Mimic camera shutter: white noise burst + quick high pitch click
      const bufferSize = audioCtx.sampleRate * 0.15; // 150ms
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1000;
      
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.14);
      
      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      noiseNode.start();
      
      // Click spike
      const clickOsc = audioCtx.createOscillator();
      const clickGain = audioCtx.createGain();
      clickOsc.type = "triangle";
      clickOsc.frequency.setValueAtTime(2200, audioCtx.currentTime);
      clickGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      
      clickOsc.connect(clickGain);
      clickGain.connect(audioCtx.destination);
      clickOsc.start();
      clickOsc.stop(audioCtx.currentTime + 0.06);

      setTimeout(() => {
        audioCtx.close();
      }, 200);
    } catch (e) {
      console.warn("Shutter audio simulation error", e);
    }
  };

  // Handle active camera streaming
  useEffect(() => {
    let active = true;

    async function startCamera() {
      // Stop active stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      setCameraError(null);
      setIsCameraActive(false);

      try {
        // We use optimal photo definitions to capture beautiful crisp resolution
        const constraints: MediaStreamConstraints = {
          video: settings.cameraDeviceId ? {
            deviceId: { exact: settings.cameraDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 1.7777777778 }, // 16:9
          } : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 1.7777777778 }, // 16:9
            facingMode: { ideal: "user" }
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (active) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
          setIsCameraActive(true);
          
          // Re-enumerate devices now that permission is granted
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          if (videoDevices.length > 0 && !settings.cameraDeviceId && videoDevices[0].deviceId) {
            setSettings({
              ...settings,
              cameraDeviceId: videoDevices[0].deviceId
            });
          }
        }
      } catch (err: any) {
        console.error("Camera access failed", err);
        setCameraError(
          err.name === "NotAllowedError"
            ? "Kami membutuhkan izin kamera untuk memulai photobooth. Izinkan akses kamera di browser Anda."
            : "Gagal menyambungkan ke kamera. Pastikan kamera Anda dicolokkan dan tidak dipakai program lain."
        );
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [settings.cameraDeviceId, retryCount]);

  const triggerCaptureSequence = () => {
    if (isCapturing || !isCameraActive) return;
    const captureCount = settings.customOverlay ? 1 : (selectedFrame.captureCount || 1);
    captureFramesRef.current = [];
    setCapturedFrames([]);
    setCurrentCaptureIndex(0);
    runCaptureStep(0, captureCount);
  };

  const runCaptureStep = (stepIndex: number, totalSteps: number) => {
    setIsCapturing(true);
    setCurrentCaptureIndex(stepIndex);
    let count = 3;
    setCountdown(count);
    playBeep(880, 80);

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playBeep(880, 80);
      } else {
        clearInterval(interval);
        setCountdown(null);
        if (totalSteps > 1) {
          captureOneFrame(stepIndex, totalSteps);
        } else {
          performCapture();
        }
      }
    }, 1000);
  };

  const performCapture = async () => {
    if (!videoRef.current) return;
    
    // Play shutter sound
    playShutterSound();
    
    // Trigger flash flash
    setShowFlash(true);
    setTimeout(() => {
      setShowFlash(false);
    }, 400);

    const video = videoRef.current;
    
    // Create drawing canvas
    const canvas = document.createElement("canvas");
    // Get high resolution from video size
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video feed (Mirrored by default to match selfie preview)
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    
    // Reset transform to draw frame overlay in correct orientation
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (settings.customOverlay) {
      const img = new Image();
      const promise = new Promise<string>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", settings.imageQuality));
        };
        img.onerror = (e) => reject(e);
        img.src = settings.customOverlay!;
      });
      try {
        const finalImageBytes = await promise;
        onPhotoCaptured(finalImageBytes, "custom-png");
      } catch (e) {
        console.error("Error blending image with custom overlay:", e);
      } finally {
        setIsCapturing(false);
      }
    } else if (selectedFrame.imageUrl) {
      const img = new Image();
      const promise = new Promise<string>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", settings.imageQuality));
        };
        img.onerror = (e) => reject(e);
        img.src = selectedFrame.imageUrl!;
      });
      try {
        const finalImageBytes = await promise;
        onPhotoCaptured(finalImageBytes, selectedFrame.id);
      } catch (e) {
        console.error("Error blending image with frame overlay:", e);
      } finally {
        setIsCapturing(false);
      }
    } else {
      // Merge Selected Frame SVG on top of the mirrored image
      const svgStr = selectedFrame.getSvgString(width, height, settings.customText);
      
      const svgImage = new Image();
      
      const svgPromise = new Promise<string>((resolve, reject) => {
        svgImage.onload = () => {
          ctx.drawImage(svgImage, 0, 0, width, height);
          // Convert to high quality JPEG
          const finalUrl = canvas.toDataURL("image/jpeg", settings.imageQuality);
          resolve(finalUrl);
        };
        svgImage.onerror = (e) => reject(e);
        svgImage.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
      });

      try {
        const finalImageBytes = await svgPromise;
        onPhotoCaptured(finalImageBytes, selectedFrame.id);
      } catch (e) {
        console.error("Error blending image with frame overlay:", e);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const captureOneFrame = async (stepIndex: number, totalSteps: number) => {
    if (!videoRef.current) return;

    playShutterSound();
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 400);

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const vidW = video.videoWidth || 1280;
    const vidH = video.videoHeight || 720;
    canvas.width = vidW;
    canvas.height = vidH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(vidW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vidW, vidH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const frameData = canvas.toDataURL("image/jpeg", 0.95);
    const newFrames = [...captureFramesRef.current, frameData];
    captureFramesRef.current = newFrames;
    setCapturedFrames([...newFrames]);

    if (stepIndex + 1 < totalSteps) {
      setTimeout(() => runCaptureStep(stepIndex + 1, totalSteps), 800);
    } else {
      await compositeStrip(newFrames);
    }
  };

  const compositeStrip = async (frames: string[]) => {
    const STRIP_W = 640;
    const STRIP_M = 20;
    const STRIP_PW = STRIP_W - STRIP_M * 2;
    const STRIP_PH = Math.round(STRIP_PW * 9 / 16);
    const STRIP_GAP = 24;
    const STRIP_TOP = 60;
    const STRIP_BOTTOM = 168;
    const STRIP_H = STRIP_TOP + frames.length * STRIP_PH + (frames.length - 1) * STRIP_GAP + STRIP_BOTTOM;

    const canvas = document.createElement("canvas");
    canvas.width = STRIP_W;
    canvas.height = STRIP_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0D1117";
    ctx.fillRect(0, 0, STRIP_W, STRIP_H);

    for (let i = 0; i < frames.length; i++) {
      const py = STRIP_TOP + i * (STRIP_PH + STRIP_GAP);
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, STRIP_M, py, STRIP_PW, STRIP_PH);
          resolve();
        };
        img.src = frames[i];
      });
    }

    const svgStr = selectedFrame.getSvgString(STRIP_W, STRIP_H, settings.customText);
    await new Promise<void>((resolve) => {
      const svgImg = new Image();
      svgImg.onload = () => {
        ctx.drawImage(svgImg, 0, 0, STRIP_W, STRIP_H);
        resolve();
      };
      svgImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    });

    try {
      const finalImageBytes = canvas.toDataURL("image/jpeg", settings.imageQuality);
      onPhotoCaptured(finalImageBytes, selectedFrame.id);
    } catch (e) {
      console.error("Error compositing strip:", e);
    } finally {
      captureFramesRef.current = [];
      setCapturedFrames([]);
      setCurrentCaptureIndex(0);
      setIsCapturing(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-6">
      {/* CAMERA SCREEN PREVIEW AREA */}
      <div className="flex flex-col justify-between bg-[#111111] rounded-[8px] relative shadow-[0_4px_12px_rgba(0,0,0,0.08)] overflow-hidden aspect-video w-full">
        
        {/* Dynamic Frame Overlay Rendering directly in DOM for lag-free preview */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {isCameraActive && settings.customOverlay ? (
            <img src={settings.customOverlay} alt="Custom Overlay" className="w-full h-full object-fill pointer-events-none" />
          ) : isCameraActive && selectedFrame.imageUrl ? (
            <img src={selectedFrame.imageUrl} alt="Frame Overlay" className="w-full h-full object-fill pointer-events-none" />
          ) : isCameraActive ? (
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{
                __html: (selectedFrame.previewSvgString ?? selectedFrame.getSvgString)(1280, 720, settings.customText)
              }}
            />
          ) : null}
        </div>

        {/* Live Video Preview container */}
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {cameraError ? (
            <div className="p-8 text-center max-w-md z-20 flex flex-col items-center">
              <div className="w-16 h-16 bg-red-950/40 border border-red-800/60 rounded-full flex items-center justify-center mb-4 text-red-400">
                <Settings className="w-8 h-8 animate-spin-slow" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Akses Kamera Terkendala</h3>
              <p className="text-slate-400 text-sm mb-4">{cameraError}</p>
              <div className="flex space-x-3 justify-center">
                <button 
                  onClick={() => setRetryCount(c => c + 1)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors border border-white/20"
                >
                  Coba Ulang Izin
                </button>
                <label className="px-4 py-2 bg-[#00A8E8] hover:bg-[#00A8E8]/80 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer border border-transparent shadow-lg flex items-center">
                  <span>Upload Foto Manual</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          // Merge with selected frame or custom overlay just like performCapture
                          const imgObj = new Image();
                          imgObj.onload = async () => {
                            const canvas = document.createElement("canvas");
                            const width = 1280;
                            const height = 720;
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext("2d");
                            if (!ctx) return;
                            
                            // Draw uploaded image (scaled/centered)
                            // We don't mirror uploaded photos usually, so no scale(-1, 1).
                            ctx.drawImage(imgObj, 0, 0, width, height);

                            if (settings.customOverlay) {
                              const overlayImg = new Image();
                              overlayImg.onload = () => {
                                ctx.drawImage(overlayImg, 0, 0, width, height);
                                onPhotoCaptured(canvas.toDataURL("image/jpeg", settings.imageQuality), "custom-png");
                              };
                              overlayImg.src = settings.customOverlay;
                            } else if (selectedFrame.imageUrl) {
                              const overlayImg = new Image();
                              overlayImg.onload = () => {
                                ctx.drawImage(overlayImg, 0, 0, width, height);
                                onPhotoCaptured(canvas.toDataURL("image/jpeg", settings.imageQuality), selectedFrame.id);
                              };
                              overlayImg.src = selectedFrame.imageUrl;
                            } else {
                              const svgStr = selectedFrame.getSvgString(width, height, settings.customText);
                              const svgImage = new Image();
                              svgImage.onload = () => {
                                ctx.drawImage(svgImage, 0, 0, width, height);
                                onPhotoCaptured(canvas.toDataURL("image/jpeg", settings.imageQuality), selectedFrame.id);
                              };
                              svgImage.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
                            }
                          };
                          imgObj.src = base64;
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </label>
              </div>
            </div>
          ) : !isCameraActive ? (
            <div className="flex flex-col items-center space-y-3 z-20">
              <div className="w-12 h-12 border-2 border-dashed border-[#00A8E8] rounded-full animate-spin border-t-transparent" />
              <p className="text-slate-400 font-medium text-xs tracking-wider uppercase">Menghubungkan Kamera...</p>
            </div>
          ) : null}

          {/* Video Stream Element (Mirrored via CSS) */}
          <video
            ref={videoRef}
            aria-label="Live camera preview"
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isCameraActive ? "opacity-100" : "opacity-0"
            } scale-x-[-1]`}
            playsInline
            muted
          />
        </div>

        {/* Shutter Animation Flash */}
        <AnimatePresence>
          {showFlash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-white z-50 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Countdown Indicator Overlay */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center z-40 bg-black/30 backdrop-blur-xs pointer-events-none"
            >
              <div className="bg-slate-950/80 border-2 border-[#D4AF37] h-40 w-40 rounded-full flex flex-col items-center justify-center shadow-2xl gap-0.5">
                <span className="text-6xl font-sans font-black text-[#D4AF37] animate-pulse">
                  {countdown}
                </span>
                {(selectedFrame.captureCount || 1) > 1 && (
                  <span className="text-[#D4AF37]/70 text-[11px] font-bold tracking-wider">
                    FOTO {currentCaptureIndex + 1}/{selectedFrame.captureCount}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Floating Stats Panel: Mode and Status info */}
        <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center space-x-2 text-xs text-white">
          <span className={`w-2 h-2 rounded-full ${isCameraActive ? "bg-[#1e8e3e] animate-pulse" : "bg-[#d93025]"}`} />
          <span className="font-mono text-white/90 font-medium tracking-wide text-[11px]">
            {isCameraActive ? "KAMERA AKTIF" : "KAMERA MATI"}
          </span>
          <span className="text-white/40">|</span>
          <span className="text-white/80 font-bold text-[11px]">16:9 HD</span>
        </div>

        {/* Captured frames thumbnails for multi-capture */}
        <AnimatePresence>
          {capturedFrames.length > 0 && (selectedFrame.captureCount || 1) > 1 && (
            <div className="absolute top-4 right-4 z-30 flex flex-col space-y-1.5">
              {Array.from({ length: selectedFrame.captureCount || 1 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.6, opacity: 0, x: 20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  className={`w-[72px] aspect-video rounded overflow-hidden border-2 shadow-lg ${
                    i < capturedFrames.length
                      ? "border-[#D4AF37]"
                      : "border-[#D4AF37]/20 bg-black/30"
                  }`}
                >
                  {i < capturedFrames.length && (
                    <img src={capturedFrames[i]} className="w-full h-full object-cover" alt={`Foto ${i + 1}`} />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Bottom Capture Button */}
        <div className="absolute bottom-6 left-4 right-4 z-20 pointer-events-none flex justify-center">
          <button
            onClick={triggerCaptureSequence}
            disabled={!isCameraActive || isCapturing}
            className={`pointer-events-auto px-7 h-[52px] rounded-full font-medium text-[14px] transition-all duration-150 flex items-center justify-center space-x-2.5 ${
              !isCameraActive || isCapturing
                ? "bg-white/80 text-black/40 cursor-not-allowed backdrop-blur-md shadow-lg"
                : "bg-white text-black hover:scale-[1.03] active:scale-[0.97] shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
            }`}
          >
            <Camera className={`w-[18px] h-[18px] ${isCapturing ? "animate-pulse" : ""}`} />
            <span>
              {isCapturing
                ? capturedFrames.length >= (selectedFrame.captureCount || 1)
                  ? "Menyusun Strip..."
                  : (selectedFrame.captureCount || 1) > 1
                  ? `Foto ${capturedFrames.length + 1}/${selectedFrame.captureCount}`
                  : "Memproses..."
                : (selectedFrame.captureCount || 1) > 1
                ? `Ambil ${selectedFrame.captureCount} Foto`
                : "Ambil Foto"}
            </span>
            {!isCapturing && (selectedFrame.captureCount || 1) > 1 && (
              <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                3s/foto
              </span>
            )}
            {!isCapturing && (selectedFrame.captureCount || 1) === 1 && (
              <span className="text-black/40 text-[12px]">(3s)</span>
            )}
          </button>
        </div>
      </div>

      {/* Frame Overlays Picker Row */}
      <div className="w-full bg-[#ffffff] border border-[#ebebeb] p-5 rounded-[8px] flex flex-col shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[#111111] text-[15px] font-medium tracking-[-0.01em]">Pilih Frame</h3>
            <p className="text-[13px] text-[#666666] mt-0.5">Geser untuk melihat opsi overlay frame photo booth Anda</p>
          </div>
        </div>

        {/* Horizontal Row Selection list */}
        <div className={`flex overflow-x-auto space-x-3 pb-3 ${settings.customOverlay ? "opacity-50 pointer-events-none" : ""}`}>
          {FRAME_TEMPLATES.map((tpl) => {
            const isSelected = selectedFrame.id === tpl.id;
            const previewSrc = tpl.imageUrl
              ? tpl.imageUrl
              : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                  (tpl.previewSvgString ?? tpl.getSvgString)(312, 176, settings.customText)
                )}`;
            return (
              <button
                key={tpl.id}
                onClick={() => setSelectedFrame(tpl)}
                className={`relative flex flex-col rounded-[8px] border overflow-hidden text-left shrink-0 w-[152px] transition-all duration-200 ${
                  isSelected
                    ? "border-[#111111] shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                    : "border-[#e0e0e0] hover:border-[#bbb] hover:shadow-[0_1px_6px_rgba(0,0,0,0.05)]"
                }`}
              >
                {/* Thumbnail preview */}
                <div className="w-full h-[85px] overflow-hidden bg-[#111] relative">
                  <img
                    src={previewSrc}
                    alt={tpl.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Multi-capture badge */}
                  {tpl.captureCount && tpl.captureCount > 1 && (
                    <div className="absolute top-1.5 left-1.5 bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5" />
                      <span>{tpl.captureCount} FOTO</span>
                    </div>
                  )}
                  {/* Gradient color strip at bottom of thumbnail */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tpl.color}`} />
                </div>

                {/* Card info */}
                <div className={`px-2.5 py-2 ${isSelected ? "bg-[#fafafa]" : "bg-white"}`}>
                  <span className={`block text-[12px] font-semibold tracking-tight line-clamp-1 ${isSelected ? "text-[#111]" : "text-[#333]"}`}>
                    {tpl.name}
                  </span>
                  <span className="block text-[10px] text-[#888] mt-0.5 leading-tight line-clamp-2">
                    {tpl.description}
                  </span>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-[#111111] rounded-full flex items-center justify-center shadow">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
