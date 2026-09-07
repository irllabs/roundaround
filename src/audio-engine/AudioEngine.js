import * as Tone from 'tone';
import Track from './Track';
import _ from 'lodash';
import { arraymove } from '../utils';

/**
 * Old rounds were saved with lowpass and highpass second and third in the chain; they belong fourth
 * and fifth. Returns the corrected order as a new array, leaving the round's own list alone.
 */
const orderedFx = (fx) => {
    if (fx[1].name === 'lowpass' && fx[2].name === 'highpass') {
        const corrected = [...fx]
        arraymove(corrected, 1, 4)
        arraymove(corrected, 1, 4)
        return corrected
    }
    return fx
}

const AudioEngine = {
    tracks: [],
    tracksById: {},
    tracksByType: {},
    busesByUser: {},
    master: null,
    init () {
        const _this = this
        return new Promise(async (resolve, reject) => {
            _this.master = new Track({
                fx: []
            }, Track.TRACK_TYPE_MASTER)
            _this.master.buildAudioChain()
            resolve()
        })
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
                await _this.addUser(userBus.id, orderedFx(userBus.fx))
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
    play () {
        this.startAudioContext()
        Tone.Transport.start("+0.1");
        Tone.Transport.loop = false
        Tone.Transport.loopEnd = '1:0:0'
    },
    stop () {
        Tone.Transport.stop()
    },
    startAudioContext () {
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }
    },
    isOn () {
        return Tone.Transport.state === 'started'
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
    removeTrack (id) {
        if (!_.isNil(this.tracksById[id])) {
            this.tracksById[id].dispose()
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
        return Math.round(Tone.Transport.seconds * 1000)
    },
    setTempo (bpm) {
        Tone.Transport.bpm.value = bpm
        // need to recalculate parts because absolute time offset needs to be recalculated
        this.recalculateParts(this.round)
    },
    setSwing (swing) {
        Tone.Transport.swing = swing / 100
    }

}
export default AudioEngine
