import { defineConfig } from "vite";

export default defineConfig({
  base: "/doodlegame/",
  build: { target: "es2022", sourcemap: true }
});
