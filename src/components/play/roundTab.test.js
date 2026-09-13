import { describe, it, expect } from 'vitest'
import { tabFont, tabGeometry, tabLabel, TAB_MAX_CHARS } from './roundTab'

// A round of this user's, at the app's numbers from the Figma: a 52px band, 48px steps, 76px between bands.
const own = { cx: 500, cy: 500, ringRadius: 512, bandWidth: 52, gap: 76 }
// A collaborator's round: half size, a 26px band, 23px between bands: room for a small tab.
const theirs = { cx: 500, cy: 500, ringRadius: 896, bandWidth: 26, gap: 23 }
// A round with no room at all outside it.
const cramped = { cx: 500, cy: 500, ringRadius: 320, bandWidth: 16, gap: 5.3 }

describe('tabLabel', () => {
    it('shows the instrument in capitals', () => {
        expect(tabLabel('Hi-hat')).toBe('HI-HAT')
        expect(tabLabel('Kick')).toBe('KICK')
    })

    it('cuts a long custom sample name with an ellipsis so the tab stays short', () => {
        expect(tabLabel('Tambourine hit')).toBe('TAMBOURI…')
        expect(tabLabel('Tambourine hit').length).toBe(TAB_MAX_CHARS + 1)
    })

    it('has nothing to say for a missing name', () => {
        expect(tabLabel(undefined)).toBe('')
        expect(tabLabel('  ')).toBe('')
    })
})

