import React, { useState, useEffect } from "react";
import { CheckCircle2, Clipboard, Globe, Link2, RefreshCw, Smartphone, Star, X } from "lucide-react";
import { AppSettings } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface PostCaptureModalProps {
  imageBytes: string;  // Data URL Base64
  frameId: string;
  settings: AppSettings;
  onClose: () => void;
}

export default function PostCaptureModal({ imageBytes, frameId, settings, onClose }: PostCaptureModalProps) {
  const [uploadStatus, setUploadStatus] = useState<"uploading" | "success" | "error">("uploading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState<string>("");
  const [uploadProgressText, setUploadProgressText] = useState("Menghubungkan ke server...");
  const [clipboardCopied, setClipboardCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function uploadImage() {
      // 1. Simulation Mode
      if (settings.isSimulatorMode) {
        const progressSteps = [
          { time: 400, text: "Merender gambar resolusi tinggi..." },
          { time: 1000, text: "Menghubungkan ke API Google Drive (SIMULASI)..." },
          { time: 1600, text: "Mengunggah berkas ke Folder Ar-Rahmah..." },
          { time: 2200, text: "Selesai! Menghasilkan QR Code..." }
        ];

        for (const step of progressSteps) {
          if (!active) return;
          await new Promise(r => setTimeout(r, step.time - (progressSteps[progressSteps.indexOf(step)-1]?.time || 0)));
          if (active) setUploadProgressText(step.text);
        }

        if (active) {
          setDriveUrl(`https://drive.google.com/fill_with_your_google_apps_script_url_simulation_${Math.random().toString(36).substring(4)}`);
          setUploadStatus("success");
        }
        return;
      }

      // 2. Real Google Apps Script Integration
      if (!settings.googleAppsScriptUrl) {
        setUploadStatus("error");
        setErrorMessage(
          "URL Web App Google Apps Script belum dikonfigurasi! Ganti ke 'Mode Simulasi' di kanan atas atau paste URL Web App Anda untuk mengunggah beneran."
        );
        return;
      }

      try {
        setUploadProgressText("Mempersiapkan data Base64...");
        
        // Strip data:image/jpeg;base64, header to leave raw Base64
        const base64Data = imageBytes.split(",")[1];
        if (!base64Data) {
          throw new Error("Format Base64 tidak valid");
        }

        const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `Ar-Rahmah_Photobooth_${timestampStr}.jpg`;

        setUploadProgressText("Mengunggah foto langsung ke Google Drive...");

        // Google Apps Script expects raw POST payload usually, or JSON
        const response = await fetch(settings.googleAppsScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8", // avoids pre-flight CORS issues in some environments
          },
          body: JSON.stringify({
            image: base64Data,
            filename: filename,
            mimeType: "image/jpeg"
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        setUploadProgressText("Mendapatkan tautan publik...");
        const result = await response.json();

        if (result.success) {
          if (active) {
            setDriveUrl(result.url);
            setUploadStatus("success");
          }
        } else {
          throw new Error(result.error || "Google Apps Script gagal menyimpan file.");
        }

      } catch (err: any) {
        console.error("Upload error:", err);
        if (active) {
          setUploadStatus("error");
          setErrorMessage(
            err.message || "Gagal menghubungi Server Google Apps Script. Periksa kembali Web App URL & izin CORS Anda."
          );
        }
      }
    }

    uploadImage();

    return () => {
      active = false;
    };
  }, [imageBytes, settings.googleAppsScriptUrl, settings.isSimulatorMode]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(driveUrl);
    setClipboardCopied(true);
    setTimeout(() => setClipboardCopied(false), 2000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(driveUrl)}&color=002244`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Modal Card Backdrop */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#ffffff] border border-[#ebebeb] rounded-[8px] overflow-hidden w-full max-w-4xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] grid grid-cols-1 md:grid-cols-12 max-h-[92vh]"
      >
        
        {/* Left Side: Captured Photo view (7 columns) */}
        <div className="md:col-span-7 bg-[#f5f5f5] flex items-center justify-center relative min-h-[300px] md:min-h-0 border-r border-[#ebebeb]">
          <img
            src={imageBytes}
            alt="Hasil Foto Photobooth"
            className="w-full h-full object-contain pointer-events-none"
          />
          <div className="absolute top-4 left-4 bg-[#ffffff] px-2.5 py-1 rounded-[4px] border border-[#d1d1d1] text-[11px] text-[#444444] font-medium tracking-wide shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            RENDER SUCCESS
          </div>
        </div>

        {/* Right Side: Status/Cloud sharing operations (5 columns) */}
        <div className="md:col-span-5 p-8 flex flex-col justify-between bg-[#ffffff]">
          
          {/* Header Title with exit button */}
          <div className="flex items-center justify-between pb-6 border-b border-[#ebebeb]">
            <div>
              <span className="text-[11px] text-[#666666] font-medium tracking-wide uppercase">Ar-Rahmah Cloud Server</span>
              <h2 className="text-[#111111] font-medium text-[20px] tracking-[-0.01em] mt-1">Share Photo</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[6px] bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#666666] hover:text-[#111111] transition-colors cursor-pointer border border-[#ebebeb]"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-6 flex flex-col items-center justify-center flex-1">
            <AnimatePresence mode="wait">
              
              {/* STAGE 1: UPLOADING LOADING */}
              {uploadStatus === "uploading" && (
                <motion.div
                  key="uploading-state"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-col items-center text-center space-y-4 py-8"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-[#e0e0e0] rounded-full animate-spin border-t-[#111111]" />
                  </div>
                  <div className="space-y-1.5 max-w-xs mt-4">
                    <p className="text-[#111111] text-[14px] font-medium tracking-[-0.01em]">Uploading Image...</p>
                    <p className="text-[#666666] text-[13px] leading-relaxed transition-all duration-300">
                      {uploadProgressText}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STAGE 2: UPLOAD ERROR */}
              {uploadStatus === "error" && (
                <motion.div
                  key="error-state"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="w-full text-center space-y-4 py-4"
                >
                  <div className="w-12 h-12 bg-[#fbecec] border border-[#f5c6c6] rounded-full flex items-center justify-center mx-auto text-[#d93025]">
                    <X className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 mt-4">
                    <h3 className="text-[#111111] font-medium text-[14px]">Upload Failed</h3>
                    <p className="text-[#666666] text-[13px] leading-relaxed max-w-xs mx-auto">
                      {errorMessage}
                    </p>
                  </div>
                  
                  {settings.isSimulatorMode ? null : (
                    <button
                      onClick={() => {
                        setUploadStatus("uploading");
                        setUploadProgressText("Retrying connection...");
                        // Trigger upload flow again manually if state resets, handled by re-execution
                      }}
                      className="text-[13px] text-[#111111] font-medium underline hover:text-[#333333] cursor-pointer mt-4 inline-block"
                    >
                      Try uploading again
                    </button>
                  )}
                </motion.div>
              )}

              {/* STAGE 3: UPLOAD SUCCESS & DISPLAY QR CODE */}
              {uploadStatus === "success" && (
                <motion.div
                  key="success-state"
                  initial={{ opacity: 0, scale: 0.93 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.93 }}
                  className="flex flex-col items-center text-center space-y-5 w-full"
                >
                  <div className="flex items-center space-x-1.5 text-[#1e8e3e] text-[12px] font-medium tracking-wide bg-[#e6f4ea] px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Upload Complete</span>
                  </div>

                  {/* QR Code Container */}
                  <div className="relative p-2 bg-[#ffffff] rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#ebebeb]">
                    <img
                      src={qrCodeUrl}
                      alt="Link QR Code"
                      className="w-[140px] h-[140px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[#111111] text-[14px] font-medium tracking-tight">Scan QR to Download</p>
                    <p className="text-[#666666] text-[13px] max-w-xs leading-normal">
                      Use your mobile camera to scan the code and save the photo.
                    </p>
                  </div>

                  {/* Copy Link Utility Area */}
                  <div className="w-full flex items-center bg-[#fafafa] border border-[#d1d1d1] rounded-[6px] p-1 h-[40px]">
                    <span className="flex-1 text-[12px] text-[#444444] font-mono text-left pl-3 truncate select-all">
                      {driveUrl}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-[4px] transition-all cursor-pointer flex items-center space-x-1.5 h-full ${
                        clipboardCopied
                          ? "bg-[#e5e5e5] text-[#111111]"
                          : "bg-[#ffffff] hover:bg-[#f5f5f5] text-[#111111] border border-[#e0e0e0] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      }`}
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>{clipboardCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Action buttons footer */}
          <div className="pt-6 border-t border-[#ebebeb] flex items-center space-x-3">
            <button
              onClick={onClose}
              className="flex-1 h-[40px] rounded-[6px] border border-[#d1d1d1] bg-[#ffffff] hover:bg-[#f5f5f5] font-medium text-[14px] text-[#111111] transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Take New Photo</span>
            </button>
            
            {uploadStatus === "success" && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1 h-[40px] rounded-[6px] bg-[#111111] hover:bg-[#333333] text-[#ffffff] font-medium text-[14px] transition-all text-center flex items-center justify-center space-x-2"
              >
                <Globe className="w-4 h-4" />
                <span>Open Link</span>
              </a>
            )}
          </div>

        </div>

      </motion.div>
    </div>
  );
}
