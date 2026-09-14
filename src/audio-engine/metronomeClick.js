/**
 * The metronome's click: a short sine burst on every beat, a higher and louder one on the
 * downbeat, synthesised on plain Web Audio so no sample has to load. Both engines hand it their
 * beats (the Tone transport's quarter-note repeat, the v2 scheduler's `onBeat`); it plays them
 * only while it is switched on. Its output is one gain the engine connects into the master, past
 * the users' effects: a click through a delay line is not a metronome.
 */
import { BEATS_PER_BAR } from './grid'

/** The two clicks: frequency in Hz, gain linear; and how long each lasts, seconds. */
export const CLICK = {
    beat: { frequency: 1000, gain: 0.35 },
    downbeat: { frequency: 1500, gain: 0.5 },
    attack: 0.001,
    duration: 0.03
}
/** How long a click still to come takes to fade when playback stops, seconds. */
export const STOP_FADE = 0.005

/**
 * @param {object} o
 * @param {BaseAudioContext} o.context anything with createGain, createOscillator and currentTime
 * @param {boolean} [o.enabled] on from the start
 */
export function createMetronomeClick ({ context, enabled = false }) {
    const output = context.createGain()
    const live = new Set()
    let on = enabled === true

    const metronome = {
        /** The gain every click goes through; the engine connects it into the master. */
        output,
        isEnabled () {
            return on
        },
        setEnabled (value) {
            on = value === true
            if (!on) {
                metronome.stopAll(context.currentTime)
            }
            return on
        },
        /**
         * One click at `time` (context seconds) for beat `beat` counted from bar 0; the downbeat is
         * every BEATS_PER_BAR-th. Nothing while switched off.
         * @returns {{ oscillator: OscillatorNode, gain: GainNode, stop: (at: number) => void } | null}
         */
        click ({ time, beat }) {
            if (!on) {
                return null
            }
            const spec = beat % BEATS_PER_BAR === 0 ? CLICK.downbeat : CLICK.beat
            const oscillator = context.createOscillator()
            oscillator.type = 'sine'
            oscillator.frequency.value = spec.frequency
            const gain = context.createGain()
            gain.gain.setValueAtTime(0, time)
            gain.gain.linearRampToValueAtTime(spec.gain, time + CLICK.attack)
            // an exponential decay reads as a tick; it cannot reach zero, so it ends near it
            gain.gain.exponentialRampToValueAtTime(0.001, time + CLICK.duration)
            oscillator.connect(gain)
            gain.connect(output)
            const voice = {
                oscillator,
                gain,
                stop (at, fade = STOP_FADE) {
                    gain.gain.cancelScheduledValues(at)
                    gain.gain.setValueAtTime(0, at)
                    // a stop before the start is silence: a click still to come never sounds
                    oscillator.stop(at + fade)
                }
            }
            oscillator.onended = () => {
                oscillator.disconnect()
                gain.disconnect()
                live.delete(voice)
            }
            live.add(voice)
            oscillator.start(time)
            oscillator.stop(time + CLICK.duration + STOP_FADE)
            return voice
        },
        /** Silences every click sounding or still to come, as the engines do with the layers' voices on stop. */
        stopAll (at) {
            for (const voice of live) voice.stop(at)
            live.clear()
        },
        get pending () {
            return live.size
        },
        dispose () {
            metronome.stopAll(context.currentTime)
            try {
                output.disconnect()
            } catch (e) {
                // already gone
            }
        }
    }
    return metronome
}
