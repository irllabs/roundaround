import { vi, describe, it, expect, beforeEach } from 'vitest'
import Track from './Track'
import AudioEngine from './AudioEngine'
import FX from './FX'
import { deepFreeze } from '../test/deep-freeze'

vi.mock('tone', () => {
    class Signal {
        constructor (value) {
            this.value = value
        }
        setValueAtTime (value) {
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
        connect () { }
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
    class FeedbackDelay extends Node {
        constructor (...args) {
            super(...args)
            this.wet = new Signal(1)
        }
    }
    return {
        Channel,
        Filter,
        FeedbackDelay,
        Gain: Node,
        Part: class { dispose () { } },
        Transport: { PPQ: 192, bpm: { value: 120 } }
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
