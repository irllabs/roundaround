import { defineConfig, devices } from '@playwright/test'

/**
 * The Playwright suite runs against a built bundle, never the dev server: under React 18's
 * StrictMode the dev server double-mounts PlayUI and leaves an empty SVG in front of the live one,
 * so `#round svg` would match the wrong element. `--mode e2e` is the build that swaps the Firebase
 * wrapper for the in-memory double (see vite.config.js), so nothing here touches the live project.
 */
const PORT = Number(process.env.E2E_PORT || 3100)

/**
 * CI runs Playwright's own Chromium. `E2E_CHANNEL=chrome` runs the Chrome already on the machine
 * instead, which is the way through when `playwright install` cannot reach the download host.
 */
const CHANNEL = process.env.E2E_CHANNEL || undefined

const chromium = {
    ...(CHANNEL ? { channel: CHANNEL } : {}),
    launchOptions: {
        args: [
            // the transport has to be able to start without a real user gesture
            '--autoplay-policy=no-user-gesture-required',
            '--mute-audio'
        ]
    }
}

export default defineConfig({
    testDir: './e2e/specs',
    // the canvas is drawn imperatively and the audio engine loads samples: give it room
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI
        ? [['github'], ['junit', { outputFile: 'e2e/results/junit.xml' }], ['html', { open: 'never', outputFolder: 'e2e/report' }]]
        : [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
    outputDir: 'e2e/results/artifacts',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // the app marks its own elements with data-test, as the unit tests do
        testIdAttribute: 'data-test'
    },
    projects: [
        {
            name: 'desktop-chrome',
            testIgnore: /touch\.spec\.js$/,
            use: {
                ...devices['Desktop Chrome'],
                // the round is laid out for a wide window; the height clears the header and bar
                viewport: { width: 1440, height: 900 },
                ...chromium
            }
        },
        {
            // a tablet, which is what the round is mostly played on: a touch screen at tablet size.
            // Built by hand rather than from a `devices` entry because the iPad ones are WebKit,
            // and the suite runs one browser.
            name: 'tablet',
            testMatch: /touch\.spec\.js$/,
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1180, height: 820 },
                deviceScaleFactor: 2,
                isMobile: false,
                hasTouch: true,
                ...chromium
            }
        }
    ],
    webServer: {
        command: `yarn build:e2e && npx vite preview --mode e2e --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe'
    }
})
