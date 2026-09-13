import { describe, it, expect } from 'vitest'
import { instrumentIcon, ICON_BOX } from './instrumentIcons'

describe('instrumentIcon', () => {
    it('has an icon for each of the four instruments, as paths to draw in the round\'s colour', () => {
        for (const sampler of ['Kicks', 'Snares', 'HiHats', 'Perc']) {
            const paths = instrumentIcon(sampler)
            expect(paths.length).toBeGreaterThan(0)
            for (const p of paths) {
                expect(p.d).toMatch(/^M/)
                expect(typeof p.evenOdd).toBe('boolean')
            }
        }
        expect(ICON_BOX).toBe(16)
    })

    it('keeps the kick\'s even-odd fill, which cuts the drum\'s hole out of its body', () => {
        expect(instrumentIcon('Kicks').some((p) => p.evenOdd)).toBe(true)
    })

    it('has nothing for an instrument it does not know', () => {
        expect(instrumentIcon('Theremin')).toBeNull()
        expect(instrumentIcon(undefined)).toBeNull()
    })
})
