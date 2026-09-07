import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as ToneMock from 'tone'
import FX from '../FX'
import Autowah from './autowah'
import Bitcrusher from './bitcrusher'
import Delay from './delay'
import Distortion from './distortion'
import Highpass from './highpass'
import Lowpass from './lowpass'
import PingPong from './pingpong'
import Reverb from './reverb'

vi.mock('tone', () => {
    // Stands in for both Tone.Signal and Tone.Param: a read-only property of its node whose
    // value is written through .value, never by replacing the property.
    class Signal {
        constructor (value) {
            this.value = value
            this.scheduled = []
        }
        setValueAtTime (value, time) {
            this.scheduled.push([value, time])
            return this
        }
    }
    class Node {
        constructor (...args) {
            this.args = args
            this._context = {}
            this.isDisposed = false
        }
        dispose () {
            this.isDisposed = true
        }
    }
    class WetNode extends Node {
        constructor (...args) {
            super(...args)
            this.wet = new Signal(1)
        }
    }
    class AutoWah extends WetNode {
        constructor (...args) {
            super(...args)
            this.Q = new Signal(2)
        }
    }
    class BitCrusher extends WetNode {
        constructor (...args) {
            super(...args)
            this.bits = new Signal(4)
        }
    }
    class Freeverb extends WetNode {
        constructor (...args) {
            super(...args)
            this.roomSize = new Signal(0.7)
        }
    }
    // named apart from the Distortion FX class this file imports, so the mock factory
    // does not shadow it
    class ToneDistortion extends WetNode {
        constructor (...args) {
            super(...args)
            this.distortion = 0
        }
    }
    class FeedbackDelay extends WetNode {
        constructor (...args) {
            super(...args)
            this.delayTime = new Signal('8n')
            this.feedback = new Signal(0.125)
        }
    }
    class PingPongDelay extends FeedbackDelay { }
    class Filter extends Node {
        constructor (...args) {
            super(...args)
            this.frequency = new Signal(args[0])
            this.type = args[1]
        }
    }
    return { Signal, AutoWah, BitCrusher, Freeverb, Distortion: ToneDistortion, FeedbackDelay, PingPongDelay, Filter }
})

const { Signal } = ToneMock

const build = (FxClass, overrides = {}) => new FxClass({
    id: 'fx-1',
    name: FxClass.fxName,
    order: 0,
    isOn: true,
    ...overrides
})

describe('FX classes', () => {
    beforeEach(() => {
        FX.fxClasses = {}
        FX.fx = []
        FX.fxById = {}
        FX.init()
    })

    it('registers all eight effects with their labels unchanged', async () => {
        const labels = {}
        for (const name of Object.keys(FX.fxClasses)) {
            const fx = await FX.create({ id: name, name, order: 0, isOn: true })
            labels[name] = fx.label
        }
        expect(labels).toEqual({
            lowpass: 'Lowpass',
            delay: 'Tape delay',
            pingpong: 'Ping-pong delay',
            highpass: 'Highpass',
            distortion: 'Distortion',
            bitcrusher: 'Bitcrusher',
            autowah: 'Autowah',
            reverb: 'Reverb'
        })
    })
})

describe('mix bypass', () => {
    it('starts bypassed with a dry mix', () => {
        const fx = build(Autowah)
        expect(fx.fx.wet.value).toBe(0)
    })

    it('restores the effect mix when the bypass is lifted', () => {
        const reverb = build(Reverb)
        reverb.setBypass(false)
        expect(reverb.fx.wet.value).toBe(0.2)
        reverb.setBypass(true)
        expect(reverb.fx.wet.value).toBe(0)
    })

    it('remembers a mix set while the effect was audible', () => {
        const fx = build(Delay)
        fx.setBypass(false)
        fx.setMix(0.8)
        fx.setBypass(true)
        expect(fx.fx.wet.value).toBe(0)
        fx.setBypass(false)
        expect(fx.fx.wet.value).toBe(0.8)
    })

    it('schedules the mix at the given time instead of setting it now', () => {
        const fx = build(Autowah)
        fx.fx.wet.value = 1
        fx.setBypass(true, 4.25)
        expect(fx.fx.wet.scheduled).toEqual([[0, 4.25]])
        expect(fx.fx.wet.value).toBe(1)
    })

    it('does not build a node while the effect is switched off', () => {
        const fx = build(Autowah, { isOn: false })
        expect(fx.fx).toBeNull()
    })

    it('disposes the node when the effect is switched off', () => {
        const fx = build(Autowah)
        const node = fx.fx
        fx.isOn = false
        expect(node.isDisposed).toBe(true)
    })
})

