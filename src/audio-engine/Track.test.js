import { vi, describe, it, expect, beforeEach } from 'vitest'
import Track from './Track'
import AudioEngine from './AudioEngine'
import FX from './FX'
import { deepFreeze } from '../test/deep-freeze'
import { stepTicks, stepLength } from './grid'

vi.mock('tone', () => {
    class Signal {
        constructor (value) {
            this.value = value
        }
        setValueAtTime (value) {
            this.value = value
            return this
        }
        linearRampToValueAtTime (value) {
            this.value = value
            return this
        }
    }
    class Node {
        constructor (...args) {
            this.args = args
            this._context = {}
            this.context = { _context: {} }
        }
        connect (destination) { (this.connections = this.connections || []).push(destination) }
        disconnect () { }
        dispose () { }
        toDestination () { }
    }
    class Channel extends Node {
        constructor (...args) {
            super(...args)
            this.volume = new Signal(0)
            this.mute = false
            this.solo = false
        }
    }
    class Filter extends Node {
        constructor (...args) {
            super(...args)
            this.frequency = new Signal(args[0])
            this.type = args[1]
        }
    }
    class Compressor extends Node {
        constructor (options) {
            super(options)
            this.options = options
            this.toDestinationCalls = 0
        }
        toDestination () { this.toDestinationCalls += 1 }
    }
    class WaveShaper extends Node {
        constructor (mapping, length) {
            super()
            this.mapping = mapping
            this.length = length
            this.toDestinationCalls = 0
        }
        toDestination () { this.toDestinationCalls += 1 }
    }
    class FeedbackDelay extends Node {
        constructor (...args) {
            super(...args)
            this.wet = new Signal(1)
        }
    }
    class Gain extends Node {
        constructor (value = 1) {
            super(value)
            this.gain = new Signal(value)
        }
    }
    return {
        Channel,
        Filter,
        FeedbackDelay,
        Gain,
        now: () => 10,
        Compressor,
        WaveShaper,
        Part: class { dispose () { } },
        getTransport: () => ({ PPQ: 192, bpm: { value: 120 } })
    }
})

// Lets the promise createFX() returns settle, the way it does just after a round loads.
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const layer = (parameters) => ({ id: 'layer-1', fx: {}, ...parameters })

describe('Track mixer state', () => {
    beforeEach(() => {
        AudioEngine.busesByUser = { 'user-1': { channel: {} } }
        AudioEngine.master = { channel: {} }
    })

    it('plays a freshly loaded layer at its saved gain and mute state', () => {
        const track = new Track(layer({ gain: -6, isMuted: true }), Track.TRACK_TYPE_LAYER, 'user-1')
        expect(track.channel.volume.value).toBe(-6)
        expect(track.channel.mute).toBe(true)
    })

    it('falls back to 0 dB and unmuted for a layer that has neither', () => {
        const track = new Track(layer({}), Track.TRACK_TYPE_LAYER, 'user-1')
        expect(track.channel.volume.value).toBe(0)
        expect(track.channel.mute).toBe(false)
    })

    it('applies a volume or mute change straight away, with no timer', () => {
        const track = new Track(layer({}), Track.TRACK_TYPE_LAYER, 'user-1')
        track.setVolume(-3)
        track.setMute(true)
        expect(track.channel.volume.value).toBe(-3)
        expect(track.channel.mute).toBe(true)
    })

    it('carries volume and mute over to the channel setType builds', () => {
        const track = new Track(layer({}), Track.TRACK_TYPE_LAYER, 'user-1')
        track.setVolume(-9)
        track.setMute(true)
        const firstChannel = track.channel
        track.setType(Track.TRACK_TYPE_LAYER)
        expect(track.channel).not.toBe(firstChannel)
        expect(track.channel.volume.value).toBe(-9)
        expect(track.channel.mute).toBe(true)
    })
})

describe('Track effects after a load', () => {
    beforeEach(() => {
        AudioEngine.busesByUser = { 'user-1': { channel: {} } }
        AudioEngine.master = { channel: {} }
        FX.fxClasses = {}
        FX.fx = []
        FX.fxById = {}
        FX.init()
    })

    const busFx = {
        'fx-lowpass': { id: 'fx-lowpass', name: 'lowpass', order: 0, isOn: true, isOverride: true },
        'fx-delay': { id: 'fx-delay', name: 'delay', order: 1, isOn: true, isOverride: false }
    }

    it('brings back the effects the user had switched on, and leaves the rest bypassed', async () => {
        const bus = new Track({ id: 'user-1', fx: busFx }, Track.TRACK_TYPE_USER, 'user-1')
        await flush()
        expect(bus.fx['fx-lowpass'].fx.frequency.value).toBe(500)
        expect(bus.fx['fx-delay'].fx.wet.value).toBe(0)
    })

    it('bypasses everything when nothing was switched on', async () => {
        const fx = { 'fx-lowpass': { ...busFx['fx-lowpass'], isOverride: false } }
        const bus = new Track({ id: 'user-1', fx }, Track.TRACK_TYPE_USER, 'user-1')
        await flush()
        expect(bus.fx['fx-lowpass'].fx.frequency.value).toBe(20000)
    })

    it('orders the effects by their saved order', async () => {
        const bus = new Track({ id: 'user-1', fx: busFx }, Track.TRACK_TYPE_USER, 'user-1')
        await flush()
        expect(bus.sortedFx.map(fx => fx.id)).toEqual(['fx-lowpass', 'fx-delay'])
    })
})

