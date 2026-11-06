# Little Instant

A mobile-first instant camera web app built with Next.js. Capture a single instant photo or a four-shot strip, then customize the film look and paper before saving.

## Features

- Front-camera preview with a three-second countdown and screen flash
- Single instant print and four-shot photo strip modes
- Seven reversible film looks: Color 600, Reclaimed Purple, Reclaimed Blue, Reclaimed Green, Duochrome Yellow, Silver B&W, and Original
- Six paper styles: Classic, Ink, Rose, Sage, Grid, and Spectrum
- Change film and paper after capture without retaking photos
- Share image files on supported phones; download PNG files on desktop
- Local sample artwork for trying filters without camera access
- Home-screen installation through a standalone web app manifest, iOS metadata, and app icons
- Mobile safe-area support and reduced-motion preferences

Film looks are digital interpretations inspired by experimental instant film, not exact reproductions of physical film chemistry. This project is not affiliated with Polaroid.

## Run locally

Requires Node.js 20.9 or later and npm.

~~~sh
npm ci
npm run dev -- --hostname 127.0.0.1
~~~

Open the localhost URL printed by Next.js. If port 3000 is occupied, Next.js chooses another available port.

## Production

~~~sh
npm run build
npm start
~~~

Deploy to a Next.js-compatible host with HTTPS to use the camera on a phone. A localhost URL on your computer is not accessible as that same address from your phone.

## Install on a phone

- **iPhone / iPad:** Open the HTTPS site in Safari, choose Share, then Add to Home Screen. Enable Open as Web App if offered.
- **Android:** Open the HTTPS site in Chrome and choose Install app or Add to home screen.

The app includes installation guidance under **Get the app**. Installation does not currently provide offline support.

## Privacy

Camera captures and image processing stay in the browser. This application does not upload photos, require an account, or provide cloud storage. Captures remain in memory for the current session and are cleared when you reload or close the page. Save any photos you want to keep.

## Project structure

- `app/page.tsx` — camera, capture modes, live preview, editing, and image sharing
- `app/film.ts` — deterministic grain and film color processing
- `app/paper.ts` — paper styles and PNG print composition
- `app/globals.css` — mobile app layout and styling
- `public/manifest.webmanifest` — home-screen installation metadata
