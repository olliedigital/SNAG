import type { CapacitorConfig } from "@capacitor/cli";

// SNAG native shell. The app is a server-rendered Next.js site, so instead of
// bundling static files we point the native WebView at the live deployment —
// the app and the website stay identical and always current. Set SNAG_APP_URL
// before `npx cap sync` to test against a local `next dev` (e.g. your Mac's LAN
// IP: http://192.168.1.20:3000).
const config: CapacitorConfig = {
  appId: "com.olliedigital.snag",
  appName: "SNAG",
  webDir: "native", // offline fallback splash (see native/index.html)
  server: {
    url: process.env.SNAG_APP_URL || "https://snag-eta.vercel.app",
    // The live site is HTTPS; leave cleartext off. For a local http:// dev URL,
    // temporarily set this to true.
    cleartext: false,
  },
  backgroundColor: "#0b0b0d",
  ios: {
    contentInset: "always",
    backgroundColor: "#0b0b0d",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      backgroundColor: "#0b0b0d",
      showSpinner: false,
    },
    // Native deal/strike alerts land here in Phase 2.
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
