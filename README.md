# 🏏 Cricket Scorer PWA

A Progressive Web App for managing cricket teams and scoring matches. Built with Next.js and next-pwa.

## Features

- ✅ **Team Management**: Create and manage cricket teams with up to 11 players
- ✅ **Live Scoring**: Score matches in real-time with ball-by-ball tracking
- ✅ **PWA Support**: Install on your device and use offline
- ✅ **Responsive Design**: Works on mobile, tablet, and desktop
- ✅ **Player Avatars**: Unique avatars for each player
- ✅ **Captain Selection**: Designate team captains

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## PWA Features

This app is a Progressive Web App with the following capabilities:

- **Installable**: Add to home screen on mobile devices or install as desktop app
- **Offline Support**: Service worker caches assets for offline use
- **App-like Experience**: Runs in standalone mode without browser UI
- **Auto-updates**: Service worker updates automatically when new version is deployed

### Installing the PWA

1. Open the app in your browser
2. Look for the "Install" prompt or "Add to Home Screen" option
3. Follow the prompts to install
4. Launch from your home screen or app drawer

### Generating Icons

To generate proper PWA icons:

1. Open `generate-icons.html` in your browser
2. Right-click each canvas and save as:
   - `public/icon-192x192.png`
   - `public/icon-512x512.png`

Or replace with your own custom icons matching these dimensions.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
