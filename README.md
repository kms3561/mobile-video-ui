# Mobile Video UI

This repository contains the original static HTML/CSS/JavaScript prototype and a new Expo React Native app in `mobile-app/`.

## Project Structure

- `index.html`, `styles.css`, `app.js` - original static prototype.
- `mobile-app/` - Expo React Native app for iOS and Android.

## Install Dependencies

```powershell
cd mobile-app
npm install
```

## Run The App

```powershell
cd mobile-app
npm run start
```

Then use the Expo CLI options to open the app:

- Press `a` for Android emulator/device.
- Press `i` for iOS simulator on macOS.
- Scan the QR code with Expo Go on a physical iPhone or Android device.

You can also run platform commands directly:

```powershell
npm run android
npm run ios
```

## Checks

```powershell
cd mobile-app
npm run typecheck
npm run lint
```

## Current Scope

The Expo app currently uses placeholder content only. It does not include backend services, authentication, database access, cloud storage, or real media uploads yet.
