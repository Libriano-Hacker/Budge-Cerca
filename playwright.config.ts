import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: [
    {
      command: "npm run preview -- --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "npm run preview -- --outDir dist-mobile --port 4180 --strictPort",
      url: "http://127.0.0.1:4180",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx vite --host 127.0.0.1 --port 4181 --strictPort",
      url: "http://127.0.0.1:4181",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "desktop",
      testIgnore: ["**/native-preview.spec.ts", "**/admin-demo.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testIgnore: ["**/native-preview.spec.ts", "**/admin-demo.spec.ts"],
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "native-preview",
      testMatch: "**/native-preview.spec.ts",
      use: { ...devices["Pixel 7"], baseURL: "http://127.0.0.1:4180" },
    },
    {
      name: "admin-demo-desktop",
      testMatch: "**/admin-demo.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4181" },
    },
    {
      name: "admin-demo-mobile",
      testMatch: "**/admin-demo.spec.ts",
      use: { ...devices["Pixel 7"], baseURL: "http://127.0.0.1:4181" },
    },
  ],
});
