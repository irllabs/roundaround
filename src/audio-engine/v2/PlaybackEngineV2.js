/**
 * The v2 playback engine, behind `?engine=v2`. It plays the round's layers from arrangement
 * snapshots through the look-ahead scheduler and plain Web Audio voices, and keeps everything
 * downstream of a layer as it is: each layer's voices go into a native gain that is connected
 * into the old engine's Tone user bus, so the effects, the busses and the master limiter chain
 * (#316) are untouched. The old engine object (`base`) still owns those; this one owns the
 * transport, the layers and their samples.
 *
 * The surface is what PlayUI, PlayRoute and the settings panels call on the old engine, so the
 * switch is one import. Automation layers are not played by v2 yet (they are left out of the
 * snapshot and their track is a stub that says so once).
 */
import * as Tone from 'tone'
import _ from 'lodash'
import { createScheduler } from './scheduler'
import { snapshotFromRound } from './arrangement'
import { createSampleLibrary } from './samples'
import { playHit, createChokeGroups, createVoiceRegistry, dbToGain } from './voices'
import { alignedOrigin } from './transport'

export const TRACK_TYPE_LAYER = 'TRACK_TYPE_LAYER'
export const TRACK_TYPE_USER = 'TRACK_TYPE_USER'
export const TRACK_TYPE_AUTOMATION = 'TRACK_TYPE_AUTOMATION'

/** How far ahead of the press the transport starts, seconds: room for the first hits to be scheduled. */
export const START_DELAY = 0.1

/** A layer as v2 plays it: a gain into the user's bus, the decoded samples, the mixer state. */
class LayerTrackV2 {
    constructor (engine, layer) {
        this.engine = engine
        this.id = layer.id
        this.userId = layer.createdBy
        this.type = layer.type || TRACK_TYPE_LAYER
        this.trackParameters = { ...layer }
        this.volume = _.isNil(layer.gain) ? 0 : Number(layer.gain)
        this.isMuted = layer.isMuted === true
        this.set = null
        this.output = engine.context().createGain()
        this.applyMixerState()
        this.connectToBus()
        if (this.type === TRACK_TYPE_AUTOMATION) {
            engine.warnOnce('automation', 'Playback v2 does not play automation layers yet; this layer is silent')
        }
    }
    connectToBus () {
        const bus = this.engine.base.busesByUser[this.userId]
        const target = bus && bus.channel ? bus.channel : (this.engine.base.master ? this.engine.base.master.channel : null)
        if (!_.isNil(target)) {
            this.engine.tone.connect(this.output, target)
        }
    }
    /** Loads the samples for `instrument` ({ sampler, sample }); a failure leaves the layer silent and is logged. */
    async setInstrument (instrument) {
        const sampler = instrument ? instrument.sampler : null
        const sample = instrument ? instrument.sample : null
        this.trackParameters.instrument = instrument
        this.set = null
        if (_.isNil(sampler) || _.isNil(sample) || this.type !== TRACK_TYPE_LAYER) {
            return null
        }
        try {
            const set = await this.engine.library.load(sampler, sample)
            // the instrument may have changed again while this one loaded
            if (this.trackParameters.instrument === instrument) {
                this.set = set
            }
            return set
        } catch (error) {
            console.error(`Layer ${this.id}: could not load ${sampler}/${sample}`, error)
            return null
        }
    }
    /** Plays one scheduled hit. Nothing happens for a layer whose samples are not there yet. */
    play (hit) {
        if (_.isNil(this.set)) {
            return null
        }
        return playHit({
            context: this.engine.context(),
            buffer: this.set.bufferFor(hit.velocity),
            time: hit.time,
            velocity: hit.velocity,
            destination: this.output,
            chokeGroups: this.engine.chokeGroups,
            chokeGroup: this.trackParameters.instrument ? this.trackParameters.instrument.chokeGroup : null,
            registry: this.engine.voices
        })
    }
    setVolume (value) {
        this.volume = Number(value)
        this.applyMixerState()
    }
    setMute (value) {
        this.isMuted = value === true
        this.applyMixerState()
    }
    setSolo () {}
    applyMixerState () {
        const gain = this.isMuted ? 0 : dbToGain(this.volume)
        const now = this.engine.context().currentTime
        this.output.gain.cancelScheduledValues(now)
        this.output.gain.setTargetAtTime(gain, now, 0.01)
    }
    setType (type) {
        this.type = type
        if (type !== TRACK_TYPE_LAYER) {
            this.engine.warnOnce('automation', 'Playback v2 does not play automation layers yet; this layer is silent')
        }
    }
    setAutomatedFx () {}
    calculatePart () {}
    load () {}
    releaseAll () {}
    getNotes () { return null }
    dispose () {
        try {
            this.output.disconnect()
        } catch (e) {
            // already gone
        }
        this.set = null
    }
}

