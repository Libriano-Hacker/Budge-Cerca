import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import headers from "./security/headers.json";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: "production-security-policy",
      transformIndexHtml() {
        if (command !== "build") return [];
        return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: headers["Content-Security-Policy"].replace(
                /frame-ancestors[^;]+;?\s*/,
                "",
              ),
            },
            injectTo: "head-prepend",
          },
        ];
      },
    },
  ],
  server: {
    cors: false,
    fs: {
      strict: true,
      deny: [
        ".env",
        ".env.*",
        "**/*.{crt,pem,key,p12,jks,keystore}",
        "**/.git/**",
      ],
    },
  },
  preview: {
    cors: false,
    headers,
    proxy:
      process.env.TBC_TEST_API === "1"
        ? { "/api": { target: "http://127.0.0.1:8889", changeOrigin: false } }
        : undefined,
  },
  build: { sourcemap: false },
}));
