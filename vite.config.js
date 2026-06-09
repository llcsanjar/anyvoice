import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default {
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        app: 'app/index.html'
      }
    }
  }
}