import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, existsSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-logos",
      closeBundle() {
        const files = ["ingilteredil_logo.png", "Bilimevi_logo.jpg", "bilimevi_logo.svg"];
        files.forEach(f => {
          const src = resolve(__dirname, "src/assets/" + f);
          const dest = resolve(__dirname, "dist-wp/" + f);
          if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log("✓ kopyalandı:", f);
          }
        });
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
        inlineDynamicImports: true,
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