/**
 * @param {object} o
 * @param {object} o.base the old engine: owns init, the user busses, the master
 * @param {typeof Tone} [o.tone]
 * @param {object} [o.library] a sample library (see samples.js)
 * @param {object} [o.scheduler] a scheduler (see scheduler.js)
 * @param {() => number} [o.wallClock] Date.now
 */
export function createPlaybackEngineV2 ({ base, tone = Tone, library = null, scheduler = null, wallClock = () => Date.now() } = {}) {
    const context = () => tone.getContext()
    const warned = new Set()
    let pendingServerStart = null
    let serverOffsetMs = 0
    let clockSamples = null
    const playListeners = new Set()

    const engine = {
        name: 'v2',
        isV2: true,
        base,
        tone,
        tracks: [],
        tracksById: {},
        tracksByType: {},
        round: null,
        chokeGroups: createChokeGroups(),
        // every voice sounding or still to come, so stop can silence them all at once
        voices: createVoiceRegistry(),
        context,
        currentTime () {
            return context().currentTime
        },
        get busesByUser () {
            return base.busesByUser
        },
        get master () {
            return base.master
        },
        warnOnce (key, message) {
            if (!warned.has(key)) {
                warned.add(key)
                console.warn(message)
            }
        },

        init () {
            engine.library = library || createSampleLibrary({ context: context() })
            engine.scheduler = scheduler || createScheduler({ context: context() })
            engine.scheduler.onStep(hit => {
                if (!hit.plays) return
                const track = engine.tracksById[hit.layerId]
                if (track && track.type === TRACK_TYPE_LAYER) {
                    track.play(hit)
                }
            })
            return base.init()
        },

        async load (round) {
            engine.round = round
            engine.reset()
            base.reset()
            for (const userBus of Object.values(round.userBuses || {})) {
                await base.addUser(userBus.id, userBus.fx)
            }
            for (const layer of round.layers) {
                await engine.createTrack(layer)
            }
            engine.scheduler.setSnapshot(snapshotFromRound(round))
        },

        addUser (userId, userFx) {
            return base.addUser(userId, userFx)
        },

        /** Makes the track for a layer and loads its samples. A user bus goes to the old engine. */
        async createTrack (trackParameters) {
            if (trackParameters.type === TRACK_TYPE_USER) {
                const bus = await base.createTrack(trackParameters)
                base.busesByUser[trackParameters.createdBy] = bus
                return bus
            }
            const track = new LayerTrackV2(engine, trackParameters)
            engine.tracks.push(track)
            engine.tracksById[track.id] = track
            if (_.isNil(engine.tracksByType[track.type])) {
                engine.tracksByType[track.type] = []
            }
            engine.tracksByType[track.type].push(track)
            await track.setInstrument(trackParameters.instrument)
            return track
        },

        removeTrack (id) {
            const track = engine.tracksById[id]
            if (_.isNil(track)) {
                return
            }
            track.dispose()
            delete engine.tracksById[id]
            _.pull(engine.tracks, track)
            for (const tracks of Object.values(engine.tracksByType)) {
                _.pull(tracks, track)
            }
        },

        reset () {
            for (const track of engine.tracks) {
                track.dispose()
            }
            engine.tracks = []
            engine.tracksById = {}
            engine.tracksByType = {}
            engine.chokeGroups.clear()
            engine.voices.stopAll(context().currentTime)
        },

        /** The round changed (steps, offsets, a layer added or removed, tempo): a new snapshot, nothing rebuilt. */
        recalculateParts (round) {
            if (_.isNil(round)) {
                return
            }
            engine.round = round
            engine.scheduler.setSnapshot(snapshotFromRound(round))
        },

        setTempo (bpm) {
            if (!(Number(bpm) > 0)) return
            if (engine.round) {
                engine.round = { ...engine.round, bpm: Number(bpm) }
            }
            engine.scheduler.setTempo(Number(bpm))
        },

        setSwing (swing) {
            const value = _.isNil(swing) ? 0 : Number(swing) / 100
            if (engine.round) {
                engine.round = { ...engine.round, swing: Number(swing) || 0 }
            }
            engine.scheduler.setSnapshot(Object.freeze({ ...engine.scheduler.snapshot(), swing: value }))
        },

        /** Starts a little after now, so the first hits have time to be scheduled. Resolves once the context runs. */
        async play () {
            await engine.startAudioContext()
            const origin = context().currentTime + START_DELAY
            engine.scheduler.start(origin)
            for (const fn of playListeners) fn({ playing: true, originContextTime: origin })
            return origin
        },

        /** Stops scheduling and silences every voice already handed to Web Audio: nothing lands after the button. */
        stop () {
            engine.scheduler.stop()
            engine.voices.stopAll(context().currentTime)
            pendingServerStart = null
            for (const fn of playListeners) fn({ playing: false })
        },

        /** Called on every play and stop with `{ playing, originContextTime }`, for whoever shares the transport. */
        onPlayback (fn) {
            playListeners.add(fn)
            return () => playListeners.delete(fn)
        },

        /** Resumes the context if it is suspended; runs a start that was waiting for the user's gesture. */
        async startAudioContext () {
            const ctx = context()
            if (ctx.state !== 'running') {
                try {
                    await ctx.resume()
                } catch (error) {
                    console.warn('Could not resume the audio context yet', error)
                }
            }
            if (ctx.state === 'running' && !_.isNil(pendingServerStart)) {
                const startedAtServerMs = pendingServerStart
                pendingServerStart = null
                engine.startAlignedToServer(startedAtServerMs)
            }
            return ctx.state === 'running'
        },

        isOn () {
            return engine.scheduler.isRunning()
        },

        getPositionMilliseconds () {
            return Math.round(engine.scheduler.positionSeconds() * 1000)
        },

        currentBar () {
            return engine.scheduler.currentBar()
        },

        releaseAll () {},

        setServerOffset (ms, samples = null) {
            serverOffsetMs = Number(ms) || 0
            clockSamples = samples
        },

        serverOffset () {
            return serverOffsetMs
        },

        /** What the clock estimate came to: the offset used and the round trips it rests on. */
        clockSync () {
            return { offsetMs: serverOffsetMs, samples: clockSamples }
        },

        /**
         * Joins a transport another client started at `startedAtServerMs` (server clock): starts
         * with bar 0 where the server says it is, or, if the audio context still waits for a user
         * gesture, remembers to do so on the first one.
         */
        startAlignedToServer (startedAtServerMs) {
            const ctx = context()
            if (ctx.state !== 'running') {
                pendingServerStart = startedAtServerMs
                engine.startAudioContext()
                return false
            }
            const origin = alignedOrigin({ startedAtServerMs, serverOffsetMs, contextNow: ctx.currentTime, wallNowMs: wallClock() })
            engine.scheduler.start(origin)
            return true
        },

        /** The server's start time arrived for a transport this client started itself: nudges bar 0 onto it. */
        alignToServer (startedAtServerMs) {
            if (!engine.isOn()) return 0
            const origin = alignedOrigin({ startedAtServerMs, serverOffsetMs, contextNow: context().currentTime, wallNowMs: wallClock() })
            return engine.scheduler.alignTo(origin)
        },

        onStep (fn) {
            return engine.scheduler.onStep(fn)
        },

        onBar (fn) {
            return engine.scheduler.onBar(fn)
        },

        dispose () {
            engine.stop()
            engine.reset()
            engine.scheduler.dispose()
        }
    }
    return engine
}
