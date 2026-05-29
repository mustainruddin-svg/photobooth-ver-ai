import React, { useState } from "react";
import { Clipboard, Check, FileCode, HardDrive, Heart, HelpCircle, StepForward, Terminal } from "lucide-react";
import { FRAME_TEMPLATES } from "./FrameTemplates";

export default function Exporter() {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [activeTab, setActiveTab] = useState<"gs" | "html">("gs");

  const handleCopyScript = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(standaloneHtmlCode);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  // Google Apps Script source code
  const googleAppsScriptCode = `/**
 * =========================================================================
 * AR-RAHMAH CLOUD BACKEND FOR PHOTOBOOTH (Code.gs)
 * =========================================================================
 * Karya: Yayasan Ar-Rahmah Event Technology Team
 * 
 * Petunjuk Penggunaan:
 * 1. Buka https://script.google.com/ memakai akun Google Anda.
 * 2. Hapus seluruh isi default editor kemudian tempel seluruh kode ini.
 * 3. Ubah variabel 'MY_DRIVE_FOLDER_ID' di bawah jika memiliki folder khusus,
 *    atau biarkan kosong "" agar sistem membuat folder otomatis di Drive Anda.
 * 4. Klik ikon Save, lalu pilih menu: Deploy -> New Deployment.
 * 5. Pilih jenis deployment: Web App (ikon gir).
 * 6. Beri nama deskripsi dan atur konfigurasi:
 *    - Execute as: "Me" (Email Anda)
 *    - Who has access: "Anyone" (HARUS Dipilih ini agar publik bisa kirim foto)
 * 7. Klik Deploy. Izinkan akses autentikasi akun Google Anda.
 * 8. Salin URL Web App yang keluar di akhir (akan dipakai di Web Frontend).
 */

function doPost(e) {
  try {
    // ---------------------------------------------------------------------
    // KONFIGURASI: Ganti placeholder ini dengan ID folder Google Drive Anda
    // Jika dibiarkan kosong "", folder baru bernama "Ar-Rahmah_Photobooth"
    // akan dibuat otomatis di Root Google Drive Anda saat upload pertama.
    // ---------------------------------------------------------------------
    var MY_DRIVE_FOLDER_ID = ""; // Cth: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ" 

    // Baca payload JSON dari request POST
    var rawContents = e.postData.contents;
    var requestData = JSON.parse(rawContents);
    
    var base64Image = requestData.image; 
    var filename = requestData.filename || ("ArRahmah_Photobooth_" + new Date().getTime() + ".jpg");
    var mimeType = requestData.mimeType || "image/jpeg";
    
    if (!base64Image) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: "Missing image parameters: Base64 data is empty." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Decode data Base64 ke dalam Byte Array
    var decodedBytes = Utilities.base64Decode(base64Image);
    var blob = Utilities.newBlob(decodedBytes, mimeType, filename);
    
    // Cari Folder Tujuan
    var folder;
    if (MY_DRIVE_FOLDER_ID && MY_DRIVE_FOLDER_ID.trim() !== "") {
      folder = DriveApp.getFolderById(MY_DRIVE_FOLDER_ID);
    } else {
      // Cari folder yang sudah ada atau buat baru
      var folders = DriveApp.getFoldersByName("Ar-Rahmah_Photobooth");
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("Ar-Rahmah_Photobooth");
      }
    }
    
    // Tulis file JPG baru ke Drive
    var file = folder.createFile(blob);
    
    // ATUR IZIN BERBAGI: Siapa saja dengan tautan bisa melihat file
    // Ini sangat penting agar link dan QR code dapat diakses oleh browser peserta event
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Dapatkan url unduhan langsung (direct download bypass viewer Drive HTML)
    var downloadUrl = "https://drive.google.com/uc?export=download&id=" + file.getId();
    
    // Kirimkan response JSON sukses kembali ke Website
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      id: file.getId(),
      url: downloadUrl,
      filename: filename
    })).setMimeType(ContentService.MimeType.JSON)
       .setHeader("Access-Control-Allow-Origin", "*");
       
  } catch (err) {
    // Return Error response jika ada kegagalan proses
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON)
       .setHeader("Access-Control-Allow-Origin", "*");
  }
}

// Handler untuk mem-bypass error pre-flight CORS preflight di browser
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
`;

  // Dynamic Standalone HTML page with embedded SVGs, scripts, styled beautifully
  const standaloneHtmlCode = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Photoboot SIT Ar-Rahmah - Client Terminal</title>
  
  <!-- Font Integration -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  
  <!-- QR Code Generator Lib CDN -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

  <style>
    :root {
      --bg-dark: #020617;
      --card-dark: #0f172a;
      --border-color: #1e293b;
      --primary: #00A8E8;
      --primary-dark: #005C8A;
      --gold: #D4AF37;
      --white: #ffffff;
      --text-muted: #94a3b8;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-dark);
      background-image: radial-gradient(circle at top left, #001f3f 0%, transparent 40%);
      color: var(--white);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    header {
      padding: 1rem 2rem;
      background: rgba(15, 23, 42, 0.6);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      backdrop-filter: blur(8px);
    }

    .brand h1 {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--white);
    }

    .brand p {
      font-size: 0.75rem;
      color: var(--primary);
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .gas-config-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 168, 232, 0.08);
      border: 1px solid rgba(0, 168, 232, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }

    .indicator-dot {
      width: 8px;
      height: 8px;
      background-color: #ef4444;
      border-radius: 50%;
    }

    .indicator-dot.configured {
      background-color: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .main-layout {
      flex: 1;
      display: grid;
      grid-template-cols: 1fr;
      padding: 2rem;
      gap: 2rem;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
    }

    @media (min-width: 1024px) {
      .main-layout {
        grid-template-columns: 8fr 4fr;
      }
    }

    /* Left Side Canvas Area */
    .viewport-container {
      background-color: #000;
      border: 1px solid var(--border-color);
      border-radius: 1.25rem;
      position: relative;
      overflow: hidden;
      aspect-ratio: 16/9;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    #live-video {
      width: 100%;
      height: 100%;
      object-cover: cover;
      transform: scaleX(-1);
    }

    #svg-overlay-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 5;
    }

    #svg-overlay-container svg {
      width: 100%;
      height: 100%;
    }

    /* Screen countdown overlays */
    .countdown-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.35);
      z-index: 10;
      display: none;
      align-items: center;
      justify-content: center;
    }

    .countdown-circle {
      width: 160px;
      height: 160px;
      background: rgba(15, 23, 42, 0.9);
      border: 3px solid var(--gold);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    .countdown-number {
      font-size: 4rem;
      font-weight: 900;
      color: var(--gold);
    }

    /* Flash */
    .shutter-flash {
      position: absolute;
      inset: 0;
      background: white;
      z-index: 20;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease-out;
    }

    /* Control Panel Right */
    .controls-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      justify-content: space-between;
    }

    .config-box {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid var(--border-color);
      padding: 1.5rem;
      border-radius: 1.25rem;
    }

    .section-title {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 1rem;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .input-group:last-child {
      margin-bottom: 0;
    }

    label {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    input, select {
      background: #090d16;
      border: 1px solid var(--border-color);
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      color: white;
      font-size: 0.85rem;
      outline: none;
      font-family: inherit;
    }

    input:focus, select:focus {
      border-color: var(--primary);
    }

    /* Swatches Grid */
    .frame-picker {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .frame-item {
      background: rgba(30, 41, 59, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 0.75rem;
      padding: 1rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 90px;
    }

    .frame-item:hover {
      background: rgba(30, 41, 59, 0.5);
      border-color: var(--text-muted);
    }

    .frame-item.active {
      background: rgba(0, 168, 232, 0.12);
      border-color: var(--primary);
    }

    .frame-item h4 {
      font-size: 0.75rem;
      font-weight: 700;
    }

    .frame-item p {
      font-size: 0.6rem;
      color: var(--text-muted);
    }

    .bar-indicator {
      height: 3px;
      width: 100%;
      border-radius: 9999px;
    }

    /* Primary Action Trigger */
    .capture-btn {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 50%, var(--gold) 100%);
      color: white;
      border: none;
      border-radius: 1rem;
      padding: 1.25rem;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 10px 20px -5px rgba(0, 168, 232, 0.3);
    }

    .capture-btn:active {
      transform: scale(0.97);
    }

    .capture-btn:disabled {
      background: rgba(15, 23, 42, 0.8);
      color: #64748b;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* Modal Styling */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.9);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 2rem;
      backdrop-filter: blur(12px);
    }

    .modal-card {
      background: #0b111e;
      border: 1px solid var(--border-color);
      width: 100%;
      max-width: 900px;
      border-radius: 1.5rem;
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
    }

    @media (min-width: 768px) {
      .modal-card {
        grid-template-columns: 7fr 5fr;
      }
    }

    .modal-photo-area {
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-photo-area img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .modal-ops {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-left: 1px solid var(--border-color);
    }

    .modal-tag {
      font-size: 0.6rem;
      color: var(--gold);
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.15em;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 900;
      margin-bottom: 1.5rem;
    }

    .qr-placeholder-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      padding: 2rem 0;
    }

    #qrcode {
      background: white;
      padding: 0.75rem;
      border-radius: 0.75rem;
      border: 2px solid var(--gold);
      margin-bottom: 1rem;
      display: none;
    }

    .loading-spinner-box {
      text-align: center;
      max-width: 250px;
    }

    .spinner {
      border: 3px border-color: rgba(0, 168, 232, 0.1);
      width: 45px;
      height: 45px;
      border-radius: 50%;
      border-left-color: var(--primary);
      margin: 0 auto 1rem;
      animation: spin 1s infinite linear;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .spinner-text {
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .spinner-desc {
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .link-copy-container {
      display: flex;
      background: #05080e;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 0.25rem;
      align-items: center;
      width: 100%;
      margin-bottom: 1rem;
    }

    .link-copy-container span {
      flex: 1;
      font-size: 0.6rem;
      font-family: 'JetBrains Mono', monospace;
      padding-left: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }

    .copy-btn {
      background: rgba(255,255,255,0.06);
      border: none;
      color: white;
      padding: 0.4rem 0.8rem;
      border-radius: 0.25rem;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
    }

    .copy-btn:hover {
      background: rgba(255,255,255,0.12);
    }

    .modal-footer {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .modal-close-btn {
      flex: 1;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      border-radius: 0.75rem;
      padding: 0.75rem;
      font-weight: 700;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .modal-close-btn:hover {
      color: white;
      background: var(--card-dark);
    }

    .direct-link-btn {
      background: var(--primary);
      color: white;
      text-decoration: none;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      font-weight: 700;
      font-size: 0.75rem;
    }

    .error-display {
      text-align: center;
      color: #ef4444;
      display: none;
      padding: 1rem;
    }

    .error-display h4 {
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .error-display p {
      font-size: 0.65rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <h1>Ar-Rahmah Photobooth</h1>
      <p>PHOTOBOOT SIT AR-RAHMAH</p>
    </div>
    
    <div class="gas-config-indicator">
      <span class="indicator-dot" id="config-dot"></span>
      <span id="config-text">Google Apps Script: Sedang Dicek</span>
    </div>
  </header>

  <div class="main-layout">
    
    <!-- Camera view area (16:9 ratio centered) -->
    <div class="viewport-container">
      <video id="live-video" autoplay playsinline muted></video>
      <div id="svg-overlay-container"></div>
      
      <!-- Countdown overlay -->
      <div class="countdown-overlay" id="countdown-wrap">
        <div class="countdown-circle">
          <span class="countdown-number" id="counter-display">3</span>
        </div>
      </div>

      <!-- Shutter shutter flash -->
      <div class="shutter-flash" id="lens-flash"></div>
    </div>

    <!-- Right Column Controls -->
    <div class="controls-panel">
      
      <!-- Settings Panel -->
      <div class="config-box">
        <div class="section-title">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          KONFIGURASI JIRAN
        </div>

        <div class="input-group">
          <label for="gas-app-url">Google Apps Script Web App URL</label>
          <input type="text" id="gas-app-url" placeholder="Paste URL Web App di sini..." value="">
        </div>

        <div class="input-group">
          <label for="banner-custom-text">Kustomisasi Teks Banner Bingkai</label>
          <input type="text" id="banner-custom-text" placeholder="Cth: Wisuda SIT Ar-Rahmah 2026" value="Wisuda SIT Ar-Rahmah">
        </div>

        <div class="input-group" id="camera-picker-group" style="display:none;">
          <label for="camera-device-select">Pilih Device Kamera</label>
          <select id="camera-device-select"></select>
        </div>
      </div>

      <!-- Frame picker list -->
      <div class="config-box" style="flex: 1; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div class="section-title">
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            BINGKAI TRANSPARAN
          </div>
          
          <div class="frame-picker" id="frame-picker-grid">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>

      <!-- Take Action Btn -->
      <button class="capture-btn" id="start-capture-btn">AMBIL FOTO (3D DETIK COUNDOWN)</button>
    </div>

  </div>

  <!-- SHARE POST CAPTURE DIALOG MODAL -->
  <div class="modal-backdrop" id="sharing-modal">
    <div class="modal-card">
      
      <!-- Photo render left -->
      <div class="modal-photo-area">
        <canvas id="synthesis-canvas" style="display:none;"></canvas>
        <img id="render-target-img" src="" alt="Captured Image">
      </div>

      <!-- Cloud Share right -->
      <div class="modal-ops">
        
        <div style="border-bottom:1px solid var(--border-color); padding-bottom: 1rem;">
          <span class="modal-tag">Ar-Rahmah Cloud Server</span>
          <h2 class="modal-title">BAGIKAN PRESTASI</h2>
        </div>

        <!-- Sharing QR, spinner states -->
        <div class="qr-placeholder-wrapper">
          
          <!-- Loading State indicator -->
          <div class="loading-spinner-box" id="modal-spinner">
            <div class="spinner"></div>
            <p class="spinner-text" id="spinner-status">Merender file gambar...</p>
            <p class="spinner-desc">Kompresi tinggi & proses transcluent bingkai.</p>
          </div>

          <!-- Success state QR block -->
          <div id="qrcode"></div>
          
          <!-- Error display block -->
          <div class="error-display" id="upload-error-block">
            <h4>Gagal Mengunggah Berkas</h4>
            <p id="error-explain text"></p>
          </div>
        </div>

        <!-- Copy Link box -->
        <div class="link-copy-container" id="copy-clipboard-wrap" style="display:none;">
          <span id="gas-drive-link-span"></span>
          <button class="copy-btn" id="copy-link-btn">SALIN</button>
        </div>

        <!-- Foot Actions actions -->
        <div class="modal-footer">
          <button class="modal-close-btn" id="modal-close-and-reset-btn">AMBIL BARU</button>
          <a class="direct-link-btn" id="direct-drive-open-btn" href="" target="_blank" style="display:none;">BUKA LINK</a>
        </div>

      </div>

    </div>
  </div>

  <script>
    // =========================================================================
    // BUILT-IN PREMIUM SVG BLEND CODES - 100% OFFLINE / SINGLE-FILE RE-READY
    // =========================================================================
    const FRAME_TEMPLATES = [
      {
        id: "royal-gold",
        name: "Classic Gold & Blue",
        description: "Borders emas premium & banner biru elegan.",
        color: "linear-gradient(90deg, #1e3a8a, #b45309, #f59e0b)",
        getSvgString: (w, h, txt = "Wisuda SIT Ar-Rahmah") => \`
          <svg xmlns="http://www.w3.org/2000/svg" width="\${w}" height="\${h}" viewBox="0 0 \${w} \${h}" fill="none">
            <rect x="15" y="15" width="\${w - 30}" height="\${h - 30}" rx="10" stroke="#D4AF37" stroke-width="4" />
            <rect x="23" y="23" width="\${w - 46}" height="\${h - 46}" rx="6" stroke="#003366" stroke-width="1" stroke-dasharray="8,4" />
            <rect x="27" y="27" width="\${w - 54}" height="\${h - 54}" rx="4" stroke="#D4AF37" stroke-width="1" />
            
            <path d="M15 15 L60 15 L15 60 Z" fill="#003366" />
            <path d="M15 15 L50 15 L15 50 Z" fill="#D4AF37" />
            <polygon points="30,30 38,22 46,30 38,38" fill="#FFFFFF" opacity="0.9" stroke="#D4AF37" stroke-width="1.5" />

            <path d="M\${w - 15} 15 L\${w - 60} 15 L\${w - 15} 60 Z" fill="#003366" />
            <path d="M\${w - 15} 15 L\${w - 50} 15 L\${w - 15} 50 Z" fill="#D4AF37" />
            <polygon points="\${w - 38},30 \${w - 30},22 \${w - 22},30 \${w - 30},38" fill="#FFFFFF" opacity="0.9" stroke="#D4AF37" stroke-width="1.5" />

            <path d="M15 \${h - 15} L60 \${h - 15} L15 \${h - 60} Z" fill="#003366" />
            <path d="M15 \${h - 15} L50 \${h - 15} L15 \${h - 50} Z" fill="#D4AF37" />

            <path d="M\${w - 15} \${h - 15} L\${w - 60} \${h - 15} L\${w - 15} \${h - 60} Z" fill="#003366" />
            <path d="M\${w - 15} \${h - 15} L\${w - 50} \${h - 15} L\${w - 15} \${h - 50} Z" fill="#D4AF37" />

            <g transform="translate(0, \${h - 110})">
              <rect x="40" y="0" width="\${w - 80}" height="70" rx="8" fill="#002244" opacity="0.95" stroke="#D4AF37" stroke-width="2" />
              <path d="M40 0 L60 -15 L80 0 Z" fill="#D4AF37" />
              <path d="M\${w - 40} 0 L\${w - 60} -15 L\${w - 80} 0 Z" fill="#D4AF37" />
              <text x="\${w / 2}" y="32" font-family="'Inter', sans-serif" font-weight="800" font-size="22" fill="#D4AF37" text-anchor="middle" letter-spacing="1">\${txt.toUpperCase()}</text>
              <text x="\${w / 2}" y="55" font-family="'JetBrains Mono', monospace" font-weight="500" font-size="12" fill="#00A8E8" text-anchor="middle" letter-spacing="3">YAYASAN AR-RAHMAH • EVENT PHOTOBOOTH</text>
            </g>
          </svg>\`
      },
      {
        id: "modern-blue",
        name: "Geometric Tech-Blue",
        description: "Angled digital biru & glowing gold.",
        color: "linear-gradient(90deg, #2563eb, #06b6d4, #fbbf24)",
        getSvgString: (w, h, txt = "SIT Ar-Rahmah") => \`
          <svg xmlns="http://www.w3.org/2000/svg" width="\${w}" height="\${h}" viewBox="0 0 \${w} \${h}" fill="none">
            <rect x="15" y="15" width="\${w - 30}" height="\${h - 30}" rx="4" stroke="#00A8E8" stroke-width="2" />
            <rect x="20" y="20" width="\${w - 40}" height="\${h - 40}" rx="2" stroke="#D4AF37" stroke-width="1" opacity="0.7" />

            <polygon points="15,15 120,15 90,45 15,45" fill="#003366" opacity="0.9"/>
            <polygon points="15,45 150,45 130,60 15,60" fill="#00A8E8" opacity="0.7"/>
            <text x="54" y="32" font-family="'Inter', sans-serif" font-weight="800" font-size="11" fill="#FFFFFF">SIT AR-RAHMAH</text>

            <polygon points="\${w - 15},15 \${w - 120},15 \${w - 90},45 \${w - 15},45" fill="#003366" opacity="0.9"/>
            <polygon points="\${w - 15},45 \${w - 150},45 \${w - 130},60 \${w - 15},60" fill="#D4AF37" opacity="0.8"/>
            <text x="\${w - 85}" y="32" font-family="'Inter', sans-serif" font-weight="700" font-size="10" fill="#FFFFFF" text-anchor="middle">LIVE EVENT</text>

            <line x1="15" y1="\${h / 2 - 40}" x2="15" y2="\${h / 2 + 40}" stroke="#D4AF37" stroke-width="4" />
            <line x1="\${w - 15}" y1="\${h / 2 - 40}" x2="\${w - 15}" y2="\${h / 2 + 40}" stroke="#00A8E8" stroke-width="4" />

            <polygon points="15,\${h - 15} 120,\${h - 15} 140,\${h - 65} 15,\${h - 65}" fill="#003366" opacity="0.9"/>
            <polygon points="\${w - 15},\${h - 15} \${w - 120},\${h - 15} \${w - 140},\${h - 65} \${w - 15},\${h - 65}" fill="#003366" opacity="0.9"/>

            <polygon points="100,\${h - 15} \${w - 100},\${h - 15} \${w - 130},\${h - 80} 130,\${h - 80}" fill="#005C8A" opacity="0.9" stroke="#D4AF37" stroke-width="2"/>
            
            <text x="\${w / 2}" y="\${h - 48}" font-family="'Inter', sans-serif" font-weight="800" font-size="20" fill="#FFFFFF" text-anchor="middle" letter-spacing="1.5">\${txt.toUpperCase()}</text>
            <text x="\${w / 2}" y="\${h - 28}" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="11" fill="#D4AF37" text-anchor="middle" letter-spacing="4">MENDIDIK DENGAN HATI DAN PRESTASI</text>
          </svg>\`
      },
      {
        id: "graduation-joy",
        name: "Graduation Celebration",
        description: "Bintang emas & Topi wisuda ceria.",
        color: "linear-gradient(90deg, #f59e0b, #10b981)",
        getSvgString: (w, h, txt = "Selamat Wisuda") => \`
          <svg xmlns="http://www.w3.org/2000/svg" width="\${w}" height="\${h}" viewBox="0 0 \${w} \${h}" fill="none">
            <rect x="20" y="20" width="\${w - 40}" height="\${h - 40}" rx="12" stroke="#D4AF37" stroke-width="3" />
            
            <line x1="120" y1="20" x2="120" y2="60" stroke="#D4AF37" stroke-width="1.5" />
            <polygon points="120,68 123,62 129,62 124,58 126,52 120,56 114,52 116,58 111,62 117,62" fill="#D4AF37" />
            
            <line x1="\${w - 120}" y1="20" x2="\${w - 120}" y2="75" stroke="#D4AF37" stroke-width="1.5" />
            <polygon points="\${w - 120},83 \${w - 117},77 \${w - 111},77 \${w - 116},73 \${w - 114},67 \${w - 120},71 \${w - 126},67 \${w - 124},73 \${w - 129},77 \${w - 123},77" fill="#D4AF37" />

            <g transform="translate(35, 30)">
              <polygon points="20,15 45,5 70,15 45,25" fill="#334155" stroke="#D4AF37" stroke-width="1" />
              <rect x="35" y="19" width="20" height="9" fill="#1E293B" />
              <path d="M60 17 L65 30 L62 31" stroke="#D4AF37" stroke-width="2" fill="none" />
              <circle cx="62" cy="31" r="2.5" fill="#D4AF37" />
            </g>

            <g transform="translate(\${w - 80}, 35)">
              <path d="M15 0 L18 8 L26 11 L18 14 L15 22 L12 14 L4 11 L12 8 Z" fill="#D4AF37" />
            </g>

            <g transform="translate(0, \${h - 115})">
              <path d="M 40 40 Q \${w / 2} 10 \${w - 40} 40 L \${w - 40} 85 Q \${w / 2} 85 40 85 Z" fill="#111827" opacity="0.9" stroke="#D4AF37" stroke-width="2" />
              <text x="\${w / 2}" y="53" font-family="'Inter', sans-serif" font-weight="950" font-size="20" fill="#FBBF24" text-anchor="middle" letter-spacing="1">GRADUATION DAY 🎉</text>
              <text x="\${w / 2}" y="76" font-family="'Inter', sans-serif" font-weight="700" font-size="14" fill="#FFFFFF" text-anchor="middle">\${txt}</text>
            </g>
          </svg>\`
      }
    ];

    // =========================================================================
    // FRONTEND APPLICATION CONTROLLER
    // =========================================================================
    let stream = null;
    let selectedFrame = FRAME_TEMPLATES[0];
    let qrcodeInstance = null;
    let availableCameras = [];

    // DOM selectors
    const video = document.getElementById("live-video");
    const overlayContainer = document.getElementById("svg-overlay-container");
    const configDot = document.getElementById("config-dot");
    const configText = document.getElementById("config-text");
    const gasUrlInput = document.getElementById("gas-app-url");
    const bannerTextInput = document.getElementById("banner-custom-text");
    const startCaptureBtn = document.getElementById("start-capture-btn");
    const framePickerGrid = document.getElementById("frame-picker-grid");
    const cameraSelect = document.getElementById("camera-device-select");
    const cameraSelectGroup = document.getElementById("camera-picker-group");
    
    // Timer DOMs
    const countdownWrap = document.getElementById("countdown-wrap");
    const counterDisplay = document.getElementById("counter-display");
    const lensFlash = document.getElementById("lens-flash");

    // Modal DOMs
    const sharingModal = document.getElementById("sharing-modal");
    const renderTargetImg = document.getElementById("render-target-img");
    const modalSpinner = document.getElementById("modal-spinner");
    const spinnerStatus = document.getElementById("spinner-status");
    const qrTargetDiv = document.getElementById("qrcode");
    const errorBlock = document.getElementById("upload-error-block");
    const errorExplain = document.getElementById("error-explain text");
    const copyWrap = document.getElementById("copy-clipboard-wrap");
    const directLinkSpan = document.getElementById("gas-drive-link-span");
    const copyLinkBtn = document.getElementById("copy-link-btn");
    const modalCloseBtn = document.getElementById("modal-close-and-reset-btn");
    const directOpenBtn = document.getElementById("direct-drive-open-btn");

    // Local Storage save handler
    if (localStorage.getItem("ar_rahmah_gas_url")) {
      gasUrlInput.value = localStorage.getItem("ar_rahmah_gas_url");
    }

    // Checking validation helper
    function checkGasState() {
      const url = gasUrlInput.value.trim();
      if (url === "") {
        configDot.className = "indicator-dot";
        configText.innerText = "Mode: Live Simulator (Mocks Upload)";
      } else {
        configDot.className = "indicator-dot configured";
        configText.innerText = "Google Apps Script: Tersambung";
        localStorage.setItem("ar_rahmah_gas_url", url);
      }
    }
    gasUrlInput.addEventListener("input", checkGasState);
    checkGasState();

    // Start Webcam camera stream
    async function initCamera() {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      try {
        const deviceId = cameraSelect.value;
        const constraints = {
          video: deviceId ? { deviceId: { exact: deviceId }, width: 1280, height: 720 } : { width: 1280, height: 720 },
          audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // Enumerate devices once
        if (availableCameras.length === 0) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          availableCameras = devices.filter(d => d.kind === "videoinput");
          if (availableCameras.length > 1) {
            cameraSelectGroup.style.display = "block";
            cameraSelect.innerHTML = "";
            availableCameras.forEach((cam, index) => {
              const option = document.createElement("option");
              option.value = cam.deviceId;
              option.text = cam.label || "Kamera " + (index + 1);
              cameraSelect.appendChild(option);
            });
          }
        }
      } catch (err) {
        console.error("Camera permissions not granted or failed:", err);
        alert("Gagal mengakses kamera. Mohon izinkan kamera untuk photobooth.");
      }
    }

    cameraSelect.addEventListener("change", initCamera);

    // Render Overlay stream in real-time
    function renderOverlay() {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const text = bannerTextInput.value || "Wisuda SIT Ar-Rahmah";
      overlayContainer.innerHTML = selectedFrame.getSvgString(width, height, text);
    }

    bannerTextInput.addEventListener("input", renderOverlay);

    // Setup Frames picker DOM UI
    function renderFramePicker() {
      framePickerGrid.innerHTML = "";
      FRAME_TEMPLATES.forEach(item => {
        const el = document.createElement("button");
        el.className = "frame-item" + (item.id === selectedFrame.id ? " active" : "");
        el.onclick = () => {
          selectedFrame = item;
          renderFramePicker();
          renderOverlay();
        };
        el.innerHTML = \`
          <div>
            <h4>\${item.name}</h4>
            <p>\${item.description}</p>
          </div>
          <div class="bar-indicator" style="background: \${item.color}"></div>
        \`;
        framePickerGrid.appendChild(el);
      });
    }

    // Shutter clicks synthesizers (Web Audio)
    function playBeep(freq, time) {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain);
        gain.connect(context.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.1;
        osc.start();
        setTimeout(() => { osc.stop(); context.close(); }, time);
      }catch(e){}
    }

    // Take photo triggers
    startCaptureBtn.addEventListener("click", () => {
      startCaptureBtn.disabled = true;
      let count = 3;
      countdownWrap.style.display = "flex";
      counterDisplay.innerText = count;
      playBeep(880, 80);

      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          counterDisplay.innerText = count;
          playBeep(880, 80);
        } else {
          clearInterval(interval);
          countdownWrap.style.display = "none";
          executePhotoCapture();
        }
      }, 1000);
    });

    // Mirroring & fusing camera canvas image
    function executePhotoCapture() {
      playBeep(1200, 30); // flash beep
      lensFlash.style.opacity = 1;
      setTimeout(() => { lensFlash.style.opacity = 0; }, 200);

      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      
      const canvas = document.getElementById("synthesis-canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Draw Mirrored video frames
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // resets

      // SVG over canvas
      const text = bannerTextInput.value;
      const svgStr = selectedFrame.getSvgString(width, height, text);
      const img = new Image();
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        
        // Open sharing popups
        displayShareModal(dataUrl);
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    }

    // Sharing modal actions
    async function displayShareModal(dataUrl) {
      renderTargetImg.src = dataUrl;
      sharingModal.style.display = "flex";
      
      // Reset modes states
      modalSpinner.style.display = "block";
      spinnerStatus.innerText = "Merender file gambar...";
      qrTargetDiv.style.display = "none";
      qrTargetDiv.innerHTML = "";
      errorBlock.style.display = "none";
      copyWrap.style.display = "none";
      directOpenBtn.style.display = "none";

      const gasUrl = gasUrlInput.value.trim();
      
      // SIMULATOR MODE
      if (gasUrl === "") {
        setTimeout(() => { spinnerStatus.innerText = "Mengontak Cloud Server (Simulasi)..."; }, 600);
        setTimeout(() => { spinnerStatus.innerText = "Membuat direct link unduh..."; }, 1200);
        setTimeout(() => {
          const fakeDriveUrl = "https://drive.google.com/uc?export=download&id=simulate_" + Math.random().toString(36).substr(2, 9);
          showSharingSuccess(fakeDriveUrl);
        }, 1800);
        return;
      }

      // REAL SYSTEM CONNECTIONS
      try {
        spinnerStatus.innerText = "Menghubungkan ke Google Apps Script...";
        const rawBase64 = dataUrl.split(",")[1];
        const filename = "ArRahmah_Event_" + Date.now() + ".jpg";

        const response = await fetch(gasUrl, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            image: rawBase64,
            filename: filename,
            mimeType: "image/jpeg"
          })
        });

        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }

        const data = await response.json();
        if (data.success) {
          showSharingSuccess(data.url);
        } else {
          throw new Error(data.error || "Gagal mengupload berkas ke Drive.");
        }
      } catch (err) {
        console.error(err);
        modalSpinner.style.display = "none";
        errorBlock.style.display = "block";
        errorExplain.innerText = err.message || "Terdapat kendala koneksi ke server Google Drive Yayasan Ar-Rahmah.";
      }
    }

    function showSharingSuccess(downloadUrl) {
      modalSpinner.style.display = "none";
      qrTargetDiv.style.display = "block";
      
      // Render QR Code inside container
      if (qrcodeInstance) {
        qrcodeInstance.clear();
      }
      qrcodeInstance = new QRCode(qrTargetDiv, {
        text: downloadUrl,
        width: 140,
        height: 140,
        colorDark : "#002244",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M
      });

      // Show copy bar
      copyWrap.style.display = "flex";
      directLinkSpan.innerText = downloadUrl;

      // Show open path
      directOpenBtn.style.display = "flex";
      directOpenBtn.href = downloadUrl;
    }

    // Modal Operations
    modalCloseBtn.addEventListener("click", () => {
      sharingModal.style.display = "none";
      startCaptureBtn.disabled = false;
    });

    // Copy clipboards
    copyLinkBtn.addEventListener("click", () => {
      const link = directLinkSpan.innerText;
      navigator.clipboard.writeText(link);
      copyLinkBtn.innerText = "COPIED!";
      setTimeout(() => { copyLinkBtn.innerText = "SALIN"; }, 1500);
    });

    // Warmboot initialization
    window.addEventListener("load", async () => {
      await initCamera();
      renderFramePicker();
      // Wait for camera to update actual pixel widths
      video.onloadedmetadata = () => { renderOverlay(); };
    });
  </script>
</body>
</html>
`;

  return (
    <div className="bg-[#ffffff] border border-[#ebebeb] rounded-[8px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)] max-w-7xl mx-auto w-full">
      {/* Exporter Header Info */}
      <div className="p-8 border-b border-[#ebebeb] flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#fafafa]">
        <div>
          <div className="flex items-center space-x-2 text-[#666666] mb-1">
            <Terminal className="w-5 h-5" />
            <span className="text-[11px] font-mono font-medium tracking-wide uppercase">Standalone Deployment Export</span>
          </div>
          <h2 className="text-[#111111] font-medium text-[20px] tracking-[-0.01em]">Export Photobooth Code</h2>
          <p className="text-[#666666] text-[14px] mt-1.5 max-w-2xl">
            Use this file to publish on Vercel, Netlify, Github Pages, or run entirely offline on your event tablet. No additional server required.
          </p>
        </div>

        {/* Exporter Toggles */}
        <div className="flex bg-[#f2f2f2] p-1 border border-[#e0e0e0] rounded-[8px] shrink-0">
          <button
            onClick={() => setActiveTab("gs")}
            className={`px-4 py-2 text-[13px] font-medium rounded-[6px] transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === "gs" ? "bg-white text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e0e0e0]" : "text-[#666666] hover:bg-[#e5e5e5] border border-transparent"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Code.gs</span>
          </button>
          
          <button
            onClick={() => setActiveTab("html")}
            className={`px-4 py-2 text-[13px] font-medium rounded-[6px] transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === "html" ? "bg-white text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e0e0e0]" : "text-[#666666] hover:bg-[#e5e5e5] border border-transparent"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>index.html</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[500px]">
        {/* Left Side: Copy Button, Instructions Panel (4 cols) */}
        <div className="lg:col-span-4 p-8 bg-[#ffffff] border-b lg:border-b-0 lg:border-r border-[#ebebeb] overflow-y-auto">
          
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-[#111111] text-[13px] font-medium tracking-wide uppercase">Deployment Steps</h3>
              <p className="text-[#666666] text-[13px] leading-relaxed">
                Follow the instructions below to prepare your photobooth terminal.
              </p>
            </div>

            {/* Step-by-step indicator cards */}
            {activeTab === "gs" ? (
              <div className="space-y-4">
                <div className="bg-[#fafafa] p-4 border border-[#e0e0e0] rounded-[6px] space-y-2">
                  <div className="flex items-center space-x-2 text-[#111111] text-[13px] font-medium">
                    <span className="bg-[#e5e5e5] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">1</span>
                    <span>Create Script</span>
                  </div>
                  <p className="text-[#666666] text-[12px] leading-relaxed pl-7">
                    Open <span className="text-[#111111] font-mono select-all">script.google.com</span>, create a new project and paste this code.
                  </p>
                </div>

                <div className="bg-[#fafafa] p-4 border border-[#e0e0e0] rounded-[6px] space-y-2">
                  <div className="flex items-center space-x-2 text-[#111111] text-[13px] font-medium">
                    <span className="bg-[#e5e5e5] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">2</span>
                    <span>Deploy Web App</span>
                  </div>
                  <p className="text-[#666666] text-[12px] leading-relaxed pl-7">
                    Deploy as Web App. Set "Execute as" to <span className="font-medium text-[#111111]">Me</span> and "Who has access" to <span className="font-medium text-[#111111]">Anyone</span>.
                  </p>
                </div>

                <button
                  onClick={handleCopyScript}
                  className={`w-full py-2.5 px-4 rounded-[6px] font-medium text-[13px] flex items-center justify-center space-x-2 transition-all cursor-pointer ${copiedScript ? "bg-[#e5e5e5] text-[#111111] border border-[#d1d1d1]" : "bg-[#111111] text-[#ffffff] border border-transparent hover:bg-[#333333]"}`}
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                  <span>{copiedScript ? "Code.gs Copied!" : "COPY CODE.GS"}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#fafafa] p-4 border border-[#e0e0e0] rounded-[6px] space-y-2">
                  <div className="flex items-center space-x-2 text-[#111111] text-[13px] font-medium">
                    <span className="bg-[#e5e5e5] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">1</span>
                    <span>Configure App URL</span>
                  </div>
                  <p className="text-[#666666] text-[12px] leading-relaxed pl-7">
                    After obtaining the Web App URL from Google, paste it directly in the UI settings panel.
                  </p>
                </div>

                <div className="bg-[#fafafa] p-4 border border-[#e0e0e0] rounded-[6px] space-y-2">
                  <div className="flex items-center space-x-2 text-[#111111] text-[13px] font-medium">
                    <span className="bg-[#e5e5e5] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">2</span>
                    <span>Upload Single File</span>
                  </div>
                  <p className="text-[#666666] text-[12px] leading-relaxed pl-7">
                    Deploy this single <span className="font-mono text-[#111111]">index.html</span> directly to Vercel/Netlify or run locally.
                  </p>
                </div>

                <button
                  onClick={handleCopyHtml}
                  className={`w-full py-2.5 px-4 rounded-[6px] font-medium text-[13px] flex items-center justify-center space-x-2 transition-all cursor-pointer ${copiedHtml ? "bg-[#e5e5e5] text-[#111111] border border-[#d1d1d1]" : "bg-[#111111] text-[#ffffff] border border-transparent hover:bg-[#333333]"}`}
                >
                  {copiedHtml ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                  <span>{copiedHtml ? "HTML Copied!" : "COPY INDEX.HTML"}</span>
                </button>
              </div>
            )}
            
            <div className="pt-6 mt-4 border-t border-[#ebebeb] flex items-center justify-center text-[11px] text-[#999999]">
              <span>Powered by Ar-Rahmah Technology</span>
            </div>
          </div>

        </div>

        {/* Right Side: Code Viewer Block Component (8 cols) */}
        <div className="lg:col-span-8 p-0 bg-[#fafafa] overflow-auto h-[400px] lg:h-full relative font-mono text-[13px] text-[#333333]">
          <div className="sticky top-0 bg-[#ffffff] border-b border-[#ebebeb] px-6 py-3 flex items-center justify-between text-[11px] text-[#666666] select-none font-sans font-medium uppercase tracking-wide">
            <span>{activeTab === "gs" ? "Code.gs - Script" : "index.html - Client"}</span>
            <span>READ ONLY</span>
          </div>

          <pre className="p-6 select-all max-w-full overflow-x-auto whitespace-pre leading-relaxed">
            <code>{activeTab === "gs" ? googleAppsScriptCode : standaloneHtmlCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
