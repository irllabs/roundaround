/**
 * The layer bar along the bottom: the mixer, the step count, the offset that turns a ring, and
 * mute. These are the controls that change what a ring is, so a regression here is silent on the
 * canvas until something sounds wrong.
 */
import { test, expect } from '../fixtures/test.js'

test.describe('the layer bar', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('offers the mixer, and the mixer lists every layer', async ({ page }) => {
        await page.getByRole('button', { name: 'Open the mixer' }).click()

        const mixer = page.getByTestId('mixer-popup')
        await expect(mixer).toBeVisible()
        await expect(mixer.getByRole('slider')).toHaveCount(3)

        await page.getByRole('button', { name: 'Close the mixer' }).click()
        await expect(mixer).toHaveAttribute('data-open', 'false')
    })

    test('opens the layer options, and the step count is the layer\'s own', async ({ page, app }) => {
        await app.selectLayer('kicks')
        await page.getByRole('button', { name: 'Layer options' }).click()

        const popup = page.getByTestId('layer-popup')
        await expect(popup).toBeVisible()
        await expect(popup.getByRole('textbox', { name: 'Number of steps' })).toHaveValue('16')
    })

    test('adds a step to the ring, and the ring gains a dot', async ({ page, app }) => {
        await app.selectLayer('kicks')
        await page.getByRole('button', { name: 'Layer options' }).click()
        await page.getByRole('button', { name: 'More steps' }).click()

        await expect.poll(async () => {
            const layer = await app.storedLayer('kicks')
            return layer.steps.length
        }).toBe(17)
        await expect(page.locator('[data-step-layer="kicks"]')).toHaveCount(17)
    })

    test('takes a step off the ring again', async ({ page, app }) => {
        await app.selectLayer('kicks')
        await page.getByRole('button', { name: 'Layer options' }).click()
        await page.getByRole('button', { name: 'Fewer steps' }).click()

        await expect.poll(async () => {
            const layer = await app.storedLayer('kicks')
            return layer.steps.length
        }).toBe(15)
        await expect(page.locator('[data-step-layer="kicks"]')).toHaveCount(15)
    })

    test('turns the ring with the offset slider, and writes the offset', async ({ page, app }) => {
        await app.selectLayer('kicks')
        await page.getByRole('button', { name: 'Layer options' }).click()

        const slider = page.getByTestId('layer-popup').getByRole('slider').last()
        await slider.focus()
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('ArrowRight')
        }

        await expect.poll(async () => {
            const layer = await app.storedLayer('kicks')
            return layer.percentOffset
        }).toBeGreaterThan(0)
    })

    test('mutes a layer from the volume popup and lets it back in', async ({ page, app }) => {
        await app.selectLayer('kicks')
        await page.getByRole('button', { name: 'Volume, solo and mute' }).click()
        const popup = page.getByTestId('volume-popup')
        await expect(popup).toBeVisible()

        const mute = popup.getByRole('button', { name: 'Mute' })
        await mute.click()
        await expect.poll(async () => (await app.storedLayer('kicks')).isMuted).toBe(true)

        await mute.click()
        await expect.poll(async () => (await app.storedLayer('kicks')).isMuted).toBe(false)
    })

    test('adds a layer to the round, and the canvas gains a ring', async ({ page, app }) => {
        const before = (await app.storedRound()).layers.length

        await page.getByRole('button', { name: 'Add a layer' }).click()

        await expect.poll(async () => (await app.storedRound()).layers.length, { timeout: 20_000 }).toBe(before + 1)
        await expect.poll(() => app.firebaseCalls('createLayer').then(calls => calls.length)).toBeGreaterThan(0)
    })

    test('clears a layer without removing it', async ({ page, app }) => {
        await app.selectLayer('kicks')
        await page.getByRole('button', { name: 'Clear this layer' }).click()

        await expect.poll(async () => {
            const layer = await app.storedLayer('kicks')
            return layer.steps.filter(step => step.isOn).length
        }).toBe(0)
        // the ring is still there, just empty
        await expect(page.locator('[data-step-layer="kicks"]')).toHaveCount(16)
    })

    test('deletes a layer, and its ring goes', async ({ page, app }) => {
        await app.selectLayer('kicks')
        await page.getByRole('button', { name: 'Delete this layer' }).click()

        await expect(page.locator('[data-step-layer="kicks"]')).toHaveCount(0)
        await expect.poll(() => app.firebaseCalls('deleteLayer').then(calls => calls.length)).toBeGreaterThan(0)
    })
})

test.describe('the effects sidebar', () => {
    test('is on the page with the round\'s effects', async ({ app, page }) => {
        await app.openRound()
        await expect(page.locator('#effects-sidebar-effects')).toBeAttached()
        await expect(page.getByRole('button', { name: /the effects/ })).toBeVisible()
    })
})
