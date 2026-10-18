import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/firebase/auth') || id.includes('node_modules/@firebase/auth')) {
            return 'firebase-auth'
          }
          if (id.includes('node_modules/firebase/firestore') || id.includes('node_modules/@firebase/firestore')) {
            return 'firebase-firestore'
          }
          if (id.includes('node_modules/react-joyride') || id.includes('node_modules/@floating-ui')) {
            return 'admin-tour'
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
        },
      },
    },
  },
})
