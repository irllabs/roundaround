import { describe, it, expect, vi } from 'vitest'
import { createSampleLibrary, filesFor, fileForVelocity, MANIFESTS } from './samples'

const manifests = {
    Kicks: { folder: 'Kicks', articulations: { punch: { samples: [{ sample: 'samples/k_b.wav', lovel: 0, hivel: 64 }, { sample: 'samples/k_a.wav', lovel: 65, hivel: 127 }] } } }
}

function fakes () {
    const fetchImpl = vi.fn(async (url) => ({ ok: !url.includes('missing'), status: url.includes('missing') ? 404 : 200, arrayBuffer: async () => url }))
    const decode = vi.fn(async (ctx, bytes) => ({ decodedFrom: bytes, duration: 0.5 }))
    const customSample = vi.fn(async (id) => id === 'c1' ? { id, localURL: 'blob:c1' } : null)
    return { fetchImpl, decode, customSample }
}

describe('filesFor and fileForVelocity', () => {
    it('resolves an articulation to its files under /samples with their velocity ranges', () => {
        expect(filesFor('Kicks', 'punch', manifests)).toEqual([
            { url: '/samples/Kicks/samples/k_b.wav', lovel: 0, hivel: 64 },
            { url: '/samples/Kicks/samples/k_a.wav', lovel: 65, hivel: 127 }
        ])
        expect(() => filesFor('Theremin', 'x', manifests)).toThrow(/Unknown instrument/)
        expect(() => filesFor('Kicks', 'x', manifests)).toThrow(/Unknown articulation/)
    })

    it('picks the quiet file below MIDI 65 and the loud one from 65 up, as the old sampler did', () => {
        const files = filesFor('Kicks', 'punch', manifests)
        expect(fileForVelocity(files, 0.5).url).toMatch(/k_b/) // 64
        expect(fileForVelocity(files, 0.52).url).toMatch(/k_a/) // 66
        expect(fileForVelocity(files, 1).url).toMatch(/k_a/)
        expect(fileForVelocity(files, 0).url).toMatch(/k_b/)
    })

    it('knows the four shipped instruments', () => {
        expect(Object.keys(MANIFESTS)).toEqual(['HiHats', 'Kicks', 'Snares', 'Perc'])
        for (const name of Object.keys(MANIFESTS)) {
            const first = Object.keys(MANIFESTS[name].articulations)[0]
            expect(filesFor(name, first)).toHaveLength(2)
        }
    })
})

describe('createSampleLibrary', () => {
    it('fetches and decodes each file once and hands back a set that picks by velocity', async () => {
        const { fetchImpl, decode, customSample } = fakes()
        const library = createSampleLibrary({ context: {}, fetchImpl, decode, customSample, manifests })
        const set = await library.load('Kicks', 'punch')
        expect(fetchImpl).toHaveBeenCalledTimes(2)
        expect(decode).toHaveBeenCalledTimes(2)
        expect(set.bufferFor(1).decodedFrom).toBe('/samples/Kicks/samples/k_a.wav')
        expect(set.bufferFor(0.2).decodedFrom).toBe('/samples/Kicks/samples/k_b.wav')
        // a second layer on the same articulation shares the work
        const again = await library.load('Kicks', 'punch')
        expect(again).toBe(set)
        expect(fetchImpl).toHaveBeenCalledTimes(2)
        expect(library.size()).toBe(2)
    })

    it('loads a custom sample from its stored URL', async () => {
        const { fetchImpl, decode, customSample } = fakes()
        const library = createSampleLibrary({ context: {}, fetchImpl, decode, customSample, manifests })
        const set = await library.load('custom', 'c1')
        expect(set.files).toHaveLength(1)
        expect(set.bufferFor(0.1).decodedFrom).toBe('blob:c1')
        await expect(library.load('custom', 'nope')).rejects.toThrow(/not found/)
    })

    it('forgets a failed load so it can be retried', async () => {
        const { fetchImpl, decode, customSample } = fakes()
        const bad = { Kicks: { folder: 'Kicks', articulations: { punch: { samples: [{ sample: 'samples/missing.wav', lovel: 0, hivel: 127 }] } } } }
        const library = createSampleLibrary({ context: {}, fetchImpl, decode, customSample, manifests: bad })
        await expect(library.load('Kicks', 'punch')).rejects.toThrow(/404/)
        expect(library.has('Kicks', 'punch')).toBe(false)
        await expect(library.prefetch('Kicks', 'punch')).resolves.toBeUndefined()
    })
})
