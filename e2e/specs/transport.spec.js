/**
 * Starting and stopping the round: the button, the spacebar, what the engine does, and what the
 * playhead does while it runs. The playhead is the only thing on screen that says the round is
 * moving, so its behaviour is checked here rather than left to a screenshot.
 */
import { test, expect } from '../fixtures/test.js'

test.describe('the transport', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('starts and stops from the play button, and says which it will do next', async ({ page, app }) => {
        const play = page.locator('[aria-label="Play"]')
        await expect(play).toBeAttached()
        await play.click()

        await expect(page.locator('[aria-label="Stop"]')).toBeAttached()
        await expect.poll(() => app.isPlaying()).toBe(true)

        await page.locator('[aria-label="Stop"]').click()
        await expect(page.locator('[aria-label="Play"]')).toBeAttached()
        await expect.poll(() => app.isPlaying()).toBe(false)
    })

    test('starts and stops from the spacebar', async ({ page, app }) => {
        await page.keyboard.press('Space')
        await expect.poll(() => app.isPlaying()).toBe(true)

        await page.keyboard.press('Space')
        await expect.poll(() => app.isPlaying()).toBe(false)
    })

    test('runs the transport forward in bars while it plays', async ({ page, app }) => {
        await page.locator('[aria-label="Play"]').click()
        await expect.poll(() => app.isPlaying()).toBe(true)

        const first = await app.positionBars()
        await page.waitForTimeout(700)
        const second = await app.positionBars()
        // 120 bpm is a two second bar, so 700 ms is about a third of one
        expect(second).toBeGreaterThan(first)
    })
})

test.describe('the playhead', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('is drawn across the rings and kept out of sight until the round plays', async ({ page, app }) => {
        await expect(page.locator('#playhead')).toBeAttached()
        expect(await app.playheadVisible()).toBe(false)
        // it must never swallow a tap meant for a step underneath it
        await expect(page.locator('#playhead')).toHaveAttribute('pointer-events', 'none')
    })

    test('appears on play and turns as the round runs', async ({ page, app }) => {
        await page.locator('[aria-label="Play"]').click()
        await expect.poll(() => app.playheadVisible()).toBe(true)

        // it turns once a bar: at 120 bpm a bar is two seconds, so 600 ms is roughly 108 degrees
        await expect.poll(() => app.playheadDegrees(), { timeout: 15_000 }).toBeGreaterThan(20)
        const early = await app.playheadDegrees()
        await page.waitForTimeout(400)
        const later = await app.playheadDegrees()
        // either it has moved on round the dial, or it has passed the top and started again
        expect(later).not.toBe(early)
    })

    test('goes back to the top and out of sight on stop', async ({ page, app }) => {
        await page.locator('[aria-label="Play"]').click()
        await expect.poll(() => app.playheadVisible()).toBe(true)
        await page.waitForTimeout(400)

        await page.locator('[aria-label="Stop"]').click()
        await expect.poll(() => app.playheadVisible()).toBe(false)
        expect(await app.playheadDegrees()).toBe(0)
    })
})

test.describe('the metronome', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('is off until the tempo pill is tapped, and says so', async ({ page, app }) => {
        const pill = page.locator('#tempo-button')
        await expect(pill).toHaveAttribute('aria-pressed', 'false')
        expect(await app.metronomeOn()).toBe(false)

        await pill.click()
        await expect(pill).toHaveAttribute('aria-pressed', 'true')
        expect(await app.metronomeOn()).toBe(true)

        await pill.click()
        await expect(pill).toHaveAttribute('aria-pressed', 'false')
        expect(await app.metronomeOn()).toBe(false)
    })

    test('keeps the tempo label and the round\'s tempo together', async ({ page }) => {
        await expect(page.locator('#tempo-button-text')).toHaveText('120')
    })

    test('can be switched with the keyboard', async ({ page, app }) => {
        await page.locator('#tempo-button').focus()
        await page.keyboard.press('Enter')
        expect(await app.metronomeOn()).toBe(true)
    })
})
