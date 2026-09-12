
import * as Tone from 'tone';
import Instruments from './Instruments';
import _ from 'lodash'
import FX from './FX';
import AudioEngine from './AudioEngine';
import Automation from './Automation';

/**
 * The track's own copy of the layer or user bus it plays. What is handed in comes from the Redux
 * store, which the track must not write to, so setType() stamps its bookkeeping onto the copy.
 */
const ownCopy = (trackParameters) => _.isNil(trackParameters) ? trackParameters : { ...trackParameters }

export default class Track {
    static TRACK_TYPE_LAYER = 'TRACK_TYPE_LAYER' // Each layer is routed to a user bus
    static TRACK_TYPE_USER = 'TRACK_TYPE_USER' // User busses are routed to master
    static TRACK_TYPE_MASTER = 'TRACK_TYPE_MASTER'
    static TRACK_TYPE_AUTOMATION = 'TRACK_TYPE_AUTOMATION' // Each layer is routed to a user bus
    static MASTER_LIMITER = { threshold: -2, knee: 0, ratio: 20, attack: 0.001, release: 0.05 }
    /** The soft ceiling after the limiter: linear up to `knee`, then bending towards `top` (just under full scale) without reaching it; sees `headroom` times full scale. */
    static MASTER_CEILING = { knee: 0.9, top: 0.995, headroom: 4, length: 8192 }
    /**
     * The ceiling's curve for a normalised input `u` in [-1, 1], which stands for a sample of
     * `u * headroom`: below the knee the sample passes unchanged; above it, the excess is bent with
     * a tanh so the output approaches full scale and never gets there. Stacked hits the
     * compressor's 1 ms attack lets through are rounded off instead of flat-topped by the device.
     */
    static ceilingCurve (u) {
        const { knee, top, headroom } = Track.MASTER_CEILING
        const x = u * headroom
        const a = Math.abs(x)
        if (a <= knee) {
            return x
        }
        return Math.sign(x) * (knee + (top - knee) * Math.tanh((a - knee) / (top - knee)))
    }
    constructor (trackParameters, type, userId) {
        this.trackParameters = ownCopy(trackParameters)
        this.id = trackParameters.id
        this.userId = userId
        this.type = type
        this.instrument = null
        this.automation = null
        this.notes = null
        // the saved mixer state, kept on the track so it survives the channel being rebuilt
        this.volume = _.isNil(trackParameters.gain) ? 0 : trackParameters.gain
        this.isMuted = _.isNil(trackParameters.isMuted) ? false : trackParameters.isMuted
        this.setType(type)
    }
    setType (type, automationFxId) {
        this.dispose()
        this.type = type;
        this.trackParameters.type = type
        if (this.type === Track.TRACK_TYPE_LAYER || this.type === Track.TRACK_TYPE_USER) {
            this.channel = new Tone.Channel({ channelCount: 2 })
            this.fx = null
            this.sortedFx = null
            if (_.isNil(this.trackParameters.fx)) {
                this.trackParameters.fx = {}
            }
            this.applyMixerState()
            const _this = this
            this.createFX(this.trackParameters.fx).then(() => {
                _this.buildAudioChain()
            })
        } else if (this.type === Track.TRACK_TYPE_MASTER) {
            this.channel = new Tone.Gain()
            // Every layer sits at 0 dB and the samples are normalised to full scale, so three
            // layers hitting the same step reach this bus at up to 1.7x full scale (measured on
            // production, 2026-09-08) and the device clips them into a short crackle. The limiter
            // holds stacked peaks under 0 dBFS and leaves single hits untouched. Tone's Limiter
            // keeps the compressor's default 30 dB soft knee, which let the overshoot through at
            // 1.05x full scale, and a 3 ms attack still passed the first milliseconds of a stacked
            // transient at 1.00x; a hard knee, 1 ms attack and 1 dB of margin measure under 1.0.
            this.limiter = new Tone.Compressor(Track.MASTER_LIMITER)
            // What the compressor still lets through (measured up to 1.2x full scale with every step of
            // three rounds on) is held under full scale by a soft ceiling. A WaveShaper only sees
            // inputs in [-1, 1], so the signal is padded down by the ceiling's headroom first and the
            // curve maps the padded value straight to the output level.
            this.ceilingPad = new Tone.Gain(1 / Track.MASTER_CEILING.headroom)
            this.ceiling = new Tone.WaveShaper(Track.ceilingCurve, Track.MASTER_CEILING.length)
            // no oversampling: its resampling filter rings back over the rounded peak by up to a tenth
            // (measured 1.11x full scale with '2x'), and what is shaped here would have clipped anyway
            this.ceiling.oversample = 'none'
        } else if (this.type === Track.TRACK_TYPE_AUTOMATION) {
            if (!_.isNil(automationFxId)) {
                this.trackParameters.automationFxId = automationFxId
            }
            this.automation = new Automation(this.trackParameters.automationFxId, this.userId)
        }
        this.calculatePart(this.trackParameters, this.userPatterns)
    }
    setFxOrder (updatedFxOrders) {
        /* this.disconnectAudioChain()
         for (let updatedFxOrder of updatedFxOrders) {
             _.find(this.sortedFx, { id: updatedFxOrder.id }).order = updatedFxOrder.order
         }
         this.sortedFx = _.sortBy(this.sortedFx, 'order')
         this.buildAudioChain()*/
    }
    load (trackParameters, userPatterns) {
        this.userPatterns = userPatterns
        // calculatePart takes the track's own copy of the parameters
        this.calculatePart(trackParameters, userPatterns)
    }
    async createFX (fxList) {
        if (_.isNil(fxList)) {
            return
        }
        this.fx = {}
        this.sortedFx = []
        for (let [, fxObject] of Object.entries(fxList)) {
            let fx = await FX.create(fxObject)
            // effects come up bypassed, so switch back on the ones the user had switched on by hand
            fx.override = fxObject.isOverride === true
            this.fx[fx.id] = fx
            this.sortedFx.push(fx)
        }
        this.sortedFx = _.sortBy(this.sortedFx, 'order')
    }
    buildAudioChain () {
        if (this.type === Track.TRACK_TYPE_MASTER) {
            this.channel.connect(this.limiter)
            this.limiter.connect(this.ceilingPad)
            this.ceilingPad.connect(this.ceiling)
            this.ceiling.toDestination()
        } else if (this.type !== Track.TRACK_TYPE_AUTOMATION) {
            this.disconnectAudioChain()
            if (!_.isNil(this.instrument) && !_.isNil(this.instrument.instrument)) {
                //this.instrument.instrument.toDestination()
                this.instrument.instrument.connect(this.channel)
                //this.channel.toDestination()
                // let channel = new Tone.Channel({ channelCount: 2 })
                //channel.toDestination()
                // this.instrument.instrument.connect(channel)

            }
            let onFx = _.filter(this.sortedFx, {
                isOn: true
            })
            if (onFx.length > 0) {
                for (let i = 0; i < onFx.length; i++) {
                    let fx = onFx[i]
                    // connect channel to first fx
                    if (i === 0) {
                        this.channel.connect(fx.fx)
                    }

                    // connect previous fx to this one
                    if (i > 0) {
                        onFx[i - 1].fx.connect(fx.fx)
                    }

                    // connect last fx to user bus or master
                    if (i === onFx.length - 1) {
                        if (this.type === Track.TRACK_TYPE_LAYER) {
                            fx.fx.connect(AudioEngine.busesByUser[this.userId].channel)
                        } else if (this.type === Track.TRACK_TYPE_USER) {
                            fx.fx.connect(AudioEngine.master.channel)
                        } else {
                            fx.fx.toDestination()
                        }
                    }
                }
            } else {
                if (this.type === Track.TRACK_TYPE_LAYER) {
                    this.channel.connect(AudioEngine.busesByUser[this.userId].channel)
                } else if (this.type === Track.TRACK_TYPE_USER) {
                    this.channel.connect(AudioEngine.master.channel)
                } else {
                    this.channel.toDestination()
                }
            }

        }
    }
    disconnectAudioChain () {
        if (!_.isNil(this.channel) && !_.isNil(this.channel.context._context)) {
            this.channel.disconnect(0)
        }

        if (!_.isNil(this.sortedFx)) {
            for (let fx of this.sortedFx) {
                if (!_.isNil(fx.fx) && !_.isNil(fx.fx.context._context)) {
                    fx.fx.disconnect(0)
                }
            }
        }

    }
    dispose () {
        this.disconnectAudioChain()
        if (!_.isNil(this.instrument)) {
            this.instrument.dispose()
        }
        if (!_.isNil(this.automation)) {
            this.automation.dispose()
        }
        if (!_.isNil(this.sortedFx)) {
            for (let fx of this.sortedFx) {
                fx.dispose()
            }
        }
        if (!_.isNil(this.channel)) {
            try {
                this.channel.dispose()
            } catch (e) {
            }
        }
        if (!_.isNil(this.limiter)) {
            this.limiter.dispose()
            this.limiter = null
        }
        for (const key of ['ceilingPad', 'ceiling']) {
            if (!_.isNil(this[key])) {
                this[key].dispose()
                this[key] = null
            }
        }
    }
    calculatePart (layer, userPatterns) {
        this.trackParameters = ownCopy(layer)
        if (!_.isNil(userPatterns)) {
            // if (!userPatterns.isPlayingSequence) {
            if (!_.isNil(layer)) {
                if (this.type === Track.TRACK_TYPE_AUTOMATION) {
                    this.automation.clearPart()
                    this.automation.loadSteps(layer.steps)
                } else {
                    if (_.isNil(this.instrument) || _.isNil(layer)) {
                        return
                    }
                    this.instrument.clearPart()
                    this.notes = this.convertStepsToNotes(layer.steps, layer.percentOffset, layer.timeOffset)
                    _.sortBy(this.notes, 'time')
                    this.instrument.loadPart(this.notes, 1)
                }
            }
            /*   } else {
               }*/
        }
    }
    convertStepsToNotes (steps, percentOffset, timeOffset) {
        const PPQ = Tone.getTransport().PPQ
        const totalTicks = PPQ * 4
        const ticksPerStep = Math.round(totalTicks / steps.length)
        if (_.isNil(percentOffset)) {
            percentOffset = 0
        }
        const percentOffsetTicks = Math.round((percentOffset / 100) * ticksPerStep)
        const timeOffsetTicks = this.msToTicks(timeOffset)
        let notes = []
        let previousNote = null;
        for (let i = 0; i < steps.length; i++) {
            let step = steps[i]
            if (step.isOn) {
                let time = (i * ticksPerStep) + percentOffsetTicks + timeOffsetTicks
                if (time < 0) {
                    time += totalTicks
                }
                let note = {
                    time,
                    duration: ticksPerStep,
                    midi: 60,
                    velocity: Number(step.velocity),
                    probability: step.probability
                }
                notes.push(note)
                previousNote = note
            } else if (!_.isNil(previousNote)) {
                // step not on so increase duration of previous note
                previousNote.duration += ticksPerStep
            }
        }
        return notes
    }
    msToTicks (ms) {
        const BPM = Tone.getTransport().bpm.value
        const PPQ = Tone.getTransport().PPQ
        const msPerBeat = 60000 / BPM
        const msPerTick = msPerBeat / PPQ
        return Math.round(ms / msPerTick)
    }
    /**
     * Swaps the layer's instrument. If the samples cannot be loaded the layer stays silent and
     * the error is logged; the rest of the round keeps loading.
     */
    async setInstrument (instrument) {
        const instrumentName = instrument ? instrument.sampler : null
        const articulation = instrument ? instrument.sample : null
        this.clearInstrument()
        if (_.isNil(instrumentName) || _.isNil(articulation)) {
            return null
        }
        try {
            this.instrument = await Instruments.create(instrumentName, articulation)
        } catch (error) {
            console.error(`Layer ${this.id}: could not load ${instrumentName}/${articulation}`, error)
            this.instrument = null
            return null
        }
        this.buildAudioChain()
        if (!_.isNil(this.notes)) {
            this.instrument.loadPart(this.notes, 1)
        }
        return this.instrument
    }
    clearInstrument () {
        if (!_.isNil(this.instrument)) {
            Instruments.dispose(this.instrument.id)
            this.instrument = null
        }
    }
    setAutomatedFx (fxId) {
        if (!_.isNil(this.automation)) {
            this.automation.setFx(fxId)
        } else {
            this.createAutomation(fxId, this.userId)
        }
        this.calculatePart(this.trackParameters, this.userPatterns)
    }
    createAutomation (fxId, userId) {
        this.automation = new Automation(fxId, userId)
    }
    setVolume (value) {
        this.volume = value
        this.applyMixerState()
    }
    setSolo (value) {
        this.channel.solo = value
    }
    setMute (value) {
        this.isMuted = value
        this.applyMixerState()
    }
    /** Writes volume and mute to the channel. The master track is a plain Gain and has neither. */
    applyMixerState () {
        if (_.isNil(this.channel) || _.isNil(this.channel.volume)) {
            return
        }
        this.channel.volume.value = this.volume
        this.channel.mute = this.isMuted
    }
    async setMixerSettings (settings) {
        let _this = this
        return new Promise(async function (resolve, reject) {
            await _this.setStyle(settings.style)
            _this.setVolume(settings.volume)
            for (let [fxId, fxParameters] of Object.entries(settings.fx)) {
                for (let [fxParameterName, fxValue] of Object.entries(fxParameters)) {
                    _this.setFXParameter(fxId, fxParameterName, fxValue)
                }
            }
            resolve()
        })
    }
    async setFXIsOn (fxId, value) {
        this.disconnectAudioChain()
        this.fx[fxId].isOn = value
        this.buildAudioChain()
    }
    setFXParameter (fxId, parameter, value) {
        if (this.fx[fxId].isOn) {
            this.fx[fxId][parameter] = value
        }
    }
    releaseAll () {
        if (!_.isNil(this.instrument)) {
            this.instrument.releaseAll()
        }
    }
    triggerNote (note) {
        if (!_.isNil(this.instrument)) this.instrument.triggerNote(note)
    }
    triggerAttack (pitch, velocity) {
        if (!_.isNil(this.instrument)) this.instrument.triggerAttack(pitch, velocity)
    }
    triggerRelease (pitch) {
        if (!_.isNil(this.instrument)) this.instrument.triggerRelease(pitch)
    }
    getNotes () {
        return this.notes
    }
}
