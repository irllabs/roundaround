/**
 * The playhead's flash on a step: the outline goes white the moment the step sounds, then eases
 * back to the round's colour.
 *
 * The ease is animated on the attributes themselves. svg.js 3.2 does not animate
 * `stroke({ color, opacity })`: with an opacity key in the object the runner completes but the
 * outline stays white (that is what painted every step white after the dependency bump, #318).
 * `attr({ stroke, 'stroke-opacity' })` eases both.
 *
 * @param {import('@svgdotjs/svg.js').Shape} stepGraphic the step's outline circle
 * @param {string} color the colour to come back to (the round's owner's, or white for a muted round)
 * @param {number} opacity the outline's opacity (a muted round's steps sit at 0.1)
 * @returns the runner, so a caller can wait for it or finish it
 */
export function flashStep(stepGraphic, color, opacity) {
    stepGraphic.stroke({ color: '#FFFFFF', opacity })
    return stepGraphic.animate().attr({ stroke: color, 'stroke-opacity': opacity })
}