describe('Track and the layer it is given', () => {
    beforeEach(() => {
        AudioEngine.busesByUser = { 'user-1': { channel: {} } }
        AudioEngine.master = { channel: {} }
    })

    // The layer comes straight out of the Redux store, which is frozen: writing to it would throw.
    const storeLayer = () => deepFreeze({
        id: 'layer-1',
        createdBy: 'user-1',
        type: Track.TRACK_TYPE_LAYER,
        gain: -6,
        isMuted: false,
        percentOffset: 0,
        timeOffset: 0,
        steps: [{ id: 's0', isOn: true, velocity: 1, probability: 1 }]
    })

    it('never writes to the layer, on load or when the type changes', () => {
        const layer = storeLayer()
        const track = new Track(layer, Track.TRACK_TYPE_LAYER, 'user-1')
        track.load(layer, { isPlayingSequence: false })
        track.setType(Track.TRACK_TYPE_LAYER)
        expect(layer).not.toHaveProperty('fx')
        expect(track.trackParameters).not.toBe(layer)
        expect(track.trackParameters.fx).toEqual({})
    })

    it('takes the automated effect from the layer it is given', () => {
        const layer = deepFreeze({ ...storeLayer(), type: Track.TRACK_TYPE_AUTOMATION, automationFxId: 'fx-lowpass' })
        const track = new Track(layer, Track.TRACK_TYPE_AUTOMATION, 'user-1')
        track.setType(Track.TRACK_TYPE_AUTOMATION, 'fx-delay')
        expect(track.trackParameters.automationFxId).toBe('fx-delay')
        expect(layer.automationFxId).toBe('fx-lowpass')
    })
})

describe('AudioEngine and a removed track', () => {
    beforeEach(() => {
        AudioEngine.busesByUser = { 'user-1': { channel: {} } }
        AudioEngine.master = { channel: {} }
        AudioEngine.reset()
    })

    it('disposes the track once and forgets it, so a second removal does nothing', async () => {
        const track = await AudioEngine.createTrack({ id: 'layer-1', createdBy: 'user-1', type: Track.TRACK_TYPE_LAYER, fx: {}, steps: [] })
        const dispose = vi.spyOn(track, 'dispose')

        AudioEngine.removeTrack('layer-1')
        AudioEngine.removeTrack('layer-1')

        expect(dispose).toHaveBeenCalledTimes(1)
        expect(AudioEngine.tracksById['layer-1']).toBeUndefined()
        expect(AudioEngine.tracks).toEqual([])
        expect(AudioEngine.tracksByType[Track.TRACK_TYPE_LAYER]).toEqual([])
    })
})

describe('the master track', () => {
    it('routes the master gain through the limiter, then the padded soft ceiling, into the destination', () => {
        // Three coincident full-scale samples reach the output at up to 2.5x full scale and the
        // device clips them; the limiter takes most of it and the ceiling holds the rest under 1.
        const master = new Track({ fx: [] }, Track.TRACK_TYPE_MASTER)
        master.buildAudioChain()
        expect(master.limiter.options).toEqual({ threshold: -2, knee: 0, ratio: 20, attack: 0.001, release: 0.05 })
        expect(master.channel.connections).toEqual([master.limiter])
        expect(master.limiter.connections).toEqual([master.ceilingPad])
        expect(master.ceilingPad.connections).toEqual([master.ceiling])
        expect(master.ceiling.mapping).toBe(Track.ceilingCurve)
        expect(master.ceiling.length).toBe(8192)
        expect(master.ceiling.oversample).toBe('none')
        expect(master.ceiling.toDestinationCalls).toBe(1)
        master.dispose()
        expect(master.limiter).toBeNull()
        expect(master.ceiling).toBeNull()
        expect(master.ceilingPad).toBeNull()
    })

    it('has a ceiling curve that passes normal levels untouched and never reaches full scale', () => {
        const { headroom, knee } = Track.MASTER_CEILING
        // the curve's input is the padded signal, so a sample x arrives as x / headroom
        const out = (x) => Track.ceilingCurve(x / headroom)
        expect(out(0)).toBe(0)
        expect(out(0.5)).toBeCloseTo(0.5, 6)
        expect(out(-0.5)).toBeCloseTo(-0.5, 6)
        expect(out(knee)).toBeCloseTo(knee, 6)
        // above the knee it keeps rising but stays under 1, even for the worst stacked hit
        expect(out(1.0)).toBeGreaterThan(knee)
        expect(out(1.2)).toBeGreaterThan(out(1.0))
        expect(out(2.5)).toBeGreaterThan(out(1.2))
        expect(out(headroom)).toBeLessThan(1)
        expect(out(headroom)).toBeLessThanOrEqual(Track.MASTER_CEILING.top)
        expect(out(-headroom)).toBeGreaterThan(-1)
        // and it is continuous at the knee: the first step past it is a small one
        expect(out(knee + 0.001) - out(knee)).toBeLessThan(0.0011)
    })
})

