import { describe, it, expect, vi } from 'vitest'
import { createScheduler } from './scheduler'
import { snapshotFromRound } from './arrangement'

// A fake clock and a hand-driven timer: the tests move time and tick when they choose.
function harness ({ lookAhead = 0.15, interval = 0.025, random } = {}) {
    const context = { currentTime: 0 }
    let onTick = null
    const timer = (ms, fn) => { onTick = fn; return () => { onTick = null } }
    const scheduler = createScheduler({ context, lookAhead, interval, timer, random })
    const steps = []
    const bars = []
    scheduler.onStep(h => steps.push(h))
    scheduler.onBar(b => bars.push(b))
    // advance the clock in `interval` steps, ticking at each, up to `until`
    const run = (until) => {
        while (context.currentTime + interval <= until + 1e-12) {
            context.currentTime = Math.round((context.currentTime + interval) * 1e6) / 1e6
            if (onTick) onTick()
        }
    }
    return { context, scheduler, steps, bars, run, tick: () => onTick && onTick() }
}

const layer = (count, on = true, overrides = {}) => ({
    id: overrides.id || 'L', createdBy: 'u', steps: Array(count).fill(null).map((_, i) => ({ id: `${overrides.id || 'L'}-${i}`, isOn: on, velocity: 1, probability: 1 })),
    percentOffset: 0, timeOffset: 0, gain: 0, isMuted: false, instrument: { sampler: 'Kicks', sample: 'x' }, ...overrides
})
const snap = (layers, extra) => snapshotFromRound({ bpm: 120, swing: 0, layers, ...extra })

