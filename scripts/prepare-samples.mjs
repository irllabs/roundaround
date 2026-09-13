#!/usr/bin/env node
/**
 * Aligns and levels the drum samples in public/samples, in place.
 *
 *     node scripts/prepare-samples.mjs          rewrite every wav
 *     node scripts/prepare-samples.mjs --check  only report, change nothing
 *
 * Each file is trimmed so the hit (the first frame at 5% of the peak) starts 1 ms in, and its
 * peak is set to -3 dBFS. Before this the perc set carried up to 40 ms of silence before the hit
 * and the hats up to 21 ms, while kicks and snares carried none, so hits on the same step
 * smeared by that much. Files stay 16-bit 44.1 kHz stereo (the browser resamples at decode);
 * the writer keeps only the fmt and data chunks. src/samples/samples.test.js guards the result.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readWav, writeWav, analyseWav, prepareWav } from '../src/samples/wav.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples')
const check = process.argv.includes('--check')

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const fmt = (x) => x.toFixed(1).padStart(5)
const row = (name, before, after) => {
    const cell = (rs) => `${fmt(Math.min(...rs.map(r => r.onsetMs)))} / ${fmt(median(rs.map(r => r.onsetMs)))} / ${fmt(Math.max(...rs.map(r => r.onsetMs)))} ms, peak ${fmt(Math.min(...rs.map(r => r.peakDb)))} to ${fmt(Math.max(...rs.map(r => r.peakDb)))} dB`
    return `${name.padEnd(8)} before ${cell(before)}${after ? `\n${''.padEnd(8)} after  ${cell(after)}` : ''}`
}

let changed = 0
for (const instrument of readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
    const dir = join(root, instrument, 'samples')
    const before = []
    const after = []
    for (const file of readdirSync(dir).filter(f => f.endsWith('.wav')).sort()) {
        const path = join(dir, file)
        const wav = readWav(readFileSync(path))
        before.push(analyseWav(wav))
        const prepared = prepareWav(wav)
        after.push(analyseWav(prepared))
        if (!check) {
            writeFileSync(path, writeWav(prepared))
            changed++
        }
    }
    console.log(row(instrument, before, after))
}
console.log(check ? 'checked, nothing written' : `${changed} files rewritten`)
