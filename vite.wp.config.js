import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
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
    // CSS'i ayrı dosyaya çıkar
    cssCodeSplit: false,
  },
  // WordPress ortamında html2pdf CDN'den gelir, bundle etme
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
