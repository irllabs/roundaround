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
            for (let i = 0; i < oldLength; i++) {
                newSteps[i * multiple].isOn = layer.steps[i].isOn
            }
        } else {
            // new length doesn't fit neatly
            for (let i = 0; i < oldLength; i++) {
                newSteps[i].isOn = layer.steps[i].isOn
            }
        }
    } else {
        if (oldLength % newLength === 0) {
            // new length fits neatly in to old length
            let multiple = oldLength / newLength
            for (let i = 0; i < newLength; i++) {
                newSteps[i].isOn = layer.steps[i * multiple].isOn
            }
        } else {
            // new length doesn't fit neatly
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
 * Layers keep their original creators, so the copy keeps the original's contributors as well as
 * the copier: without their profiles the copied layers would have no colour.
 */
export const duplicateRound = (round, userId) => {
    const clone = _.cloneDeep(round)
    clone.id = uuid()
    clone.name = (round.name || 'Round') + ' (duplicate)'
    clone.createdAt = Date.now()
    clone.createdBy = userId
    clone.currentUsers = [userId]
    clone.contributors = _.uniq([...(round.contributors || []), userId])
    delete clone.shortLink
    delete clone.isPlaying
    return clone
}

/**
 * Old rounds were saved with lowpass and highpass second and third in a user bus's chain; they
 * belong fourth and fifth. Returns a new round with those buses put right, or the round it was
 * given when there is nothing to put right. Never writes to the round.
 */
export const normalizeLegacyFxOrder = (round) => {
    if (_.isNil(round) || _.isNil(round.userBuses)) {
        return round
    }
    const userBuses = {}
    let corrected = false
    for (const [userId, userBus] of Object.entries(round.userBuses)) {
        const fx = userBus.fx
        if (_.get(fx, '[1].name') === 'lowpass' && _.get(fx, '[2].name') === 'highpass') {
            const reordered = [...fx]
            arraymove(reordered, 1, 4)
            arraymove(reordered, 1, 4)
            userBuses[userId] = { ...userBus, fx: reordered }
            corrected = true
        } else {
            userBuses[userId] = userBus
        }
    }
    return corrected ? { ...round, userBuses } : round
}

/** A copy of `layer` with every step switched off. */
export const layerWithStepsOff = (layer) => {
    const silenced = _.cloneDeep(layer)
    for (const step of silenced.steps) {
        step.isOn = false
    }
    return silenced
}

/**
 * A saved pattern's layers lined up with the round as it stands now: a layer the user has added
 * since the pattern was saved comes back with every step off, a layer that has been deleted from
 * the round drops out. Returns a new array and leaves the pattern it was given alone.
 */
export const patternLayersForRound = (patternLayers, roundLayers, userId) => {
    const layers = patternLayers.filter(layer => !_.isNil(_.find(roundLayers, { id: layer.id })))
    for (const roundLayer of roundLayers) {
        if (roundLayer.createdBy === userId && _.isNil(_.find(patternLayers, { id: roundLayer.id }))) {
            layers.push(layerWithStepsOff(roundLayer))
        }
    }
    return layers
}

/**
 * Effective mute state per layer when `soloedLayerId` is soloed for this listener only
 * (null means no solo): a layer plays if it is not muted and is the soloed one, or nothing is soloed.
 */
export const soloMuteStates = (layers, soloedLayerId) => {
    const states = {}
    for (const layer of layers || []) {
        states[layer.id] = Boolean(layer.isMuted) || (!_.isNil(soloedLayerId) && layer.id !== soloedLayerId)
    }
    return states
}

/**
 * The contributors who are in the round right now. The app keeps a profile for every contributor,
 * present or not, so a layer keeps its author's colour after the author has gone; the header shows
 * an avatar, and voice chat opens, only for the people who are actually here.
 */
export const presentUsers = (users, round) => {
    const currentUsers = _.get(round, 'currentUsers')
    if (_.isNil(currentUsers)) {
        return []
    }
    return (users || []).filter(user => currentUsers.includes(user.id))
}

/**
 * The contributors of a round saved before rounds had a `contributors` field: whoever created it,
 * whoever is in it now, and whoever made one of its layers. De-duplicated; the order means nothing.
 */
export const derivedContributors = (round) => {
    if (_.isNil(round)) {
        return []
    }
    const layerCreators = (round.layers || []).map(layer => layer.createdBy)
    return _.uniq([round.createdBy, ...(round.currentUsers || []), ...layerCreators].filter(id => !_.isNil(id)))
}

/**
 * The profile fields an auth user contributes to their users/{uid} document. Null fields are
 * left out so a merge write never overwrites a display name chosen in the sign-up dialog.
 */
export const profileFromAuthUser = (authUser) => {
    const profile = { id: authUser.uid, isGuest: Boolean(authUser.isAnonymous) }
    if (authUser.displayName) profile.displayName = authUser.displayName
    if (authUser.email) profile.email = authUser.email
    if (authUser.photoURL) profile.avatar = authUser.photoURL
    return profile
}
