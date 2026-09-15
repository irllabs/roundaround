/**
 * Getting into and out of a round: the landing page, the sign-in dialog, the rounds list, the
 * header, and signing out. These are the routes a player crosses before the canvas exists.
 */
import { test, expect } from '../fixtures/test.js'
import { seed, signedOutSeed, round, ROUND_ID } from '../fixtures/seed.js'

test.describe('the landing page, signed out', () => {
    test.use({ seedData: signedOutSeed() })

    test('offers a way in, and asks who you are', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByTestId('app')).toBeVisible()

        await page.getByTestId('button-get-started').click()

        await expect(page.getByTestId('button-guest')).toBeVisible()
        await expect(page.getByTestId('button-email')).toBeVisible()
    })

    test('takes a guest in under a name they choose', async ({ page, app }) => {
        await page.goto('/')
        await page.getByTestId('button-get-started').click()
        await page.getByTestId('button-guest').click()

        await page.getByTestId('input-name').locator('input').fill('Visitor')
        await page.getByTestId('button-name').click()

        // a guest is dropped straight into a round of their own
        await expect(page).toHaveURL(/\/play\//, { timeout: 30_000 })
        await app.waitForCanvas()
    })

    test('shows the sign-in button in the header rather than an avatar', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByTestId('button-sign-in-out')).toBeVisible()
    })
})

test.describe('the rounds list, signed in', () => {
    test('lists the rounds this user made', async ({ page }) => {
        await page.goto('/rounds')
        await expect(page.getByTestId('button-new-round')).toBeVisible()
        await expect(page.getByTestId('list-item-round')).toHaveCount(1)
    })

    test('opens a round from the list', async ({ page, app }) => {
        await page.goto('/rounds')
        await page.getByTestId('list-item-round').first().click()

        await expect(page).toHaveURL(new RegExp(`/play/${ROUND_ID}`))
        await app.waitForCanvas()
    })

    test('makes a new round and opens it', async ({ page, app }) => {
        await page.goto('/rounds')
        await page.getByTestId('button-new-round').click()

        await expect(page).toHaveURL(/\/play\//, { timeout: 30_000 })
        await app.waitForCanvas()
        await expect.poll(() => app.firebaseCalls('createRound').then(calls => calls.length)).toBeGreaterThan(0)
    })

    test('goes back to the list from a round', async ({ page, app }) => {
        await app.openRound()
        await page.getByTestId('button-back-to-rounds').click()
        await expect(page).toHaveURL(/\/rounds$/)
    })
})

test.describe('several rounds', () => {
    test.use({
        seedData: seed({
            rounds: [
                round({ id: 'round-a', name: 'Round A', createdAt: 3000 }),
                round({ id: 'round-b', name: 'Round B', createdAt: 2000 })
            ]
        })
    })

    test('lists them newest first', async ({ page }) => {
        await page.goto('/rounds')
        await expect(page.getByTestId('list-item-round')).toHaveCount(2)
        await expect(page.getByTestId('list-item-round').first()).toContainText('Round A')
    })
})

test.describe('the account menu', () => {
    test('signs the player out', async ({ page, app }) => {
        await app.openRound()
        await page.getByTestId('button-back-to-rounds').click()
        await expect(page).toHaveURL(/\/rounds$/)

        await page.getByTestId('button-sign-in-out').click()
        await page.getByTestId('button-sign-out').click()

        await expect.poll(() => app.firebaseCalls('signOut').then(calls => calls.length)).toBeGreaterThan(0)
    })
})
