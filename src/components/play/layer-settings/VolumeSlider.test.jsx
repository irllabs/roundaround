import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import VolumeSlider from './VolumeSlider'
import { renderWithProviders, makeStore } from '../../../test/test-utils'
import { setRound } from '../../../redux/actions'

vi.mock('../../../audio-engine/AudioEngine', () => ({ default: { tracksById: {} } }))

const layerA = { id: 'layer-a', createdBy: 'me', gain: 0, isMuted: false, steps: [] }
const layerB = { id: 'layer-b', createdBy: 'me', gain: 0, isMuted: false, steps: [] }

// MUI's slider turns the pointer position into a value using the track's box, which jsdom
// reports as empty; give every element a 100px wide box so 75px means 75%.
function withSliderGeometry() {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        width: 100, height: 10, left: 0, top: 0, right: 100, bottom: 10, x: 0, y: 0, toJSON: () => ({})
    })
}

describe('VolumeSlider', () => {
    it('saves the gain of the layer that is selected now, not the one selected first', async () => {
        const store = makeStore()
        store.dispatch(setRound({ id: 'r1', layers: [layerA, layerB], currentUsers: [] }))
        const firebase = { updateLayer: vi.fn().mockResolvedValue() }
        const user = { id: 'me' }
        withSliderGeometry()
        const { rerender } = renderWithProviders(
            <VolumeSlider selectedLayer={layerA} user={user} roundId="r1" />, { store, firebase }
        )
        rerender(<VolumeSlider selectedLayer={layerB} user={user} roundId="r1" />)

        fireEvent.mouseDown(screen.getByRole('slider'), { clientX: 75, clientY: 5 })
        fireEvent.mouseUp(document)

        await waitFor(() => expect(firebase.updateLayer).toHaveBeenCalled())
        for (const call of firebase.updateLayer.mock.calls) {
            expect(call[0]).toBe('r1')
            expect(call[1]).toBe('layer-b')
            expect(call[2]).toHaveProperty('gain')
        }
        const savedLayerB = store.getState().round.layers.find(l => l.id === 'layer-b')
        expect(savedLayerB.gain).toBeGreaterThan(-6) // 75% sits in the upper range
        expect(store.getState().round.layers.find(l => l.id === 'layer-a').gain).toBe(0)
    })
})
