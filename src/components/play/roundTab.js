/**
 * The instrument tab on a round: a bump of the band itself, growing out of its outer edge at the
 * top over the first step, with shoulders that flare into the band, straight sides, a fully arched
 * top, filled the way the band is filled, and the instrument's name along its arc. Pure geometry,
 * so PlayUI only has to draw what comes back and the tests can check it without SVG.js.
 *
 * Every measure is in the round's own pixels (the same the steps are drawn in): `ringRadius` is
 * the band's centreline, `bandWidth` the band's stroke, `gap` the room between this band's outer
 * edge and the next band's inner edge. Angles are degrees, clockwise, zero at three o'clock, so
 * the top is -90.
 */

/** Names longer than this are cut, so the tab never runs past its round's neighbours. */
export const TAB_MAX_CHARS = 8
/** Room the tab leaves to the next band, in pixels; it sits flush on its own band. */
const CLEARANCE = 3
/** Height of the tab at full size, its height as a share of the band it stands on (a collaborator's smaller band gets a smaller tab), and the smallest tab still worth drawing. */
const HEIGHT = 28
const HEIGHT_OF_BAND = 0.55
/** The top is a full arch (its corners' radius is half the tab's height); the base flares this far into the band on each side, so the tab grows out of the band the way a browser tab does. */
const SHOULDER = 6
/** The face as a share of the tab's height: the capitals take about 0.4 of the height, leaving 0.3 of air above and below. */
const FONT_OF_HEIGHT = 0.55
const MIN_HEIGHT = 8
/** Tracked capitals: the tracking, the room at each end of the tab, and a width guess for when the text has not been measured. */
const LETTER_SPACING = 0.12
const PADDING = 14
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
    const font = tabFont(gap, bandWidth)
    if (!font) return null
    const { height, fontSize } = font
    const spacingPx = fontSize * LETTER_SPACING
    // the tab grows out of the band: its bottom is the band's outer edge, its top a parallel arc
    const inner = ringRadius + bandWidth / 2
    const outer = inner + height
    const radius = (inner + outer) / 2
    // the browser draws tracking after every glyph, the last one included, so a measured width carries one spacing too many
    const glyphs = (textWidth ?? text.length * fontSize * (CHAR_WIDTH + LETTER_SPACING)) - spacingPx
    const width = glyphs + PADDING * 2
    const span = (width / radius) * (180 / Math.PI)
    const centre = -90 + offsetDeg
    const startAngle = centre - span / 2
    const endAngle = centre + span / 2
    // the text's baseline runs below the tab's centreline, so the capitals end up centred in it
    const textRadius = radius - fontSize * CAP_CENTRE
    const textLength = textRadius * (span * Math.PI / 180)
    // a full arch on top; a small tab keeps its shoulders in proportion
    const corner = Math.min(height / 2, width / 4)
    const shoulder = Math.min(SHOULDER, height / 4)
    return {
        text,
        height,
        fontSize,
        letterSpacing: `${LETTER_SPACING}em`,
        radius,
        startAngle,
        endAngle,
        corner,
        shoulder,
        labelPath: tagPath(cx, cy, inner, outer, startAngle, endAngle, corner, shoulder),
        textPath: arcPath(cx, cy, textRadius, startAngle, endAngle),
        // where the middle of the text goes on its path: the path's middle, plus half the trailing spacing
        textOffset: round1(textLength / 2 + spacingPx / 2),
    }
}

/**
 * A tag growing out of a ring: its base is the ring's outer edge (an arc of radius `inner`),
 * flaring `shoulder` pixels into the ring on each side with a concave fillet; straight radial
 * sides; a top that follows the ring at `outer` with corners of radius `corner` (half the height
 * makes a full arch).
 */
function tagPath(cx, cy, inner, outer, a0, a1, corner, shoulder) {
    const cornerDeg = (corner / outer) * (180 / Math.PI)
    const shoulderDeg = (shoulder / inner) * (180 / Math.PI)
    const sweep = a1 - a0 > 180 ? 1 : 0
    const P = (r, deg) => point(cx, cy, r, deg).join(' ')
    return [
        `M${P(inner, a0 - shoulderDeg)}`,
        `Q${P(inner, a0)} ${P(inner + shoulder, a0)}`,
        `L${P(outer - corner, a0)}`,
        `Q${P(outer, a0)} ${P(outer, a0 + cornerDeg)}`,
        `A${outer} ${outer} 0 ${sweep} 1 ${P(outer, a1 - cornerDeg)}`,
        `Q${P(outer, a1)} ${P(outer - corner, a1)}`,
        `L${P(inner + shoulder, a1)}`,
        `Q${P(inner, a1)} ${P(inner, a1 + shoulderDeg)}`,
        `A${inner} ${inner} 0 ${sweep} 0 ${P(inner, a0 - shoulderDeg)}`,
        'Z',
    ].join(' ')
}

/** The tab's height and face for a gap and a band, or null when the gap cannot hold a tab. Measure the text at this size first. */
export function tabFont(gap, bandWidth = Infinity) {
    const height = Math.min(HEIGHT, gap - CLEARANCE, bandWidth * HEIGHT_OF_BAND)
    if (height < MIN_HEIGHT) return null
    return { height, fontSize: round1(height * FONT_OF_HEIGHT), letterSpacing: `${LETTER_SPACING}em` }
}
