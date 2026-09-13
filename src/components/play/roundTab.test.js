import { describe, it, expect } from 'vitest'
import { tabFont, tabGeometry, tabLabel, TAB_MAX_CHARS } from './roundTab'

// A round of this user's, at the app's own numbers: 48px band and steps, 16px between bands.
const own = { cx: 500, cy: 500, ringRadius: 256, bandWidth: 48, gap: 16 }
// A collaborator's round: everything a third of the size, so about five pixels between bands.
const theirs = { cx: 500, cy: 500, ringRadius: 320, bandWidth: 16, gap: 5.3 }

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
        // the shape starts and ends on the band's edge and closes: flat bottom, not a pill
        expect(tab.labelPath.startsWith('M')).toBe(true)
        expect(tab.labelPath.endsWith('Z')).toBe(true)
        expect(tab.labelPath.match(/A[\d.]+ [\d.]+ 0 [01] 0 /)).not.toBeNull() // the bottom arc runs back along the band
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

    it('sizes the tab to the measured text plus a small pad at each end, dropping the trailing tracking', () => {
        const { fontSize } = tabFont(own.gap)
        const measured = 40 // what the browser says 'KICK' takes at that size, tracking after every glyph included
        const tab = tabGeometry({ ...own, text: 'KICK', textWidth: measured })
        const tabWidth = tab.radius * ((tab.endAngle - tab.startAngle) * Math.PI / 180)
        expect(tabWidth).toBeCloseTo(measured - fontSize * 0.12 + 8, 1)
    })

    it('sets the text on a baseline below the tab\'s centreline, so the capitals sit centred, with the middle of the text at the middle of its path', () => {
        const tab = tabGeometry({ ...own, text: 'SNARE', textWidth: 48 })
        const textRadius = Number(tab.textPath.match(/A([\d.]+) /)[1])
        expect(textRadius).toBeLessThan(tab.radius)
        expect(tab.radius - textRadius).toBeCloseTo(tab.fontSize * 0.36, 1)
        const textLength = textRadius * ((tab.endAngle - tab.startAngle) * Math.PI / 180)
        expect(tab.textOffset).toBeCloseTo(textLength / 2 + tab.fontSize * 0.12 / 2, 0)
    })

    it('draws no tab where there is no room for one, as on a collaborator\'s round', () => {
        expect(tabGeometry({ ...theirs, text: 'KICK' })).toBeNull()
    })

    it('draws no tab for an empty name', () => {
        expect(tabGeometry({ ...own, text: '' })).toBeNull()
    })
})
