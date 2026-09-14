import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as ToneMock from 'tone'
import AudioEngine from './AudioEngine'

vi.mock('tone', () => {
    const calls = []
    const context = {
        state: 'suspended',
        currentTime: 12.5,
        resume: vi.fn(() => new Promise(resolve => setTimeout(() => { context.state = 'running'; calls.push('resumed'); resolve() }, 0)))
    }
    const transport = {
        PPQ: 192,
        bpm: { value: 120 },
        loop: null,
        loopEnd: null,
        state: 'stopped',
        start: vi.fn((when) => { calls.push('start ' + when + ' while ' + context.state) }),
        stop: vi.fn()
    }
    return { calls, context, transport, getContext: () => context, getTransport: () => transport }
})

const { calls, context, transport } = ToneMock

describe('AudioEngine.play', () => {
    beforeEach(() => {
        calls.length = 0
        context.state = 'suspended'
        transport.start.mockClear()
        context.resume.mockClear()
    })

    it('starts the transport only once the context is running', async () => {
        // on a fresh context the first events used to be scheduled while it was still suspended
        await AudioEngine.play()
        expect(calls).toEqual(['resumed', 'start +0.1 while running'])
        expect(transport.loop).toBe(false)
        expect(transport.loopEnd).toBe('1:0:0')
    })

    it('does not ask a running context to resume', async () => {
        context.state = 'running'
        await AudioEngine.play()
        expect(context.resume).not.toHaveBeenCalled()
        expect(calls).toEqual(['start +0.1 while running'])
    })
})

describe('AudioEngine.stop', () => {
    it('stops the transport and releases every layer\'s voices at once, so nothing lands after the button', () => {
        const kick = { instrument: { releaseAll: vi.fn() } }
        const snare = { instrument: { releaseAll: vi.fn() } }
        const loading = { instrument: null }
        AudioEngine.tracksByType = { TRACK_TYPE_LAYER: [kick, snare, loading], TRACK_TYPE_USER: [{ instrument: { releaseAll: vi.fn() } }] }
        transport.stop.mockClear()
        AudioEngine.stop()
        // at the context's current time, not Tone's look-ahead "now": nothing after the press gets scheduled and the fade starts at once
        expect(transport.stop).toHaveBeenCalledWith(context.currentTime)
        expect(kick.instrument.releaseAll).toHaveBeenCalledWith(context.currentTime)
        expect(snare.instrument.releaseAll).toHaveBeenCalledTimes(1)
        // a layer still loading has no instrument and is skipped; busses are not instruments
        expect(AudioEngine.tracksByType.TRACK_TYPE_USER[0].instrument.releaseAll).not.toHaveBeenCalled()
        AudioEngine.tracksByType = {}
    })

    it('silences the metronome\'s pending clicks with the layers', () => {
        AudioEngine.metronome = { stopAll: vi.fn(), isEnabled: () => true }
        AudioEngine.stop()
        expect(AudioEngine.metronome.stopAll).toHaveBeenCalledWith(context.currentTime)
        AudioEngine.metronome = null
    })
})

describe('AudioEngine metronome', () => {
    it('hands the transport\'s quarter notes to the click, counted in beats from the start', () => {
        AudioEngine.metronome = { click: vi.fn(), setEnabled: vi.fn(on => on), isEnabled: () => true }
        transport.getTicksAtTime = vi.fn(time => (time - 0.1) * 2 * transport.PPQ) // 120 bpm from a start at 0.1 s
        AudioEngine.clickBeat(0.1)
        AudioEngine.clickBeat(2.6)
        expect(AudioEngine.metronome.click).toHaveBeenNthCalledWith(1, { time: 0.1, beat: 0 })
        expect(AudioEngine.metronome.click).toHaveBeenNthCalledWith(2, { time: 2.6, beat: 5 })
        expect(AudioEngine.setMetronome(false)).toBe(false)
        expect(AudioEngine.metronome.setEnabled).toHaveBeenCalledWith(false)
        AudioEngine.metronome = null
    })

    it('is off, and switching it on does nothing, before init has built it', () => {
        expect(AudioEngine.isMetronomeOn()).toBe(false)
        expect(AudioEngine.setMetronome(true)).toBe(false)
        expect(() => AudioEngine.clickBeat(1)).not.toThrow()
    })
})
