import {defineConfig,devices} from "@playwright/test";

export default defineConfig({
 testDir:"./tests/browser",
 testMatch:"**/*.spec.mjs",
 timeout:20000,
 expect:{timeout:5000},
 retries:process.env.CI?1:0,
 workers:process.env.CI?1:undefined,
 use:{
  ...devices["Desktop Chrome"],
  baseURL:"http://127.0.0.1:4173/doodlegame/",
  trace:"retain-on-failure"
 },
 webServer:{
  command:"npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
  url:"http://127.0.0.1:4173/doodlegame/tests/browser/weapon-picker.html",
  reuseExistingServer:!process.env.CI,
  timeout:30000
 }
});
