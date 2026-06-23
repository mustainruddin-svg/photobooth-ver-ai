import React, { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, Settings, Sliders, Sparkles, Wand2, FlipHorizontal } from "lucide-react";
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
            setSettings(prev => ({
              ...prev,
              cameraDeviceId: videoDevices[0].deviceId
            }));
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

    // Draw video feed (Mirrored if enabled)
    if (settings.mirrorCamera) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
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
                __html: selectedFrame.getSvgString(1280, 720, settings.customText) 
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

          {/* Video Stream Element */}
          <video
            ref={videoRef}
            aria-label="Live camera preview"
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isCameraActive ? "opacity-100" : "opacity-0"
            } ${settings.mirrorCamera ? "scale-x-[-1]" : ""}`}
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

        {/* Quick Toggles Overlay */}
        {isCameraActive && (
          <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2">
            <button
              onClick={() => setSettings({ ...settings, mirrorCamera: !settings.mirrorCamera })}
              className={`p-2 rounded-full backdrop-blur-md border transition-colors ${
                settings.mirrorCamera 
                  ? "bg-white/20 text-white border-white/40 hover:bg-white/30" 
                  : "bg-black/40 text-white/70 border-white/10 hover:bg-black/60"
              }`}
              title="Mirror Camera"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Bottom Captured Instruction Alert */}
        <div className="absolute bottom-6 left-4 right-4 z-20 pointer-events-none flex justify-center">
          <button
            onClick={triggerCaptureSequence}
            disabled={!isCameraActive || isCapturing}
            className={`pointer-events-auto px-8 h-[56px] rounded-full font-medium text-[15px] transition-all duration-150 flex items-center justify-center space-x-3 shadow-[0_4px_24px_rgba(0,0,0,0.2)] ${
              !isCameraActive || isCapturing
                ? "bg-white/80 text-black/50 cursor-not-allowed backdrop-blur-md"
                : "bg-white text-black hover:scale-105 active:scale-95"
            }`}
          >
            <Camera className={`w-[20px] h-[20px] ${isCapturing ? "animate-spin" : ""}`} />
            <span>{isCapturing ? "Memproses..." : "Ambil Foto (3s)"}</span>
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
        <div className={`flex overflow-x-auto space-x-4 pb-4 ${settings.customOverlay ? "opacity-50 pointer-events-none" : ""}`}>
          {FRAME_TEMPLATES.map((tpl) => {
            const isSelected = selectedFrame.id === tpl.id;
            return (
              <button
                key={tpl.id}
                onClick={() => setSelectedFrame(tpl)}
                className={`relative p-3 rounded-[6px] border flex flex-col justify-between items-start text-left shrink-0 w-[180px] h-[100px] overflow-hidden transition-all duration-150 ${
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
                <div className={`w-[80%] h-1.5 mt-auto rounded-full bg-gradient-to-r ${tpl.color}`} />

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
    </div>
  );
}
