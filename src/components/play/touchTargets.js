/**
 * How big a step is to a finger, and to the eye, once the round has been zoomed to fit the screen.
 *
 * The round is drawn at the design's size and scaled down to fit the window, so on an iPad a
 * step's dot ends up 9 to 16 screen points across (Apple asks for 44). Two things follow:
 *
 *  - The dot is drawn larger than the design's 48px, as large as DOT.diameter, and made smaller
 *    only where dots would come within DOT.clearance points of one another (a 32-step ring, a
 *    round with many rings).
 *  - What a finger hits is not the dot but an invisible ellipse laid along the ring: as long
 *    along the arc and as tall across it as a 44-point target, cut back so that neighbouring
 *    hit areas, on the same ring and on the rings either side, stay HIG.clearance points apart.
 *    A mouse gets no such slack: it hits what it sees (POINTER).
 *
 * The clearance is where the nearer hit area wins rather than a dead zone: measured with synthetic
 * touches, Chrome sends a touch to a target up to 10 points past its edge and WebKit up to 8, so a
 * tap in the gutter between two rings lands on the nearer ring. What the ellipse guarantees is
 * the area a tap always reaches.
 *
 * Everything is in the round's own units; `zoom` (screen points per unit) converts.
 */

/** Apple's Human Interface Guidelines: targets of 44 x 44 points, kept apart. In screen points. */
export const HIG = Object.freeze({ target: 44, clearance: 8 })
/** A fine pointer hits the dot and nothing more. */
export const POINTER = Object.freeze({ target: 0, clearance: 0 })
/** The visible dot, in the round's units, and the least gap between two dots, in screen points. */
export const DOT = Object.freeze({ diameter: 72, clearance: 8, min: 24 })
/** How far off the dot's edge a finger can be and still count as holding the dot, in screen points. */
export const DOT_SLACK = 4

/** Screen points at this zoom, in the round's units. */
const units = (points, zoom) => points / zoom

/**
 * The zoom that fits a round whose furthest extent is `outer` units from the centre into a
 * window, keeping `chrome` screen points free for the header and the bottom bar and a margin at
 * the sides; never more than 1, the design's own size.
 */
export function fitZoom({ width, height, outer, chrome = 150, sideMargin = 40 }) {
    return Math.min(1, (height - chrome) / (outer * 2), (width - sideMargin) / (outer * 2))
}

/**
 * The dot's diameter for a ring whose steps are `arcSpacing` units apart along the ring and
 * whose nearest ring is `ringPitch` units away: the design's dot, unless that would bring dots
 * closer than DOT.clearance screen points.
 */
export function dotDiameter({ zoom, arcSpacing, ringPitch = Infinity, dot = DOT }) {
    const room = Math.min(arcSpacing, ringPitch) - units(dot.clearance, zoom)
    return Math.max(dot.min, Math.min(dot.diameter, room))
}

/**
 * The hit ellipse of a step: `along` the ring and `across` it, in units. Each is the policy's
 * target, cut back to keep `clearance` from the neighbouring hit area (the next step along, the
 * next ring across), and never smaller than the dot itself.
 */
export function hitSize({ zoom, arcSpacing, ringPitch = Infinity, dot, policy = HIG }) {
    const wanted = units(policy.target, zoom)
    const gap = units(policy.clearance, zoom)
    return {
        along: Math.max(dot, Math.min(wanted, arcSpacing - gap)),
        across: Math.max(dot, Math.min(wanted, ringPitch - gap))
    }
}

/**
 * Whether a point, in the round's units, is inside a step's hit ellipse. `hit` is the ellipse:
 * its centre, `along` and `across`, and `angle`, the step's angle from the round's centre in
 * radians (the ellipse's short axis points that way).
 */
export function inHit(point, hit) {
    const dx = point.x - hit.cx, dy = point.y - hit.cy
    const cos = Math.cos(hit.angle), sin = Math.sin(hit.angle)
    const radial = dx * cos + dy * sin
    const tangential = -dx * sin + dy * cos
    return (tangential / (hit.along / 2)) ** 2 + (radial / (hit.across / 2)) ** 2 <= 1
}

/** Whether a point, in units, is on the dot itself (plus DOT_SLACK screen points) rather than on the rest of the hit area. */
export function onDot(point, hit, zoom) {
    return Math.hypot(point.x - hit.cx, point.y - hit.cy) <= hit.dot / 2 + units(DOT_SLACK, zoom)
}

/** The hit policy for this device: fingers get the HIG target, a mouse hits the dot. */
export function hitPolicy(win = typeof window === 'undefined' ? null : window) {
    const coarse = win && win.matchMedia && win.matchMedia('(any-pointer: coarse)').matches
    return coarse ? HIG : POINTER
}
