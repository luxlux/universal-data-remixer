import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true // Äquivalent zu --host in der Kommandozeile
    // oder host: '0.0.0.0'
    // port: 5173 // Sie können den Port hier auch festlegen
  },
})