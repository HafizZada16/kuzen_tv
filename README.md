# Kuzen TV (Android TV Client)

Klien Android TV resmi untuk **Kuzen App**, dengan fokus utama pada proyek **Native Android TV (`native-tv/`)** berbasis **Kotlin + Jetpack Compose for TV** (~1 MB release APK) yang ringan dan responsif untuk remote D-Pad, serta tetap mempertahankan proyek **React Native / Expo (`src/`)** di root repository.

---

## 1. Proyek Utama: Native Kotlin Android TV (`native-tv/`)

### Spesifikasi & Stack
- **Teknologi**: Kotlin, Jetpack Compose (`androidx.tv:tv-material`, `tv-foundation`), OkHttp, `kotlinx.serialization`, Coil.
- **Kompatibilitas**: Android TV 5.0+ (API 21+, `targetSdkVersion: 34`), `LEANBACK_LAUNCHER`, orientasi terkunci **Landscape**, tanpa syarat touchscreen.
- **Desain TV 10-Foot**: Palet Kuzen Dark (`#0A0A0A`) + Brand Orange (`#EA580C`), outline fokus putih kontras tinggi (`#FFFFFF`), dan label episode ringkas (`Episode 5`).

### Fitur & Katalog
- **Beranda (`HomeScreen.kt`)**: Baris katalog terurut prioritas — **Anime Ongoing**, **Anime Completed**, **Donghua Populer**, **Film Bioskop Populer**, dan **Film Aksi Pilihan**.
- **Katalog & Pencarian (`CatalogScreen.kt`)**: Filter **Anime** (`Ongoing`, `Completed`), **Donghua** (`Populer`, `Ongoing`, `Completed`), **Film Bioskop** (genre FrameX TV), serta **Pencarian Global** lintas sumber.
- **Detail Media (`DetailScreen.kt`)**: Routing otomatis per tipe (`anime`, `donghua`, `movie`), metadata, genre, sinopsis, dan daftar episode.

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
  - `WebView` di-key per `streamUrl` dengan `onRelease` cleanup agar tidak terjadi overlap audio/video saat pindah server, serta otomatis melanjutkan di **detik terakhir** (`pendingResumeTime`).
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
├── App.tsx
├── app.json
└── package.json
```
