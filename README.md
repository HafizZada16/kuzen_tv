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
   - **Navigasi Tab**: Beranda, Anime, Donghua, Riwayat, Pengaturan.

2. **Spatial Focus System (`TVFocusableCard.tsx`)**:
   - Skala membesar **1.08x** dengan animasi pegas yang halus saat disorot remote.
   - Border **2px solid Kuzen Orange (`#ea580c`)** dengan efek glow.
   - Indikator Play bulat di bagian tengah kartu.

3. **Katalog Media & Baris Carousel (`TVMediaRow.tsx` & `TVHeroBanner.tsx`)**:
   - *Hero Banner Spotlight* untuk rilis unggulan terbaru.
   - *Horizontal Scrolling Rows* responsif terhadap D-Pad Kiri/Kanan.
   - Dialog *Episode Selector* (`TVMediaModal.tsx`) dengan navigasi grid D-Pad.

---

## 🎬 TV Video Player (Quetta Media Hijacking + Native OSD)

Karena scraper anime dan donghua menyediakan stream pihak ketiga (*embed iframe*), **kuzen-tv** menggunakan **Quetta Media Hijacking Architecture**:
1. **Latar Belakang Terisolasi**: `WebView` berjalan di background dan otomatis membersihkan iklan, tombol web, serta pop-up pihak ketiga.
2. **Jembatan Remote D-Pad Hardware**:
   - **D-Pad OK / Center**: Toggle Play / Pause (`window.__QUETTA_EXEC__('TOGGLE')`).
   - **D-Pad Kiri / Kanan**: Seek -10s / +10s dengan visual toast feedback.
   - **D-Pad Bawah**: Membuka *bottom drawer* OSD untuk ganti episode atau ganti server.
   - **Back Button**: Menutup drawer jika terbuka, atau keluar dari player.
   - **Auto-Hide (4 Detik)**: OSD otomatis menghilang setelah 4 detik hening.
3. **Netflix-Style Bottom Controls**:
   - **Seekbar di posisi ATAS**: Track progres berwarna **Kuzen Brand Orange (`#ea580c`)**, buffer track putih semi-transparan.
   - **Waktu & Info di posisi BAWAH**: Durasi berjalan / total (`01:45 / 23:40`) dan badge server stream.
4. **Supabase Watch History Telemetry**:
   - Polling berkala dengan pengecekan aman `if (player)`.
   - Melanjutkan (*auto-resume*) posisi tontonan terakhir.
   - Pemetaan sumber: `"otakudesu"` untuk Anime dan `"anichin"` untuk Donghua.

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
│   │   │   ├── hlsPlayerTemplate.ts      # Template Hls.js untuk stream Kurama
│   │   │   ├── quettaInjectedScript.ts   # Skrip Quetta Media Hijacking
│   │   │   └── TVNativePlayer.tsx        # Player Android TV dengan Netflix OSD
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
│   │   ├── HistoryScreen.tsx             # Riwayat tontonan Supabase
│   │   ├── HomeScreen.tsx                # Halaman beranda utama
│   │   └── SettingsScreen.tsx            # Info sistem TV & panduan remote
│   ├── services/
│   │   ├── api.ts                        # Axios client dengan retry backoff
│   │   ├── mediaService.ts               # Scraper Otakudesu, Anichin, Kurama HLS
│   │   ├── supabase.ts                   # Supabase cloud client
│   │   └── userService.ts                # Sinkronisasi watch history & bookmarks
│   └── types/
│       └── index.ts                      # Definisi tipe data global
├── App.tsx                               # Root container Android TV
├── app.json                              # Konfigurasi @react-native-tvos/config-tv
├── package.json                          # Dependensi Expo SDK 52+
└── tsconfig.json                         # Konfigurasi TypeScript
```

