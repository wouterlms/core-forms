import { resolve } from 'path'
import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'

import pkg from './package.json'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, 'src')
      }
    ]
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [...Object.keys(pkg.dependencies), 'vue', 'vue-i18n'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-i18n': 'vue-i18n'
        },
        entryFileNames: () => '[name].js'
      }
    }
  }
})