describe('frequency bypass', () => {
    it('parks the lowpass at 20000 Hz and restores its cutoff', () => {
        const fx = build(Lowpass)
        expect(fx.fx.args).toEqual([500, 'lowpass'])
        expect(fx.fx.frequency.value).toBe(20000)
        fx.setBypass(false)
        expect(fx.fx.frequency.value).toBe(500)
    })

    it('parks the highpass at 0 Hz and restores its cutoff', () => {
        const fx = build(Highpass)
        expect(fx.fx.args).toEqual([4000, 'highpass'])
        expect(fx.fx.frequency.value).toBe(0)
        fx.setBypass(false)
        expect(fx.fx.frequency.value).toBe(4000)
    })

    it('schedules the cutoff at the given time', () => {
        const fx = build(Lowpass)
        fx.setBypass(false, 2)
        expect(fx.fx.frequency.scheduled).toEqual([[500, 2]])
    })
})

describe('override', () => {
    it('keeps the effect audible until the override is lifted', () => {
        const fx = build(Reverb)
        fx.override = true
        expect(fx.fx.wet.value).toBe(0.2)
        fx.setBypass(true)
        expect(fx.fx.wet.value).toBe(0.2)
        fx.override = false
        expect(fx.fx.wet.value).toBe(0)
    })

    it('keeps a filter open until the override is lifted', () => {
        const fx = build(Lowpass)
        fx.override = true
        expect(fx.fx.frequency.value).toBe(500)
        fx.setBypass(true)
        expect(fx.fx.frequency.value).toBe(500)
        fx.override = false
        expect(fx.fx.frequency.value).toBe(20000)
    })
})

describe('automation options', () => {
    const classes = [Autowah, Bitcrusher, Delay, Distortion, Highpass, Lowpass, PingPong, Reverb]

    it('offers one "enabled" option per effect that inverts the step value', () => {
        for (const FxClass of classes) {
            const options = build(FxClass).getAutomationOptions()
            expect(options).toHaveLength(1)
            expect(options[0].label).toBe('Enabled')
            expect(options[0].name).toBe('enabled')
            expect(options[0].calculateValue(true)).toBe(false)
            expect(options[0].calculateValue(false)).toBe(true)
        }
    })

    it('switches the effect on for a step that is on', () => {
        const fx = build(Reverb)
        const [enabled] = fx.getAutomationOptions()
        enabled.setParameter(enabled.calculateValue(true), 1)
        expect(fx.fx.wet.scheduled).toEqual([[0.2, 1]])
        enabled.setParameter(enabled.calculateValue(false), 2)
        expect(fx.fx.wet.scheduled).toEqual([[0.2, 1], [0, 2]])
    })
})

describe('parameter setters write through the Tone signal', () => {
    it('sets the autowah Q without replacing the signal', () => {
        const fx = build(Autowah)
        fx.setQ(6)
        expect(fx.fx.Q).toBeInstanceOf(Signal)
        expect(fx.fx.Q.value).toBe(6)
    })

    it('sets the reverb room size without replacing the signal', () => {
        const fx = build(Reverb)
        fx.setSize(0.4)
        expect(fx.fx.roomSize).toBeInstanceOf(Signal)
        expect(fx.fx.roomSize.value).toBe(0.4)
    })

    it('sets the bitcrusher bits without replacing the param', () => {
        const fx = build(Bitcrusher)
        fx.setBits(8)
        expect(fx.fx.bits).toBeInstanceOf(Signal)
        expect(fx.fx.bits.value).toBe(8)
    })

    it('sets delay time and feedback without replacing their signals', () => {
        for (const FxClass of [Delay, PingPong]) {
            const fx = build(FxClass)
            fx.setDelayTime('4n')
            fx.setFeedback(0.3)
            expect(fx.fx.delayTime).toBeInstanceOf(Signal)
            expect(fx.fx.delayTime.value).toBe('4n')
            expect(fx.fx.feedback).toBeInstanceOf(Signal)
            expect(fx.fx.feedback.value).toBe(0.3)
        }
    })

    it('sets the distortion amount, which is a plain property', () => {
        const fx = build(Distortion)
        fx.setAmount(0.5)
        expect(fx.fx.distortion).toBe(0.5)
    })

    it('sets the filter type, which is a plain property', () => {
        const fx = build(Lowpass)
        fx.type = 'bandpass'
        expect(fx.fx.type).toBe('bandpass')
    })
})
