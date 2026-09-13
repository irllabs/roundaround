/**
 * The arrangement snapshot: an immutable, plain-data picture of what the round plays, read by the
 * scheduler on every tick. Edits do not touch a snapshot; they produce a new one, and the scheduler
 * simply reads the latest from its next window on. That is what makes double or dropped hits
 * impossible: nothing is ever disposed or rebuilt while the transport runs.
 *
 * Every time here is in seconds. A layer's steps sit on an exact fractional grid
 * (`i * barSeconds / count`), so a count that does not divide the bar (7, 9, 18, 19...) is as
 * accurate as one that does, and offsets are added in seconds, never rounded to ticks.
 */
import _ from 'lodash'

export const LAYER_TYPE = 'TRACK_TYPE_LAYER'

/** Seconds in one bar of four beats at `bpm`. */
export function barSeconds (bpm) {
    return (60 / bpm) * 4
}

/**
 * The snapshot for a round as the store (or PlayUI's working copy) holds it. Layers that are not
 * instrument layers (automation) are left out: the scheduler plays samples only.
 */
export function snapshotFromRound (round) {
    const bpm = Number(round.bpm) > 0 ? Number(round.bpm) : 120
    const swing = _.isNil(round.swing) ? 0 : Number(round.swing) / 100
    const layers = (round.layers || [])
        .filter(layer => _.isNil(layer.type) || layer.type === LAYER_TYPE)
        .map(layer => Object.freeze({
            id: layer.id,
            userId: layer.createdBy,
            count: layer.steps.length,
            steps: Object.freeze(layer.steps.map((step, index) => Object.freeze({
                index,
                id: step.id,
                on: step.isOn === true,
                velocity: _.isNil(step.velocity) ? 1 : Number(step.velocity),
                probability: _.isNil(step.probability) ? 1 : Number(step.probability)
            }))),
            percentOffset: _.isNil(layer.percentOffset) ? 0 : Number(layer.percentOffset),
            timeOffset: _.isNil(layer.timeOffset) ? 0 : Number(layer.timeOffset),
            gain: _.isNil(layer.gain) ? 0 : Number(layer.gain),
            muted: layer.isMuted === true,
            instrument: Object.freeze({
                sampler: layer.instrument ? layer.instrument.sampler : null,
                sample: layer.instrument ? layer.instrument.sample : null
            })
        }))
    return Object.freeze({ bpm, swing, barSeconds: barSeconds(bpm), layers: Object.freeze(layers) })
}

/**
 * How much later a hit at `time` (seconds into the bar) sounds with `swing` (0 to 1). The same
 * shape as Tone's transport swing on an eighth-note subdivision, so a round swings as it did:
 * hits on a beat stay, the eighth between two beats is pushed by up to a third of a beat, and
 * anything in between moves by a sine of its position, so a sixteenth moves less than the eighth.
 */
export function swingDelay (time, bar, swing) {
    if (!(swing > 0)) return 0
    const eighth = bar / 8
    const pair = eighth * 2
    const within = time % pair
    if (Math.abs(within) < 1e-9 || Math.abs(within - pair) < 1e-9) return 0
    const progress = within / pair
    return Math.sin(progress * Math.PI) * swing * (pair / 3)
}

/**
 * Where a layer's steps fall in one bar, in seconds from the bar's start, in step order. Every
 * step is listed, on or off, so the same list drives the sound and the step lights. Offsets and
 * swing are applied and the result wrapped into [0, bar): a negative offset moves a step to the
 * end of the bar, as the round shows it.
 */
export function hitTimes (layer, snapshot) {
    const bar = snapshot.barSeconds
    const stepSeconds = bar / layer.count
    const offset = (layer.percentOffset / 100) * stepSeconds + layer.timeOffset / 1000
    return layer.steps.map(step => {
        const grid = step.index * stepSeconds
        const swung = grid + swingDelay(grid, bar, snapshot.swing)
        let time = swung + offset
        time = ((time % bar) + bar) % bar
        return { layerId: layer.id, stepIndex: step.index, stepId: step.id, time, on: step.on, velocity: step.velocity, probability: step.probability }
    })
}

/**
 * Every step of every layer whose absolute time falls in [from, to), where absolute time is
 * `origin + bar * barSeconds + time-in-bar`. Spans as many bars as the window needs, in time
 * order. Half-open, so a scheduler walking consecutive windows sees each hit exactly once.
 */
export function hitsBetween (snapshot, from, to, origin) {
    if (!(to > from)) return []
    const bar = snapshot.barSeconds
    const firstBar = Math.floor((from - origin) / bar)
    const lastBar = Math.floor((to - origin) / bar)
    const out = []
    for (let b = firstBar; b <= lastBar; b++) {
        const barStart = origin + b * bar
        for (const layer of snapshot.layers) {
            for (const hit of hitTimes(layer, snapshot)) {
                const time = barStart + hit.time
                if (time >= from && time < to) {
                    out.push({ ...hit, time, bar: b })
                }
            }
        }
    }
    return out.sort((a, b) => a.time - b.time || a.layerId.localeCompare(b.layerId) || a.stepIndex - b.stepIndex)
}
