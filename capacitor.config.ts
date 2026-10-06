/// <reference types="@capacitor/app" />
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.abolfazl.doodlegame",
  appName: "DoodleGame",
  webDir: "dist",
  server: {
    allowNavigation: []
  },
  plugins: {
    App: {
      disableBackButtonHandler: true
    },
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
      hidden: true
    }
  }
};

export default config;
