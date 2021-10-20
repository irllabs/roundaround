/* eslint-disable eqeqeq */
import { getDefaultRoundData, getDefaultStepData } from './defaultData'
import { Colors } from './constants'

export const createRound = async (userId) => {
    return await getDefaultRoundData(userId)
}

export const arraymove = async (arr, fromIndex, toIndex) => {
    var element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
}

export const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min)) + min;
}

export const arraymove = async (arr, fromIndex, toIndex) => {
    var element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
}

export const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        // eslint-disable-next-line no-mixed-operators
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const numberRange = (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

export const randomBool = (probability = 0.5) => {
    return Math.random() < probability
}

export const randomItem = (items) => {
    return items[Math.floor(Math.random() * items.length)]
}

export const getRandomColor = () => {
    return randomItem(Colors)
    // return '#' + Math.floor(Math.random() * 16777215).toString(16);
}
export const changeLayerLength = (layer, newLength) => {
    const oldLength = layer.steps.length;
    //let difference = newLength - oldLength;

    let newSteps = []
    for (let i = 0; i < newLength; i++) {
        let step = getDefaultStepData()
        step.order = i
        newSteps.push(step)
    }

    if (oldLength < newLength) {
        if (newLength % oldLength == 0) {
            // new length fits neatly in to old length
            let multiple = newLength / oldLength
            // console.log('new length is multiple of old', multiple);
            for (let i = 0; i < oldLength; i++) {
                newSteps[i * multiple].isOn = layer.steps[i].isOn
            }
        } else {
            // new length doesn't fit neatly
            //console.log('new length is not multiple of old');
            for (let i = 0; i < oldLength; i++) {
                newSteps[i].isOn = layer.steps[i].isOn
            }
        }
    } else {
        if (oldLength % newLength == 0) {
            // new length fits neatly in to old length
            let multiple = oldLength / newLength
            // console.log('new length is multiple of old', multiple);
            for (let i = 0; i < newLength; i++) {
                newSteps[i].isOn = layer.steps[i * multiple].isOn
            }
        } else {
            // new length doesn't fit neatly
            // console.log('new length is not multiple of old');
            for (let i = 0; i < newLength; i++) {
                newSteps[i].isOn = layer.steps[i].isOn
            }
        }
    }
    /*
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
            stepsToAdd = Array(Limits.stepsPerLayer.max - oldLength).fill(0).map(element => getDefaultStepData());
        } else {
            stepsToAdd = Array(difference).fill(0).map(element => getDefaultStepData());
        }
        let steps = [...layer.steps, ...stepsToAdd]
        let i = 0;
        for (let step of steps) {
            step.order = i++;
        }
        steps = _.orderBy(steps, 'order')
        return steps
    }*/

    return newSteps
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