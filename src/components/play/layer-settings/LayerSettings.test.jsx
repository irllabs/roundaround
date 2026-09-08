import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LayerSettings from './LayerSettings'
import { renderWithProviders, makeStore } from '../../../test/test-utils'
import { setRound, setUser } from '../../../redux/actions'
import { SET_SELECTED_LAYER_ID } from '../../../redux/actionTypes'

vi.mock('tone', () => ({}))
vi.mock('../../../audio-engine/AudioEngine', () => ({ default: { tracksById: {} } }))
vi.mock('../../../audio-engine/Instruments', () => ({
    default: {
        getInstrumentOptions: () => [{ name: 'Kicks', label: 'Kick' }],
        getInstrumentArticulationOptions: () => [{ name: 'a', value: 'a' }],
        getRandomArticulation: async () => 'a',
        getInstrumentLabel: () => 'Kick'
    }
}))

const layer = { id: 'l1', createdBy: 'me', createdAt: 1, gain: 0, isMuted: false, timeOffset: 0, percentOffset: 0, instrument: { sampler: 'Kicks', sample: 'boom' }, steps: [{ id: 's1', isOn: false }] }

function renderLayerSettings({ selected = true } = {}) {
    const store = makeStore()
    store.dispatch(setUser({ id: 'me', color: '#f44336' }))
    store.dispatch(setRound({ id: 'r1', currentUsers: ['me'], layers: [layer] }))
    if (selected) store.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId: 'l1' } })
    return renderWithProviders(<LayerSettings />, { store, firebase: { updateLayer: vi.fn(), createLayer: vi.fn(), deleteLayer: vi.fn() } })
}

describe('LayerSettings', () => {
    it('asks for a layer when none is selected', () => {
        renderLayerSettings({ selected: false })
        expect(screen.getByText('Long Press a round to edit')).toBeInTheDocument()
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'false')
    })

    it('opens the mixer from the bar and closes it again from the same button', async () => {
        const user = userEvent.setup()
        renderLayerSettings()
        const mixer = screen.getByTestId('mixer-popup')
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        expect(mixer).toHaveAttribute('data-open', 'true')
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        expect(mixer).toHaveAttribute('data-open', 'false')
    })

    it('closes an open popup on Escape', async () => {
        const user = userEvent.setup()
        renderLayerSettings()
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'true')
        await user.keyboard('{Escape}')
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'false')
    })

    // An Escape it does not act on stays the browser's own: Chrome answers it with Stop, and
    // preventDefault on a key this component ignored would take that away.
    it('takes the Escape it closes a popup with, and leaves the others alone', async () => {
        const user = userEvent.setup()
        renderLayerSettings()
        const ignored = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
        window.dispatchEvent(ignored)
        expect(ignored.defaultPrevented).toBe(false)

        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        const taken = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
        window.dispatchEvent(taken)
        expect(taken.defaultPrevented).toBe(true)
    })

    it('closes an open popup when the click lands outside it', async () => {
        const user = userEvent.setup()
        renderLayerSettings()
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        await user.click(document.body)
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'false')
    })

    it('selects a layer from a mixer row', async () => {
        const user = userEvent.setup()
        const { store } = renderLayerSettings({ selected: false })
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        await user.click(screen.getByText('boom'))
        expect(store.getState().display.selectedLayerId).toBe('l1')
    })

    // Material UI's slider only ever killed the mousedown it read the value from, so the click
    // went on bubbling and a press on a row's volume slider picked that row's layer too. Radix
    // gives the handler a value instead of an event, and nothing in VolumeSlider stops the click,
    // which is what keeps this working.
    it('selects a layer from the volume slider in its mixer row', async () => {
        const user = userEvent.setup()
        const { store } = renderLayerSettings({ selected: false })
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        await user.click(screen.getByRole('slider', { name: 'Volume' }))
        expect(store.getState().display.selectedLayerId).toBe('l1')
    })

    it('opens only one popup at a time', async () => {
        const user = userEvent.setup()
        renderLayerSettings()
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'true')
        // More is the phone-size half of the add-layer pair; jsdom runs with css:false, so the
        // class that hides it above 500px is not there to stop the click
        await user.click(screen.getByRole('button', { name: 'More' }))
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'false')
        expect(screen.getByTestId('hamburger-popup')).toHaveAttribute('data-open', 'true')
    })

    it('opens only one popup at a time, from the bar\'s own steps pill', async () => {
        const user = userEvent.setup()
        renderLayerSettings()
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        await user.click(screen.getByRole('button', { name: 'Layer options' }))
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'false')
        expect(screen.getByTestId('layer-popup')).toHaveAttribute('data-open', 'true')
    })
})
