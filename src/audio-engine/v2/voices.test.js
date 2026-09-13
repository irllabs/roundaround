import { describe, it, expect, vi } from 'vitest'
import { playHit, createChokeGroups, dbToGain, CHOKE_FADE } from './voices'

// The smallest Web Audio a voice needs: nodes that remember what was done to them.
function fakeContext () {
    const nodes = []
    const param = (value) => ({ value, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() })
    return {
        nodes,
        createBufferSource () {
            const n = { kind: 'source', buffer: null, playbackRate: param(1), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }
            nodes.push(n); return n
        },
        createGain () {
            const n = { kind: 'gain', gain: param(1), connect: vi.fn(), disconnect: vi.fn() }
            nodes.push(n); return n
        }
    }
}
const buffer = { duration: 0.6 }
const destination = { kind: 'destination' }

describe('playHit', () => {
    it('plays the whole sample at the scheduled time through a gain set from the velocity', () => {
        const context = fakeContext()
        const voice = playHit({ context, buffer, time: 12.5, velocity: 0.7, destination })
        expect(voice.source.buffer).toBe(buffer)
        expect(voice.source.start).toHaveBeenCalledWith(12.5)
        expect(voice.source.stop).not.toHaveBeenCalled()
        expect(voice.gain.gain.value).toBeCloseTo(0.7, 9)
        expect(voice.source.connect).toHaveBeenCalledWith(voice.gain)
        expect(voice.gain.connect).toHaveBeenCalledWith(destination)
    })

    it('clamps velocity to the unit range', () => {
        const context = fakeContext()
        expect(playHit({ context, buffer, time: 0, velocity: 3, destination }).gain.gain.value).toBe(1)
        expect(playHit({ context, buffer, time: 0, velocity: -1, destination }).gain.gain.value).toBe(0)
    })

    it('tidies its nodes away when the sample ends', () => {
        const context = fakeContext()
        const voice = playHit({ context, buffer, time: 0, destination })
        voice.source.onended()
        expect(voice.source.disconnect).toHaveBeenCalled()
        expect(voice.gain.disconnect).toHaveBeenCalled()
    })
})

describe('choke groups', () => {
    it('fades the previous voice of the group when the next one starts, and no other', () => {
        const context = fakeContext()
        const chokeGroups = createChokeGroups()
        const open = playHit({ context, buffer, time: 1, destination, chokeGroups, chokeGroup: 'hats' })
        const kick = playHit({ context, buffer, time: 1.2, destination, chokeGroups, chokeGroup: 'kicks' })
        const closed = playHit({ context, buffer, time: 1.5, destination, chokeGroups, chokeGroup: 'hats' })
        expect(open.gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.5 + CHOKE_FADE)
        expect(open.source.stop).toHaveBeenCalledWith(1.5 + CHOKE_FADE)
        expect(kick.source.stop).not.toHaveBeenCalled()
        expect(closed.source.stop).not.toHaveBeenCalled()
    })

    it('never chokes a voice with no group', () => {
        const context = fakeContext()
        const chokeGroups = createChokeGroups()
        const a = playHit({ context, buffer, time: 1, destination, chokeGroups })
        playHit({ context, buffer, time: 2, destination, chokeGroups })
        expect(a.source.stop).not.toHaveBeenCalled()
    })
})

describe('dbToGain', () => {
    it('is the usual amplitude ratio', () => {
        expect(dbToGain(0)).toBe(1)
        expect(dbToGain(-6)).toBeCloseTo(0.501, 3)
        expect(dbToGain(-20)).toBeCloseTo(0.1, 9)
    })
})
