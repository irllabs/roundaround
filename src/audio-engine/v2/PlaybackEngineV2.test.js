import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPlaybackEngineV2, START_DELAY } from './PlaybackEngineV2'
import { createScheduler } from './scheduler'
import { STOP_FADE } from './voices'

// A fake of everything below the engine: the old engine's busses and master, Tone's context and
// connect, a sample library that resolves at once, and a hand-driven scheduler clock.
function fakes () {
    const param = () => ({ value: 1, setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
    const nodes = []
    const ctx = {
        currentTime: 0,
        state: 'suspended',
        resume: vi.fn(async () => { ctx.state = 'running' }),
        createGain () { const n = { kind: 'gain', gain: param(), connect: vi.fn(), disconnect: vi.fn() }; nodes.push(n); return n },
        createBufferSource () { const n = { kind: 'source', buffer: null, playbackRate: param(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }; nodes.push(n); return n },
        createOscillator () { const n = { kind: 'osc', type: null, frequency: param(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }; nodes.push(n); return n }
    }
    const tone = { getContext: () => ctx, connect: vi.fn() }
    const base = {
        init: vi.fn(async () => {}), reset: vi.fn(), addUser: vi.fn(async (id) => { base.busesByUser[id] = { id, channel: { kind: 'bus', id } } }),
        createTrack: vi.fn(async (p) => ({ id: p.id, channel: { kind: 'bus' } })), busesByUser: {}, master: { channel: { kind: 'master' } }
    }
    const buffers = { a: { name: 'a' }, b: { name: 'b' } }
    const library = { load: vi.fn(async (sampler, sample) => sampler === 'Broken' ? Promise.reject(new Error('no such kit')) : ({ files: [], bufferFor: (v) => v < 0.5 ? buffers.b : buffers.a })) }
    let onTick = null
    const timer = (ms, fn) => { onTick = fn; return () => { onTick = null } }
    const scheduler = createScheduler({ context: ctx, lookAhead: 0.15, interval: 0.025, timer, random: () => 0 })
    const run = (until) => { while (ctx.currentTime + 0.025 <= until + 1e-9) { ctx.currentTime = Math.round((ctx.currentTime + 0.025) * 1e6) / 1e6; if (onTick) onTick() } }
    const engine = createPlaybackEngineV2({ base, tone, library, scheduler, wallClock: () => 1_000_000 + ctx.currentTime * 1000 })
    return { engine, base, tone, ctx, nodes, library, run, buffers }
}

const layer = (id, userId, steps = 4, extra = {}) => ({
    id, createdBy: userId, type: 'TRACK_TYPE_LAYER', steps: Array(steps).fill(null).map((_, i) => ({ id: `${id}-${i}`, isOn: true, velocity: 1, probability: 1 })),
    percentOffset: 0, timeOffset: 0, gain: 0, isMuted: false, instrument: { sampler: 'Kicks', sample: 'punch' }, ...extra
})
const round = (layers) => ({ id: 'r', bpm: 120, swing: 0, layers, userBuses: { u1: { id: 'u1', fx: [] } }, userPatterns: {} })

describe('PlaybackEngineV2', () => {
    let f
    beforeEach(async () => {
        f = fakes()
        await f.engine.init()
    })

    it('loads a round: busses through the old engine, a gain per layer into its user bus, samples loaded', async () => {
        await f.engine.load(round([layer('L1', 'u1'), layer('L2', 'u1', 4, { instrument: { sampler: 'Snares', sample: 'crack' } })]))
        expect(f.base.init).toHaveBeenCalled()
        expect(f.base.addUser).toHaveBeenCalledWith('u1', [])
        expect(Object.keys(f.engine.tracksById)).toEqual(['L1', 'L2'])
        expect(f.library.load).toHaveBeenCalledWith('Kicks', 'punch')
        expect(f.library.load).toHaveBeenCalledWith('Snares', 'crack')
        // the layer's gain is connected into the Tone user bus, so effects and master stay as they are
        expect(f.tone.connect).toHaveBeenCalledWith(f.engine.tracksById.L1.output, f.base.busesByUser.u1.channel)
    })

    it('plays the snapshot: one voice per on step at its exact time, the buffer picked by velocity', async () => {
        const l = layer('L1', 'u1', 4)
        l.steps[1].isOn = false
        l.steps[2].velocity = 0.3
        await f.engine.load(round([l]))
        await f.engine.play()
        expect(f.ctx.resume).toHaveBeenCalled()
        expect(f.engine.isOn()).toBe(true)
        f.run(2.2)
        const sources = f.nodes.filter(n => n.kind === 'source')
        expect(sources.map(s => s.start.mock.calls[0][0])).toEqual([START_DELAY, START_DELAY + 1.0, START_DELAY + 1.5, START_DELAY + 2.0])
        expect(sources[0].buffer).toBe(f.buffers.a)
        expect(sources[1].buffer).toBe(f.buffers.b) // velocity 0.3
        // nothing is ever released early
        expect(sources.every(s => s.stop.mock.calls.length === 0)).toBe(true)
    })

    it('reads an edit as a new snapshot with no rebuild: the step goes quiet from the next window', async () => {
        const l = layer('L1', 'u1', 4)
        await f.engine.load(round([l]))
        await f.engine.play()
        f.run(0.5)
        const edited = { ...l, steps: l.steps.map((s, i) => ({ ...s, isOn: i !== 3 })) }
        f.engine.recalculateParts(round([edited]))
        f.run(2.2)
        const starts = f.nodes.filter(n => n.kind === 'source').map(s => s.start.mock.calls[0][0])
        expect(starts).toEqual([START_DELAY, START_DELAY + 0.5, START_DELAY + 1.0, START_DELAY + 2.0])
        expect(f.engine.tracksById.L1).toBe(f.engine.tracksById.L1) // the same track object, never recreated
    })

    it('keeps a layer silent, and the rest playing, when its samples fail to load', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        await f.engine.load(round([layer('L1', 'u1', 1, { instrument: { sampler: 'Broken', sample: 'x' } }), layer('L2', 'u1', 1)]))
        spy.mockRestore()
        await f.engine.play()
        f.run(0.3)
        const sources = f.nodes.filter(n => n.kind === 'source')
        expect(sources).toHaveLength(1)
        expect(f.engine.tracksById.L1.set).toBeNull()
    })

    it('mutes and sets volume on the layer gain without touching the samples', async () => {
        await f.engine.load(round([layer('L1', 'u1', 1, { gain: -6 })]))
        const track = f.engine.tracksById.L1
        expect(track.output.gain.setTargetAtTime).toHaveBeenLastCalledWith(expect.closeTo(0.501, 2), 0, 0.01)
        track.setMute(true)
        expect(track.output.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.01)
        track.setVolume(0)
        track.setMute(false)
        expect(track.output.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.01)
    })

    it('changes tempo in place and reports the position', async () => {
        await f.engine.load(round([layer('L1', 'u1', 4)]))
        await f.engine.play()
        f.run(1)
        f.engine.setTempo(240)
        expect(f.engine.scheduler.snapshot().bpm).toBe(240)
        expect(f.engine.round.bpm).toBe(240)
        f.run(2)
        // 0.9 s into a 2 s bar when the bar became 1 s: 0.45 bars in, so bar 0 now began at 0.55 and we are 1.45 s from it
        expect(f.engine.getPositionMilliseconds()).toBe(1450)
        f.engine.stop()
        expect(f.engine.isOn()).toBe(false)
    })

    it('joins a transport another client started: bar 0 sits where the server says, or waits for the gesture', async () => {
        await f.engine.load(round([layer('L1', 'u1', 4)]))
        f.engine.setServerOffset(250, [{ t0: 0, t1: 100, serverMs: 300 }]) // the server's clock is 250 ms ahead of ours
        expect(f.engine.clockSync()).toEqual({ offsetMs: 250, samples: [{ t0: 0, t1: 100, serverMs: 300 }] })
        // the other client started 1.3 s ago in server time: server now = 1_000_000 + 250
        const startedAt = 1_000_250 - 1300
        expect(f.engine.startAlignedToServer(startedAt)).toBe(false) // the context is still suspended
        await f.engine.startAudioContext() // the user's first gesture
        expect(f.engine.isOn()).toBe(true)
        expect(f.engine.scheduler.origin()).toBeCloseTo(-1.3, 9)
        f.run(1)
        const starts = f.nodes.filter(n => n.kind === 'source').map(s => s.start.mock.calls[0][0])
        // steps every 0.5 s from an origin at -1.3: the first one after now (0) is at 0.2
        expect(starts[0]).toBeCloseTo(0.2, 9)
    })

    it('nudges a local start onto the server time when it arrives, by less than half a bar', async () => {
        await f.engine.load(round([layer('L1', 'u1', 4)]))
        await f.engine.play() // origin 0.1 on our clock, wall 1_000_100
        const delta = f.engine.alignToServer(1_000_100 + 40) // the server stamped 40 ms later than our origin
        expect(delta).toBeCloseTo(0.04, 9)
        expect(f.engine.scheduler.origin()).toBeCloseTo(0.14, 9)
    })

    it('tells whoever listens when playback starts and stops', async () => {
        await f.engine.load(round([layer('L1', 'u1', 4)]))
        const events = []
        f.engine.onPlayback(e => events.push(e))
        await f.engine.play()
        f.engine.stop()
        expect(events).toEqual([{ playing: true, originContextTime: START_DELAY }, { playing: false }])
    })

    it('silences every voice already handed to Web Audio when it stops, so nothing lands after the button', async () => {
        await f.engine.load(round([layer('L1', 'u1', 4)]))
        await f.engine.play()
        f.run(0.2) // the first window: hits scheduled up to 150 ms ahead
        const sources = f.nodes.filter(n => n.kind === 'source')
        expect(sources.length).toBeGreaterThan(0)
        const at = f.ctx.currentTime
        f.engine.stop()
        for (const source of sources) {
            expect(source.stop).toHaveBeenCalledTimes(1)
            expect(source.stop.mock.calls[0][0]).toBeCloseTo(at + STOP_FADE, 6)
        }
        // and nothing new is scheduled once stopped
        f.run(0.6)
        expect(f.nodes.filter(n => n.kind === 'source').length).toBe(sources.length)
    })

    it('clicks the metronome on every beat while it is on, into the master, and silences it with the rest on stop', async () => {
        await f.engine.load(round([layer('L1', 'u1', 4)]))
        // the click goes into the master, past the users' busses and their effects
        expect(f.tone.connect).toHaveBeenCalledWith(f.engine.metronome.output, f.base.master.channel)
        expect(f.engine.isMetronomeOn()).toBe(false)
        await f.engine.play()
        f.run(1.2)
        expect(f.nodes.filter(n => n.kind === 'osc')).toHaveLength(0)
        expect(f.engine.setMetronome(true)).toBe(true)
        f.run(2.2)
        const clicks = f.nodes.filter(n => n.kind === 'osc')
        // the beats from the next window on: 1.5, 2.0 s after the press (bar 0 is at START_DELAY)
        expect(clicks.map(c => c.start.mock.calls[0][0])).toEqual([START_DELAY + 1.5, START_DELAY + 2.0])
        // beat 4 is a downbeat, beat 3 is not
        expect(clicks[0].frequency.value).toBeLessThan(clicks[1].frequency.value)
        f.engine.stop()
        for (const c of clicks) {
            expect(c.stop).toHaveBeenLastCalledWith(f.ctx.currentTime + 0.005)
        }
        expect(f.engine.isOn()).toBe(false)
    })

    it('removes a track and its output, and warns once about automation layers', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        await f.engine.load(round([layer('L1', 'u1', 4), layer('A1', 'u1', 4, { type: 'TRACK_TYPE_AUTOMATION' }), layer('A2', 'u1', 4, { type: 'TRACK_TYPE_AUTOMATION' })]))
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockRestore()
        const out = f.engine.tracksById.L1.output
        f.engine.removeTrack('L1')
        expect(out.disconnect).toHaveBeenCalled()
        expect(f.engine.tracksById.L1).toBeUndefined()
        expect(f.engine.tracks.map(t => t.id)).toEqual(['A1', 'A2'])
        f.engine.removeTrack('L1') // twice is fine
    })
})
