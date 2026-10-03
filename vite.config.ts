import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    allowedHosts: ['student-safe-vault-4.onrender.com'],
  },

  preview: {
    allowedHosts: ['student-safe-vault-4.onrender.com'],
  },
})