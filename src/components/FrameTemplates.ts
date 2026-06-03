import { FrameTemplate } from "../types";

export const FRAME_TEMPLATES: FrameTemplate[] = [
  {
    id: "custom-frame-png",
    name: "Custom (frame.png)",
    description: "Overlay menggunakan file /frame.png dari folder public.",
    color: "from-gray-700 to-gray-500",
    imageUrl: "/frame.png",
    getSvgString: (width: number, height: number) => {
      // Return empty SVG space for the UI
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`;
    }
  },
  {
    id: "royal-gold",
    name: "Classic Gold & Blue",
    description: "Royal gold borders with Islamic geometric corner designs and deep blue banners.",
    color: "from-blue-900 via-amber-700 to-amber-500",
    getSvgString: (width: number, height: number, customText?: string) => {
      const bannerText = customText || "Wisuda SIT Ar-Rahmah";
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
        <!-- Main Gold Double Border -->
        <rect x="15" y="15" width="${width - 30}" height="${height - 30}" rx="10" stroke="#D4AF37" stroke-width="4" />
        <rect x="23" y="23" width="${width - 46}" height="${height - 46}" rx="6" stroke="#003366" stroke-width="1" stroke-dasharray="8,4" />
        <rect x="27" y="27" width="${width - 54}" height="${height - 54}" rx="4" stroke="#D4AF37" stroke-width="1" />

        <!-- Corner Geometric Decorations -->
        <!-- Top Left -->
        <path d="M15 15 L60 15 L15 60 Z" fill="#003366" />
        <path d="M15 15 L50 15 L15 50 Z" fill="#D4AF37" />
        <polygon points="30,30 38,22 46,30 38,38" fill="#FFFFFF" opacity="0.9" />
        <polygon points="30,30 38,22 46,30 38,38" stroke="#D4AF37" stroke-width="1.5" fill="none" />

        <!-- Top Right -->
        <path d="M${width - 15} 15 L${width - 60} 15 L${width - 15} 60 Z" fill="#003366" />
        <path d="M${width - 15} 15 L${width - 50} 15 L${width - 15} 50 Z" fill="#D4AF37" />
        <polygon points="${width - 38},30 ${width - 30},22 ${width - 22},30 ${width - 30},38" fill="#FFFFFF" opacity="0.9" />
        <polygon points="${width - 38},30 ${width - 30},22 ${width - 22},30 ${width - 30},38" stroke="#D4AF37" stroke-width="1.5" fill="none" />

        <!-- Bottom Left -->
        <path d="M15 ${height - 15} L60 ${height - 15} L15 ${height - 60} Z" fill="#003366" />
        <path d="M15 ${height - 15} L50 ${height - 15} L15 ${height - 50} Z" fill="#D4AF37" />

        <!-- Bottom Right -->
        <path d="M${width - 15} ${height - 15} L${width - 60} ${height - 15} L${width - 15} ${height - 60} Z" fill="#003366" />
        <path d="M${width - 15} ${height - 15} L${width - 50} ${height - 15} L${width - 15} ${height - 50} Z" fill="#D4AF37" />

        <!-- Bottom Branding Bar -->
        <g transform="translate(0, ${height - 110})">
          <!-- Background Banner Blue with Gold borders -->
          <rect x="40" y="0" width="${width - 80}" height="70" rx="8" fill="#002244" opacity="0.95" stroke="#D4AF37" stroke-width="2" />
          <path d="M40 0 L60 -15 L80 0 Z" fill="#D4AF37" />
          <path d="M${width - 40} 0 L${width - 60} -15 L${width - 80} 0 Z" fill="#D4AF37" />
          
          <!-- Gold text labels -->
          <text x="${width / 2}" y="32" font-family="'Inter', sans-serif" font-weight="800" font-size="22" fill="#D4AF37" text-anchor="middle" letter-spacing="1">${bannerText.toUpperCase()}</text>
          <text x="${width / 2}" y="55" font-family="'JetBrains Mono', monospace" font-weight="500" font-size="12" fill="#00A8E8" text-anchor="middle" letter-spacing="3">YAYASAN AR-RAHMAH • EVENT PHOTOBOOTH</text>
        </g>
      </svg>`;
    }
  },
  {
    id: "modern-blue",
    name: "Geometric Tech-Blue",
    description: "Angular blue abstract designs with modern glowing gold highlights.",
    color: "from-blue-600 via-cyan-500 to-amber-400",
    getSvgString: (width: number, height: number, customText?: string) => {
      const bannerText = customText || "Photoboot SIT Ar-Rahmah";
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
        <!-- Thin Tech gold Border -->
        <rect x="15" y="15" width="${width - 30}" height="${height - 30}" rx="4" stroke="#00A8E8" stroke-width="2" />
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="2" stroke="#D4AF37" stroke-width="1" opacity="0.7" />

        <!-- Top Left Modern Angled Plates -->
        <polygon points="15,15 120,15 90,45 15,45" fill="#003366" opacity="0.9"/>
        <polygon points="15,45 150,45 130,60 15,60" fill="#00A8E8" opacity="0.7"/>
        <text x="54" y="32" font-family="'Inter', sans-serif" font-weight="750" font-size="11" fill="#FFFFFF" tracking="1">SIT AR-RAHMAH</text>

        <!-- Top Right Modern Angled Plates -->
        <polygon points="${width - 15},15 ${width - 120},15 ${width - 90},45 ${width - 15},45" fill="#003366" opacity="0.9"/>
        <polygon points="${width - 15},45 ${width - 150},45 ${width - 130},60 ${width - 15},60" fill="#D4AF37" opacity="0.8"/>
        <text x="${width - 85}" y="32" font-family="'Inter', sans-serif" font-weight="700" font-size="10" fill="#FFFFFF" text-anchor="middle">LIVE EVENT</text>

        <!-- Side Structural Accents -->
        <line x1="15" y1="${height / 2 - 40}" x2="15" y2="${height / 2 + 40}" stroke="#D4AF37" stroke-width="4" />
        <line x1="${width - 15}" y1="${height / 2 - 40}" x2="${width - 15}" y2="${height / 2 + 40}" stroke="#00A8E8" stroke-width="4" />

        <!-- Bottom Banner with Angular Polygons -->
        <!-- Left Wing -->
        <polygon points="15,${height - 15} 120,${height - 15} 140,${height - 65} 15,${height - 65}" fill="#003366" opacity="0.9"/>
        <!-- Right Wing -->
        <polygon points="${width - 15},${height - 15} ${width - 120},${height - 15} ${width - 140},${height - 65} ${width - 15},${height - 65}" fill="#003366" opacity="0.9"/>

        <!-- Center Ribbon -->
        <polygon points="100,${height - 15} ${width - 100},${height - 15} ${width - 130},${height - 80} 130,${height - 80}" fill="#005C8A" opacity="0.9" stroke="#D4AF37" stroke-width="2"/>
        
        <!-- Text details -->
        <text x="${width / 2}" y="${height - 48}" font-family="'Inter', sans-serif" font-weight="800" font-size="20" fill="#FFFFFF" text-anchor="middle" letter-spacing="1.5">${bannerText.toUpperCase()}</text>
        <text x="${width / 2}" y="${height - 28}" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="11" fill="#D4AF37" text-anchor="middle" letter-spacing="4">MENDIDIK DENGAN HATI DAN PRESTASI</text>
      </svg>`;
    }
  },
  {
    id: "graduation-joy",
    name: "Graduation Celebration",
    description: "Joyful frame with graduation cap shapes, hanging gold stars, and warm tones.",
    color: "from-amber-500 via-yellow-400 to-emerald-500",
    getSvgString: (width: number, height: number, customText?: string) => {
      const bannerText = customText || "Selamat Wisuda SIT Ar-Rahmah";
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
        <!-- Playful double borders of gold and dark teal -->
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="12" stroke="#D4AF37" stroke-width="3" />
        <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="8" stroke="#10B981" stroke-width="1.5" opacity="0.6" />

        <!-- Hanging Stars and Sparkles on Top -->
        <!-- Thread 1 -->
        <line x1="120" y1="20" x2="120" y2="60" stroke="#D4AF37" stroke-width="1.5" />
        <polygon points="120,68 123,62 129,62 124,58 126,52 120,56 114,52 116,58 111,62 117,62" fill="#D4AF37" />
        
        <!-- Thread 2 -->
        <line x1="${width - 120}" y1="20" x2="${width - 120}" y2="75" stroke="#D4AF37" stroke-width="1.5" />
        <polygon points="${width - 120},83 ${width - 117},77 ${width - 111},77 ${width - 116},73 ${width - 114},67 ${width - 120},71 ${width - 126},67 ${width - 124},73 ${width - 129},77 ${width - 123},77" fill="#D4AF37" />

        <!-- Graduation Hat Element in Top Left Corner -->
        <g transform="translate(35, 30)">
          <polygon points="20,15 45,5 70,15 45,25" fill="#334155" />
          <polygon points="20,15 45,5 70,15 45,25" stroke="#D4AF37" stroke-width="1" />
          <rect x="35" y="19" width="20" height="9" fill="#1E293B" />
          <path d="M60 17 L65 30 L62 31" stroke="#D4AF37" stroke-width="2" fill="none" />
          <circle cx="62" cy="31" r="2.5" fill="#D4AF37" />
        </g>

        <!-- Sparkles in Top Right -->
        <g transform="translate(${width - 80}, 35)">
          <path d="M15 0 L18 8 L26 11 L18 14 L15 22 L12 14 L4 11 L12 8 Z" fill="#D4AF37" />
        </g>

        <!-- Bottom Banner with Wavy Soft Backdrop -->
        <g transform="translate(0, ${height - 115})">
          <path d="M 40 40 Q ${width / 2} 10 ${width - 40} 40 L ${width - 40} 85 Q ${width / 2} 85 40 85 Z" fill="#111827" opacity="0.9" stroke="#D4AF37" stroke-width="2" />
          
          <!-- Elegant Wavy Ribbon text -->
          <text x="${width / 2}" y="53" font-family="'Inter', sans-serif" font-weight="900" font-size="20" fill="#FBBF24" text-anchor="middle" letter-spacing="1">GRADUATION DAY 🎉</text>
          <text x="${width / 2}" y="76" font-family="'Inter', sans-serif" font-weight="700" font-size="14" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">${bannerText}</text>
        </g>
      </svg>`;
    }
  },
  {
    id: "minimalist-gold",
    name: "Minimalist Elegance",
    description: "Ultra-clean thin double golden lines, maximize visibility, perfect for formal settings.",
    color: "from-amber-600 to-amber-200",
    getSvgString: (width: number, height: number, customText?: string) => {
      const bannerText = customText || "Yayasan Ar-Rahmah";
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
        <!-- Thin Prestigious gold Border -->
        <rect x="25" y="25" width="${width - 50}" height="${height - 50}" rx="0" stroke="#D4AF37" stroke-width="2" />
        <rect x="31" y="31" width="${width - 62}" height="${height - 62}" rx="0" stroke="#D4AF37" stroke-width="0.75" />

        <!-- Simple Clean Side Text -->
        <text x="45" y="52" font-family="'JetBrains Mono', monospace" font-weight="800" font-size="11" fill="#D4AF37" letter-spacing="3">SIT AR-RAHMAH</text>
        
        <!-- Bottom Banner Overlay Minimal -->
        <g transform="translate(${width / 2 - 200}, ${height - 80})">
          <rect x="0" y="0" width="400" height="42" fill="#FFFFFF" opacity="0.9" stroke="#D4AF37" stroke-width="1.5" />
          <text x="200" y="26" font-family="'Inter', sans-serif" font-weight="700" font-size="14" fill="#1F2937" text-anchor="middle" letter-spacing="2">${bannerText.toUpperCase()}</text>
        </g>

        <!-- Beautiful Decorative Gold Seal in Bottom Right Corner -->
        <g transform="translate(${width - 85}, ${height - 85}) scale(0.8)">
          <circle cx="35" cy="35" r="25" fill="#003366" stroke="#D4AF37" stroke-width="2" />
          <circle cx="35" cy="35" r="22" stroke="#D4AF37" stroke-width="1" stroke-dasharray="4,2" fill="none" />
          <text x="35" y="38" font-family="'Inter', sans-serif" font-weight="900" font-size="9" fill="#D4AF37" text-anchor="middle">OFFICIAL</text>
          <path d="M22 55 L25 70 L35 63 L45 70 L48 55 Z" fill="#D4AF37" opacity="0.8" />
        </g>
      </svg>`;
    }
  }
];
