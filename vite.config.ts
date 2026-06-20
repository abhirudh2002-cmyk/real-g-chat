import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite"; // Ensure this import is here

export default defineConfig({
  vite: {
    plugins: [
      nitro({
        preset: "vercel", // This is the crucial part
      }),
    ],
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});