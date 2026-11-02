import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": `${import.meta.dirname}/src`,
        },
    },
    server: {
        proxy: {
            // `ws` also forwards the realtime socket at /api/realtime.
            "/api": { target: "http://localhost:3000", ws: true },
        },
    },
});
