import _ from 'lodash'
import * as Tone from 'tone'

/** How long the gates take to open or close, seconds: short enough to feel like a switch, long enough not to click. */
export const GATE_RAMP = 0.005

/** Bypass by pulling the wet mix down to 0, so only the dry signal is heard. */
export const BYPASS_STRATEGY_MIX = 'mix'
/** Bypass by parking the filter cutoff where it lets the whole signal through. */
export const BYPASS_STRATEGY_FREQUENCY = 'frequency'

/**
 * Shared behaviour for every effect on a user bus.
 *
 * Effects are never disconnected to bypass them: the audio chain would have to be rebuilt,
 * which is far too slow for step automation. Instead the effect stays in the chain behind a
 * pair of gates: `input -> through -> output` carries the dry signal while the effect is
 * bypassed, and `input -> into -> fx -> outOf -> output` carries it while the effect is on.
 * Gains at 0 are exactly silent; a wet mix at 0 is not. Tone's effects leak their wet path at
 * about -56 dB with the mix at 0 (measured: a FeedbackDelay with 0.7 feedback still repeats
 * every hit as a fading echo train), and with two delays "bypassed" that way on every bus the
 * trail was audible after every stop. The bypass strategy's parameter (wet mix or filter
 * cutoff) is still moved as before, so an effect switched on sounds as it always did.
 *
 * A subclass supplies its name, icon, label, default parameter values, a createNode() that
 * builds the Tone node, and any parameter setters of its own.
 */
export default class FXBaseClass {
    /** Which parameter setBypass() moves. See the BYPASS_STRATEGY_* constants. */
    static bypassStrategy = BYPASS_STRATEGY_MIX
    /** Wet mix used by the mix strategy when the effect is not bypassed. */
    static defaultMix = 1
    /** Cutoff used by the frequency strategy when the effect is not bypassed. */
    static defaultFrequency = 20000
    /** Cutoff that passes the whole signal, used by the frequency strategy to bypass. */
    static passThroughFrequency = 20000

    constructor (fxParameters) {
        this.id = fxParameters.id
        if (_.isNil(this.id)) {
            this.id = Math.floor(Math.random() * 999999)
        }
        this.name = fxParameters.name
        this.order = fxParameters.order
        this.fx = null
        this._override = false // if true will switch fx on and ignore other calls to switch it off (from automation)
        this._mix = this.constructor.defaultMix
        this._frequency = this.constructor.defaultFrequency
        // the value setBypass() restores; an un-bypassed effect runs at its default
        this._valueBeforeBypass = this.bypassedParameterValue
    }

    /** Builds this effect's Tone node. Called every time the effect is switched on. */
    createNode () {
        throw new Error('An FX class must implement createNode()')
    }

    get usesFrequencyBypass () {
        return this.constructor.bypassStrategy === BYPASS_STRATEGY_FREQUENCY
    }

    /** Current value of the parameter the bypass moves. */
    get bypassedParameterValue () {
        return this.usesFrequencyBypass ? this._frequency : this._mix
    }

    /** Value of that parameter at which the effect is inaudible. */
    get passThroughValue () {
        return this.usesFrequencyBypass ? this.constructor.passThroughFrequency : 0
    }

    setBypassedParameter (value, time) {
        if (this.usesFrequencyBypass) {
            this.setFrequency(value, time)
        } else {
            this.setMix(value, time)
        }
    }

    /** Only meaningful for the mix strategy; a filter node has no wet control. */
    setMix (value, time) {
        this._mix = value
        if (this.isOn) {
            this.setSignalValue(this.fx.wet, value, time)
        }
    }

    /** Only meaningful for the frequency strategy; the other nodes have no cutoff. */
    setFrequency (value, time) {
        this._frequency = value
        if (this.isOn) {
            this.setSignalValue(this.fx.frequency, value, time)
        }
    }

    /**
     * Tone Signals and Params are read-only properties of their node: writing over the property
     * replaces the object and leaves the audio untouched, so always write through .value.
     */
    setSignalValue (signal, value, time) {
        if (!_.isNil(time)) {
            signal.setValueAtTime(value, time)
        } else {
            signal.value = value
        }
    }

    setBypass (value, time) {
        const passThroughValue = this.passThroughValue
        const bypassed = value === true && !this._override
        if (bypassed) {
            const currentValue = this.bypassedParameterValue
            if (currentValue !== passThroughValue) {
                this._valueBeforeBypass = currentValue
            }
            this.setBypassedParameter(passThroughValue, time)
        } else {
            this.setBypassedParameter(this._valueBeforeBypass, time)
        }
        this.setGates(bypassed, time)
    }

    /** Opens the dry path and closes the effect's, or the other way round, over GATE_RAMP. */
    setGates (bypassed, time) {
        if (_.isNil(this.through)) {
            return
        }
        const at = _.isNil(time) ? Tone.now() : time
        const ramp = (node, target) => {
            const param = node.gain
            param.setValueAtTime(param.value, at)
            param.linearRampToValueAtTime(target, at + GATE_RAMP)
        }
        ramp(this.through, bypassed ? 1 : 0)
        ramp(this.into, bypassed ? 0 : 1)
        ramp(this.outOf, bypassed ? 0 : 1)
    }

    /** Whether the effect is bypassed right now, from the gates. */
    get isBypassed () {
        return _.isNil(this.into) ? true : this.into.gain.value === 0
    }

    set isOn (value) {
        this._isOn = value
        if (this._isOn) {
            this.enable()
        } else {
            this.disable()
        }
    }

    get isOn () {
        return this._isOn
    }

    set override (value) {
        this._override = value
        if (value === true) {
            this.setBypass(false)
        } else {
            this.setBypass(true)
        }
    }

    enable () {
        this.fx = this.createNode()
        // the chain connects into `input` and on from `output`; the gates decide which way the signal goes
        this.input = new Tone.Gain(1)
        this.output = new Tone.Gain(1)
        this.through = new Tone.Gain(1)
        this.into = new Tone.Gain(0)
        this.outOf = new Tone.Gain(0)
        this.input.connect(this.through)
        this.through.connect(this.output)
        this.input.connect(this.into)
        this.into.connect(this.fx)
        this.fx.connect(this.outOf)
        this.outOf.connect(this.output)
        this.setBypassedParameter(this.bypassedParameterValue)
        this.setBypass(true)
    }

    disable () {
        this.dispose()
    }

    dispose () {
        for (const key of ['fx', 'input', 'output', 'through', 'into', 'outOf']) {
            const node = this[key]
            if (!_.isNil(node) && !_.isNil(node._context)) {
                node.dispose()
            }
            this[key] = null
        }
    }

    getAutomationOptions () {
        return [
            {
                label: 'Enabled',
                name: 'enabled',
                setParameter: this.setBypass.bind(this),
                // the automation step says "effect on", setBypass takes "bypassed"
                calculateValue: (value) => !value
            }
        ]
    }
}
