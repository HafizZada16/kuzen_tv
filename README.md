# Kuzen TV (Standalone Android TV Companion)

A dedicated Android TV client for **Kuzen App**, built with **Expo (SDK 52+)**, **TypeScript**, and **`@react-native-tvos/config-tv`**. Designed specifically for 10-foot TV experience, D-Pad remote navigation, and spatial focus.

---

## 📺 Android TV OS & Hardware Specifications

- **Compatibility**: Android TV 7.0+ (Nougat, API 24+ / `minSdkVersion: 24`).
- **Device Support**: Official Google TV and AOSP Android TV Boxes (`android.software.leanback` configured with `required: false`).
- **Touchscreen**: `android.hardware.touchscreen` configured with `required: false`.
- **Orientation**: Locked strictly to **Landscape (1080p Full HD)**.
- **TV Launcher**: Native Android TV banner (`16:9`) and `LEANBACK_LAUNCHER` intent filter configured in `app.json`.

---

## 🎨 10-Foot UI & Remote Navigation Design

1. **YouTube TV-Style Collapsible Sidebar Rail (`TVSidebar.tsx`)**:
   - **Compact Rail (72px)**: Menampilkan ikon saja saat fokus berada di konten agar layar tetap lega.
   - **Expand on Focus (224px)**: Melebar secara mulus dengan animasi teks dan bayangan saat remote D-Pad digeser ke kiri.
   - **Dimming Backdrop**: Lapisan gelap semi-transparan muncul di atas konten utama saat sidebar aktif.
   - **Navigasi Tab**: Beranda, Anime, Donghua, Film Bioskop, Riwayat, Pengaturan.

2. **Spatial Focus System (`TVFocusableCard.tsx`)**:
   - Skala membesar **1.08x** dengan animasi pegas yang halus saat disorot remote.
   - Border **2px solid Kuzen Orange (`#ea580c`)** dengan efek glow.
   - Indikator Play bulat di bagian tengah kartu.

3. **Katalog Media & Baris Carousel (`TVMediaRow.tsx` & `TVHeroBanner.tsx`)**:
   - *Hero Banner Spotlight* untuk rilis unggulan terbaru (Anime & Film Populer).
   - *Horizontal Scrolling Rows* responsif terhadap D-Pad Kiri/Kanan.
   - Baris multi-konten Beranda: Film Bioskop Populer, Anime Terbaru, Film Aksi Pilihan, Donghua Populer, dan Donghua Terbaru.
   - Dialog *Episode Selector* (`TVMediaModal.tsx`) dengan navigasi grid D-Pad.

---

## 🎬 TV Video Player (SmartTube OSD & Modular Injected Scripts)

Kuzen TV menggunakan arsitektur hybrid **Native HLS.js + Modular Media Hijacking** dengan isolasi penuh:

### 1. 4-Tier D-Pad Navigation Engine (`MainActivity.kt` + `TVNativePlayer.tsx`)
Semua tombol hardware remote TV (`DPAD_UP`, `DPAD_DOWN`, `DPAD_LEFT`, `DPAD_RIGHT`, `DPAD_CENTER`, `ENTER`, `MEDIA_PLAY_PAUSE`, `BACK`) dicegat langsung di root Activity dan disalurkan via `DeviceEventEmitter`:
- **Tingkat 1 (Watch Fullscreen)**: Layar penuh bersih tanpa gangguan. Tekan `OK` untuk Play/Pause, `Kiri/Kanan` untuk Seek `±10s` (dengan akselerasi streak SmartTube), `Bawah` untuk membuka OSD.
- **Tingkat 2 (High-Contrast Seekbar)**: Rail seekbar dengan border `#FFFFFF` 3px. Scrubbing instan menampilkan badge preview waktu `◄/► [±10s] 01:29 • OK: Lompat`.
- **Tingkat 3 (Barisan Quick Actions)**:
  - **Pilihan Server / Episode**: Membuka drawer server multi-provider & episode.
  - **Pilihan Subtitle**: Pengalih subtitle instan dengan indikator bahasa aktif.
  - **Kualitas HD**: Switcher level resolusi HLS (`HD AUTO`, `1080p`, `720p`, dll.).
  - **Kecepatan Putar**: `⚡ 1x`, `1.25x`, `1.5x`, `2x`.
  - **Rasio Aspek**: `📺 AUTO`, `16:9`, `FILL`, `COVER`.
- **Tingkat 4 (Slide-up Drawer)**: Drawer kartu interaktif yang hanya dirender saat dibuka (`{isDrawerOpen && <Drawer>}`) untuk menjaga performa rendering D-Pad.

