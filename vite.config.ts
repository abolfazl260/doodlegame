import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: "/doodlegame/",
  build: {
    target: "es2022",
    sourcemap: mode !== "android"
  }
}));
