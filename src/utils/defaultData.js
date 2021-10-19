import { Layer } from './constants';
import { uuid } from './index';
import { randomInt } from './index';
import Instruments from '../audio-engine/Instruments';
//import Track from '../audio-engine/Track'
import _ from 'lodash';

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
    const newInstruments = Instruments.classes();
    const hihat = newInstruments.filter(inst => inst.name === 'HiHats')[0];
    const hithatSampleArray = Object.keys(hihat.samples);
    let randHihatSoundNo = 0;
    randHihatSoundNo = randomInt(0, hithatSampleArray.length);
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
            "sample": hithatSampleArray[randHihatSoundNo],
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
    const newInstruments = Instruments.classes();
    const hihat = newInstruments.filter(inst => inst.name === 'HiHats')[0];
    const snare = newInstruments.filter(inst => inst.name === 'Snares')[0];
    const kick = newInstruments.filter(inst => inst.name === 'Kicks')[0];
    const hithatSampleArray = Object.keys(hihat.samples);
    const snareSampleArray = Object.keys(snare.samples);
    const kickSampleArray = Object.keys(kick.samples);
    let randHihatSoundNo, randSnareSoundNo, randKickSoundNo = 0;
    randHihatSoundNo = randomInt(0, hithatSampleArray.length);
    randSnareSoundNo = randomInt(0, snareSampleArray.length);
    randKickSoundNo = randomInt(0, kickSampleArray.length);
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
                "sample": hithatSampleArray[randHihatSoundNo],
            }),
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "Snares",
                "sample": snareSampleArray[randSnareSoundNo],
            }),
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "Kicks",
                "sample": kickSampleArray[randKickSoundNo],
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