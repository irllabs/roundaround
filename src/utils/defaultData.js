import { Layer } from './constants';
import { uuid } from './index';
import HiHatsSamples from '../samples/HiHats';
import KicksSamples from '../samples/Kicks';
import SnareSamples from '../samples/Snares';
//import Track from '../audio-engine/Track'
import _ from 'lodash'

export const refrashAllIdsInArray = (array) => {
    return array.map(item => ({ ...item, id: uuid() }))
}

export const getDefaultStepData = () => {
    return {
        "isOn": false,
        "id": uuid(),
        "probability": 1,
        "velocity": 1,
        "note": "C4"
    }
};

export const getDefaultLayerData = (userId, instrument) => {
    const layer = {
        "id": uuid(),
        "createdBy": userId || null,
        "name": "",
        "type": 'TRACK_TYPE_LAYER',
        "timeOffset": 0,
        "percentOffset": 0,
        "isActive": true,
        "isMuted": false,
        "isPreviewed": false,
        "gain": 0,
        "instrument": {
            "noteLength": "64n",
            "instrument": "Sampler",
            "sampler": "HiHats",
            "sample": Object.entries(HiHatsSamples)[Math.floor(Math.random() * Object.entries(HiHatsSamples).length)][0],
            ...instrument
        },
        "steps": Array(Layer.DefaultStepsAmount).fill(null).map(() => { return getDefaultStepData() }),
        "createdAt": Date.now()
    }
    // increase each layer createdAt time by 1 ms so they're not equal
    let i = 0
    for (let step of layer.steps) {
        step.order = i++
    }
    return layer;
};

export const getDefaultRoundData = (userId) => {
    const round = {
        "createdBy": userId || null,
        "id": uuid(),
        "dataVersion": 1.5,
        "bpm": 120,
        swing: 0,
        "name": "Default Round",
        "createdAt": Date.now(),
        "currentUsers": [],
        "layers": [
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "HiHats",
                "sample": Object.entries(HiHatsSamples)[Math.floor(Math.random() * Object.entries(HiHatsSamples).length)][0],
            }),
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "Snares",
                "sample": Object.entries(SnareSamples)[Math.floor(Math.random() * Object.entries(SnareSamples).length)][0],
            }),
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "Kicks",
                "sample": Object.entries(KicksSamples)[Math.floor(Math.random() * Object.entries(KicksSamples).length)][0],
            })
        ],
        userBuses: {},
        userPatterns: {}
    }
    round.userBuses[userId] = getDefaultUserBus(userId)
    round.userPatterns[userId] = getDefaultUserPatterns(userId)
    // increase each layer createdAt time by 1 ms so they're not equal
    let i = 0
    for (let layer of round.layers) {
        layer.name = "Layer " + (i + 1)
        layer.createdAt += i++
    }
    return round
}

export const getDefaultUserBus = (id) => {
    return {
        id,
        fx: getDefaultUserBusFx()
    }
}

export const getDefaultUserBusFx = () => {
    return [
        {
            "id": uuid(),
            name: 'delay',
            order: 3,
            isOn: true,
            isOverride: false
        },
        {
            "id": uuid(),
            name: 'distortion',
            order: 4,
            isOn: true,
            isOverride: false
        },
        {
            "id": uuid(),
            name: 'autowah',
            order: 0,
            isOn: true,
            isOverride: false
        },
        {
            "id": uuid(),
            name: 'lowpass',
            order: 1,
            isOn: true,
            isOverride: false
        },
        {
            "id": uuid(),
            name: 'highpass',
            order: 2,
            isOn: true,
            isOverride: false
        }
    ]
}

export const getDefaultUserPatterns = (id) => {
    let userPattern = {
        id,
        isQueuing: '',
        patterns: [],
        sequence: getDefaultUserPatternSequence(),
        isPlayingSequence: false
    }
    for (let i = 0; i < 8; i++) {
        userPattern.patterns[i] = getDefaultUserPattern(i)
    }
    return userPattern
}
export const getDefaultUserPatternSequence = () => {
    return [false, false, false, false, false, false, false, false]
}
export const getDefaultUserPattern = (order) => {
    return {
        id: uuid(),
        order,
        state: {}
    }
}
export const getDefaultSample = (userId) => {
    let date = new Date()
    let name = date.toLocaleString()
    name = _.replace(name, ', ', '_')
    return {
        id: uuid(),
        createdBy: userId,
        createdAt: Date.now(),
        name
    }
}