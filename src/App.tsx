import React, { useState, useEffect } from "react";
import { Camera, FileCode, HardDrive, HelpCircle, LayoutGrid, ToggleLeft, ToggleRight, Settings } from "lucide-react";
import { AppSettings } from "./types";
import Photobooth from "./components/Photobooth";
import PostCaptureModal from "./components/PostCaptureModal";
import Exporter from "./components/Exporter";
import { SettingsView } from "./components/SettingsView";

export default function App() {
  const [activeTab, setActiveTab] = useState<"terminal" | "settings" | "export">("terminal");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFrameId, setCapturedFrameId] = useState<string>("royal-gold");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);

  // Global applet configuration states
  const [settings, setSettings] = useState<AppSettings>(() => {
    // When the link is opened, attempt to load the stored database configuration
    // Defaulting to the provided user specific script.
    const defaultUrl = "https://script.google.com/macros/s/AKfycbwXXVRTez5Z6B6u0HAmMKLXgXeNBwiG_ncpUlugMhSJv5U_oY6NLJHKVsABC6C4Y0pE/exec";
    const savedUrl = localStorage.getItem("photobooth_gas_url") || defaultUrl;
    const simulatorMode = savedUrl === "" ? true : false;

    return {
      googleAppsScriptUrl: savedUrl,
      isSimulatorMode: simulatorMode,
      customText: "Wisuda SIT Ar-Rahmah",
      cameraDeviceId: "",
      imageQuality: 0.9,
      customOverlay: null,
      mirrorCamera: true,
    };
  });

  // Effect to persist the database URL automatically whenever it changes
  React.useEffect(() => {
    if (settings.googleAppsScriptUrl) {
      localStorage.setItem("photobooth_gas_url", settings.googleAppsScriptUrl);
      // Auto-disable simulator mode if a valid URL is provided
      if (settings.isSimulatorMode && settings.googleAppsScriptUrl.trim() !== "") {
        setSettings(prev => ({ ...prev, isSimulatorMode: false }));
      }
    } else {
      localStorage.removeItem("photobooth_gas_url");
    }
  }, [settings.googleAppsScriptUrl, settings.isSimulatorMode]);

  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !settings.cameraDeviceId) {
          setSettings((prev) => ({
            ...prev,
            cameraDeviceId: videoDevices[0].deviceId,
          }));
        }
      } catch (err) {
        console.error("Error listing system cameras", err);
      }
    }
    getDevices();
    
    // Add event listener for when permissions change
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, [settings.cameraDeviceId]);

  const handlePhotoCaptured = (imageBytes: string, frameId: string) => {
    setCapturedImage(imageBytes);
    setCapturedFrameId(frameId);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#fafafa] flex flex-col font-sans select-none text-[#1a1a1a]">
      
      {/* HEADER SECTION */}
      <header className="h-[60px] bg-white border-b border-[#e0e0e0] flex items-center px-6 justify-between shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-30">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#f0f0f0] border border-[#e0e0e0] flex items-center justify-center">
            <Camera className="w-5 h-5 text-[#444444]" />
          </div>
          <div>
            <h1 className="text-[18px] font-medium tracking-[-0.01em] text-[#111111]">Ar-Rahmah Photobooth</h1>
            <p className="text-[11px] text-[#666666] uppercase tracking-[0.05em] font-semibold">Yayasan Ar-Rahmah</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-[#f2f2f2] p-1 border border-[#e0e0e0] rounded-[8px]">
            <button
              onClick={() => setActiveTab("terminal")}
              className={`px-3 py-1.5 rounded-[6px] font-medium text-[13px] transition-all duration-150 flex items-center space-x-2 cursor-pointer ${
                activeTab === "terminal"
                  ? "bg-white text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                  : "text-[#666666] hover:bg-[#e5e5e5]"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded-[6px] font-medium text-[13px] transition-all duration-150 flex items-center space-x-2 cursor-pointer ${
                activeTab === "settings"
                  ? "bg-white text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                  : "text-[#666666] hover:bg-[#e5e5e5]"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`px-3 py-1.5 rounded-[6px] font-medium text-[13px] transition-all duration-150 flex items-center space-x-2 cursor-pointer ${
                activeTab === "export"
                  ? "bg-white text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                  : "text-[#666666] hover:bg-[#e5e5e5]"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>

          <div className="h-8 w-[1px] bg-[#e0e0e0] mx-2"></div>

          <button
            onClick={() => setSettings({ ...settings, isSimulatorMode: !settings.isSimulatorMode })}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors cursor-pointer ${
              settings.isSimulatorMode 
                ? "bg-[#f5f5f5] text-[#444444] border border-[#d1d1d1]" 
                : "bg-[#111111] text-[#ffffff]"
            }`}
            title="Toggle Simulation Mode"
          >
            <span className={`w-2 h-2 rounded-full ${settings.isSimulatorMode ? "bg-[#888888]" : "bg-[#1e8e3e]"}`}></span>
            {settings.isSimulatorMode ? "Simulation" : "Cloud Sync"}
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <main className="flex-1 flex overflow-hidden w-full relative z-20 bg-[#fafafa]">
        
        {/* Tab view containers */}
        <div className="flex-1 flex overflow-hidden w-full h-full justify-center">
          {activeTab === "terminal" ? (
            <div className="w-full h-full overflow-y-auto items-start flex flex-col justify-center">
               <Photobooth
                settings={settings}
                setSettings={setSettings}
                onPhotoCaptured={handlePhotoCaptured}
               />
            </div>
          ) : activeTab === "settings" ? (
            <div className="w-full h-full overflow-y-auto">
              <SettingsView settings={settings} setSettings={setSettings} cameras={cameras} />
            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto p-8 flex items-center justify-center flex-col">
              <Exporter />
            </div>
          )}
        </div>

      </main>

      {/* POST-CAPTURE OVERLAY/CONFIRMATION PORTAL */}
      {capturedImage && (
        <PostCaptureModal
          imageBytes={capturedImage}
          frameId={capturedFrameId}
          settings={settings}
          onClose={() => setCapturedImage(null)}
        />
      )}
    </div>
  );
}
