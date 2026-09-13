/**
 * The instrument tab on a round: a curved pill that rests on the band's outer edge, centred at
 * the top over the first step, and holds the instrument's name along its own arc. Pure geometry,
 * so PlayUI only has to draw what comes back and the tests can check it without SVG.js.
 *
 * Every measure is in the round's own pixels (the same the steps are drawn in): `ringRadius` is
 * the band's centreline, `bandWidth` the band's stroke, `gap` the room between this band's outer
 * edge and the next band's inner edge. Angles are degrees, clockwise, zero at three o'clock, so
 * the top is -90.
 */

/** Names longer than this are cut, so the tab never runs past its round's neighbours. */
export const TAB_MAX_CHARS = 8
/** Room the tab leaves to the band it rests on, and to the next band, in pixels. */
const REST = 1
const CLEARANCE = 3
/** Height of the pill at full size, and the smallest pill still worth drawing. */
const HEIGHT = 12
const MIN_HEIGHT = 8
/** Tracked capitals: how wide one character is, as a share of the font size, plus the padding at each end. */
const CHAR_WIDTH = 0.86
const LETTER_SPACING = 0.14
const PADDING = 6

const rad = (deg) => (deg * Math.PI) / 180
const round1 = (x) => Math.round(x * 10) / 10
const point = (cx, cy, r, deg) => [round1(cx + r * Math.cos(rad(deg))), round1(cy + r * Math.sin(rad(deg)))]
const arcPath = (cx, cy, r, a0, a1) => {
    const [x0, y0] = point(cx, cy, r, a0)
    const [x1, y1] = point(cx, cy, r, a1)
    return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`
}

/** The text a tab shows for an instrument: capitals, cut with an ellipsis past TAB_MAX_CHARS. */
export function tabLabel(name) {
    const text = String(name ?? '').trim()
    if (text.length === 0) return ''
    const cut = text.length > TAB_MAX_CHARS ? text.slice(0, TAB_MAX_CHARS) + '…' : text
    return cut.toUpperCase()
}

/**
 * Where and how big the tab is, or null when the gap cannot hold one (a collaborator's round,
 * drawn at a third of the size, has about five pixels between bands: no tab).
 *
 * @param {object} o
 * @param {number} o.cx x of the round's centre
 * @param {number} o.cy y of the round's centre
 * @param {number} o.ringRadius radius of the band's centreline
 * @param {number} o.bandWidth the band's stroke width
 * @param {number} o.gap pixels between this band's outer edge and the next band's inner edge
 * @param {string} o.text what the tab says (see tabLabel)
 * @param {number} [o.offsetDeg] how far the round's first step is turned from the top, in degrees
 */
export function tabGeometry({ cx, cy, ringRadius, bandWidth, gap, text, offsetDeg = 0 }) {
    if (!text) return null
    const height = Math.min(HEIGHT, gap - REST - CLEARANCE)
    if (height < MIN_HEIGHT) return null
    const fontSize = round1(height * 0.68)
    // the pill's inner edge rests on the band's outer edge, a hair off it
    const radius = ringRadius + bandWidth / 2 + REST + height / 2
    const width = text.length * fontSize * CHAR_WIDTH + text.length * fontSize * LETTER_SPACING + PADDING * 2
    const span = (width / radius) * (180 / Math.PI)
    const centre = -90 + offsetDeg
    const startAngle = centre - span / 2
    const endAngle = centre + span / 2
    // a stroked arc with round caps reaches half its height past each end, so the pill's own arc is shorter
    const capDeg = (height / 2 / radius) * (180 / Math.PI)
    return {
        text,
        height,
        fontSize,
        letterSpacing: `${LETTER_SPACING}em`,
        radius,
        startAngle,
        endAngle,
        pillPath: arcPath(cx, cy, radius, startAngle + capDeg, endAngle - capDeg),
        textPath: arcPath(cx, cy, radius, startAngle, endAngle),
    }
}
