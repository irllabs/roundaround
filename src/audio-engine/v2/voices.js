/**
 * A voice is one hit: an AudioBufferSourceNode through its own GainNode into the layer's
 * output. The whole sample plays; nothing releases it at the next step, so a kick's tail and an
 * open hat ring as they were recorded. Velocity is gain, as in the old sampler. A voice can be
 * choked by the next voice in its choke group (an open hat by a closed one) with a short fade,
 * and only then.
 */

/** How long a choked voice takes to fade, seconds. */
export const CHOKE_FADE = 0.005
/** How long every voice takes to fade when playback stops, seconds: short enough to feel like a stop, long enough not to click on a kick. */
export const STOP_FADE = 0.03

/**
 * Plays `buffer` at `time` (context seconds) into `destination`.
 *
 * @returns {{ source: AudioBufferSourceNode, gain: GainNode, stop: (at: number) => void }}
 */
export function playHit ({ context, buffer, time, velocity = 1, destination, chokeGroups = null, chokeGroup = null, registry = null }) {
    const source = context.createBufferSource()
    source.buffer = buffer
    const gain = context.createGain()
    gain.gain.value = Math.max(0, Math.min(1, velocity))
    source.connect(gain)
    gain.connect(destination)
    const voice = {
        source,
        gain,
        stop (at, fade = CHOKE_FADE) {
            gain.gain.setValueAtTime(gain.gain.value, at)
            gain.gain.linearRampToValueAtTime(0, at + fade)
            // a voice still waiting for its start time never sounds: stop before start is silence
            source.stop(at + fade)
        }
    }
    source.onended = () => {
        source.disconnect()
        gain.disconnect()
        if (registry) registry.delete(voice)
    }
    if (registry) registry.add(voice)
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

/**
 * Every voice that is sounding or still to come. Stop silences them all at once: the scheduler
 * only stops scheduling, and the hits already handed to Web Audio inside the look-ahead would
 * otherwise land after the button and ring on, which is heard as an echo after pause.
 */
export function createVoiceRegistry () {
    const live = new Set()
    return {
        add (voice) { live.add(voice) },
        delete (voice) { live.delete(voice) },
        get size () { return live.size },
        stopAll (at, fade = STOP_FADE) {
            for (const voice of live) voice.stop(at, fade)
            live.clear()
        }
    }
}

/** dB to linear gain, as the layer volume slider is in dB. */
export function dbToGain (db) {
    return Math.pow(10, db / 20)
}
