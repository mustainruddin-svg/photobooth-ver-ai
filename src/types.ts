export interface FrameTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  captureCount?: number;
  getSvgString: (width: number, height: number, customText?: string) => string;
  previewSvgString?: (width: number, height: number, customText?: string) => string;
  imageUrl?: string;
}

export interface PhotoCaptureState {
  imageBytes: string | null;  // Base64 Data URL or string
  frameId: string;
  timestamp: string;
}

export interface AppSettings {
  googleAppsScriptUrl: string;
  isSimulatorMode: boolean;
  customText: string;
  cameraDeviceId: string;
  imageQuality: number;
  customOverlay: string | null;
}
