import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // This makes the server accessible externally.
    host: '0.0.0.0',
    // This is required for HMR to work in a proxied environment like Cloud Workstations.
    hmr: {
      clientPort: 443,
    }
  }
})
