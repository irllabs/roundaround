/**
 * The playhead: a hand like a clock's, laid across every ring from the innermost's inner edge to
 * the outermost's outer edge, turning once a bar with the transport. It turns smoothly, frame by
 * frame from the engine's position, not step by step: a layer that is offset in time has its ring
 * turned by that offset when it is drawn, so one straight hand reads the same moment on every ring.
 */

/** The hand: a translucent band with a bright core, in the round's pixels. */
export const PLAYHEAD = Object.freeze({
    width: 24,
    opacity: 0.3,
    core: 4,
    coreOpacity: 0.9
})

/**
 * How far the hand has turned, degrees clockwise from the first step at the top, for a transport
 * position in bars (fractional; negative before the start, which reads as the top).
 */
export function playheadAngle (bars) {
    if (!Number.isFinite(bars) || bars <= 0) {
        return 0
    }
    return (bars - Math.floor(bars)) * 360
}

/**
 * The radii the hand spans: from the inner edge of the innermost ring to the outer edge of the
 * outermost. `rings` are `{ radius, edge }`, the ring's centreline and how far it reaches either
 * side of it. No rings, no hand.
 * @returns {{ inner: number, outer: number } | null}
 */
export function playheadSpan (rings) {
    if (!Array.isArray(rings) || rings.length === 0) {
        return null
    }
    let inner = Infinity
    let outer = -Infinity
    for (const ring of rings) {
        inner = Math.min(inner, ring.radius - ring.edge)
        outer = Math.max(outer, ring.radius + ring.edge)
    }
    return { inner, outer }
}

/** The SVG transform that turns the hand `degrees` about the round's centre. */
export function playheadTransform (degrees, cx, cy) {
    return `rotate(${degrees.toFixed(3)} ${cx} ${cy})`
}
