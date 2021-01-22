import { Limits } from '../constants';
import { getDefaultStepData } from './dummyData';
import _ from 'lodash'


export const getRandomColor = () => {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

export function paths (root) {
    let paths = [];
    let nodes = [{
        obj: root,
        path: []
    }];
    while (nodes.length > 0) {
        let n = nodes.pop();
        Object.keys(n.obj).forEach(k => {
            if (typeof n.obj[k] === 'object') {
                let path = n.path.concat(k);
                paths.push(path);
                nodes.unshift({
                    obj: n.obj[k],
                    path: path
                });
            }
        });
    }
    return paths;
}

export const changeLayerLength = (layer, newLength) => {
    const amount = layer.steps.length;
    let difference = newLength - amount;
    if (difference < 0) {
        //remove the difference
        const newSteps = [...layer.steps];
        if (newLength < Limits.stepsPerLayer.min) {
            newSteps.splice(Limits.stepsPerLayer.min, layer.steps.length - 1);
        } else {
            newSteps.splice(difference, 9e9);
        }

        return newSteps
    }
    if (difference > 0) {
        // add new steps
        let stepsToAdd = [];
        if (newLength > Limits.stepsPerLayer.max) {
            stepsToAdd = Array(Limits.stepsPerLayer.max - amount).fill(0).map(element => getDefaultStepData());
        } else {
            stepsToAdd = Array(difference).fill(0).map(element => getDefaultStepData());
        }
        let steps = [...layer.steps, ...stepsToAdd]
        let i = 0;
        steps.map((step) => {
            step.order = i++;
        })
        steps = _.orderBy(steps, 'order')
        return steps
    }
}

export const numberRange = (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

export const randomBool = (probability = 0.5) => {
    return Math.random() < probability
}

export const convertPercentToDB = (percent) => {
    let dB;
    if (percent > 60) {
        dB = numberRange(percent, 60, 100, -6, 6)
    } else {
        dB = numberRange(percent, 0, 60, -48, -6)
    }
    if (dB <= -48) {
        dB = -96
    }
    return dB;
}

export const convertDBToPercent = (dB) => {
    if (dB < -48) {
        dB = -48
    }
    let percent;
    if (dB > -6) {
        percent = numberRange(dB, -6, 6, 60, 100)
    } else {
        percent = numberRange(dB, -48, -6, 0, 60)
    }
    return percent;
}

// remove any old rounds that won't work with this version (will mutate incoming array)
export const removeOldRounds = (rounds, minimumRoundDataVersion) => {
    console.log('all rounds', rounds);
    let roundsToRemove = []
    for (const round of rounds) {
        if (_.isNil(round.version) || round.version < minimumRoundDataVersion) {
            roundsToRemove.push(round)
        }
    }
    for (const roundToRemove of roundsToRemove) {
        _.remove(rounds, roundToRemove)
    }
}