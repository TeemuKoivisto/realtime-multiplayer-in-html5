import { defineConfig } from 'vite'

const { GH_PAGES } = process.env

// https://vitejs.dev/config/
export default defineConfig({
  base: GH_PAGES ? '/realtime-multiplayer-in-html5/' : undefined,
})