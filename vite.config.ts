import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: env.VITE_BASE_PATH || "/",
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/@supabase/")) return "supabase";
            if (id.includes("node_modules/framer-motion/")) return "motion";
            if (id.includes("node_modules/lucide-react/")) return "icons";
            if (id.includes("node_modules/react-dom/") || id.includes("node_modules/react/")) return "react-vendor";
          },
        },
      },
    },
  };
});
