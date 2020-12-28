import { Layer } from '../constants';
import { uuid } from '../models/SequencerUtil';

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
    return {
        "id": uuid(),
        "creator": userId || null,
        "name": "Default layer name",
        "isActive": true,
        "isMuted": false,
        "isPreviewed": false,
        "instrument": {
            "noteLength": "64n",
            "gain": 0,
            "instrument": "Sampler",
            "sampler": "BassDrum",
            "sample": "bdLong04",
            ...instrument
        },
        "steps": Array(Layer.DefaultStepsAmount).fill(null).map(() => { return getDefaultStepData() }),
    }
};

export const getDefaultRoundData = (userId) => {
    return {
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
        ]
    }
}
