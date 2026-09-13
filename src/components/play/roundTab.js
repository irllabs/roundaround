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
/** Tracked capitals: the tracking, the room at each end of the pill, and a width guess for when the text has not been measured. */
const LETTER_SPACING = 0.12
const PADDING = 4
const CHAR_WIDTH = 0.7
/** Capitals sit on the baseline and reach about this far up, so the baseline goes this far below the pill's centreline. */
const CAP_CENTRE = 0.36

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
 * @param {number} [o.textWidth] the text's measured width at `fontSize` (see tabFont), which sizes the pill exactly; guessed when absent
 * @param {number} [o.offsetDeg] how far the round's first step is turned from the top, in degrees
 */
export function tabGeometry({ cx, cy, ringRadius, bandWidth, gap, text, textWidth, offsetDeg = 0 }) {
    if (!text) return null
    const font = tabFont(gap)
    if (!font) return null
    const { height, fontSize } = font
    const spacingPx = fontSize * LETTER_SPACING
    // the pill's inner edge rests on the band's outer edge, a hair off it
    const radius = ringRadius + bandWidth / 2 + REST + height / 2
    // the browser draws tracking after every glyph, the last one included, so a measured width carries one spacing too many
    const glyphs = (textWidth ?? text.length * fontSize * (CHAR_WIDTH + LETTER_SPACING)) - spacingPx
    const width = glyphs + PADDING * 2
    const span = (width / radius) * (180 / Math.PI)
    const centre = -90 + offsetDeg
    const startAngle = centre - span / 2
    const endAngle = centre + span / 2
    // a stroked arc with round caps reaches half its height past each end, so the pill's own arc is shorter
    const capDeg = (height / 2 / radius) * (180 / Math.PI)
    // the text's baseline runs below the centreline, so the capitals end up centred in the pill
    const textRadius = radius - fontSize * CAP_CENTRE
    const textLength = textRadius * (span * Math.PI / 180)
    return {
        text,
        height,
        fontSize,
        letterSpacing: `${LETTER_SPACING}em`,
        radius,
        startAngle,
        endAngle,
        pillPath: arcPath(cx, cy, radius, startAngle + capDeg, endAngle - capDeg),
        textPath: arcPath(cx, cy, textRadius, startAngle, endAngle),
        // where the middle of the text goes on its path: the path's middle, plus half the trailing spacing
        textOffset: round1(textLength / 2 + spacingPx / 2),
    }
}

/** The pill's height and face for a gap, or null when the gap cannot hold a tab. Measure the text at this size first. */
export function tabFont(gap) {
    const height = Math.min(HEIGHT, gap - REST - CLEARANCE)
    if (height < MIN_HEIGHT) return null
    return { height, fontSize: round1(height * 0.7), letterSpacing: `${LETTER_SPACING}em` }
}
