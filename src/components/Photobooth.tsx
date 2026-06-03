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
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Countdown and Flash States
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Enumerate cameras
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !settings.cameraDeviceId) {
          setSettings({
            ...settings,
            cameraDeviceId: videoDevices[0].deviceId,
          });
        }
      } catch (err) {
        console.error("Error listing systems cameras", err);
      }
    }
    getDevices();
  }, [settings.cameraDeviceId]);

  // Handle active camera streaming
  useEffect(() => {
    let active = true;

    async function startCamera() {
      if (!settings.cameraDeviceId) return;
      
      // Stop active stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      setCameraError(null);
      setIsCameraActive(false);

      try {
        // We use optimal photo definitions to capture beautiful crisp resolution
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: { exact: settings.cameraDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 1.7777777778 }, // 16:9
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
  }, [settings.cameraDeviceId]);

  const triggerCaptureSequence = () => {
    if (isCapturing || !isCameraActive) return;
    setIsCapturing(true);
    let count = 3;
    setCountdown(count);
    playBeep(880, 80); // beep countdown

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playBeep(880, 80); // beep countdown
      } else {
        clearInterval(interval);
        setCountdown(null);
        performCapture();
      }
    }, 1000);
  };

  const handleCustomOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "image/png") {
        alert("Please upload a PNG file with transparency.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings({ ...settings, customOverlay: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
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
        img.src = settings.customOverlay;
      });
      try {
        const finalImageBytes = await promise;
        onPhotoCaptured(finalImageBytes, "custom-png");
      } catch (e) {
        console.error("Error blending image with custom overlay:", e);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full mx-auto">
      {/* CAMERA SCREEN PREVIEW AREA */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-[#111111] rounded-[8px] relative shadow-[0_4px_12px_rgba(0,0,0,0.08)] overflow-hidden aspect-video">
        
        {/* Dynamic Frame Overlay Rendering directly in DOM for lag-free preview */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {isCameraActive && settings.customOverlay ? (
            <img src={settings.customOverlay} alt="Custom Overlay" className="w-full h-full object-fill pointer-events-none" />
          ) : isCameraActive ? (
            <div 
              className="w-full h-full"
              dangerouslySetInnerHTML={{ 
                __html: selectedFrame.getSvgString(1280, 720, settings.customText) 
              }} 
            />
          ) : null}
        </div>

        {/* Live Video Preview container */}
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {cameraError ? (
            <div className="p-8 text-center max-w-md z-20">
              <div className="w-16 h-16 bg-red-950/40 border border-red-800/60 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
                <Settings className="w-8 h-8 animate-spin-slow" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Akses Kamera Terkendala</h3>
              <p className="text-slate-400 text-sm">{cameraError}</p>
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
              <div className="bg-slate-950/80 border-2 border-[#D4AF37] h-40 w-40 rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-6xl font-sans font-black text-[#D4AF37] animate-pulse">
                  {countdown}
                </span>
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

        {/* Bottom Captured Instruction Alert */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex justify-center">
          <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-lg border border-white/10 text-white/90 text-[13px] text-center font-medium">
            Posisikan wajah Anda di tengah sebelum menekan tombol ambil foto.
          </div>
        </div>
      </div>

      {/* DASHBOARD CONTROLS */}
      <div className="lg:col-span-4 flex flex-col space-y-5">
        
        {/* Settings Module */}
        <div className="bg-[#ffffff] border border-[#ebebeb] p-6 rounded-[8px] flex flex-col space-y-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
          <div>
            <h3 className="text-[#111111] text-[15px] font-medium tracking-[-0.01em]">Settings</h3>
            <p className="text-[13px] text-[#666666] mt-1">Configure layout and design parameters</p>
          </div>
          
          <div className="h-[1px] bg-[#e0e0e0] w-full" />
          
          {/* Dynamic Label Customization Input */}
          <div className="flex flex-col mb-4">
            <label htmlFor="custom-text-input" className="block text-[13px] font-medium text-[#444444] mb-2">Banner Custom Text</label>
            <div className="relative">
              <input
                id="custom-text-input"
                type="text"
                className="w-full h-[40px] px-3 text-[14px] border border-[#d1d1d1] rounded-[6px] bg-[#ffffff] text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
                placeholder="cth: Wisuda SIT Ar-Rahmah"
                value={settings.customText}
                onChange={(e) => setSettings({ ...settings, customText: e.target.value })}
              />
            </div>
          </div>

          {/* Google Apps Script / Database URL Input */}
          <div className="flex flex-col mb-4">
            <label htmlFor="gas-url-input" className="block text-[13px] font-medium text-[#444444] mb-2 flex items-center justify-between">
              <span>Database Sync URL</span>
              <span className="text-[10px] text-[#2ba049] bg-[#eafdcf] px-1.5 py-0.5 rounded-sm">auto-saves</span>
            </label>
            <div className="relative">
              <input
                id="gas-url-input"
                type="password"
                className="w-full h-[40px] px-3 text-[13px] border border-[#d1d1d1] rounded-[6px] bg-[#fafafa] text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all font-mono"
                placeholder="Paste Google Apps Script URL..."
                value={settings.googleAppsScriptUrl || ""}
                onChange={(e) => setSettings({ ...settings, googleAppsScriptUrl: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-[#888] mt-1.5 leading-snug">
              Masukkan URL Code.gs untuk langsung auto-sync dan upload hasil ke Google Drive saat link dibuka.
            </p>
          </div>

          {/* Swap Camera Device Selection (Crucial for Tablet front/back cameras) */}
          {cameras.length > 1 && (
            <div className="flex flex-col">
              <label htmlFor="camera-select" className="block text-[13px] font-medium text-[#444444] mb-2">Camera Source</label>
              <div className="relative">
                <select
                  id="camera-select"
                  className="w-full h-[40px] px-3 text-[14px] border border-[#d1d1d1] rounded-[6px] bg-[#ffffff] text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all appearance-none cursor-pointer"
                  value={settings.cameraDeviceId}
                  onChange={(e) => setSettings({ ...settings, cameraDeviceId: e.target.value })}
                >
                  {cameras.map((c, idx) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <RefreshCw className="absolute right-3 top-[12px] w-4 h-4 text-[#777777] pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Frame Overlays Picker Grid */}
        <div className="flex-1 bg-[#ffffff] border border-[#ebebeb] p-6 rounded-[8px] flex flex-col space-y-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[#111111] text-[15px] font-medium tracking-[-0.01em]">Frame Selection</h3>
              <p className="text-[13px] text-[#666666] mt-1">Choose layout overlay</p>
            </div>
            <span className="bg-[#f0f0f0] text-[#333333] text-[11px] font-medium px-2 py-0.5 rounded-full">{FRAME_TEMPLATES.length} VARIANTS</span>
          </div>

          <div className="h-[1px] bg-[#e0e0e0] w-full" />

          {/* Custom PNG Frame Upload Option */}
          <div className="w-full flex items-center justify-between bg-[#fafafa] border border-[#d1d1d1] rounded-[6px] p-3">
             <div className="flex flex-col">
               <span className="text-[13px] font-medium text-[#111111]">Custom PNG Frame</span>
               <span className="text-[11px] text-[#666666]">Upload transparent 16:9 image</span>
             </div>
             <div className="flex items-center space-x-2">
               {settings.customOverlay && (
                 <button 
                   onClick={() => setSettings({ ...settings, customOverlay: null })}
                   className="text-[12px] font-medium text-[#d93025] hover:underline"
                 >
                   Remove
                 </button>
               )}
               <label className="px-3 py-1.5 bg-[#111111] text-white text-[12px] font-medium rounded-[4px] cursor-pointer hover:bg-[#333333] transition-colors">
                 Upload
                 <input type="file" accept="image/png" className="hidden" onChange={handleCustomOverlayUpload} />
               </label>
             </div>
          </div>

          {/* Grid Selection list */}
          <div className={`grid grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[190px] pr-1 mt-2 ${settings.customOverlay ? "opacity-50 pointer-events-none" : ""}`}>
            {FRAME_TEMPLATES.map((tpl) => {
              const isSelected = selectedFrame.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedFrame(tpl)}
                  className={`relative p-3 rounded-[6px] border flex flex-col justify-between items-start text-left h-[100px] overflow-hidden transition-all duration-150 ${
                    isSelected
                      ? "bg-[#fafafa] border-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                      : "bg-[#ffffff] border-[#e0e0e0] hover:bg-[#f5f5f5] hover:border-[#d1d1d1]"
                  }`}
                >
                  <div className="flex flex-col space-y-1 z-10 w-full pr-4">
                    <span className={`text-[13px] font-medium tracking-tight line-clamp-1 ${isSelected ? "text-[#111111]" : "text-[#444444]"}`}>{tpl.name}</span>
                    <span className="text-[11px] text-[#666666] leading-tight line-clamp-2">{tpl.description}</span>
                  </div>

                  {/* Gradient Indicator bar */}
                  <div className={`w-full h-1 mt-3 rounded-full bg-gradient-to-r ${tpl.color}`} />

                  {/* Tiny selection dot overlay */}
                  {isSelected && (
                     <div className="absolute top-3 right-3 w-4 h-4 bg-[#111111] rounded-full flex items-center justify-center">
                       <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                     </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Action Take Photo Button */}
        <button
          onClick={triggerCaptureSequence}
          disabled={!isCameraActive || isCapturing}
          className={`w-full mt-2 py-0 h-[48px] rounded-[6px] font-medium text-[14px] transition-all duration-150 flex items-center justify-center space-x-2 border ${
            !isCameraActive || isCapturing
              ? "bg-[#f5f5f5] text-[#999999] border-[#e0e0e0] cursor-not-allowed"
              : "bg-[#111111] text-[#ffffff] border-transparent hover:bg-[#333333] active:bg-[#000000]"
          }`}
        >
          <Camera className={`w-[18px] h-[18px] ${isCapturing ? "animate-spin" : ""}`} />
          <span>{isCapturing ? "Capturing..." : "Take Photo (3s Countdown)"}</span>
        </button>

      </div>
    </div>
  );
}
