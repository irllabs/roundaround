/**
 * A voice is one hit: an AudioBufferSourceNode through its own GainNode into the layer's
 * output. The whole sample plays; nothing releases it at the next step, so a kick's tail and an
 * open hat ring as they were recorded. Velocity is gain, as in the old sampler. A voice can be
 * choked by the next voice in its choke group (an open hat by a closed one) with a short fade,
 * and only then.
 */

/** How long a choked voice takes to fade, seconds. */
export const CHOKE_FADE = 0.005

/**
 * Plays `buffer` at `time` (context seconds) into `destination`.
 *
 * @returns {{ source: AudioBufferSourceNode, gain: GainNode, stop: (at: number) => void }}
 */
export function playHit ({ context, buffer, time, velocity = 1, destination, chokeGroups = null, chokeGroup = null }) {
    const source = context.createBufferSource()
    source.buffer = buffer
    const gain = context.createGain()
    gain.gain.value = Math.max(0, Math.min(1, velocity))
    source.connect(gain)
    gain.connect(destination)
    const voice = {
        source,
        gain,
        stop (at) {
            gain.gain.setValueAtTime(gain.gain.value, at)
            gain.gain.linearRampToValueAtTime(0, at + CHOKE_FADE)
            source.stop(at + CHOKE_FADE)
        }
    }
    source.onended = () => {
        source.disconnect()
        gain.disconnect()
    }
    if (chokeGroups && chokeGroup) {
        chokeGroups.choke(chokeGroup, voice, time)
    }
    source.start(time)
    return voice
}

/**
 * The registry of choke groups: the newest voice of a group fades the one before it at the
 * moment it starts. Nothing chokes across groups, and a layer without a group never chokes.
 */
export function createChokeGroups () {
    const last = new Map()
    return {
        choke (group, voice, time) {
            const previous = last.get(group)
            if (previous && previous !== voice) {
                previous.stop(time)
            }
            last.set(group, voice)
        },
        clear () {
            last.clear()
        }
    }
}

/** dB to linear gain, as the layer volume slider is in dB. */
export function dbToGain (db) {
    return Math.pow(10, db / 20)
}
