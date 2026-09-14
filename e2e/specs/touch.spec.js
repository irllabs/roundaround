/**
 * The round on a tablet, which is what it is mostly played on. This spec runs in the `tablet`
 * project (see playwright.config.js): a touch screen, a narrower window, and the hit areas sized
 * for a finger rather than a pointer (see src/components/play/touchTargets.js).
 */
import { test, expect } from '../fixtures/test.js'

test.describe('the round under a finger', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('gives every step a hit area a finger can land on', async ({ page }) => {
        const hits = page.locator('[data-step-hit^="kicks-"]')
        await expect(hits).toHaveCount(16)

        // the guideline is a 44 point target; the ellipse is laid along the ring, so the short
        // axis across the ring is the one that has to clear it
        const boxes = await hits.evaluateAll(nodes => nodes.map(node => {
            const box = node.getBoundingClientRect()
            return { width: box.width, height: box.height }
        }))
        for (const box of boxes) {
            expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40)
        }
    })

    test('toggles a step on a tap', async ({ page, app }) => {
        await page.locator('[data-step-hit="hats-s0"]').tap()

        await expect(page.locator('[data-step="hats-s0"]')).toHaveAttribute('data-step-on', 'true')
        await expect.poll(() => app.stepIsOn('hats', 'hats-s0')).toBe(true)
    })

    test('starts the round from the play button on a tap', async ({ page, app }) => {
        await page.locator('[aria-label="Play"]').tap()
        await expect.poll(() => app.isPlaying()).toBe(true)
    })

    test('fits the whole round on the screen', async ({ page }) => {
        const round = page.locator('#round > svg')
        await expect(round).toBeAttached()

        const fits = await page.evaluate(() => {
            const svg = document.querySelector('#round > svg')
            const box = svg.getBoundingClientRect()
            return box.width <= window.innerWidth + 1 && box.height <= window.innerHeight + 1
        })
        expect(fits).toBe(true)
    })

    test('keeps the page from scrolling sideways', async ({ page }) => {
        const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
        expect(overflows).toBe(false)
    })
})
