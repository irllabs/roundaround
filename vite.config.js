import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const root = import.meta.dirname

/**
 * In `--mode e2e` (the build the Playwright suite runs against, see playwright.config.js) the
 * Firebase wrapper is swapped for the in-memory double, so the suite drives the real app without
 * a network, an account or a live project behind it.
 *
 * The swap is one import in one file rather than an alias on the specifier: `./firebase` is also
 * what firebase.test.js imports, and only the singleton the app builds should ever be the double.
 * Vitest runs in mode `test`, so no unit test can reach this either way.
 */
const firebaseTestDouble = () => ({
    name: 'rounds:firebase-test-double',
    enforce: 'pre',
    resolveId (source, importer) {
        if (source === './firebase' && importer === path.resolve(root, 'src/firebase/index.js')) {
            return path.resolve(root, 'src/firebase/testDouble.js')
        }
        return null
    }
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [react(), tailwindcss(), ...(mode === 'e2e' ? [firebaseTestDouble()] : [])],
    resolve: {
        alias: {
            '@': path.resolve(root, 'src')
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
        outDir: mode === 'e2e' ? 'build-e2e' : 'build',
        sourcemap: true
    },
    test: {
        // functions/ has its own node:test suite (yarn test inside functions/)
        exclude: ['node_modules/**', 'build/**', 'build-e2e/**', 'functions/**', 'cypress/**', 'e2e/**'],
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.js'],
        css: false
    }
}))
