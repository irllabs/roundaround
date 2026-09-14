/**
 * The round as it is drawn: a ring per layer, a dot per step, the centre controls, and the state
 * each dot reports. This is the spec that fails first when the canvas stops being drawn at all.
 */
import { test, expect } from '../fixtures/test.js'
import { ROUND_ID, USER_ID, OTHER_USER_ID, round, layer, user, otherUser, seed } from '../fixtures/seed.js'

test.describe('the round canvas', () => {
    test.beforeEach(async ({ app }) => {
        await app.openRound()
    })

    test('draws one dot per step of every layer', async ({ page }) => {
        // the seed is 16 kicks, 8 snares, 16 hats
        await expect(page.locator('[data-step-layer="kicks"]')).toHaveCount(16)
        await expect(page.locator('[data-step-layer="snares"]')).toHaveCount(8)
        await expect(page.locator('[data-step-layer="hats"]')).toHaveCount(16)
    })

    test('draws a hit area for every one of this user\'s steps', async ({ page }) => {
        // the hit area is what a finger lands on; without it a step cannot be tapped at all
        await expect(page.locator('[data-step-hit^="kicks-"]')).toHaveCount(16)
    })

    test('shows the steps that are on as on, and the rest as off', async ({ page }) => {
        for (const index of [0, 4, 8, 12]) {
            await expect(page.locator(`[data-step="kicks-s${index}"]`)).toHaveAttribute('data-step-on', 'true')
        }
        for (const index of [1, 2, 3, 5]) {
            await expect(page.locator(`[data-step="kicks-s${index}"]`)).toHaveAttribute('data-step-on', 'false')
        }
        await expect(page.locator('[data-step="snares-s2"]')).toHaveAttribute('data-step-on', 'true')
        // the hat ring starts empty
        await expect(page.locator('[data-step="hats-s0"]')).toHaveAttribute('data-step-on', 'false')
    })

    test('puts the transport, the tempo pill and the sequence controls in the middle', async ({ page }) => {
        await expect(page.locator('[aria-label="Play"]')).toBeAttached()
        await expect(page.locator('#tempo-button')).toBeAttached()
        await expect(page.locator('#tempo-button-text')).toHaveText('120')
        await expect(page.locator('#clickable-switch')).toBeAttached()
        await expect(page.locator('#sequence-cickable-button')).toBeAttached()
    })

    test('draws the eight pattern presets, each with its own click target', async ({ page }) => {
        for (let i = 0; i < 8; i++) {
            await expect(page.locator(`[id="${i}_pattern_clickable_button"]`)).toBeAttached()
        }
    })

    test('names the round in the header and offers the way back to the list', async ({ page }) => {
        await expect(page.getByTestId('button-back-to-rounds')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Test Round' })).toBeVisible()
    })

    test('reports no console errors while drawing a round', async ({ pageErrors }) => {
        expect(pageErrors).toEqual([])
    })
})

test.describe('a round with a collaborator', () => {
    test.use({
        seedData: seed({
            users: [user(), otherUser()],
            rounds: [round({
                members: [USER_ID, OTHER_USER_ID],
                layers: [
                    layer({ id: 'mine', createdBy: USER_ID, stepCount: 8, on: [0, 4], createdAt: 1000 }),
                    layer({ id: 'theirs', createdBy: OTHER_USER_ID, stepCount: 8, on: [2], sampler: 'Snares', sample: 'royale', createdAt: 1001 })
                ]
            })]
        })
    })

    test('draws both players\' rings, and hit areas only on this player\'s', async ({ app, page }) => {
        await app.openRound()
        await expect(page.locator('[data-step-layer="mine"]')).toHaveCount(8)
        await expect(page.locator('[data-step-layer="theirs"]')).toHaveCount(8)
        // a collaborator's steps are not this user's to tap
        await expect(page.locator('[data-step-hit^="mine-"]')).toHaveCount(8)
        await expect(page.locator('[data-step-hit^="theirs-"]')).toHaveCount(0)
    })
})

test.describe('a round that is not there', () => {
    test('sends the player back to their rounds rather than hanging', async ({ page }) => {
        await page.goto(`/play/${ROUND_ID}-does-not-exist`)
        await expect(page).toHaveURL(/\/rounds$/, { timeout: 20_000 })
    })
})