describe('tabGeometry', () => {
    it('centres the tab on the top of the round, over the first step', () => {
        const tab = tabGeometry({ ...own, text: 'SNARE' })
        expect((tab.startAngle + tab.endAngle) / 2).toBeCloseTo(-90, 1)
        expect(tab.startAngle).toBeLessThan(-90)
        expect(tab.endAngle).toBeGreaterThan(-90)
    })

    it('stands flat on the band\'s outer edge and stays clear of the next band', () => {
        const tab = tabGeometry({ ...own, text: 'HI-HAT' })
        const bandOuterEdge = own.ringRadius + own.bandWidth / 2
        const nextBandInnerEdge = bandOuterEdge + own.gap
        expect(tab.radius - tab.height / 2).toBeCloseTo(bandOuterEdge, 5)
        expect(tab.radius + tab.height / 2).toBeLessThanOrEqual(nextBandInnerEdge - 2)
        // the shape starts and ends on the band's edge and closes: it grows out of the band, not a pill
        expect(tab.labelPath.startsWith('M')).toBe(true)
        expect(tab.labelPath.endsWith('Z')).toBe(true)
        expect(tab.labelPath.match(/A[\d.]+ [\d.]+ 0 [01] 0 /)).not.toBeNull() // the bottom arc runs back along the band
    })

    it('arches its top and flares into the band: corners of half its height, 6px shoulders, in proportion on a small tab', () => {
        const tab = tabGeometry({ ...own, text: 'KICK' })
        expect(tab.corner).toBeCloseTo(tab.height / 2, 5)
        expect(tab.shoulder).toBe(6)
        // two shoulder fillets and two corners
        expect(tab.labelPath.match(/Q/g)).toHaveLength(4)
        // the base starts on the band's edge a shoulder before the side: further from the top than the side's foot
        const [mx, my] = tab.labelPath.match(/^M([\d.-]+) ([\d.-]+)/).slice(1).map(Number)
        const bandOuterEdge = own.ringRadius + own.bandWidth / 2
        expect(Math.hypot(mx - own.cx, my - own.cy)).toBeCloseTo(bandOuterEdge, 0)
        expect(mx).toBeLessThan(own.cx + bandOuterEdge * Math.sin(tab.startAngle * Math.PI / 180 + Math.PI / 2))
        const small = tabGeometry({ ...theirs, text: 'KICK' })
        expect(small.shoulder).toBeCloseTo(small.height / 4, 5)
        expect(small.corner).toBeCloseTo(small.height / 2, 5)
    })

    it('turns with the round when its first step is offset', () => {
        const straight = tabGeometry({ ...own, text: 'KICK' })
        const turned = tabGeometry({ ...own, text: 'KICK', offsetDeg: 11.25 })
        expect((turned.startAngle + turned.endAngle) / 2).toBeCloseTo(-90 + 11.25, 1)
        expect(turned.endAngle - turned.startAngle).toBeCloseTo(straight.endAngle - straight.startAngle, 1)
    })

    it('is wider for a longer name and its text sits inside the pill', () => {
        const short = tabGeometry({ ...own, text: 'KICK' })
        const long = tabGeometry({ ...own, text: 'TAMBOURI…' })
        expect(long.endAngle - long.startAngle).toBeGreaterThan(short.endAngle - short.startAngle)
        expect(long.labelPath.length).toBeGreaterThan(long.textPath.length)
    })

    it('sizes the tab to the measured text plus 14px at each end, dropping the trailing tracking', () => {
        const { fontSize } = tabFont(own.gap)
        const measured = 40 // what the browser says 'KICK' takes at that size, tracking after every glyph included
        const tab = tabGeometry({ ...own, text: 'KICK', textWidth: measured })
        const tabWidth = tab.radius * ((tab.endAngle - tab.startAngle) * Math.PI / 180)
        expect(tabWidth).toBeCloseTo(measured - fontSize * 0.12 + 28, 1)
    })

    it('makes room for the instrument\'s icon before the name, upright at the start, and centres the name in what is left', () => {
        const plain = tabGeometry({ ...own, text: 'KICK', textWidth: 40 })
        const tab = tabGeometry({ ...own, text: 'KICK', textWidth: 40, hasIcon: true })
        const widthOf = (t) => t.radius * ((t.endAngle - t.startAngle) * Math.PI / 180)
        // a 16px icon and a 6px gap at full size
        expect(widthOf(tab) - widthOf(plain)).toBeCloseTo(22, 1)
        expect(tab.icon.size).toBe(16)
        // the icon's centre is on the tab's centreline, 14 + 8 px in from the start
        expect(Math.hypot(tab.icon.x - own.cx, tab.icon.y - own.cy)).toBeCloseTo(tab.radius, 0)
        const iconAngle = Math.atan2(tab.icon.y - own.cy, tab.icon.x - own.cx) * 180 / Math.PI
        expect(iconAngle - tab.startAngle).toBeCloseTo((22 / tab.radius) * 180 / Math.PI, 2)
        // upright: rotated by its angle from the top, so at twelve o'clock it stands straight
        expect(tab.icon.rotate).toBeCloseTo(iconAngle + 90, 1)
        // the name's middle moves along by the icon's room
        expect(tab.textOffset - plain.textOffset).toBeCloseTo(22 * (tab.radius - tab.fontSize * 0.36) / tab.radius, 0)
        expect(plain.icon).toBeNull()
    })

    it('sets the text on a baseline below the tab\'s centreline, so the capitals sit centred, with the middle of the text at the middle of its path', () => {
        const tab = tabGeometry({ ...own, text: 'SNARE', textWidth: 48 })
        const textRadius = Number(tab.textPath.match(/A([\d.]+) /)[1])
        expect(textRadius).toBeLessThan(tab.radius)
        expect(tab.radius - textRadius).toBeCloseTo(tab.fontSize * 0.36, 1)
        const textLength = textRadius * ((tab.endAngle - tab.startAngle) * Math.PI / 180)
        expect(tab.textOffset).toBeCloseTo(textLength / 2 + tab.fontSize * 0.12 / 2, 0)
    })

    it('leaves air above and below the capitals: the face is 0.55 of the tab, so the cap height is about 0.4 of it', () => {
        const { height, fontSize } = tabFont(own.gap, own.bandWidth)
        expect(height).toBe(28)
        expect(fontSize).toBeCloseTo(15.4, 1)
        const capHeight = fontSize * 0.727
        expect((height - capHeight) / 2).toBeGreaterThan(8)
    })

    it('gives a collaborator\'s smaller band a smaller tab, and draws none where there is no room', () => {
        const small = tabGeometry({ ...theirs, text: 'KICK' })
        const mine = tabGeometry({ ...own, text: 'KICK' })
        expect(small.height).toBeLessThan(mine.height)
        expect(small.height).toBeCloseTo(theirs.bandWidth * 0.55, 5)
        expect(tabGeometry({ ...cramped, text: 'KICK' })).toBeNull()
    })

    it('draws no tab for an empty name', () => {
        expect(tabGeometry({ ...own, text: '' })).toBeNull()
    })
})
