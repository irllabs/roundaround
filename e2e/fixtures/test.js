/**
 * The suite's fixtures. Every test gets a page that already carries a seed, so the app boots
 * signed in, with a known round, against the in-memory Firebase double and no network at all.
 *
 * `seedData` is what a spec overrides to change the world it wakes up in:
 *
 *     test.use({ seedData: signedOutSeed() })
 *
 * `app` is the handle on the running app: navigation, and a window into what the double stored,
 * which is where a test checks that an interaction was actually persisted rather than only drawn.
 */
import { test as base, expect } from '@playwright/test'
import { seed as defaultSeed, ROUND_ID } from './seed.js'

/** Console messages that are noise rather than a failure: the ones the app makes on purpose. */
const EXPECTED_CONSOLE = [
    // the double has no Jitsi; the header only asks for a token with two people in the round
    /Jitsi is not available in the test double/,
    // React 18 StrictMode double-mounts in a dev server; the e2e build is production-like, but
    // keep this tolerated so the suite can also be pointed at `yarn start`
    /Warning: .*StrictMode/,
    // jsdom-ish autoplay complaints from Chromium when a context starts without a gesture
    /The AudioContext was not allowed to start/
]

const isExpected = (text) => EXPECTED_CONSOLE.some(pattern => pattern.test(text))

class App {
    constructor (page) {
        this.page = page
    }

    /** Opens a round and waits until its canvas is drawn. */
    async openRound (roundId = ROUND_ID) {
        await this.page.goto(`/play/${roundId}`)
        await this.waitForCanvas()
    }

    /** The canvas is up once SVG.js has drawn the round and the play button is on it. */
    async waitForCanvas () {
        await this.page.waitForSelector('#round > svg', { state: 'attached' })
        await this.page.waitForSelector('[aria-label="Play"], [aria-label="Stop"]', { state: 'attached' })
    }

    /**
     * Picks a layer through the mixer, which is the way to it that does not depend on hitting a
     * ring: without a selected layer the layer bar shows only "Add a layer" and the mixer itself.
     * The mixer's rows are named by the layer's sample, so the layer is looked up first.
     */
    async selectLayer (layerId) {
        const layer = await this.storedLayer(layerId)
        if (!layer) {
            throw new Error(`No layer ${layerId} in the round`)
        }
        const name = layer.instrument?.sample || layer.instrument?.sampler
        await this.page.getByRole('button', { name: 'Open the mixer' }).click()
        const mixer = this.page.getByTestId('mixer-popup')
        await expect(mixer).toBeVisible()
        await mixer.getByText(name, { exact: true }).first().click()
        // the mixer sits over the bar; close it so the bar's own controls can be reached
        const close = this.page.getByRole('button', { name: 'Close the mixer' })
        if (await close.isVisible()) {
            await close.click()
        }
        await expect(mixer).toHaveAttribute('data-open', 'false')
        await this.page.getByRole('button', { name: 'Layer options' }).waitFor({ state: 'visible' })
    }

    /** The round as the double holds it: the document plus its sub-collections. */
    async storedRound (roundId = ROUND_ID) {
        return this.page.evaluate(async (id) => window.__roundaroundFirebase.getRound(id), roundId)
    }

    /** One stored layer. */
    async storedLayer (layerId, roundId = ROUND_ID) {
        const round = await this.storedRound(roundId)
        return (round.layers || []).find(layer => layer.id === layerId) || null
    }

    /** Whether a step is on, as it was last written. */
    async stepIsOn (layerId, stepId, roundId = ROUND_ID) {
        const layer = await this.storedLayer(layerId, roundId)
        const step = (layer?.steps || []).find(s => s.id === stepId)
        return step ? step.isOn === true : null
    }

    /** One user's stored patterns document. */
    async storedUserPatterns (userId, roundId = ROUND_ID) {
        const round = await this.storedRound(roundId)
        return (round.userPatterns || {})[userId] || null
    }

    /** Every call the app made into Firebase, in order, for asserting on what was persisted. */
    async firebaseCalls (name = null) {
        const calls = await this.page.evaluate(() => window.__roundaroundFirebase.calls)
        return name ? calls.filter(call => call.name === name) : calls
    }

    /** Whether the audio engine's transport is running. */
    async isPlaying () {
        return this.page.evaluate(() => window.__roundaroundEngine.isOn() === true)
    }

    /** Which playback engine the page is running, 'v1' or 'v2'. */
    async engineName () {
        return this.page.evaluate(() => window.__roundaroundEngine.name || 'v1')
    }

    /** The transport's position in bars, fractional: what the playhead turns by. */
    async positionBars () {
        return this.page.evaluate(() => window.__roundaroundEngine.getPositionBars())
    }

    /** The playhead's rotation in degrees, read off the transform it carries. */
    async playheadDegrees () {
        return this.page.evaluate(() => {
            const head = document.querySelector('#playhead')
            const transform = head ? head.getAttribute('transform') : null
            const match = transform && transform.match(/rotate\(([-\d.]+)/)
            return match ? Number(match[1]) : null
        })
    }

    /** Whether the playhead is currently shown. */
    async playheadVisible () {
        return this.page.evaluate(() => {
            const head = document.querySelector('#playhead')
            return head ? head.getAttribute('visibility') !== 'hidden' : false
        })
    }

    /** Whether the metronome's click is switched on. */
    async metronomeOn () {
        return this.page.evaluate(() => window.__roundaroundEngine.isMetronomeOn() === true)
    }
}

export const test = base.extend({
    /** The seed the page boots with. Override per spec or per test with `test.use`. */
    seedData: [defaultSeed(), { option: true }],

    /** Console errors and uncaught exceptions the run produced, for the check after each test. */
    pageErrors: async ({ page }, use) => {
        const errors = []
        page.on('console', message => {
            if (message.type() === 'error' && !isExpected(message.text())) {
                errors.push(message.text())
            }
        })
        page.on('pageerror', error => {
            if (!isExpected(error.message)) {
                errors.push(error.message)
            }
        })
        await use(errors)
    },

    page: async ({ page, seedData }, use) => {
        // before any app code: the double reads this in its constructor
        await page.addInitScript(value => {
            window.__ROUNDS_TEST_SEED__ = value
        }, seedData)
        await use(page)
    },

    app: async ({ page }, use) => {
        await use(new App(page))
    }
})

export { expect }
