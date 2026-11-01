import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // Dashboard'daki sürüm etiketi için: Vercel build'inde commit'in ilk 7 hanesi, yerelde boş.
    __BUILD_SHA__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7)),
  },
});
