/**
 * The metronome in the tempo pill: the same icon as before, drawn as a body and a separate arm,
 * so the arm can swing at the round's tempo while the round plays. One swing from side to side
 * is one beat, so it ticks with the music: the arm reaches an extreme on every beat.
 */

/** The pivot of the arm, in the icon's 14 by 13 viewBox. */
export const PIVOT = { x: 6.8, y: 9.2 }
/** How far the arm leans at rest and at the ends of a swing, degrees. */
export const LEAN = 26
/** Both engines start the transport this long after the press (seconds); the first beat lands then. */
export const START_DELAY = 0.1

/** The icon: the body's outline and base, and the arm as its own element, upright, pivoted at the base. */
export const METRONOME_ICON = `<svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path class="metronome-body" fill-rule="evenodd" clip-rule="evenodd" d="M8.2715 1.8769C7.62095 0.750117 5.99458 0.750118 5.34403 1.8769L0.692891 9.93291C0.0423411 11.0597 0.855527 12.4682 2.15663 12.4682H11.4589C12.76 12.4682 13.5732 11.0597 12.9226 9.93291L8.2715 1.8769ZM6.34265 2.45346C6.54937 2.09542 7.06616 2.09542 7.27288 2.45346L10.7521 8.47966H2.86342L6.34265 2.45346ZM11.4179 9.63277H2.19767L1.69152 10.5095C1.4848 10.8675 1.74319 11.3151 2.15663 11.3151H11.4589C11.8723 11.3151 12.1307 10.8675 11.924 10.5095L11.4179 9.63277Z" fill="white" fill-opacity="0.9"/>
    <rect class="metronome-arm" x="6.25" y="2.4" width="1.1" height="6.8" rx="0.55" fill="white" fill-opacity="0.9" style="transform-origin: ${PIVOT.x}px ${PIVOT.y}px"/>
</svg>`

/**
 * The swing for a tempo: one beat from one side to the other, alternating, so the arm reaches an
 * extreme on every beat. It waits START_DELAY after the press, at rest, and leaves its rest lean
 * exactly on the first beat: no jump at the start. (The stylesheet holds the arm at rest during
 * the delay with `animation-fill-mode: backwards`, and eases it back to rest when the class goes.)
 * @returns {{ duration: number, delay: number }} seconds
 */
export function metronomeSwing (bpm, startDelay = START_DELAY) {
    const beat = 60 / Number(bpm)
    return { duration: beat, delay: startDelay }
}

/** Sets the arm swinging at `bpm` while `playing`, or leaves it leaning at rest. */
export function applyMetronome (arm, { bpm, playing, startDelay = START_DELAY }) {
    if (!arm) return
    const { duration, delay } = metronomeSwing(bpm, startDelay)
    arm.style.setProperty('--beat', `${duration.toFixed(4)}s`)
    arm.style.setProperty('--beat-delay', `${delay.toFixed(4)}s`)
    arm.classList.toggle('is-playing', playing === true)
}
