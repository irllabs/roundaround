import Track from './Track';
import _ from 'lodash'

const AudioEngine = {
    tracks: [],
    tracksById: {},
    tracksByType: {},
    master: null,
    init () {
        this.master = new Track({
            fx: []
        }, Track.TRACK_TYPE_MASTER)
        this.master.buildAudioChain()
    },
    async load (round) {
        console.log('audio engine loading round', round);
        for (const layer of round.layers) {
            const track = await this.createTrack(layer, Track.TRACK_TYPE_LAYER)
            await track.load(layer)
        }
    },
    // assumes tracks haven't changed, just the steps
    recalculateParts (round, layerId = null) {
        for (let layer of round.layers) {
            if (_.isNil(layerId) || layerId === layer.id) {
                this.tracksById[layer.id].calculatePart(layer)
            }
        }
    },
    createTrack (trackParameters) {
        console.log('createTrack', trackParameters);
        console.time('createTrack')
        let _this = this
        return new Promise(async function (resolve, reject) {
            let track = new Track(trackParameters)
            _this.tracks.push(track)
            _this.tracksById[track.id] = track
            if (_.isNil(_this.tracksByType[track.type])) {
                _this.tracksByType[track.type] = []
            }
            _this.tracksByType[track.type].push(track)

            await _this.tracksById[track.id].setInstrument(
                trackParameters.instrument
            )

            console.timeEnd('createTrack')
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
    }
}
export default AudioEngine
