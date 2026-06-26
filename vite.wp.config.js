import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, existsSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-logo",
      closeBundle() {
        const src = resolve(__dirname, "src/assets/bilimevi_logo.svg");
        const dest = resolve(__dirname, "dist-wp/bilimevi_logo.svg");
        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log("✓ bilimevi_logo.svg kopyalandı");
        }
      },
    },
  ],
  build: {
    outDir: "dist-wp",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/wp-main.jsx"),
      output: {
        entryFileNames: "fiyat-teklifi.js",
        chunkFileNames: "fiyat-teklifi-[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "fiyat-teklifi.css";
          return assetInfo.name;
        },
      },
    },
    cssCodeSplit: false,
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