describe('createScheduler', () => {
    it('hands out every hit exactly once across many small windows, never in the past', () => {
        const h = harness()
        h.scheduler.setSnapshot(snap([layer(16), layer(4, true, { id: 'M' })]))
        h.scheduler.start(1)
        h.run(9) // four bars from origin 1 to 9, the look-ahead reaches 9.15
        const keys = h.steps.map(s => `${s.layerId}:${s.bar}:${s.stepIndex}`)
        expect(new Set(keys).size).toBe(keys.length)
        expect(h.steps.filter(s => s.bar >= 0 && s.bar < 4)).toHaveLength(4 * 20)
        for (const s of h.steps) {
            expect(s.time).toBeGreaterThanOrEqual(1)
        }
        expect(h.steps[0]).toMatchObject({ layerId: 'L', stepIndex: 0, time: 1, bar: 0, on: true, plays: true })
    })

    it('never schedules behind now: a late tick skips what it missed', () => {
        const h = harness()
        h.scheduler.setSnapshot(snap([layer(16)]))
        h.scheduler.start(0)
        h.run(1)
        const before = h.steps.length
        // the tab was hidden for a second and a half
        h.context.currentTime = 2.6
        h.tick()
        const late = h.steps.slice(before)
        expect(late.every(s => s.time >= 2.6)).toBe(true)
        expect(late.some(s => s.time > 1.15 && s.time < 2.6)).toBe(false)
    })

    it('hands out each bar line once, before that bar\'s hits', () => {
        const h = harness()
        h.scheduler.setSnapshot(snap([layer(4)]))
        h.scheduler.start(0.5)
        h.run(5)
        expect(h.bars.map(b => b.bar)).toEqual([0, 1, 2])
        expect(h.bars.map(b => b.time)).toEqual([0.5, 2.5, 4.5])
        // and the first hit of bar 1 is not handed out before bar 1 is announced
        const events = []
        const h2 = harness()
        h2.scheduler.setSnapshot(snap([layer(4)]))
        h2.scheduler.onStep(s => events.push(`step ${s.bar}:${s.stepIndex}`))
        h2.scheduler.onBar(b => events.push(`bar ${b.bar}`))
        h2.scheduler.start(0.5)
        h2.run(3)
        expect(events.indexOf('bar 1')).toBeLessThan(events.indexOf('step 1:0'))
        expect(events.indexOf('bar 1')).toBeGreaterThan(events.indexOf('step 0:3'))
    })

    it('lets an onBar handler swap the snapshot exactly on the bar line', () => {
        const h = harness()
        const a = snap([layer(4)])
        const b = snap([layer(2, true, { id: 'B' })])
        h.scheduler.setSnapshot(a)
        h.scheduler.onBar(({ bar }) => { if (bar === 1) h.scheduler.setSnapshot(b) })
        h.scheduler.start(0)
        h.run(4)
        const bar0 = h.steps.filter(s => s.bar === 0).map(s => s.layerId)
        const bar1 = h.steps.filter(s => s.bar === 1).map(s => s.layerId)
        expect(new Set(bar0)).toEqual(new Set(['L']))
        expect(bar0).toHaveLength(4)
        expect(new Set(bar1)).toEqual(new Set(['B']))
        expect(bar1).toHaveLength(2)
    })

    it('reads a new snapshot from the next window, with no hit doubled or lost', () => {
        const h = harness()
        h.scheduler.setSnapshot(snap([layer(16)]))
        h.scheduler.start(0)
        h.run(0.7)
        // a step edit mid-bar: the same layer, step 15 now off
        h.scheduler.setSnapshot(snap([layer(16, true, { steps: Array(16).fill(null).map((_, i) => ({ id: `L-${i}`, isOn: i !== 15, velocity: 1, probability: 1 })) })]))
        h.run(2.2)
        const keys = h.steps.map(s => `${s.bar}:${s.stepIndex}`)
        expect(new Set(keys).size).toBe(keys.length)
        const step15 = h.steps.find(s => s.bar === 0 && s.stepIndex === 15)
        expect(step15.on).toBe(false)
        expect(step15.plays).toBe(false)
        expect(h.steps.filter(s => s.bar === 0)).toHaveLength(16)
    })

    it('keeps the phase through a tempo change', () => {
        const h = harness()
        h.scheduler.setSnapshot(snap([layer(4)]))
        h.scheduler.start(0)
        h.run(1)
        // half way through bar 0 at 120 bpm (bar = 2 s) the tempo doubles: the bar is now 1 s and we are at its half, so bar 1 starts at 1.5
        h.scheduler.setTempo(240, 1)
        expect(h.scheduler.currentBar()).toBe(0)
        h.run(3)
        const bar1 = h.steps.filter(s => s.bar === 1).map(s => s.time)
        expect(bar1[0]).toBeCloseTo(1.5, 9)
        expect(bar1[1]).toBeCloseTo(1.75, 9)
        expect(h.scheduler.snapshot().bpm).toBe(240)
    })

    it('emits nothing after stop and starts clean again', () => {
        const h = harness()
        h.scheduler.setSnapshot(snap([layer(4)]))
        h.scheduler.start(0)
        h.run(1)
        h.scheduler.stop()
        const n = h.steps.length
        h.run(3)
        expect(h.steps).toHaveLength(n)
        expect(h.scheduler.isRunning()).toBe(false)
        h.scheduler.start(3)
        h.run(4)
        expect(h.steps.slice(n)[0]).toMatchObject({ bar: 0, time: 3 })
    })

    it('decides probability with the injected random and reports it on the hit', () => {
        const random = vi.fn().mockReturnValueOnce(0.2).mockReturnValueOnce(0.9)
        const h = harness({ random })
        h.scheduler.setSnapshot(snap([layer(2, true, { steps: [{ id: 'a', isOn: true, velocity: 1, probability: 0.5 }, { id: 'b', isOn: true, velocity: 1, probability: 0.5 }] })]))
        h.scheduler.start(0)
        h.run(1.5)
        expect(h.steps.slice(0, 2).map(s => s.plays)).toEqual([true, false])
        expect(random).toHaveBeenCalledTimes(2)
    })

    it('joins a running transport mid-bar from a past origin, playing only from now on', () => {
        const h = harness()
        h.scheduler.setSnapshot(snap([layer(4)]))
        h.context.currentTime = 10
        h.scheduler.start(10 - 2.75) // bar 1 started 0.75 s ago
        h.run(12)
        expect(h.steps[0]).toMatchObject({ bar: 1, stepIndex: 2, time: 10.25 })
        expect(h.scheduler.currentBar()).toBe(2)
    })

    it('alignTo nudges the origin by less than half a bar and keeps the bar count', () => {
        const h = harness()
        h.scheduler.setSnapshot(snap([layer(4)]))
        h.scheduler.start(0)
        h.run(1)
        expect(h.scheduler.alignTo(0.08)).toBeCloseTo(0.08, 9)
        expect(h.scheduler.origin()).toBeCloseTo(0.08, 9)
        // a server start time that is a bar later means the same phase: no shift
        expect(h.scheduler.alignTo(2.08)).toBeCloseTo(0, 9)
        expect(h.scheduler.alignTo(1.9)).toBeCloseTo(-0.18, 9)
    })
})
