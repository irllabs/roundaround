import * as Tone from 'tone';
import Track from './Track';
import _ from 'lodash';
import { createMetronomeClick } from './metronomeClick';
import { BEATS_PER_BAR } from './grid';

const AudioEngine = {
    tracks: [],
    tracksById: {},
    tracksByType: {},
    busesByUser: {},
    master: null,
    /** The metronome's click (see metronomeClick.js), into the master past the users' effects. */
    metronome: null,
    /** The transport event that hands the metronome every quarter note; scheduled once. */
    metronomeEvent: null,
    init () {
        const _this = this
        return new Promise(async (resolve, reject) => {
            _this.master = new Track({
                fx: []
            }, Track.TRACK_TYPE_MASTER)
            _this.master.buildAudioChain()
            // a second init (a new round) rebuilds the master, so the click follows it; on or off as it was
            const metronomeWasOn = !_.isNil(_this.metronome) && _this.metronome.isEnabled()
            if (!_.isNil(_this.metronome)) {
                _this.metronome.dispose()
            }
            _this.metronome = createMetronomeClick({ context: Tone.getContext(), enabled: metronomeWasOn })
            Tone.connect(_this.metronome.output, _this.master.channel)
            if (_.isNil(_this.metronomeEvent)) {
                // the beat, as a quarter-note repeat on the transport: it runs whenever the transport does
                _this.metronomeEvent = Tone.getTransport().scheduleRepeat((time) => _this.clickBeat(time), '4n', 0)
            }
            resolve()
        })
    },
    /** One beat of the transport at `time` (context seconds): the metronome clicks if it is on. */
    clickBeat (time) {
        if (_.isNil(this.metronome)) {
            return
        }
        const transport = Tone.getTransport()
        const beat = Math.round(transport.getTicksAtTime(time) / transport.PPQ)
        this.metronome.click({ time, beat })
    },
    /** Switches the metronome's click on or off; the arm in the tempo pill swings either way. */
    setMetronome (on) {
        return _.isNil(this.metronome) ? false : this.metronome.setEnabled(on)
    },
    isMetronomeOn () {
        return !_.isNil(this.metronome) && this.metronome.isEnabled()
    },
    async load (round) {
        const _this = this
        return new Promise(async (resolve, reject) => {
            _this.round = round
            _this.reset()
            _this.setTempo(round.bpm)
            if (!_.isNil(round.swing)) {
                _this.setSwing(round.swing)
            }
            for (const userBus of Object.values(round.userBuses)) {
                await _this.addUser(userBus.id, userBus.fx)
            }
            for (const layer of round.layers) {
                const track = await _this.createTrack(layer)
                await track.load(layer, round.userPatterns[layer.createdBy])
            };
            resolve()
        })
    },
    async addUser (userId, userFx) {
        return new Promise(async (resolve, reject) => {
            const userBus = await this.createTrack({ fx: userFx, id: userId, createdBy: userId, type: Track.TRACK_TYPE_USER })
            //userBus.buildAudioChain()
            this.busesByUser[userId] = userBus;
            resolve()
        })
    },
    /** Starts the transport once the context is running: on a fresh context the first events used to be scheduled while it was still suspended. */
    async play () {
        await this.startAudioContext()
        Tone.getTransport().start("+0.1");
        Tone.getTransport().loop = false
        Tone.getTransport().loopEnd = '1:0:0'
    },
    /**
     * Stops the transport and silences every layer at once. The transport only stops scheduling:
     * the hits already handed to Web Audio inside the look-ahead (up to a quarter of a second of
     * them) would still land after the button, and whatever was sounding would ring on, which is
     * heard as an echo after pause. Each sampler releases all its voices now, with its 100 ms fade.
     */
    stop () {
        // Tone's "now" sits a look-ahead (100 ms) in the future; stopping and releasing at the
        // context's current time instead means no tick after the press schedules anything and the
        // fade starts at once, not a tenth of a second later.
        const now = Tone.getContext().currentTime
        Tone.getTransport().stop(now)
        if (!_.isNil(this.metronome)) {
            this.metronome.stopAll(now)
        }
        for (const track of this.tracksByType[Track.TRACK_TYPE_LAYER] || []) {
            if (!_.isNil(track.instrument) && typeof track.instrument.releaseAll === 'function') {
                track.instrument.releaseAll(now)
            }
        }
    },
    /** Resolves once the context is running (a resume needs a user gesture behind it, which play has). */
    startAudioContext () {
        if (Tone.getContext().state !== 'running') {
            return Tone.getContext().resume()
        }
        return Promise.resolve()
    },
    isOn () {
        return Tone.getTransport().state === 'started'
    },
    // assumes tracks haven't changed, just the steps
    recalculateParts (round, layerId = null) {
        if (!_.isNil(round)) {
            this.round = round
            for (let layer of round.layers) {
                if (_.isNil(layerId) || layerId === layer.id) {
                    if (!_.isNil(this.tracksById[layer.id])) {
                        this.tracksById[layer.id].calculatePart(layer, round.userPatterns[layer.createdBy])
                    }
                }
            }
        }
    },
    getIsPlayingSequence (userId, round) {
        return round.userPatterns[userId].isPlayingSequence
    },

    createTrack (trackParameters) {
        const userId = trackParameters.createdBy
        const type = trackParameters.type
        let _this = this
        return new Promise(async function (resolve, reject) {
            let track = new Track(trackParameters, type, userId)

            _this.tracks.push(track)
            _this.tracksById[track.id] = track
            if (_.isNil(_this.tracksByType[track.type])) {
                _this.tracksByType[track.type] = []
            }
            _this.tracksByType[track.type].push(track)

            if (type === Track.TRACK_TYPE_LAYER) {
                await _this.tracksById[track.id].setInstrument(
                    trackParameters.instrument
                )
            }
            resolve(track)
        })
    },
    /** Disposes a track and forgets it, so removing the same id again does nothing. */
    removeTrack (id) {
        const track = this.tracksById[id]
        if (_.isNil(track)) {
            return
        }
        track.dispose()
        delete this.tracksById[id]
        _.pull(this.tracks, track)
        for (const tracks of Object.values(this.tracksByType)) {
            _.pull(tracks, track)
        }
    },
    reset () {
        for (let track of this.tracks) {
            track.dispose()
        }
        this.tracks = []
        this.tracksById = {}
        this.tracksByType = {}
    },

    releaseAll () {
        for (let track of this.tracks) {
            track.releaseAll()
        }
    },
    getPositionMilliseconds () {
        return Math.round(Tone.getTransport().seconds * 1000)
    },
    /**
     * The transport's position in bars, fractional, at the context's current time (not Tone's
     * look-ahead "now", which sits a tenth of a second ahead of the sound): what the playhead turns
     * by. Zero before the start.
     */
    getPositionBars () {
        const transport = Tone.getTransport()
        return transport.getTicksAtTime(Tone.getContext().currentTime) / (transport.PPQ * BEATS_PER_BAR)
    },
    setTempo (bpm) {
        Tone.getTransport().bpm.value = bpm
        // need to recalculate parts because absolute time offset needs to be recalculated
        this.recalculateParts(this.round)
    },
    setSwing (swing) {
        Tone.getTransport().swing = swing / 100
    }

}
export default AudioEngine
