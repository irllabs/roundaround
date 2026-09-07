import _ from 'lodash'

// The step fields a change to which is seen or heard. `lastUpdated` is bookkeeping about a change,
// not part of one; `id` and `order` are the step's place, which is compared as the shape of the
// layer's step list.
const STEP_FIELDS = ['isOn', 'velocity', 'probability', 'note']

// The layer fields the round UI reacts to, grouped by the reaction they need. 'offset' covers both
// offsets; 'steps' (added by changedLayerFields) means the step list itself changed shape.
const LAYER_FIELDS = {
    instrument: ['instrument'],
    type: ['type'],
    automationFxId: ['automationFxId'],
    gain: ['gain'],
    isMuted: ['isMuted'],
    offset: ['timeOffset', 'percentOffset']
}

const sameStepList = (previousSteps, nextSteps) =>
    previousSteps.length === nextSteps.length && previousSteps.every((step, i) => step.id === nextSteps[i].id)

const changedStepIds = (previousSteps, nextSteps) =>
    nextSteps
        .filter((step, i) => !_.isEqual(_.pick(previousSteps[i], STEP_FIELDS), _.pick(step, STEP_FIELDS)))
        .map(step => step.id)

const changedLayerFields = (previous, next) => {
    const fields = Object.keys(LAYER_FIELDS).filter(name => LAYER_FIELDS[name].some(field => !_.isEqual(previous[field], next[field])))
    if (!sameStepList(previous.steps, next.steps)) {
        fields.push('steps')
    }
    return fields
}

/**
 * Sorts the difference between two versions of the same round into the cases the round UI reacts
 * to. Layers are matched by id, so their order does not matter. Pure: reads both rounds and writes
 * to neither. Returns:
 *
 * - `addedLayers`: the layers of `nextRound` that `previousRound` did not have
 * - `removedLayerIds`: the ids of the layers `nextRound` no longer has
 * - `changedSteps`: `{ [layerId]: [stepId, ...] }`, the steps whose isOn, velocity, probability or
 *   note changed, in layers whose step list kept its shape
 * - `changedLayerFields`: `{ [layerId]: [field, ...] }` with 'instrument', 'type',
 *   'automationFxId', 'gain', 'isMuted', 'offset' (timeOffset or percentOffset) and 'steps' (the
 *   step list has a different length or different ids)
 * - `tempoChanged`: whether bpm changed
 * - `changedUserPatterns`: the users whose patterns document changed in any way
 * - `changedSequencePlayback`: the users whose sequence was started or stopped
 * - `stepsOnly`: `changedSteps` when nothing else changed, otherwise null. This is the case that
 *   needs no redraw: the changed steps are repainted and their layers' parts recalculated.
 *
 * A step whose only change is `lastUpdated` has not changed: that is what the user's own toggle
 * looks like when it comes back from the store, and what a collaborator's toggle and toggle back
 * look like when they arrive in one snapshot. The rest of the round (name, members, buses, swing,
 * isPlaying) is not the round UI's concern and is not reported, and neither is a user whose
 * patterns document is new to `nextRound`.
 */
export const classifyRoundChange = (previousRound, nextRound) => {
    const change = {
        addedLayers: [],
        removedLayerIds: [],
        changedSteps: {},
        changedLayerFields: {},
        tempoChanged: previousRound.bpm !== nextRound.bpm,
        changedUserPatterns: [],
        changedSequencePlayback: [],
        stepsOnly: null
    }
    for (const layer of nextRound.layers) {
        const previous = _.find(previousRound.layers, { id: layer.id })
        if (_.isNil(previous)) {
            change.addedLayers.push(layer)
            continue
        }
        const fields = changedLayerFields(previous, layer)
        if (fields.length > 0) {
            change.changedLayerFields[layer.id] = fields
        }
        if (!fields.includes('steps')) {
            const stepIds = changedStepIds(previous.steps, layer.steps)
            if (stepIds.length > 0) {
                change.changedSteps[layer.id] = stepIds
            }
        }
    }
    for (const layer of previousRound.layers) {
        if (_.isNil(_.find(nextRound.layers, { id: layer.id }))) {
            change.removedLayerIds.push(layer.id)
        }
    }
    for (const [userId, patterns] of Object.entries(nextRound.userPatterns)) {
        const previous = previousRound.userPatterns[userId]
        if (_.isNil(previous)) {
            continue
        }
        if (!_.isEqual(previous, patterns)) {
            change.changedUserPatterns.push(userId)
        }
        if (Boolean(previous.isPlayingSequence) !== Boolean(patterns.isPlayingSequence)) {
            change.changedSequencePlayback.push(userId)
        }
    }
    const nothingElse = _.isEmpty(change.addedLayers) && _.isEmpty(change.removedLayerIds)
        && _.isEmpty(change.changedLayerFields) && !change.tempoChanged && _.isEmpty(change.changedUserPatterns)
    if (nothingElse && !_.isEmpty(change.changedSteps)) {
        change.stepsOnly = change.changedSteps
    }
    return change
}
