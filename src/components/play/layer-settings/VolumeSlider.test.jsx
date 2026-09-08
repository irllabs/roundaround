import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VolumeSlider from './VolumeSlider'
import { renderWithProviders, makeStore } from '../../../test/test-utils'
import { setRound } from '../../../redux/actions'

// The slider reaches Tone.js through the audio engine's imports. A gain write has nothing to do
// with audio here (the engine itself is mocked), and loading Tone only buys a banner on stdout.
vi.mock('tone', () => ({}))
vi.mock('../../../audio-engine/AudioEngine', () => ({ default: { tracksById: {} } }))

const layerA = { id: 'layer-a', createdBy: 'me', gain: 0, isMuted: false, steps: [] }
const layerB = { id: 'layer-b', createdBy: 'me', gain: 0, isMuted: false, steps: [] }

// No getBoundingClientRect stub: the slider is driven from the keyboard, and Radix's key handlers
// jump straight to a value instead of measuring the track. (The pointer path cannot be driven at
// all here -- Radix listens for pointer events and jsdom has no PointerEvent.)
describe('VolumeSlider', () => {
    it('saves the gain of the layer that is selected now, not the one selected first', async () => {
        const store = makeStore()
        store.dispatch(setRound({ id: 'r1', layers: [layerA, layerB], currentUsers: [] }))
        const firebase = { updateLayer: vi.fn().mockResolvedValue() }
        const user = { id: 'me' }
        const { rerender } = renderWithProviders(
            <VolumeSlider selectedLayer={layerA} user={user} roundId="r1" />, { store, firebase }
        )
        rerender(<VolumeSlider selectedLayer={layerB} user={user} roundId="r1" />)

        const thumb = screen.getByRole('slider')
        thumb.focus()
        await userEvent.setup().keyboard('{End}')

        await waitFor(() => expect(firebase.updateLayer).toHaveBeenCalled())
        for (const call of firebase.updateLayer.mock.calls) {
            expect(call[0]).toBe('r1')
            expect(call[1]).toBe('layer-b')
            expect(call[2]).toHaveProperty('gain')
        }
        const savedLayerB = store.getState().round.layers.find(l => l.id === 'layer-b')
        expect(savedLayerB.gain).toBeGreaterThan(-6) // End is 100%, the top of the upper range
        expect(store.getState().round.layers.find(l => l.id === 'layer-a').gain).toBe(0)
    })
})
