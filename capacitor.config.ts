import type { CapacitorConfig } from "@capacitor/cli";
import app from "./app.config.json";

const config: CapacitorConfig = {
  appId: app.appId,
  appName: app.appName,
  webDir: "dist-mobile",
  backgroundColor: "#081426",
  android: { backgroundColor: "#081426", allowMixedContent: false },
  ios: { backgroundColor: "#081426", contentInset: "automatic" },
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
