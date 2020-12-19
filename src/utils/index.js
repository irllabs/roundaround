import { Limits } from '../constants';
import { getDefaultStepData } from './dummyData';

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
        return [...layer.steps, ...stepsToAdd]
    }
}

export const numberRange = (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

export const randomBool = (probability = 0.5) => {
    return Math.random() < probability
}