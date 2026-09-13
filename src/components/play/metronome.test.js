import { describe, it, expect } from 'vitest'
import { METRONOME_ICON, PIVOT, START_DELAY, metronomeSwing, applyMetronome } from './metronome'

describe('metronomeSwing', () => {
    it('swings once per beat at the round\'s tempo', () => {
        expect(metronomeSwing(120).duration).toBeCloseTo(0.5, 6)
        expect(metronomeSwing(92).duration).toBeCloseTo(0.6522, 4)
    })

    it('waits at rest for the first beat, START_DELAY after the press, then leaves its rest lean on it', () => {
        const { delay } = metronomeSwing(120)
        expect(delay).toBeCloseTo(START_DELAY, 6)
        expect(delay).toBeGreaterThan(0)
    })
})

describe('applyMetronome', () => {
    it('sets the beat on the arm and marks it playing, then leaves it at rest when playback stops', () => {
        document.body.innerHTML = METRONOME_ICON
        const arm = document.querySelector('.metronome-arm')
        applyMetronome(arm, { bpm: 92, playing: true })
        expect(arm.style.getPropertyValue('--beat')).toBe('0.6522s')
        expect(arm.style.getPropertyValue('--beat-delay')).toBe('0.1000s')
        expect(arm.classList.contains('is-playing')).toBe(true)
        applyMetronome(arm, { bpm: 92, playing: false })
        expect(arm.classList.contains('is-playing')).toBe(false)
    })

    it('does nothing without an arm', () => {
        expect(() => applyMetronome(null, { bpm: 120, playing: true })).not.toThrow()
    })
})

describe('METRONOME_ICON', () => {
    it('draws the arm as its own element pivoted at the base of the body', () => {
        document.body.innerHTML = METRONOME_ICON
        const arm = document.querySelector('.metronome-arm')
        expect(arm).not.toBeNull()
        expect(arm.getAttribute('style')).toContain(`transform-origin: ${PIVOT.x}px ${PIVOT.y}px`)
        expect(document.querySelector('.metronome-body')).not.toBeNull()
        // the arm's foot sits on the pivot
        expect(Number(arm.getAttribute('y')) + Number(arm.getAttribute('height'))).toBeCloseTo(PIVOT.y, 1)
    })
})
