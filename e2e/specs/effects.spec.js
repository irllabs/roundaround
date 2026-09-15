/**
 * The effects sidebar: the six switches down the side of the round. Each is a thumb drawn with
 * SVG.js and dragged, so the switch a test (or a screen reader, or a keyboard) reaches is the
 * element around it, which carries the name, the state and the keys.
 */
import { test, expect } from '../fixtures/test.js'
import { USER_ID } from '../fixtures/seed.js'

const EFFECTS = ['pingpong', 'autowah', 'delay', 'distortion', 'lowpass', 'highpass']

/** Whether the round says an effect is overridden, which is what a switch writes. */
async function storedOverride (app, name) {
    const round = await app.storedRound()
    const fx = (round.userBuses[USER_ID].fx || []).find(entry => entry.name === name)
    return fx ? fx.isOverride === true : null
}

test.describe('the effects sidebar', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('gives every effect a switch that says which effect it is', async ({ page }) => {
        await expect(page.getByTestId('effect-switch')).toHaveCount(EFFECTS.length)
        for (const name of EFFECTS) {
            await expect(page.locator(`[data-effect="${name}"]`)).toHaveCount(1)
        }
    })

    test('names each switch and reports its state', async ({ page }) => {
        const delay = page.locator('[data-effect="delay"]').getByRole('switch')
        await expect(delay).toHaveAttribute('aria-label', 'Delay')
        await expect(delay).toHaveAttribute('aria-checked', /true|false/)
    })

    test('switches an effect from the keyboard, and writes it to the round', async ({ page, app }) => {
        const before = await storedOverride(app, 'delay')

        const delay = page.locator('[data-effect="delay"]').getByRole('switch')
        await delay.focus()
        await page.keyboard.press('Enter')

        await expect(delay).toHaveAttribute('data-on', String(!before))
        await expect.poll(() => storedOverride(app, 'delay')).toBe(!before)
    })

    test('switches it back', async ({ page, app }) => {
        const delay = page.locator('[data-effect="delay"]').getByRole('switch')
        const before = await storedOverride(app, 'delay')

        await delay.focus()
        await page.keyboard.press('Enter')
        await expect.poll(() => storedOverride(app, 'delay')).toBe(!before)

        await page.keyboard.press('Enter')
        await expect.poll(() => storedOverride(app, 'delay')).toBe(before)
    })

    test('does not start the round when a switch is used with the spacebar', async ({ page, app }) => {
        // PlayUI starts playback on Space for anything that is not a text field, so a switch that
        // did not stop the key would play the round every time someone reached it from the keyboard
        const lowpass = page.locator('[data-effect="lowpass"]').getByRole('switch')
        await lowpass.focus()
        await page.keyboard.press(' ')

        await expect.poll(() => storedOverride(app, 'lowpass')).toBe(true)
        expect(await app.isPlaying()).toBe(false)
    })

    test('leaves the other effects alone', async ({ page, app }) => {
        const before = await Promise.all(EFFECTS.map(name => storedOverride(app, name)))

        await page.locator('[data-effect="autowah"]').getByRole('switch').focus()
        await page.keyboard.press('Enter')
        await expect.poll(() => storedOverride(app, 'autowah')).toBe(!before[1])

        const after = await Promise.all(EFFECTS.map(name => storedOverride(app, name)))
        expect(after.filter((value, i) => value !== before[i])).toHaveLength(1)
    })

    test('can be hidden and shown again', async ({ page }) => {
        const toggle = page.getByRole('button', { name: 'Hide the effects' })
        await toggle.click()
        await expect(page.getByRole('button', { name: 'Show the effects' })).toBeVisible()
    })
})
