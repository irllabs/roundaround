import { Layer } from './constants';
import { uuid } from './index';
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
            "sampler": "BassDrum",
            "sample": "E808_BD[long]-04.wav",
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
                "sampler": "HitHatOpen",
                "sample": "E808_OH-03.wav",
            }),
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "SnareDrum",
                "sample": "E808_SD-03.wav",
            }),
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "BassDrum",
                "sample": "E808_BD[long]-04.wav"
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
        },
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
        }
    ]
}

export const getDefaultUserPatterns = (id) => {
    let userPattern = {
        id,
        isQueuing: '',
        patterns: []
    }
    for (let i = 0; i < 5; i++) {
        userPattern.patterns[i] = getDefaultUserPattern(i)
    }
    return userPattern
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
    console.log('getDefaultSample() name2', name);
    return {
        id: uuid(),
        createdBy: userId,
        createdAt: Date.now(),
        name
    }
}