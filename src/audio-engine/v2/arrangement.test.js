import { describe, it, expect } from 'vitest'
import { barSeconds, snapshotFromRound, hitTimes, hitsBetween, swingDelay } from './arrangement'

const step = (isOn, extra = {}) => ({ id: `s${Math.random()}`, isOn, velocity: 1, probability: 1, ...extra })
const layer = (count, overrides = {}) => ({
    id: overrides.id || 'layer-1',
    createdBy: 'user-1',
    steps: Array(count).fill(null).map(() => step(true)),
    percentOffset: 0,
    timeOffset: 0,
    gain: 0,
    isMuted: false,
    instrument: { sampler: 'Kicks', sample: 'punch' },
    ...overrides
})
const round = (layers, extra = {}) => ({ bpm: 120, swing: 0, layers, ...extra })

describe('snapshotFromRound', () => {
    it('is plain, frozen data with the bar length worked out from the tempo', () => {
        const snap = snapshotFromRound(round([layer(16)]))
        expect(snap.bpm).toBe(120)
        expect(snap.barSeconds).toBe(2)
        expect(Object.isFrozen(snap)).toBe(true)
        expect(Object.isFrozen(snap.layers[0])).toBe(true)
        expect(Object.isFrozen(snap.layers[0].steps[0])).toBe(true)
        expect(snap.layers[0]).toMatchObject({ id: 'layer-1', userId: 'user-1', count: 16, gain: 0, muted: false, instrument: { sampler: 'Kicks', sample: 'punch' } })
        expect(snap.layers[0].steps[3]).toMatchObject({ index: 3, on: true, velocity: 1, probability: 1 })
    })

    it('leaves automation layers out and fills in what a layer does not say', () => {
        const snap = snapshotFromRound(round([layer(8, { type: 'TRACK_TYPE_AUTOMATION' }), layer(4, { id: 'l2', percentOffset: undefined, gain: undefined, isMuted: true })]))
        expect(snap.layers.map(l => l.id)).toEqual(['l2'])
        expect(snap.layers[0]).toMatchObject({ percentOffset: 0, gain: 0, muted: true })
    })

    it('falls back to 120 bpm and no swing when the round has none', () => {
        const snap = snapshotFromRound({ layers: [] })
        expect(snap.bpm).toBe(120)
        expect(snap.swing).toBe(0)
        expect(snapshotFromRound(round([], { swing: 50 })).swing).toBe(0.5)
    })
})

describe('hitTimes', () => {
    it('puts every count from 1 to 32 on an exact fractional grid that closes the bar', () => {
        for (let n = 1; n <= 32; n++) {
            const snap = snapshotFromRound(round([layer(n)]))
            const times = hitTimes(snap.layers[0], snap).map(h => h.time)
            expect(times).toHaveLength(n)
            for (let i = 0; i < n; i++) {
                expect(times[i]).toBeCloseTo(i * 2 / n, 12)
            }
            // the interval from the last step back round to the first is the same as all the others
            const last = 2 - times[n - 1]
            expect(last).toBeCloseTo(2 / n, 12)
        }
    })

    it('lists off steps too, marked, so the lights and the sound share one list', () => {
        const l = layer(4)
        l.steps[1].isOn = false
        const snap = snapshotFromRound(round([l]))
        expect(hitTimes(snap.layers[0], snap).map(h => h.on)).toEqual([true, false, true, true])
    })

    it('applies the percent offset as a share of a step and the time offset in milliseconds', () => {
        const snap = snapshotFromRound(round([layer(4, { percentOffset: 50, timeOffset: 10 })]))
        const times = hitTimes(snap.layers[0], snap).map(h => h.time)
        // a step is 0.5 s: half a step is 0.25 s, plus 10 ms
        expect(times[0]).toBeCloseTo(0.26, 9)
        expect(times[3]).toBeCloseTo(1.76, 9)
    })

    it('wraps a negative offset to the end of the bar', () => {
        const snap = snapshotFromRound(round([layer(4, { timeOffset: -100 })]))
        const times = hitTimes(snap.layers[0], snap).map(h => h.time)
        expect(times[0]).toBeCloseTo(1.9, 9)
        expect(times[1]).toBeCloseTo(0.4, 9)
    })

    it('swings like the old transport: beats stay, the off-beat eighth is pushed most, the sixteenths around it less', () => {
        // Tone's swing on an eighth-note subdivision: hits on a beat (a quarter) stay, the eighth between
        // two beats moves by swing * (a quarter / 3) at most, and the sixteenths on either side by a sine of that
        expect(swingDelay(0, 2, 0.5)).toBe(0)
        expect(swingDelay(0.5, 2, 0.5)).toBe(0) // a beat
        expect(swingDelay(0.25, 2, 0.5)).toBeCloseTo(0.5 * (0.5 / 3), 9) // the off-beat eighth, full sine
        expect(swingDelay(0.125, 2, 0.5)).toBeCloseTo(Math.sin(Math.PI / 4) * 0.5 * (0.5 / 3), 9)
        expect(swingDelay(0.25, 2, 0)).toBe(0)
        const snap = snapshotFromRound(round([layer(16)], { swing: 100 }))
        const times = hitTimes(snap.layers[0], snap).map(h => h.time)
        expect(times[0]).toBe(0)
        expect(times[4]).toBeCloseTo(0.5, 9)
        expect(times[2]).toBeCloseTo(0.25 + 0.5 / 3, 9)
        expect(times[1]).toBeCloseTo(0.125 + Math.sin(Math.PI / 4) * 0.5 / 3, 9)
    })
})

describe('hitsBetween', () => {
    const snap = snapshotFromRound(round([layer(4), layer(2, { id: 'layer-2' })]))
    const origin = 10

    it('returns the hits of every layer in a window, in time order, with their bar', () => {
        const hits = hitsBetween(snap, 10, 11, origin)
        expect(hits.map(h => [h.layerId, h.stepIndex, h.time, h.bar])).toEqual([
            ['layer-1', 0, 10, 0], ['layer-2', 0, 10, 0], ['layer-1', 1, 10.5, 0]
        ])
    })

    it('is half-open, so walking consecutive windows sees each hit exactly once', () => {
        const seen = []
        for (let t = 10; t < 18; t += 0.137) {
            seen.push(...hitsBetween(snap, t, Math.min(t + 0.137, 18), origin))
        }
        const keys = seen.map(h => `${h.layerId}:${h.bar}:${h.stepIndex}`)
        expect(new Set(keys).size).toBe(keys.length)
        expect(keys.length).toBe(4 * (4 + 2))
    })

    it('spans bars and handles a window starting before the origin', () => {
        const hits = hitsBetween(snap, 9.9, 14.1, origin)
        expect(hits[0]).toMatchObject({ time: 10, bar: 0 })
        expect(hits[hits.length - 1]).toMatchObject({ time: 14, bar: 2 })
        expect(hits.filter(h => h.bar === 1)).toHaveLength(6)
    })

    it('is empty for an empty window', () => {
        expect(hitsBetween(snap, 12, 12, origin)).toEqual([])
        expect(hitsBetween(snap, 12, 11, origin)).toEqual([])
    })
})

describe('barSeconds', () => {
    it('is four beats', () => {
        expect(barSeconds(120)).toBe(2)
        expect(barSeconds(60)).toBe(4)
    })
})
