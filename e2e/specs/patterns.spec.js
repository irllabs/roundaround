/**
 * The patterns and the sequence: the eight presets around the middle, the switch between playing
 * one preset and playing the recorded sequence, and the recording itself.
 */
import { test, expect } from '../fixtures/test.js'
import { USER_ID } from '../fixtures/seed.js'

test.describe('the pattern presets', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('marks the preset that is playing', async ({ page }) => {
        // the selected preset is the only one wearing an outline
        await expect(page.locator('[id="0-pattern-outline"]')).toBeAttached()
        await expect(page.locator('[id="1-pattern-outline"]')).toHaveCount(0)
    })

    test('moves the outline when another preset is chosen', async ({ page }) => {
        await page.locator('[id="1_pattern_clickable_button"]').click()

        await expect(page.locator('[id="1-pattern-outline"]')).toBeAttached()
        await expect(page.locator('[id="0-pattern-outline"]')).toHaveCount(0)
    })

    test('saves the round into the preset it leaves, so the steps come back', async ({ page, app }) => {
        // a step that only exists in preset A
        await page.locator('[data-step-hit="hats-s5"]').click()
        await expect(page.locator('[data-step="hats-s5"]')).toHaveAttribute('data-step-on', 'true')

        await page.locator('[id="1_pattern_clickable_button"]').click()
        await expect(page.locator('[id="1-pattern-outline"]')).toBeAttached()

        await page.locator('[id="0_pattern_clickable_button"]').click()
        await expect(page.locator('[id="0-pattern-outline"]')).toBeAttached()
        await expect(page.locator('[data-step="hats-s5"]')).toHaveAttribute('data-step-on', 'true')

        const patterns = await app.storedUserPatterns(USER_ID)
        expect(patterns.patterns).toHaveLength(8)
    })

    test('empties the rings when an unsaved preset is chosen', async ({ page }) => {
        await page.locator('[id="3_pattern_clickable_button"]').click()

        // preset D has never been saved, so it starts the round silent
        await expect(page.locator('[data-step="kicks-s0"]')).toHaveAttribute('data-step-on', 'false')
        await expect(page.locator('[data-step="snares-s2"]')).toHaveAttribute('data-step-on', 'false')
    })
})

test.describe('the sequence', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('switches between the preset and the sequence', async ({ page, app }) => {
        await page.locator('#clickable-switch').click()

        await expect.poll(async () => {
            const patterns = await app.storedUserPatterns(USER_ID)
            return patterns.isPlayingSequence
        }).toBe(true)

        await page.locator('#clickable-switch').click()
        await expect.poll(async () => {
            const patterns = await app.storedUserPatterns(USER_ID)
            return patterns.isPlayingSequence
        }).toBe(false)
    })

    test('goes into recording, and the button offers to stop', async ({ page }) => {
        await expect(page.locator('#sequence-text')).toHaveText('Sequence')

        await page.locator('#sequence-cickable-button').click()

        await expect(page.locator('#sequence-stop')).toBeAttached()
        await expect(page.locator('#sequence-text')).toHaveText('Stop')
    })

    test('records the presets that are tapped, and stops again', async ({ page, app }) => {
        await page.locator('#sequence-cickable-button').click()
        await expect(page.locator('#sequence-stop')).toBeAttached()

        await page.locator('[id="0_pattern_clickable_button"]').click()
        await page.locator('[id="1_pattern_clickable_button"]').click()

        // while recording, the pill and its click target share an id; the overlay is drawn last
        await page.locator('#sequence-button').last().click()
        await expect(page.locator('#sequence-text')).toHaveText('Sequence')

        // finishing the recording is what starts the sequence playing, and that is written
        await expect.poll(async () => {
            const patterns = await app.storedUserPatterns(USER_ID)
            return patterns.isPlayingSequence
        }).toBe(true)
    })
})
