import { describe, it, expect, vi } from 'vitest'
import { createMetronomeClick, CLICK, STOP_FADE } from './metronomeClick'
import { BEATS_PER_BAR } from './grid'

// A fake context that records every node it makes.
function fakeContext () {
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() })
    const nodes = []
    const context = {
        currentTime: 5,
        createGain () { const n = { kind: 'gain', gain: param(), connect: vi.fn(), disconnect: vi.fn() }; nodes.push(n); return n },
        createOscillator () { const n = { kind: 'osc', type: null, frequency: param(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }; nodes.push(n); return n }
    }
    return { context, nodes, oscillators: () => nodes.filter(n => n.kind === 'osc') }
}

describe('createMetronomeClick', () => {
    it('is silent until switched on', () => {
        const f = fakeContext()
        const m = createMetronomeClick({ context: f.context })
        expect(m.isEnabled()).toBe(false)
        expect(m.click({ time: 6, beat: 0 })).toBeNull()
        expect(f.oscillators()).toHaveLength(0)
        m.setEnabled(true)
        expect(m.click({ time: 6, beat: 0 })).not.toBeNull()
        expect(f.oscillators()).toHaveLength(1)
    })

    it('clicks at the exact time, the downbeat higher and louder than the other beats', () => {
        const f = fakeContext()
        const m = createMetronomeClick({ context: f.context, enabled: true })
        m.click({ time: 6, beat: 0 })
        m.click({ time: 6.5, beat: 1 })
        m.click({ time: 8, beat: BEATS_PER_BAR })
        const [down, beat, nextDown] = f.oscillators()
        expect(down.frequency.value).toBe(CLICK.downbeat.frequency)
        expect(beat.frequency.value).toBe(CLICK.beat.frequency)
        expect(nextDown.frequency.value).toBe(CLICK.downbeat.frequency)
        expect(down.start).toHaveBeenCalledWith(6)
        expect(beat.start).toHaveBeenCalledWith(6.5)
        // the envelope: silent at the start, up in the attack, decaying to near nothing by the end
        const env = f.nodes.filter(n => n.kind === 'gain')[1].gain // [0] is the output
        expect(env.setValueAtTime).toHaveBeenCalledWith(0, 6)
        expect(env.linearRampToValueAtTime).toHaveBeenCalledWith(CLICK.downbeat.gain, 6 + CLICK.attack)
        expect(env.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 6 + CLICK.duration)
        expect(down.stop).toHaveBeenCalledWith(6 + CLICK.duration + STOP_FADE)
        // every click goes through the one output the engine connects into the master
        const output = f.nodes[0]
        for (const g of f.nodes.filter(n => n.kind === 'gain').slice(1)) {
            expect(g.connect).toHaveBeenCalledWith(output)
        }
    })

    it('stops every click still to come at once, so none lands after the button', () => {
        const f = fakeContext()
        const m = createMetronomeClick({ context: f.context, enabled: true })
        m.click({ time: 6, beat: 0 })
        m.click({ time: 6.5, beat: 1 })
        expect(m.pending).toBe(2)
        m.stopAll(5.9)
        for (const osc of f.oscillators()) {
            expect(osc.stop).toHaveBeenLastCalledWith(5.9 + STOP_FADE)
        }
        expect(m.pending).toBe(0)
    })

    it('forgets a click once it has ended, and silences the pending ones when switched off', () => {
        const f = fakeContext()
        const m = createMetronomeClick({ context: f.context, enabled: true })
        m.click({ time: 6, beat: 0 })
        const [osc] = f.oscillators()
        osc.onended()
        expect(osc.disconnect).toHaveBeenCalled()
        expect(m.pending).toBe(0)
        m.click({ time: 6.5, beat: 1 })
        m.setEnabled(false)
        expect(m.pending).toBe(0)
        expect(f.oscillators()[1].stop).toHaveBeenLastCalledWith(f.context.currentTime + STOP_FADE)
    })
})
