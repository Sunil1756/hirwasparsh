import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function copernicusDevServerPlugin() {
  return {
    name: "copernicus-dev-server",
    configureServer(server: any) {
      server.middlewares.use("/api/copernicus-token", async (_req: any, res: any) => {
        const clientId = process.env.COPERNICUS_CLIENT_ID || "sh-bca04d51-5029-419e-a9d2-29b4cb7ae6fa";
        const clientSecret = process.env.COPERNICUS_CLIENT_SECRET || "65bC8ZTF2Uu4Vy9nBV8Tg6q6ldXAxenF";
        try {
          const resp = await fetch(
            "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: clientSecret,
              }),
            }
          );
          const json = await resp.json();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(json));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), copernicusDevServerPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
          "vendor-leaflet": [
            "leaflet",
            "react-leaflet",
            "@turf/area",
            "@turf/helpers",
            "@turf/length",
            "@turf/boolean-point-in-polygon",
          ],
          "vendor-charts": ["recharts"],
          "vendor-docs": ["jspdf", "jspdf-autotable", "xlsx", "pptxgenjs"],
          "vendor-motion": ["framer-motion"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
}));
