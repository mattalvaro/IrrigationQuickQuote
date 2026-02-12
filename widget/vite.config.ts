import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../public/widget"),
    lib: {
      entry: path.resolve(__dirname, "index.tsx"),
      name: "IrrigationQuickQuote",
      fileName: "irrigation-quick-quote",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        assetFileNames: "irrigation-quick-quote.[ext]",
      },
    },
  },
});
