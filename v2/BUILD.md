# Tally v2 (Flutter) — Build & Run Guide

The Flutter client for Tally. It talks to the **existing PHP/MySQL API unchanged**
(see the repo root `README.md`). This is the only doc you need to build and run it.

---

## 1. Prerequisites

- **Flutter SDK** 3.19+ (`flutter --version`; run `flutter doctor` and fix any ❌).
- **Android:** Android Studio + an SDK/emulator, or a USB device with USB-debugging on.
- **iOS (macOS only):** Xcode + CocoaPods.
- **Backend running:** XAMPP with **Apache + MySQL** started and the `tally` database
  imported (`database/schema.sql`). Verify in a browser:
  `http://localhost/tally/api/get-products-with-stock.php?book_id=1` → should return JSON.

## 2. One-time bootstrap

This repo ships the Flutter **source** (`lib/`, `pubspec.yaml`, assets, l10n). Generate the
platform folders (`android/`, `ios/`, `web/`, …) once — `flutter create` skips files that
already exist, so it won't touch `lib/`, `pubspec.yaml`, or the bundled
`android/.../network_security_config.xml`:

```bash
cd v2
flutter create --org com.tally --project-name tally --platforms=android,ios,web .
flutter pub get
```

Localizations (the `AppL10n` class) are generated automatically by `flutter pub get` / build.
To regenerate manually: `flutter gen-l10n`.

### Platform tweaks after `flutter create` (do once)

- **App id / name** — target `com.tally.app`, display name **Tally**:
  - `android/app/build.gradle` → `applicationId "com.tally.app"`.
  - `android/app/src/main/AndroidManifest.xml` → `android:label="Tally"`.
  - iOS: `ios/Runner/Info.plist` → `CFBundleDisplayName` = `Tally`; set the bundle id to
    `com.tally.app` in Xcode (Runner ▸ Signing & Capabilities).
- **Android cleartext HTTP** (the API is plain HTTP) — in
  `android/app/src/main/AndroidManifest.xml`, add to the `<application>` tag:
  ```xml
  android:usesCleartextTraffic="true"
  android:networkSecurityConfig="@xml/network_security_config"
  ```
  The referenced `network_security_config.xml` is already provided under
  `android/app/src/main/res/xml/` (edit the LAN range to match your network).
- **iOS cleartext HTTP (dev only)** — in `ios/Runner/Info.plist`:
  ```xml
  <key>NSAppTransportSecurity</key>
  <dict><key>NSAllowsArbitraryLoads</key><true/></dict>
  ```
- **Image picker (iOS)** — add `NSPhotoLibraryUsageDescription` to `Info.plist`.

## 3. Point the app at the API

The base URL is injected with `--dart-define` (defaults to `http://localhost/tally/api/`):

```
--dart-define=API_BASE_URL=http://localhost/tally/api/
```

Pick the host per target:

| Target | `API_BASE_URL` |
|---|---|
| Web (Chrome) / desktop | `http://localhost/tally/api/` |
| Android **emulator** | `http://10.0.2.2/tally/api/` (10.0.2.2 = host machine) |
| Android **USB device** | `http://localhost/tally/api/` **+** `adb reverse tcp:80 tcp:80` |
| Android/iOS over **Wi-Fi** | `http://<YOUR-PC-LAN-IP>/tally/api/` (e.g. `http://192.168.0.10/tally/api/`) |

## 4. Run (development)

```bash
# Web
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost/tally/api/

# List devices, then run on one
flutter devices
flutter run -d <device-id> --dart-define=API_BASE_URL=http://10.0.2.2/tally/api/
```

### Android device over USB (adb)

```bash
adb devices                       # confirm the device is listed & authorized
adb reverse tcp:80 tcp:80         # phone's localhost:80 → PC's XAMPP:80
flutter run -d <device-id> --dart-define=API_BASE_URL=http://localhost/tally/api/
```

> `adb reverse` must be re-run after replugging the device. Over Wi-Fi instead, skip it and use
> your PC's LAN IP in `API_BASE_URL`.

## 5. Build release artifacts

```bash
# Android APK  → build/app/outputs/flutter-apk/app-release.apk
flutter build apk --release --dart-define=API_BASE_URL=http://<host>/tally/api/

# Android App Bundle (Play Store)
flutter build appbundle --release --dart-define=API_BASE_URL=http://<host>/tally/api/

# iOS IPA (macOS + Xcode; needs a signing team)  → build/ios/ipa/*.ipa
flutter build ipa --release --dart-define=API_BASE_URL=http://<host>/tally/api/

# Web  → build/web/  (serve behind any static host, ideally same origin as the API)
flutter build web --release --dart-define=API_BASE_URL=/tally/api/
```

> For real APK/IPA/web builds, point `API_BASE_URL` at a host the device can actually reach
> (a LAN IP or a deployed HTTPS server) — not `localhost`.

## 6. Troubleshooting

- **Network / "Connection refused":** Apache + MySQL running? Correct `API_BASE_URL` for the
  target (see §3)? For a USB device, did you run `adb reverse`?
- **Android device can't load over HTTP:** confirm the manifest cleartext lines (§2) and that
  your LAN subnet is listed in `network_security_config.xml`.
- **`AppL10n` undefined:** run `flutter gen-l10n` (or `flutter pub get`) to regenerate localizations.
- **CORS:** the API already sends `Access-Control-Allow-Origin: *`, so the web build works
  cross-origin; still, hosting the web build under the same origin (`/tally/`) is simplest.
