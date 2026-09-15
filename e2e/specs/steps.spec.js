/**
 * Editing a round: tapping a step on and off, what gets written, and the hold that opens the step
 * modal. A tap and a hold start the same way, so the two are easy to break in each other's favour;
 * both are checked here.
 */
import { test, expect } from '../fixtures/test.js'

/** The hold that opens the step modal is half a second; press past it, then let go. */
async function holdStep (page, stepId, ms = 900) {
    const hit = page.locator(`[data-step-hit="${stepId}"]`)
    const box = await hit.boundingBox()
    if (!box) {
        throw new Error(`No hit area on screen for ${stepId}`)
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(ms)
    return async () => {
        await page.mouse.up()
    }
}

test.describe('tapping a step', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('turns an empty step on, and the dot says so', async ({ page, app }) => {
        const dot = page.locator('[data-step="hats-s0"]')
        await expect(dot).toHaveAttribute('data-step-on', 'false')

        await page.locator('[data-step-hit="hats-s0"]').click()

        await expect(dot).toHaveAttribute('data-step-on', 'true')
        await expect.poll(() => app.stepIsOn('hats', 'hats-s0')).toBe(true)
    })

    test('turns a step that was on back off', async ({ page, app }) => {
        const dot = page.locator('[data-step="kicks-s0"]')
        await expect(dot).toHaveAttribute('data-step-on', 'true')

        await page.locator('[data-step-hit="kicks-s0"]').click()

        await expect(dot).toHaveAttribute('data-step-on', 'false')
        await expect.poll(() => app.stepIsOn('kicks', 'kicks-s0')).toBe(false)
    })

    test('writes the layer once per tap, with every step in it', async ({ page, app }) => {
        await page.locator('[data-step-hit="hats-s1"]').click()
        await expect.poll(() => app.stepIsOn('hats', 'hats-s1')).toBe(true)

        const writes = await app.firebaseCalls('updateLayer')
        const hatWrites = writes.filter(call => call.args.layerId === 'hats')
        expect(hatWrites.length).toBeGreaterThan(0)
        // the write carries the whole step array, not just the one that changed
        expect(hatWrites.at(-1).args.data.steps).toHaveLength(16)
    })

    test('leaves the other steps of the layer alone', async ({ page, app }) => {
        await page.locator('[data-step-hit="hats-s3"]').click()
        await expect.poll(() => app.stepIsOn('hats', 'hats-s3')).toBe(true)

        expect(await app.stepIsOn('hats', 'hats-s2')).toBe(false)
        expect(await app.stepIsOn('hats', 'hats-s4')).toBe(false)
        // and another layer entirely is untouched
        expect(await app.stepIsOn('kicks', 'kicks-s0')).toBe(true)
    })

    test('takes several taps in a row without losing one', async ({ page, app }) => {
        for (const index of [1, 5, 9, 13]) {
            await page.locator(`[data-step-hit="hats-s${index}"]`).click()
        }
        for (const index of [1, 5, 9, 13]) {
            await expect(page.locator(`[data-step="hats-s${index}"]`)).toHaveAttribute('data-step-on', 'true')
        }
        await expect.poll(async () => {
            const layer = await app.storedLayer('hats')
            return layer.steps.filter(step => step.isOn).length
        }).toBe(4)
    })

    test('saves the change into the pattern a second after the last tap', async ({ page, app }) => {
        await page.locator('[data-step-hit="hats-s7"]').click()
        // the pattern write is debounced by a second; the layer write is not
        await expect.poll(() => app.firebaseCalls('saveUserPatterns').then(calls => calls.length), { timeout: 15_000 })
            .toBeGreaterThan(0)
    })
})

test.describe('holding a step', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('opens the step modal on a step that is on', async ({ page }) => {
        const modal = page.getByTestId('step-modal')
        await expect(modal).toBeHidden()

        const release = await holdStep(page, 'kicks-s0')
        await expect(modal).toBeVisible()
        await release()
    })

    test('does not open it on a plain tap', async ({ page }) => {
        const modal = page.getByTestId('step-modal')

        await page.locator('[data-step-hit="kicks-s4"]').click()

        await expect(modal).toBeHidden()
    })

    test('does not open it on a step that is off: there is nothing to shape yet', async ({ page }) => {
        const modal = page.getByTestId('step-modal')

        const release = await holdStep(page, 'hats-s0')
        await expect(modal).toBeHidden()
        await release()
    })
})

test.describe('a step that is edited while the round plays', () => {
    test('is taken by the engine without stopping the transport', async ({ page, app }) => {
        await app.openRound()
        await page.locator('[aria-label="Play"]').click()
        await expect.poll(() => app.isPlaying()).toBe(true)

        await page.locator('[data-step-hit="hats-s2"]').click()

        await expect(page.locator('[data-step="hats-s2"]')).toHaveAttribute('data-step-on', 'true')
        expect(await app.isPlaying()).toBe(true)
    })
})
