/* eslint-disable eqeqeq */
import { getDefaultRoundData, getDefaultStepData } from './defaultData'
import _ from 'lodash'
import { randomInt, uuid, numberRange, randomBool, randomItem, getRandomColor, arraymove } from './helpers'

export { randomInt, uuid, numberRange, randomBool, randomItem, getRandomColor, arraymove }

export const createRound = async (userId) => {
    return await getDefaultRoundData(userId)
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
        if (newLength % oldLength === 0) {
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
        if (oldLength % newLength === 0) {
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

/**
 * Copies a round for `userId`: new id, fresh timestamps, the copier as creator and only member,
 * and no short link (a link to the original would otherwise be copied along).
 * Layers keep their original creators.
 */
export const duplicateRound = (round, userId) => {
    const clone = _.cloneDeep(round)
    clone.id = uuid()
    clone.name = (round.name || 'Round') + ' (duplicate)'
    clone.createdAt = Date.now()
    clone.createdBy = userId
    clone.currentUsers = [userId]
    delete clone.shortLink
    delete clone.isPlaying
    return clone
}
