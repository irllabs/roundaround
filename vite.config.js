import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    server: {
        port: 3000,
        strictPort: true
    },
    preview: {
        port: 3000
    },
    build: {
        // Firebase Hosting targets in firebase.json point at build/
        outDir: 'build',
        sourcemap: true
    },
    test: {
        // functions/ has its own node:test suite (yarn test inside functions/)
        exclude: ['node_modules/**', 'build/**', 'functions/**', 'cypress/**'],
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.js'],
        css: false
    }
})
