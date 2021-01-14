import { Layer } from '../constants';
import { uuid } from '../models/SequencerUtil';
import Track from '../audio-engine/Track'

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
        "creator": userId || null,
        "name": "",
        "type": Track.TRACK_TYPE_LAYER,
        "isActive": true,
        "isMuted": false,
        "isPreviewed": false,
        "gain": 0,
        "instrument": {
            "noteLength": "64n",
            "instrument": "Sampler",
            "sampler": "BassDrum",
            "sample": "bdLong04",
            ...instrument
        },
        "steps": Array(Layer.DefaultStepsAmount).fill(null).map(() => { return getDefaultStepData() }),
        "createdAt": Date.now()
    }
    // increase each layer createdAt time by 1 ms so they're not equal
    let i = 0
    layer.steps.map((step) => {
        step.order = i++
    })
    return layer;
};

export const getDefaultRoundData = (userId) => {
    const round = {
        "user": userId || null,
        "id": uuid(),
        "bpm": 120,
        "name": "Default Round",
        "layers": [
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "BassDrum",
                "sample": "bdLong04"
            }),
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "SnareDrum",
                "sample": "sd03",
            }),
            getDefaultLayerData(userId, {
                "instrument": "Sampler",
                "sampler": "HitHatOpen",
                "sample": "oh03",
            }),
        ],
        userBusFx: {}
    }
    round.userBusFx[userId] = getDefaultUserBusFx()
    // increase each layer createdAt time by 1 ms so they're not equal
    let i = 0
    round.layers.map((layer) => {
        layer.name = "Layer " + (i + 1)
        layer.createdAt += i++
    })
    return round
}

export const getDefaultUserBusFx = () => {
    return [
        {
            "id": uuid(),
            name: 'autowah',
            order: 0,
            isOn: true
        },
        {
            "id": uuid(),
            name: 'lowpass',
            order: 1,
            isOn: true
        },
        {
            "id": uuid(),
            name: 'highpass',
            order: 2,
            isOn: true
        },
        {
            "id": uuid(),
            name: 'delay',
            order: 3,
            isOn: true
        },
        {
            "id": uuid(),
            name: 'distortion',
            order: 4,
            isOn: true
        },
        {
            "id": uuid(),
            name: 'bitcrusher',
            order: 5,
            isOn: true
        }, {
            "id": uuid(),
            name: 'reverb',
            order: 6,
            isOn: true
        }
    ]
}