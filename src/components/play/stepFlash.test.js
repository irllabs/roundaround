import { describe, it, expect, beforeEach } from 'vitest'
import { SVG } from '@svgdotjs/svg.js'
import { flashStep } from './stepFlash'

// A real svg.js circle in jsdom: the flash is checked at its start and at the end of its runner,
// which is where svg.js 3.2 left the outline white for the object form of stroke().
let draw
beforeEach(() => {
    document.body.innerHTML = '<div id="round"></div>'
    draw = SVG().addTo('#round').size(100, 100)
})

describe('flashStep', () => {
    it('turns the outline white at once and brings it back to the round\'s colour by the end of the ease', () => {
        const step = draw.circle(48).stroke({ color: '#9c27b0', opacity: 1, width: 4 })
        const runner = flashStep(step, '#9c27b0', 1)
        expect(step.attr('stroke').toLowerCase()).toBe('#ffffff')
        runner.finish()
        expect(step.attr('stroke').toLowerCase()).toBe('#9c27b0')
        expect(Number(step.attr('stroke-opacity'))).toBe(1)
    })

    it('keeps a muted round\'s faint outline faint, in white', () => {
        const step = draw.circle(48).stroke({ color: '#FFFFFF', opacity: 0.1, width: 4 })
        const runner = flashStep(step, '#FFFFFF', 0.1)
        runner.finish()
        expect(step.attr('stroke').toLowerCase()).toBe('#ffffff')
        expect(Number(step.attr('stroke-opacity'))).toBeCloseTo(0.1, 5)
    })

    it('is what the playhead relies on: the object form of stroke() does not ease back in this svg.js', () => {
        // documents the reason for flashStep; if svg.js fixes it this test says so and the helper can go
        const step = draw.circle(48).stroke({ color: '#9c27b0', opacity: 1, width: 4 })
        step.stroke({ color: '#FFFFFF', opacity: 1 })
        step.animate().stroke({ color: '#9c27b0', opacity: 1 }).finish()
        expect(step.attr('stroke').toLowerCase()).toBe('#ffffff')
    })
})
