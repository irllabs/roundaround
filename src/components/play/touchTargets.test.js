import { describe, it, expect } from 'vitest'
import { HIG, POINTER, DOT, DOT_SLACK, fitZoom, dotDiameter, hitSize, inHit, onDot, hitPolicy } from './touchTargets'
import { HTML_UI_Params } from '../../utils/constants'

// An iPad 10.9" in Safari, landscape: 1180 x 716 points; the round's rings are 128px apart and
// 16 steps on the innermost ring (radius 512) are 201px apart along it. The outermost extent is
// the last ring's radius, half its 76px rail and a 40px margin.
const IPAD = { width: 1180, height: 716 }
const outerOf = (rings) => (1024 + (rings - 1) * 256) / 2 + 38 + 40
const arc16 = 2 * Math.PI * 512 / 16
const pitch = 128

describe('the rail', () => {
    it('is as wide as a dot with its stroke, as the Figma\'s 52px rail was for its 48px dots', () => {
        expect(HTML_UI_Params.layerStrokeMax).toBe(DOT.diameter + HTML_UI_Params.stepStrokeWidth)
    })
})

describe('fitZoom', () => {
    it('fits the round between the header and the bottom bar, near the values measured before the rail grew', () => {
        // measured on the iPad with the 52px rail: 3 rings at 0.339, 5 at 0.260, 8 at 0.192; the 76px rail costs 12px of radius
        expect(fitZoom({ ...IPAD, outer: outerOf(3) })).toBeCloseTo(0.3345, 3)
        expect(fitZoom({ ...IPAD, outer: outerOf(5) })).toBeCloseTo(0.2568, 3)
        expect(fitZoom({ ...IPAD, outer: outerOf(8) })).toBeCloseTo(0.1905, 3)
    })

    it('is bound by the width in portrait, and never enlarges the design', () => {
        expect(fitZoom({ width: 820, height: 1080, outer: outerOf(5) })).toBeCloseTo(780 / (2 * outerOf(5)), 6)
        expect(fitZoom({ width: 4000, height: 3000, outer: outerOf(1) })).toBe(1)
    })
})

describe('dotDiameter', () => {
    it('draws the design\'s dot wherever there is room', () => {
        expect(dotDiameter({ zoom: 0.339, arcSpacing: arc16, ringPitch: pitch })).toBe(DOT.diameter)
        expect(dotDiameter({ zoom: 0.192, arcSpacing: arc16, ringPitch: pitch })).toBe(DOT.diameter)
    })

    it('shrinks the dot only so that dots never come within 8 points of each other', () => {
        // 32 steps on the innermost ring of an 8-ring round: 100px apart along the ring, at 0.192 that is 19 points
        const zoom = 0.192, arcSpacing = arc16 / 2
        const dot = dotDiameter({ zoom, arcSpacing, ringPitch: pitch })
        expect(dot).toBeLessThan(DOT.diameter)
        expect((arcSpacing - dot) * zoom).toBeCloseTo(DOT.clearance, 6)
        // and never below the size it keeps legible
        expect(dotDiameter({ zoom: 0.05, arcSpacing: 30, ringPitch: pitch })).toBe(DOT.min)
    })

    it('treats a lone ring as having all the room in the world across it', () => {
        expect(dotDiameter({ zoom: 0.5, arcSpacing: arc16 })).toBe(DOT.diameter)
    })
})

describe('hitSize', () => {
    it('gives a finger a 44-point target along the ring and as much across it as the next ring allows', () => {
        // 3 rings at 0.339: 44 points along, 35 across (the rings are 43 points apart, 8 of which are kept clear)
        const zoom = 0.339
        const hit = hitSize({ zoom, arcSpacing: arc16, ringPitch: pitch, dot: DOT.diameter })
        expect(hit.along * zoom).toBeCloseTo(HIG.target, 6)
        expect((pitch - hit.across) * zoom).toBeCloseTo(HIG.clearance, 6)
        expect(hit.across * zoom).toBeCloseTo(35.4, 1)
    })

    it('keeps neighbouring hit areas 8 points apart along the ring too', () => {
        // 32 steps at 0.339: 100px apart, so the 44-point target does not fit and the area is cut back
        const zoom = 0.339, arcSpacing = arc16 / 2
        const hit = hitSize({ zoom, arcSpacing, ringPitch: pitch, dot: 60 })
        expect((arcSpacing - hit.along) * zoom).toBeCloseTo(HIG.clearance, 6)
        expect(hit.along * zoom).toBeLessThan(HIG.target)
    })

    it('is never smaller than the dot', () => {
        const hit = hitSize({ zoom: 1, arcSpacing: 80, ringPitch: 80, dot: DOT.diameter })
        expect(hit).toEqual({ along: DOT.diameter, across: DOT.diameter })
    })

    it('gives a mouse the dot and nothing more', () => {
        const hit = hitSize({ zoom: 0.339, arcSpacing: arc16, ringPitch: pitch, dot: DOT.diameter, policy: POINTER })
        expect(hit).toEqual({ along: DOT.diameter, across: DOT.diameter })
    })
})

describe('inHit and onDot', () => {
    // a step at the top of a ring (angle -90 degrees): its hit area is wide along the ring (x) and short across it (y)
    const top = { cx: 500, cy: 100, along: 130, across: 100, angle: -Math.PI / 2, dot: 72 }

    it('takes the ellipse along the ring, not a box around the dot', () => {
        expect(inHit({ x: 500 + 64, y: 100 }, top)).toBe(true)
        expect(inHit({ x: 500 + 66, y: 100 }, top)).toBe(false)
        expect(inHit({ x: 500, y: 100 + 49 }, top)).toBe(true)
        expect(inHit({ x: 500, y: 100 + 51 }, top)).toBe(false)
        // a corner of the bounding box is outside the ellipse
        expect(inHit({ x: 500 + 60, y: 100 + 45 }, top)).toBe(false)
    })

    it('follows the step round the ring', () => {
        const angle = Math.PI / 4
        const side = { ...top, cx: 500 + 400 * Math.cos(angle), cy: 100 + 400 * Math.sin(angle), angle }
        const along = { x: -Math.sin(angle), y: Math.cos(angle) }, across = { x: Math.cos(angle), y: Math.sin(angle) }
        expect(inHit({ x: side.cx + along.x * 64, y: side.cy + along.y * 64 }, side)).toBe(true)
        expect(inHit({ x: side.cx + across.x * 64, y: side.cy + across.y * 64 }, side)).toBe(false)
        expect(inHit({ x: side.cx + across.x * 49, y: side.cy + across.y * 49 }, side)).toBe(true)
    })

    it('counts a finger as on the dot up to 4 points past its edge', () => {
        const zoom = 0.5
        expect(onDot({ x: 500 + 36 + DOT_SLACK / zoom - 0.1, y: 100 }, top, zoom)).toBe(true)
        expect(onDot({ x: 500 + 36 + DOT_SLACK / zoom + 0.1, y: 100 }, top, zoom)).toBe(false)
    })
})

describe('hitPolicy', () => {
    const win = (coarse) => ({ matchMedia: (query) => ({ matches: query === '(any-pointer: coarse)' && coarse }) })

    it('gives fingers the HIG target and a mouse the dot', () => {
        expect(hitPolicy(win(true))).toBe(HIG)
        expect(hitPolicy(win(false))).toBe(POINTER)
        expect(hitPolicy(null)).toBe(POINTER)
    })
})
