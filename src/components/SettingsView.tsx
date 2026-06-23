import React from "react";
import { AppSettings } from "../types";
import { RefreshCw, Camera } from "lucide-react";

interface SettingsViewProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  cameras: MediaDeviceInfo[];
}

export function SettingsView({ settings, setSettings, cameras }: SettingsViewProps) {
  return (
    <div className="w-full h-full max-w-3xl mx-auto p-4 md:p-8 flex flex-col items-center">
      <div className="w-full bg-[#ffffff] border border-[#ebebeb] p-6 rounded-[8px] flex flex-col space-y-6 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-[#111111] text-[20px] font-medium tracking-[-0.01em]">Settings</h2>
          <p className="text-[14px] text-[#666666] mt-1">Configure layout, data sync, and device parameters</p>
        </div>
        
        <div className="h-[1px] bg-[#e0e0e0] w-full" />
        
        <div className="flex flex-col space-y-6 w-full max-w-xl">
          {/* Dynamic Label Customization Input */}
          <div className="flex flex-col">
            <label htmlFor="custom-text-input" className="block text-[14px] font-medium text-[#444444] mb-2">Banner Custom Text</label>
            <input
              id="custom-text-input"
              type="text"
              className="w-full h-[44px] px-4 text-[14px] border border-[#d1d1d1] rounded-[6px] bg-[#ffffff] text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
              placeholder="cth: Wisuda SIT Ar-Rahmah"
              value={settings.customText}
              onChange={(e) => setSettings({ ...settings, customText: e.target.value })}
            />
          </div>

          {/* Google Apps Script / Database URL Input */}
          <div className="flex flex-col">
            <label htmlFor="gas-url-input" className="block text-[14px] font-medium text-[#444444] mb-2 flex items-center justify-between">
              <span>Database Sync URL</span>
              <span className="text-[11px] text-[#2ba049] bg-[#eafdcf] px-2 py-0.5 rounded-sm">auto-saves</span>
            </label>
            <input
              id="gas-url-input"
              type="password"
              className="w-full h-[44px] px-4 text-[14px] border border-[#d1d1d1] rounded-[6px] bg-[#fafafa] text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all font-mono"
              placeholder="Paste Google Apps Script URL..."
              value={settings.googleAppsScriptUrl || ""}
              onChange={(e) => setSettings({ ...settings, googleAppsScriptUrl: e.target.value })}
            />
            <p className="text-[12px] text-[#888] mt-2 leading-snug">
              Masukkan URL Code.gs untuk langsung auto-sync dan upload hasil ke Google Drive saat link dibuka.
            </p>
          </div>

          {/* Swap Camera Device Selection */}
          {cameras.length > 1 && (
            <div className="flex flex-col">
              <label htmlFor="camera-select" className="block text-[14px] font-medium text-[#444444] mb-2">Camera Source</label>
              <div className="relative">
                <select
                  id="camera-select"
                  className="w-full h-[44px] px-4 text-[14px] border border-[#d1d1d1] rounded-[6px] bg-[#ffffff] text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all appearance-none cursor-pointer"
                  value={settings.cameraDeviceId}
                  onChange={(e) => setSettings({ ...settings, cameraDeviceId: e.target.value })}
                >
                  <option value="">Default OS Camera</option>
                  {cameras.map((c, idx) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <RefreshCw className="absolute right-4 top-[14px] w-4 h-4 text-[#777777] pointer-events-none" />
              </div>
            </div>
          )}

          {/* Mirror Camera Setting */}
          <div className="flex flex-col">
            <label className="flex items-center space-x-3 cursor-pointer mt-2 w-fit">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={settings.mirrorCamera}
                  onChange={(e) => setSettings({ ...settings, mirrorCamera: e.target.checked })}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${settings.mirrorCamera ? "bg-[#111111]" : "bg-[#e0e0e0]"}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.mirrorCamera ? "translate-x-4" : "translate-x-0"}`}></div>
              </div>
              <span className="text-[14px] font-medium text-[#444444]">Mirror Camera</span>
            </label>
            <p className="text-[12px] text-[#888] mt-1 leading-snug">
              Flip the camera view horizontally (like a mirror). Keep this enabled if using a front-facing camera.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
