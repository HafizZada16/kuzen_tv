<p align="center">
  <img src="assets/images/kuzen_logo_transparent.png" alt="Kuzen TV Logo" width="128" />
</p>

<h1 align="center">Kuzen TV</h1>

<p align="center">
  Klien Android TV resmi untuk <strong>Kuzen App</strong> — ringan, responsif, dan dirancang khusus untuk navigasi remote D-Pad 10-foot.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.2.0-ea580c?style=flat-square" alt="Version 2.2.0" />
  <img src="https://img.shields.io/badge/platform-Android%20TV-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Android TV" />
  <img src="https://img.shields.io/badge/stack-Kotlin%20%2B%20Compose%20TV-7F52FF?style=flat-square&logo=kotlin&logoColor=white" alt="Kotlin Compose TV" />
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square" alt="GPL-3.0 License" />
</p>

---

## 1. Proyek Utama: Native Kotlin Android TV (`native-tv/`)

Fokus utama proyek ini adalah klien **Native Android TV (`native-tv/`)** berbasis **Kotlin + Jetpack Compose for TV** (~1 MB release APK) dengan UI ringkas, caching lokal, dan isolasi player yang stabil.

### Spesifikasi & Stack
- **Teknologi**: Kotlin, Jetpack Compose (`androidx.tv:tv-material`, `tv-foundation`), OkHttp, `kotlinx.serialization`, Coil.
- **Kompatibilitas**: Android TV 5.0+ (API 21+, `targetSdkVersion: 34`), `LEANBACK_LAUNCHER`, orientasi terkunci **Landscape**, tanpa syarat touchscreen.
- **Desain TV 10-Foot Compact**: Palet Kuzen Dark (`#0A0A0A`) + Brand Orange (`#EA580C`), sidebar ringkas (`148.dp`), kartu `124×178.dp`, outline fokus `#FFFFFF` dengan `contentPadding` aman agar border tidak terpotong, dan label episode ringkas (`Episode 5`).

### Fitur, Katalog & Performa
- **Urutan Sidebar**: **Beranda → Anime → Donghua → Film Bioskop → Pencarian**.
- **Beranda (`HomeScreen.kt`)**: Baris katalog terurut prioritas — **Anime Ongoing**, **Anime Completed**, **Donghua Populer**, **Film Bioskop Populer**, dan **Film Aksi Pilihan**.
- **Katalog & Pencarian (`CatalogScreen.kt`)**: Filter **Anime** (`Ongoing`, `Completed`), **Donghua** (`Populer`, `Ongoing`, `Completed`), **Film Bioskop** (genre FrameX TV), serta **Pencarian Global** lintas sumber.
- **Detail Media (`DetailScreen.kt`)**: Routing otomatis per tipe (`anime`, `donghua`, `movie`), metadata, genre, sinopsis, dan daftar episode.
- **Caching & Prefetch (`MediaRepository.kt`)**: In-memory TTL cache (Katalog 3 menit, Detail 10 menit, Stream 5 menit), retry backoff cold-start Neon DB (`1.2s → 2.4s`), dan background prefetch untuk episode berikutnya.

### Player & Kontrol Remote D-Pad (`TVNativePlayerScreen.kt`)
- **Kontrol Mode Nonton (OSD Tertutup)**:
  - `OK` / `Enter` / `Play-Pause`: Putar / Jeda.
  - `Kiri` / `Kanan`: Langsung skip **-10s / +10s**.
  - `Atas`: Membuka **Panel Kanan** (Episode, Server, Subtitle).
  - `Bawah`: Membuka **OSD Seekbar** (scrubbing `±10s/30s/60s`, Kualitas HLS, Kecepatan `1x–2x`).
- **Panel Kanan (`330.dp`)**:
  - `Atas` / `Bawah`: Navigasi daftar Episode, Server, atau Subtitle.
  - `Kiri` / `Kanan`: Pindah tab (`Episode` ↔ `Server`, atau `Server` ↔ `Subtitle` untuk Film); tekan `Kiri` di tab paling kiri atau `Back` untuk menutup panel.
- **Stabilitas Ganti Server & Script Injection**:
  - `WebView` di-key per `(streamUrl, isDirectHls)` dengan `onRelease` cleanup agar tidak terjadi overlap audio/video saat pindah server, serta otomatis melanjutkan di **detik terakhir** (`pendingResumeTime`).
  - Script injeksi terpisah di `native-tv/app/src/main/assets/player/` (`anime_inject.js`, `donghua_inject.js`, `movie_inject.js`, `hls_player.html`) terhubung via `@JavascriptInterface` (`ReactNativeWebView`) dan `window.__QUETTA_EXEC__`.

### Cara Build APK Native (`native-tv/`)
```powershell
# Release APK
cd native-tv
.\gradlew.bat assembleRelease

# Debug APK (applicationId suffix .debug)
cd native-tv
.\gradlew.bat assembleDebug
```
Output APK berada di `native-tv/app/build/outputs/apk/release/app-release.apk` (atau `debug/app-debug.apk`).

Install ke TV via ADB:
```powershell
adb install -r native-tv\app\build\outputs\apk\release\app-release.apk
```

---

## 2. Proyek Pendamping: React Native / Expo (`src/`)

Proyek awal berbasis **Expo (SDK 52+)**, **TypeScript**, dan **`@react-native-tvos/config-tv`** tetap dipertahankan di root repository (`src/`, `App.tsx`, `android/`), lengkap dengan Riwayat Supabase, Pengaturan, dan 4-Tier `TVNativePlayer.tsx`.

### Cara Build APK React Native
```powershell
npm install
cd android
.\gradlew.bat assembleRelease
```
Output APK berada di `android/app/build/outputs/apk/release/app-release.apk`.

---

## 📁 Struktur Direktori

```
kuzen_tv/
├── assets/images/                          # Logo, ikon adaptif, banner TV, & splash
├── native-tv/                              # Proyek Utama: Native Kotlin Android TV
│   └── app/
│       ├── proguard-rules.pro              # Rule R8 & @JavascriptInterface
│       └── src/main/
│           ├── assets/player/              # anime_inject.js, donghua_inject.js, movie_inject.js, hls_player.html
│           └── java/com/hafiz16/kuzen_tv/
│               ├── MainActivity.kt         # Sidebar 5 tab & dispatchKeyEvent remote TV
│               ├── data/
│               │   ├── models/MediaModels.kt
│               │   └── network/MediaRepository.kt
│               ├── player/
│               │   ├── AdBlocker.kt
│               │   ├── PlayerScriptInjector.kt
│               │   └── TVNativePlayerScreen.kt
│               └── ui/
│                   ├── components/TVMediaCard.kt
│                   ├── screens/            # HomeScreen, CatalogScreen, DetailScreen
│                   └── theme/Color.kt
├── src/                                    # Proyek Pendamping: React Native / Expo TV
│   ├── components/                         # TVSidebar, TVFocusableCard, TVMediaRow, player/
│   ├── screens/                            # HomeScreen, AnimeScreen, DonghuaScreen, MovieScreen, HistoryScreen, SettingsScreen
│   ├── services/                           # api.ts, mediaService.ts, movieService.ts, supabase.ts, userService.ts
│   └── utils/                              # subtitleParser.ts, cacheManager.ts
├── AGENTS.md                               # Aturan pengembangan Kuzen TV
├── App.tsx
├── app.json
└── package.json
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0 (GPL-3.0)** — lihat file [LICENSE](LICENSE) untuk detailnya.