### 2. Skrip Injeksi Terisolasi per Kategori
- **`animeInjectedScript.ts`**: Khusus Otakudesu, Playdesu, Desustream, Odstream, Vidhide, Mega.
- **`donghuaInjectedScript.ts`**: Khusus Kuramadrive, Kuramanime, dan Anichin.
- **`movieInjectedScript.ts`**: Khusus FrameX TV embed player (Executioner, Bowler, Titan, dll.).
- **`hlsPlayerTemplate.ts`**: Standalone HTML5 + Hls.js dengan capping resolusi `<= 1080p` (mencegah crash decoder 4K pada Android TV), pelaporan dimensi video, dan background solid `#000000`.

### 3. Subtitle Engine Mandiri (`subtitleParser.ts`)
- Parser lokal format SubRip (`.srt`) dan WebVTT (`.vtt`) dari upstream Stremio / OpenSubtitles.
- Tampilan overlay teks kuning kontras tinggi (`#FFFF55`) dengan bayangan teks tajam dan pill semi-transparan yang disinkronkan secara real-time dengan video.

---

## 🚀 Panduan Memulai (Development & Run)

### 1. Instalasi Dependensi
```bash
npm install
# atau
yarn install
```

### 2. Menjalankan di Emulator Android TV / TV Box
Pastikan Android TV Emulator (dengan arsitektur x86_64 atau arm64) atau TV Box fisik sudah terhubung via ADB:
```bash
adb devices
```

Lalu jalankan prebuild & run Android TV:
```bash
npx expo run:android
```

### 3. Build APK Standalone untuk Android TV
Gunakan EAS Build atau Expo Prebuild untuk menghasilkan file `.apk`:
```bash
# Build APK lokal release
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
File APK Android TV akan berada di `android/app/build/outputs/apk/release/app-release.apk`.
Install langsung ke TV via ADB:
```bash
adb install -r app-release.apk
```

---

## 📁 Struktur Direktori

```
kuzen_tv/
├── assets/
│   ├── banner.png              # Android TV 16:9 Banner Launcher
│   └── images/                 # Logo, ikon adaptif, dan splash
├── src/
│   ├── components/
│   │   ├── player/
│   │   │   ├── animeInjectedScript.ts    # Skrip Media Hijacking khusus Otakudesu & Anime
│   │   │   ├── donghuaInjectedScript.ts  # Skrip Media Hijacking khusus Kuramadrive Donghua
│   │   │   ├── movieInjectedScript.ts    # Skrip Media Hijacking khusus FrameX TV Embed
│   │   │   ├── hlsPlayerTemplate.ts      # Template Hls.js dengan resolution capping (<=1080p)
│   │   │   └── TVNativePlayer.tsx        # Player Android TV 4-Tier SmartTube OSD
│   │   ├── TVFocusableCard.tsx           # Kartu TV focusable (scale 1.08x, #ea580c)
│   │   ├── TVHeroBanner.tsx              # Spotlight banner layar 1080p
│   │   ├── TVMediaModal.tsx              # Episode picker modal dengan D-Pad
│   │   ├── TVMediaRow.tsx                # Baris carousel horizontal
│   │   └── TVSidebar.tsx                 # Sidebar collapsible ala YouTube TV
│   ├── constants/
│   │   └── Colors.ts                     # Token warna Kuzen Brand Orange (#ea580c)
│   ├── screens/
│   │   ├── AnimeScreen.tsx               # Katalog Anime Otakudesu
│   │   ├── DonghuaScreen.tsx             # Katalog Donghua Anichin
│   │   ├── MovieScreen.tsx               # Katalog Film Bioskop FrameX TV
│   │   ├── HistoryScreen.tsx             # Riwayat tontonan Supabase
│   │   ├── HomeScreen.tsx                # Halaman beranda utama multi-katalog
│   │   └── SettingsScreen.tsx            # Info sistem TV & panduan remote
│   ├── services/
│   │   ├── api.ts                        # Axios client dengan retry backoff
│   │   ├── mediaService.ts               # Scraper Otakudesu, Anichin, Kurama HLS
│   │   ├── movieService.ts               # Scraper FrameX TV Movie & Multi-Provider
│   │   ├── supabase.ts                   # Supabase cloud client
│   │   └── userService.ts                # Sinkronisasi watch history & bookmarks
│   ├── utils/
│   │   └── subtitleParser.ts             # Parser SRT & WebVTT untuk TV Subtitle Overlay
│   └── types/
│       └── index.ts                      # Definisi tipe data global
├── App.tsx                               # Root container Android TV
├── app.json                              # Konfigurasi @react-native-tvos/config-tv
├── package.json                          # Dependensi Expo SDK 52+
└── tsconfig.json                         # Konfigurasi TypeScript
```

