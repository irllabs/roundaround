import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'
import RoundsListRoute from './RoundsListRoute'
import { renderWithProviders, makeStore, LocationProbe } from '../../test/test-utils'
import { setUser, setRounds } from '../../redux/actions'

// "New round" builds a round out of the default round data, and that reaches Tone.js. No sound is
// made here, and loading Tone only buys a banner on stdout.
vi.mock('tone', () => ({}))
// The new round picks a random sampler and articulation; the samples themselves are beside the point.
vi.mock('../../audio-engine/Instruments', () => ({
    default: {
        classes: vi.fn().mockResolvedValue({ Kicks: { sampleKeys: ['a'] } }),
        getRandomArticulation: vi.fn().mockResolvedValue('a')
    }
}))

const me = { id: 'me', displayName: 'Ada Lovelace', isGuest: false }
const jam = { id: 'r1', name: 'Jam', createdAt: Date.UTC(2026, 8, 3, 12, 0, 0) }
const sketch = { id: 'r2', name: 'Sketch', createdAt: Date.UTC(2026, 7, 29, 9, 30, 0) }

/** The date line each row shows, built the way the component builds it. */
function createdString(round) {
    return new Date(round.createdAt).toLocaleTimeString('en-gb', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Renders the route the way App.jsx does, so it is handed a `history` to push onto. */
function renderRoundsList(rounds = [jam, sketch]) {
    const store = makeStore()
    store.dispatch(setUser(me))
    store.dispatch(setRounds(rounds))
    const firebase = { createRound: vi.fn().mockResolvedValue() }
    const view = renderWithProviders(
        <><Route path="/rounds" component={RoundsListRoute} /><LocationProbe /></>,
        { store, firebase, route: '/rounds' }
    )
    return { store, firebase, ...view }
}

/** Opens the menu on one row the way a person does. */
async function openRowMenu(user, index) {
    const view = renderRoundsList()
    await user.click(screen.getAllByRole('button', { name: 'Round options' })[index])
    await screen.findByRole('menu')
    return view
}

describe('RoundsListRoute', () => {
    it('lists every round the user owns, with the date it was made', () => {
        renderRoundsList()

        const rows = screen.getAllByTestId('list-item-round')
        expect(rows).toHaveLength(2)
        expect(rows[0]).toHaveTextContent('Jam')
        expect(rows[0]).toHaveTextContent(createdString(jam))
        expect(rows[1]).toHaveTextContent('Sketch')
        expect(rows[1]).toHaveTextContent(createdString(sketch))
    })

    it('opens the round a row is about', async () => {
        const user = userEvent.setup()
        renderRoundsList()

        await user.click(screen.getAllByTestId('list-item-round')[1])

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/play/r2'))
    })

    it('makes a new round and opens it', async () => {
        const user = userEvent.setup()
        const { store, firebase } = renderRoundsList()

        await user.click(screen.getByTestId('button-new-round'))

        await waitFor(() => expect(firebase.createRound).toHaveBeenCalled())
        const newRound = firebase.createRound.mock.calls[0][0]
        expect(newRound.createdBy).toBe('me')
        expect(store.getState().rounds.map(round => round.id)).toEqual([newRound.id, 'r1', 'r2'])
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/play/' + newRound.id))
    })

    it('selects the round a menu is about while it is open, and unselects it after', async () => {
        const user = userEvent.setup()
        const { store } = await openRowMenu(user, 1)

        expect(store.getState().display.selectedRoundId).toBe('r2')
        expect(screen.getByRole('menu')).toHaveAttribute('id', 'menu-list-grow')

        await user.keyboard('{Escape}')

        await waitFor(() => expect(store.getState().display.selectedRoundId).toBeNull())
    })

    it('opens the rename dialog for the round whose menu it was', async () => {
        const user = userEvent.setup()
        const { store } = await openRowMenu(user, 0)

        await user.click(screen.getByRole('menuitem', { name: 'Rename' }))

        expect(store.getState().display.isShowingRenameDialog).toBe(true)
        // The dialog is about the round the menu was opened on, so the selection outlives the menu.
        expect(store.getState().display.selectedRoundId).toBe('r1')
        await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    })

    it('opens the delete dialog for the round whose menu it was', async () => {
        const user = userEvent.setup()
        const { store } = await openRowMenu(user, 0)

        await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

        expect(store.getState().display.isShowingDeleteRoundDialog).toBe(true)
        expect(store.getState().display.selectedRoundId).toBe('r1')
        await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    })
})
