import { defineConfig } from "vite";

// Vite configuration for GitHub Pages
// Hosted at: https://sc-software-engineering2025-2026.github.io/final-project-Josh-pierce2026-clock/
// We also output directly to "docs" so GitHub Pages can use
// the development branch with /docs as the source.
export default defineConfig({
  base: "/final-project-Josh-pierce2026-clock/",
  build: {
    outDir: "docs",
  },
});
