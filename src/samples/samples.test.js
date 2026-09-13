import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readWav, writeWav, analyseWav, prepareWav } from './wav'

// The shipped samples, read with the same parser scripts/prepare-samples.mjs uses. A sample that
// starts late smears every hit it shares a step with; one that peaks off -3 dBFS is louder or
// quieter than its neighbours. Both used to be true of the library.
const root = join(__dirname, '..', '..', 'public', 'samples')
const files = readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .flatMap(d => readdirSync(join(root, d.name, 'samples')).filter(f => f.endsWith('.wav')).map(f => join(root, d.name, 'samples', f)))

describe('the shipped samples', () => {
    it('are the whole library, 16-bit PCM', () => {
        expect(files.length).toBe(128)
        for (const file of files) {
            const wav = readWav(readFileSync(file))
            expect(wav.channels).toBe(2)
            expect(wav.sampleRate).toBe(44100)
        }
    })

    it('start within 2 ms and peak at -3 dBFS, every one of them', () => {
        const late = []
        const offLevel = []
        for (const file of files) {
            const { onsetMs, peakDb } = analyseWav(readWav(readFileSync(file)))
            if (onsetMs > 2) late.push(`${file.split('/').slice(-3).join('/')} ${onsetMs.toFixed(1)} ms`)
            if (peakDb < -3.1 || peakDb > -2.9) offLevel.push(`${file.split('/').slice(-3).join('/')} ${peakDb.toFixed(2)} dB`)
        }
        expect(late).toEqual([])
        expect(offLevel).toEqual([])
    })
})

describe('prepareWav', () => {
    // a 100 ms stereo file: 30 ms of silence, then a hit peaking at half scale
    const rate = 44100
    const frames = Math.round(rate * 0.1)
    const samples = new Int16Array(frames * 2)
    const hitAt = Math.round(rate * 0.03)
    for (let f = hitAt; f < frames; f++) {
        const v = Math.round(16384 * Math.exp(-(f - hitAt) / (rate * 0.02)))
        samples[f * 2] = v
        samples[f * 2 + 1] = -v
    }
    const wav = { sampleRate: rate, channels: 2, samples }

    it('trims to one millisecond before the hit and sets the peak to -3 dBFS', () => {
        const before = analyseWav(wav)
        expect(before.onsetMs).toBeCloseTo(30, 0)
        expect(before.peakDb).toBeCloseTo(-6.02, 1)
        const after = analyseWav(prepareWav(wav))
        expect(after.onsetMs).toBeCloseTo(1, 0)
        expect(after.peakDb).toBeCloseTo(-3, 1)
        expect(after.frames).toBe(frames - hitAt + Math.ceil(rate / 1000))
    })

    it('survives a round trip through the writer', () => {
        const again = readWav(writeWav(prepareWav(wav)))
        expect(again.sampleRate).toBe(rate)
        expect(again.channels).toBe(2)
        expect(analyseWav(again).peakDb).toBeCloseTo(-3, 1)
    })
})
