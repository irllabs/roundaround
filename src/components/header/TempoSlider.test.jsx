import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TempoSlider from './TempoSlider'
import AudioEngine from '../../audio-engine/AudioEngine'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setRound } from '../../redux/actions'

// The slider drives the transport and nothing else; loading Tone here only buys a banner.
vi.mock('tone', () => ({}))
vi.mock('../../audio-engine/AudioEngine', () => ({ default: { setTempo: vi.fn() } }))

function renderSlider(bpm = 120) {
    const store = makeStore()
    store.dispatch(setRound({ id: 'r1', name: 'Jam', bpm, layers: [] }))
    const firebase = { updateRound: vi.fn().mockResolvedValue() }
    return { store, firebase, ...renderWithProviders(<TempoSlider />, { store, firebase, route: '/play/r1' }) }
}

describe('TempoSlider', () => {
    it('starts on the round\'s tempo and shows it in the bubble', () => {
        renderSlider(120)

        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '120')
        expect(screen.getByText('120')).toBeInTheDocument()
    })

    it('follows a tempo a collaborator changed', () => {
        const { store } = renderSlider(120)

        act(() => { store.dispatch(setRound({ id: 'r1', name: 'Jam', bpm: 90, layers: [] })) })

        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '90')
    })

    it('raises the tempo a step at a time from the keyboard and tells the audio engine', async () => {
        const user = userEvent.setup()
        const { store, firebase } = renderSlider(120)
        const thumb = screen.getByRole('slider')
        act(() => { thumb.focus() })

        await user.keyboard('{ArrowRight}')

        expect(thumb).toHaveAttribute('aria-valuenow', '121')
        expect(screen.getByText('121')).toBeInTheDocument()
        expect(AudioEngine.setTempo).toHaveBeenCalledWith(121)
        // The throttle writes the first change through at once, so the round is already saved.
        expect(store.getState().round.bpm).toBe(121)
        expect(firebase.updateRound).toHaveBeenCalledWith('r1', { bpm: 121 })
    })

    it('is labelled by the row it sits in', () => {
        renderSlider()

        expect(screen.getByRole('slider')).toHaveAttribute('aria-labelledby', 'tempo-slider-label')
        expect(screen.getByText('Tempo')).toHaveAttribute('id', 'tempo-slider-label')
    })
})
