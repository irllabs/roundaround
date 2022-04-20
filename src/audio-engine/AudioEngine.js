import * as Tone from 'tone';
import Track from './Track';
import _ from 'lodash';
import { arraymove } from '../utils';

const AudioEngine = {
    tracks: [],
    tracksById: {},
    tracksByType: {},
    busesByUser: {},
    master: null,
    init() {
        const _this = this
        return new Promise(async (resolve, reject) => {
            _this.master = new Track({
                fx: []
            }, Track.TRACK_TYPE_MASTER)
            _this.master.buildAudioChain()
            resolve()
        })
    },
    async load(round) {
        console.log('audio engine loading round', round);
        const _this = this
        return new Promise(async (resolve, reject) => {
            _this.round = round
            _this.reset()
            _this.setTempo(round.bpm)
            if (!_.isNil(round.swing)) {
                _this.setSwing(round.swing)
            }
            for (const userBus of Object.values(round.userBuses)) {
                //check if lowpass and highpass are positioned second and third then move them to fourth and fifth positions
                if (userBus.fx[1].name === 'lowpass' && userBus.fx[2].name === 'highpass') {
                    await arraymove(userBus.fx, 1, 4);
                    await arraymove(userBus.fx, 1, 4);
                }
                await _this.addUser(userBus.id, userBus.fx)
            }
            for (const layer of round.layers) {
                console.log('creating track', layer.id)
                const track = await _this.createTrack(layer)
                console.log('created track', track)
                await track.load(layer, round.userPatterns[layer.createdBy])
            };
            //  console.log('audio engine finsihed loading round');
            resolve()
        })
    },
    async addUser(userId, userFx) {
        return new Promise(async (resolve, reject) => {
            //console.log('addUser()', userId);
            const userBus = await this.createTrack({ fx: userFx, id: userId, createdBy: userId, type: Track.TRACK_TYPE_USER })
            //userBus.buildAudioChain()
            this.busesByUser[userId] = userBus;
            resolve()
        })
    },
    play() {
        this.startAudioContext()
        Tone.Transport.start("+0.1")
        Tone.Transport.loop = false
        Tone.Transport.loopEnd = '1:0:0'
    },
    stop() {
        Tone.Transport.stop()
    },
    startAudioContext() {
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }
    },
    isOn() {
        return Tone.Transport.state === 'started'
    },
    // assumes tracks haven't changed, just the steps
    recalculateParts(round, layerId = null) {
        console.log('AudioEngine::recalculateParts()');
        console.time('AudioEngine::recalculateParts')
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
        console.timeEnd('AudioEngine::recalculateParts')
    },
    getIsPlayingSequence(userId, round) {
        return round.userPatterns[userId].isPlayingSequence
    },

    createTrack(trackParameters) {
        const userId = trackParameters.createdBy
        const type = trackParameters.type
        // console.log('createTrack', trackParameters, userId, type);
        let _this = this
        return new Promise(async function (resolve, reject) {
            console.log('pre track --')
            let track = new Track(trackParameters, type, userId)
            console.log('track --', track)
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
    removeTrack(id) {
        if (!_.isNil(this.tracksById[id])) {
            this.tracksById[id].dispose()
        }
    },
    reset() {
        for (let track of this.tracks) {
            track.dispose()
        }
        this.tracks = []
        this.tracksById = {}
        this.tracksByType = {}
    },

    releaseAll() {
        for (let track of this.tracks) {
            track.releaseAll()
        }
    },
    getPositionMilliseconds() {
        return Math.round(Tone.Transport.seconds * 1000)
    },
    setTempo(bpm) {
        Tone.Transport.bpm.value = bpm
        // need to recalculate parts because absolute time offset needs to be recalculated
        this.recalculateParts(this.round)
    },
    setSwing(swing) {
        Tone.Transport.swing = swing / 100
    }

}
export default AudioEngine
