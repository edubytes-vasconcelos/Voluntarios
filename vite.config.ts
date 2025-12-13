import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill to prevent crashes if process.env is accessed in legacy code
    'process.env': {}
  }
});