/**
 * A reader and writer for the 16-bit PCM WAV files in public/samples, and the two measures the
 * sample pipeline cares about: where a hit starts and how loud it peaks. No dependencies, so the
 * build-time script and the test that guards its result share one parser.
 */

const decoder = new TextDecoder('latin1')

/** Parses a RIFF/WAVE buffer (an ArrayBuffer, or a Node Buffer) with PCM 16-bit samples. */
export function readWav (buffer) {
    const view = ArrayBuffer.isView(buffer)
        ? new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : new DataView(buffer)
    const tag = (at) => decoder.decode(new Uint8Array(view.buffer, view.byteOffset + at, 4))
    if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') {
        throw new Error('not a WAVE file')
    }
    let format = null
    let samples = null
    let at = 12
    while (at + 8 <= view.byteLength) {
        const id = tag(at)
        const size = view.getUint32(at + 4, true)
        const body = at + 8
        if (id === 'fmt ') {
            format = {
                formatTag: view.getUint16(body, true),
                channels: view.getUint16(body + 2, true),
                sampleRate: view.getUint32(body + 4, true),
                bitsPerSample: view.getUint16(body + 14, true)
            }
        } else if (id === 'data') {
            if (!format) throw new Error('data before fmt')
            if (format.formatTag !== 1 || format.bitsPerSample !== 16) {
                throw new Error(`only 16-bit PCM is handled, got format ${format.formatTag} at ${format.bitsPerSample} bits`)
            }
            const count = Math.floor(size / 2)
            samples = new Int16Array(count)
            for (let i = 0; i < count; i++) samples[i] = view.getInt16(body + i * 2, true)
        }
        at = body + size + (size & 1)
    }
    if (!format || !samples) throw new Error('missing fmt or data chunk')
    return { sampleRate: format.sampleRate, channels: format.channels, samples }
}

/** Serialises 16-bit PCM samples (interleaved) as a canonical WAV: fmt and data, nothing else. */
export function writeWav ({ sampleRate, channels, samples }) {
    const dataBytes = samples.length * 2
    const out = new ArrayBuffer(44 + dataBytes)
    const view = new DataView(out)
    const ascii = (at, text) => { for (let i = 0; i < 4; i++) view.setUint8(at + i, text.charCodeAt(i)) }
    ascii(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true); ascii(8, 'WAVE')
    ascii(12, 'fmt '); view.setUint32(16, 16, true)
    view.setUint16(20, 1, true); view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * channels * 2, true)
    view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true)
    ascii(36, 'data'); view.setUint32(40, dataBytes, true)
    for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, samples[i], true)
    return new Uint8Array(out)
}

/** The share of the peak a frame has to reach to count as the start of the hit. */
export const ONSET_SHARE = 0.05

/**
 * Peak (0 to 1, over every channel), the frame the hit starts on (the first frame at or above
 * ONSET_SHARE of the peak), and the same in milliseconds.
 */
export function analyseWav ({ sampleRate, channels, samples }) {
    const frames = Math.floor(samples.length / channels)
    let peak = 0
    for (let i = 0; i < samples.length; i++) {
        const a = Math.abs(samples[i])
        if (a > peak) peak = a
    }
    const threshold = peak * ONSET_SHARE
    let onsetFrame = frames
    for (let f = 0; f < frames && onsetFrame === frames; f++) {
        for (let c = 0; c < channels; c++) {
            if (Math.abs(samples[f * channels + c]) >= threshold) { onsetFrame = f; break }
        }
    }
    return { peak: peak / 32768, peakDb: peak > 0 ? 20 * Math.log10(peak / 32768) : -Infinity, onsetFrame, onsetMs: (onsetFrame / sampleRate) * 1000, frames, durationMs: (frames / sampleRate) * 1000 }
}

/**
 * The prepared version of a sample: trimmed so the hit starts `leadMs` in, and its peak set to
 * `targetDb`. Returns a new wav object; the input is left alone.
 */
export function prepareWav (wav, { leadMs = 1, targetDb = -3 } = {}) {
    const { sampleRate, channels, samples } = wav
    const { peak, onsetFrame } = analyseWav(wav)
    const lead = Math.ceil((leadMs / 1000) * sampleRate)
    const start = Math.max(0, onsetFrame - lead) * channels
    const gain = peak > 0 ? Math.pow(10, targetDb / 20) / peak : 1
    const out = new Int16Array(samples.length - start)
    for (let i = 0; i < out.length; i++) {
        out[i] = Math.max(-32768, Math.min(32767, Math.round(samples[start + i] * gain)))
    }
    return { sampleRate, channels, samples: out }
}
