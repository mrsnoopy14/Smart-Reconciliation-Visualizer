import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base makes the build work on GitHub Pages subpaths and also works on Vercel/Netlify.
  base: './',
  plugins: [react()],
})
