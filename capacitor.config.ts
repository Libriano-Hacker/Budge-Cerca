import type { CapacitorConfig } from "@capacitor/cli";
import app from "./app.config.json";

const config: CapacitorConfig = {
  appId: app.appId,
  appName: app.appName,
  webDir: "dist-mobile",
  loggingBehavior: "none",
  backgroundColor: "#081426",
  server: { cleartext: false, allowNavigation: [] },
  android: {
    backgroundColor: "#081426",
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: "#081426",
    contentInset: "automatic",
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#081426",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: { style: "LIGHT", backgroundColor: "#081426" },
  },
};
export default config;
