import * as Tone from 'tone';
import Track from './Track';
import _ from 'lodash';

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
    play () {
        this.startAudioContext()
        Tone.getTransport().start("+0.1");
        Tone.getTransport().loop = false
        Tone.getTransport().loopEnd = '1:0:0'
    },
    stop () {
        Tone.getTransport().stop()
    },
    startAudioContext () {
        if (Tone.getContext().state !== 'running') {
            Tone.getContext().resume();
        }
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
