import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@builder.io')) {
              return 'builder-cms';
            }
            if (id.includes('react-chessboard') || id.includes('chess.js')) {
              return 'chess-engine';
            }
            if (id.includes('@supabase')) {
              return 'supabase-client';
            }
            if (id.includes('socket.io-client')) {
              return 'socket-client';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('/react/')) {
              return 'react-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
