import { describe, it, expect } from 'vitest'
import { CENTRE_PANE, centrePaneLayout, onCircle } from './centrePane'

const cx = 1000, cy = 800

describe('centrePaneLayout', () => {
    it('puts the play button on the centre at the design\'s size', () => {
        const { play } = centrePaneLayout(cx, cy)
        expect(play.width).toBe(128)
        expect(play.x + play.width / 2).toBe(cx)
        expect(play.y + play.height / 2).toBe(cy)
    })

    it('stacks the pills on the vertical axis: Sequence above, the switch nearer, tempo below', () => {
        const l = centrePaneLayout(cx, cy)
        for (const pill of [l.sequenceButton, l.stopButton, l.switch, l.tempo]) {
            expect(pill.x + pill.width / 2).toBeCloseTo(cx, 5)
        }
        expect(l.sequenceButton.cy).toBe(cy - 253)
        expect(l.switch.cy).toBe(cy - 96)
        expect(l.tempo.cy).toBe(cy + 104)
        expect(l.sequenceButton.cy).toBeLessThan(l.switch.cy)
    })

    it('draws the switch as a bordered pill with the letter\'s disc on the left and the dots on the right', () => {
        const { switch: sw } = centrePaneLayout(cx, cy)
        expect([sw.width, sw.height]).toEqual([120, 64])
        expect(sw.disc.cx).toBe(sw.x + 32)
        expect(sw.dots.cx).toBe(sw.x + 64 + 8 + 24)
        expect(sw.disc.cy).toBe(sw.dots.cy)
        expect(sw.disc.diameter).toBe(48)
    })

    it('places the presets on the outer circle and the slots on the inner one, the first of each at the top', () => {
        const l = centrePaneLayout(cx, cy)
        const a = l.preset(0, 8), e = l.preset(4, 8)
        expect(a.x).toBeCloseTo(cx, 5)
        expect(a.y).toBeCloseTo(cy - 360, 5)
        expect(e.y).toBeCloseTo(cy + 360, 5)
        expect(a.diameter).toBe(144)
        const s0 = l.slot(0, 8)
        expect(s0.y).toBeCloseTo(cy - 180, 5)
        expect(s0.diameter).toBe(72)
        // the presets sit inside the first ring (centreline 512, band 52) and outside the slots
        expect(CENTRE_PANE.presets.radius + CENTRE_PANE.presets.diameter / 2).toBeLessThan(512 - 26)
        expect(CENTRE_PANE.slots.radius + CENTRE_PANE.slots.diameter / 2).toBeLessThan(CENTRE_PANE.presets.radius - CENTRE_PANE.presets.diameter / 2)
    })

    it('goes round clockwise from the top', () => {
        const right = onCircle(cx, cy, 100, 2, 8)
        expect(right.x).toBeCloseTo(cx + 100, 5)
        expect(right.y).toBeCloseTo(cy, 5)
    })
})
