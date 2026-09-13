import { vi, describe, it, expect } from 'vitest'
import { getDefaultLayerData } from './defaultData'

vi.mock('tone', () => ({}))
vi.mock('../audio-engine/Instruments', () => ({
    default: {
        classes: vi.fn().mockResolvedValue({ Kicks: { sampleKeys: ['a'] } }),
        getRandomArticulation: vi.fn().mockResolvedValue('a')
    }
}))

describe('getDefaultLayerData', () => {
    it('starts a new layer at -6 dB, with sixteen steps off', async () => {
        // three layers at 0 dB with full-scale samples summed to 2.5x full scale on one step
        const layer = await getDefaultLayerData('user')
        expect(layer.gain).toBe(-6)
        expect(layer.isMuted).toBe(false)
        expect(layer.steps).toHaveLength(16)
        expect(layer.steps.every(step => !step.isOn)).toBe(true)
        expect(layer.steps.map(step => step.order)).toEqual(Array.from({ length: 16 }, (u, i) => i))
    })
})
