import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom", // simulate browser
    globals: true, // allows test(), expect() without import
    setupFiles: "./src/test/setup.js",
  },
});
