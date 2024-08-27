import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import * as path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    UnoCSS()
  ],
  server: {
    port: 5500,
    open: true,
    host: true
  },
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(__dirname, 'src')}/`,
      },
    ]
  },
  // NOTICE: top-level await有兼容性问题，需要插件进行编译：https://github.com/Menci/vite-plugin-top-level-await
  build: {
    // target: 'esnext'
    rollupOptions: {
      output: {
        manualChunks: {
          'p5-wrapper': ['@p5-wrapper/react'], // 这个包体积有点大，进行拆分
        }
      }
    }
  }
})
