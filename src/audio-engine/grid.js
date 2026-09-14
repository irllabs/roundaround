/**
 * The step grid in transport ticks. One bar is `totalTicks` (PPQ * 4). The old conversion used
 * `Math.round(totalTicks / n)` ticks for every step, so any count that does not divide the bar
 * (5, 7, 9, 10, 11, 13, 14, 15, 17 to 20 ...) left the last interval up to 8 ticks (21 ms at
 * 120 bpm) wrong, and the audio, the step lights and the automation each rounded on their own.
 * Here every step is rounded from its exact position, so no step is more than half a tick off,
 * the bar always adds up, and everyone converts the same way.
 */

/** Beats (quarter notes) to the bar: the rounds are in four. */
export const BEATS_PER_BAR = 4

/** The tick a step starts on: its exact position, rounded once. */
export function stepTick (i, n, totalTicks) {
    return Math.round((i * totalTicks) / n)
}

/** How many ticks a step lasts, so that the lengths add up to exactly one bar. */
export function stepLength (i, n, totalTicks) {
    return stepTick(i + 1, n, totalTicks) - stepTick(i, n, totalTicks)
}

/** The exact (fractional) length of a step, for offsets given as a share of a step. */
export function exactStepLength (n, totalTicks) {
    return totalTicks / n
}

/** A layer's percent offset, as ticks: a share of the exact step length, rounded once. */
export function percentOffsetTicks (percent, n, totalTicks) {
    return Math.round(((percent || 0) / 100) * exactStepLength(n, totalTicks))
}

/** A layer's millisecond offset, as ticks at a tempo. */
export function msToTicks (ms, bpm, ppq) {
    const msPerTick = 60000 / bpm / ppq
    return Math.round((ms || 0) / msPerTick)
}

/** Brings a tick back into the bar, whichever way an offset pushed it out. */
export function wrapTick (tick, totalTicks) {
    return ((tick % totalTicks) + totalTicks) % totalTicks
}

/**
 * The tick of every step of a layer, offsets applied and wrapped into the bar. The audio parts,
 * the step lights and the automation all take their times from here.
 */
export function stepTicks (n, totalTicks, { percentOffset = 0, timeOffsetTicks = 0 } = {}) {
    const shift = percentOffsetTicks(percentOffset, n, totalTicks) + timeOffsetTicks
    return Array.from({ length: n }, (unused, i) => wrapTick(stepTick(i, n, totalTicks) + shift, totalTicks))
}