describe('the bus chain and the bypass gates', () => {
    beforeEach(() => {
        AudioEngine.busesByUser = { 'user-1': { channel: {} } }
        AudioEngine.master = { channel: { kind: 'master' } }
        FX.fxClasses = {}
        FX.fx = []
        FX.fxById = {}
        FX.init()
    })

    it('runs the bus through each effect\'s gates, so a bypassed effect is silent by gain, not by mix', async () => {
        const busFx = {
            'fx-lowpass': { id: 'fx-lowpass', name: 'lowpass', order: 0, isOn: true, isOverride: false },
            'fx-delay': { id: 'fx-delay', name: 'delay', order: 1, isOn: true, isOverride: true }
        }
        const bus = new Track({ id: 'user-1', fx: busFx }, Track.TRACK_TYPE_USER, 'user-1')
        await flush()
        bus.buildAudioChain() // the mock keeps every connection ever made; the last one is this build's
        const lowpass = bus.fx['fx-lowpass'], delay = bus.fx['fx-delay']
        expect(bus.channel.connections.at(-1)).toBe(lowpass.input)
        expect(lowpass.output.connections.at(-1)).toBe(delay.input)
        expect(delay.output.connections.at(-1)).toBe(AudioEngine.master.channel)
        // bypassed: the dry gate open, the effect's gates shut; switched on: the other way round
        expect(lowpass.into.gain.value).toBe(0)
        expect(lowpass.through.gain.value).toBe(1)
        expect(delay.into.gain.value).toBe(1)
        expect(delay.outOf.gain.value).toBe(1)
        expect(delay.through.gain.value).toBe(0)
    })
})

describe('Track.convertStepsToNotes', () => {
    beforeEach(() => {
        AudioEngine.busesByUser = { 'user-1': { channel: {} } }
        AudioEngine.master = { channel: {} }
    })
    const steps = (pattern) => pattern.split('').map((c, i) => ({ id: 's' + i, order: i, isOn: c === 'x', velocity: 1, probability: 1 }))

    it("takes every note's time from the shared grid, offsets included, so the step lights land with the sound", () => {
        const track = new Track({ id: 'l', createdBy: 'user-1', fx: [] }, Track.TRACK_TYPE_LAYER, 'user-1')
        const pattern = steps('x.x....x')
        const notes = track.convertStepsToNotes(pattern, 25, -20)
        // -20 ms at 120 bpm and 192 PPQ is -8 ticks; a quarter of an 8-step step is 24 ticks
        const grid = stepTicks(8, 768, { percentOffset: 25, timeOffsetTicks: -8 })
        expect(notes.map(n => n.time)).toEqual([grid[0], grid[2], grid[7]])
        expect(grid[0]).toBe(16)
    })

    it('rounds each step from its exact place, so seven steps fill the bar and the last one is not short', () => {
        const track = new Track({ id: 'l', createdBy: 'user-1', fx: [] }, Track.TRACK_TYPE_LAYER, 'user-1')
        const notes = track.convertStepsToNotes(steps('xxxxxxx'), 0, 0)
        expect(notes.map(n => n.time)).toEqual([0, 110, 219, 329, 439, 549, 658])
        expect(notes.reduce((sum, n) => sum + n.duration, 0)).toBe(768)
        expect(notes[6].duration).toBe(110)
    })

    it('stretches a note over the off steps after it, on the same grid', () => {
        const track = new Track({ id: 'l', createdBy: 'user-1', fx: [] }, Track.TRACK_TYPE_LAYER, 'user-1')
        const notes = track.convertStepsToNotes(steps('x..x'), 0, 0)
        expect(notes.map(n => [n.time, n.duration])).toEqual([[0, stepLength(0, 4, 768) + stepLength(1, 4, 768) + stepLength(2, 4, 768)], [576, 192]])
    })

    it('wraps a negative offset to the end of the bar', () => {
        const track = new Track({ id: 'l', createdBy: 'user-1', fx: [] }, Track.TRACK_TYPE_LAYER, 'user-1')
        const notes = track.convertStepsToNotes(steps('x...'), 0, -125)
        expect(notes[0].time).toBe(768 - 48)
    })
})
