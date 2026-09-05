import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react'
import VolumeSlider from './VolumeSlider'
import { renderWithProviders, makeStore } from '../../../test/test-utils'
import { setRound } from '../../../redux/actions'

jest.mock('../../../audio-engine/AudioEngine', () => ({ tracksById: {} }))

const layerA = { id: 'layer-a', createdBy: 'me', gain: 0, isMuted: false, steps: [] }
const layerB = { id: 'layer-b', createdBy: 'me', gain: 0, isMuted: false, steps: [] }

function sliderAt(container) {
    const slider = container.querySelector('.MuiSlider-root')
    slider.getBoundingClientRect = () => ({ width: 100, height: 10, left: 0, top: 0, right: 100, bottom: 10 })
    return slider
}

describe('VolumeSlider', () => {
    it('saves the gain of the layer that is selected now, not the one selected first', async () => {
        const store = makeStore()
        store.dispatch(setRound({ id: 'r1', layers: [layerA, layerB], currentUsers: [] }))
        const firebase = { updateLayer: jest.fn().mockResolvedValue() }
        const user = { id: 'me' }
        const { container, rerender } = renderWithProviders(
            <VolumeSlider selectedLayer={layerA} user={user} roundId="r1" />, { store, firebase }
        )
        rerender(<VolumeSlider selectedLayer={layerB} user={user} roundId="r1" />)

        fireEvent.mouseDown(sliderAt(container), { clientX: 75, clientY: 5 })
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
