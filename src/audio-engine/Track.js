
import * as Tone from 'tone';
import Instruments from './Instruments';
import _ from 'lodash'
import FX from './FX';
import AudioEngine from './AudioEngine';
import Automation from './Automation';

export default class Track {
    static TRACK_TYPE_LAYER = 'TRACK_TYPE_LAYER' // Each layer is routed to a user bus
    static TRACK_TYPE_USER = 'TRACK_TYPE_USER' // User busses are routed to master
    static TRACK_TYPE_MASTER = 'TRACK_TYPE_MASTER'
    static TRACK_TYPE_AUTOMATION = 'TRACK_TYPE_AUTOMATION' // Each layer is routed to a user bus
    constructor(trackParameters, type, userId) {
        this.trackParameters = trackParameters
        this.id = trackParameters.id
        this.userId = userId
        this.type = type
        this.instrument = null
        this.automation = null
        this.notes = null
        this.setType(type)
    }
    setType(type, automationFxId) {
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
            const _this = this
            this.createFX(this.trackParameters.fx).then(() => {
                _this.buildAudioChain()
            })

            // todo fix this better, for some reason fx are not bypassing correctly to start with
            setTimeout(() => {
                // bypass all effects
                // console.log('fx hack todo: fix this');
                for (const effect of _this.sortedFx) {
                    effect.setBypass(true)
                }
            }, 3000);
        } else if (this.type === Track.TRACK_TYPE_MASTER) {
            this.channel = new Tone.Gain()
        } else if (this.type === Track.TRACK_TYPE_AUTOMATION) {
            if (!_.isNil(automationFxId)) {
                this.trackParameters.automationFxId = automationFxId
            }
            this.automation = new Automation(this.trackParameters.automationFxId, this.userId)
        }
        this.calculatePart(this.trackParameters, this.userPatterns)
    }
    setFxOrder(updatedFxOrders) {
        /* this.disconnectAudioChain()
         for (let updatedFxOrder of updatedFxOrders) {
             _.find(this.sortedFx, { id: updatedFxOrder.id }).order = updatedFxOrder.order
         }
         this.sortedFx = _.sortBy(this.sortedFx, 'order')
         this.buildAudioChain()*/
    }
    load(trackParameters, userPatterns) {
        this.trackParameters = trackParameters
        this.userPatterns = userPatterns
        this.calculatePart(trackParameters, userPatterns)

    }
    async createFX(fxList) {
        return new Promise(async (resolve, reject) => {
            if (!_.isNil(fxList)) {
                this.fx = {}
                this.sortedFx = []
                for (let [, fxObject] of Object.entries(fxList)) {
                    let fx = await FX.create(fxObject)
                    this.fx[fx.id] = fx
                    this.sortedFx.push(fx)
                }
                this.sortedFx = _.sortBy(this.sortedFx, 'order')
            }
            resolve()
        })
    }
    buildAudioChain() {
        // console.log('Track::buildAudioChain()', this.type, this.id, this.instrument);
        if (this.type === Track.TRACK_TYPE_MASTER) {
            this.channel.toDestination()
        } else if (this.type !== Track.TRACK_TYPE_AUTOMATION) {
            this.disconnectAudioChain()
            if (!_.isNil(this.instrument) && !_.isNil(this.instrument.instrument)) {
                //this.instrument.instrument.toDestination()
                this.instrument.instrument.connect(this.channel)
                //this.channel.toDestination()
                // let channel = new Tone.Channel({ channelCount: 2 })
                //channel.toDestination()
                // this.instrument.instrument.connect(channel)

                // console.log('instrument channels', this.instrument.instrument.numberOfOutputs, 'channel numberOfInputs', this.channel.numberOfInputs, 'channel numberOfOutputs', this.channel.numberOfOutputs);
            }
            let onFx = _.filter(this.sortedFx, {
                isOn: true
            })
            if (onFx.length > 0) {
                for (let i = 0; i < onFx.length; i++) {
                    let fx = onFx[i]
                    // connect channel to first fx
                    if (i === 0) {
                        //   console.log('connecting channel to first fx', this.channel, 'to', fx);
                        this.channel.connect(fx.fx)
                    }

                    // connect previous fx to this one
                    if (i > 0) {
                        //  console.log('connecting previous fx', onFx[i - 1], 'to', fx);
                        onFx[i - 1].fx.connect(fx.fx)
                    }

                    // connect last fx to user bus or master
                    if (i === onFx.length - 1) {
                        if (this.type === Track.TRACK_TYPE_LAYER) {
                            fx.fx.connect(AudioEngine.busesByUser[this.userId].channel)
                        } else if (this.type === Track.TRACK_TYPE_USER) {
                            //  console.log('connect last fx to master', fx, 'to', AudioEngine.master.channel);
                            fx.fx.connect(AudioEngine.master.channel)
                        } else {
                            fx.fx.toDestination()
                        }
                    }
                }
            } else {
                if (this.type === Track.TRACK_TYPE_LAYER) {
                    // console.log('track connecting to ', AudioEngine.busesByUser[this.userId]);
                    this.channel.connect(AudioEngine.busesByUser[this.userId].channel)
                } else if (this.type === Track.TRACK_TYPE_USER) {
                    // console.log('track connecting to master');
                    this.channel.connect(AudioEngine.master.channel)
                } else {
                    //  console.log('track connecting to destination',);
                    this.channel.toDestination()
                }
            }

        }
    }
    disconnectAudioChain() {
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
    dispose() {
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
                console.log('caught channel dispose error', e)
            }
        }
    }
    calculatePart(layer, userPatterns) {
        //console.log('Track::calculatePart()', layer, userPatterns);
        this.trackParameters = layer
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
                   console.log('calculatePart sequence');
               }*/
        }
    }
    convertStepsToNotes(steps, percentOffset, timeOffset) {
        const PPQ = Tone.Transport.PPQ
        const totalTicks = PPQ * 4
        const ticksPerStep = Math.round(totalTicks / steps.length)
        if (_.isNil(percentOffset)) {
            percentOffset = 0
        }
        const percentOffsetTicks = Math.round((percentOffset / 100) * ticksPerStep)
        const timeOffsetTicks = this.msToTicks(timeOffset)
        //console.log('convertStepsToNotes()', 'percentOffsetTicks', percentOffsetTicks, 'timeOffsetTicks', timeOffsetTicks);
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
        // console.log('notes', notes);
        return notes
    }
    msToTicks(ms) {
        const BPM = Tone.Transport.bpm.value
        const PPQ = Tone.Transport.PPQ
        const msPerBeat = 60000 / BPM
        const msPerTick = msPerBeat / PPQ
        return Math.round(ms / msPerTick)
    }
    async setInstrument(instrument) {
        // console.time('setInstrument', instrument)
        const instrumentName = instrument.sampler
        const articulation = instrument.sample
        let _this = this
        return new Promise(async function (resolve, reject) {
            if (!_.isNil(_this.instrument)) {
                Instruments.dispose(_this.instrument.id)
            }
            if (_.isNil(articulation)) {
                _this.clearInstrument()
                resolve()
            }
            _this.instrument = await Instruments.create(
                instrumentName,
                articulation
            )
            // console.log('instrument created')
            _this.buildAudioChain()
            if (!_.isNil(_this.notes)) {
                _this.instrument.loadPart(_this.notes, 1)
            }
            // _this.calculatePart()
            //_this.instrument.setVolume(_this.channel.volume.value)

            resolve(_this.instrument)
        })
    }
    clearInstrument() {
        Instruments.dispose(this.instrument.id)
    }
    setAutomatedFx(fxId) {
        if (!_.isNil(this.automation)) {
            this.automation.setFx(fxId)
        } else {
            this.createAutomation(fxId, this.userId)
        }
        this.calculatePart(this.trackParameters, this.userPatterns)
    }
    createAutomation(fxId, userId) {
        this.automation = new Automation(fxId, userId)
    }
    setVolume(value) {
        //console.log('Track::setVolume()', value);
        const _this = this
        // temporary hack, todo investigate why this is necessary (when loading a preset the volume sometimes doesn't update)
        setTimeout(() => {
            _this.channel.volume.value = value
        }, 300)
    }
    setSolo(value) {
        this.channel.solo = value
    }
    setMute(value) {
        // console.log('Track::setMute()', value);
        const _this = this
        // temporary hack, todo investigate why this is necessary (when loading a preset the mute sometimes doesn't work)
        setTimeout(() => {
            _this.channel.mute = value
        }, 300)
    }
    async setMixerSettings(settings) {
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
    async setFXIsOn(fxId, value) {
        // console.log('setFXIsOn', fxId, value);
        this.disconnectAudioChain()
        this.fx[fxId].isOn = value
        this.buildAudioChain()
    }
    setFXParameter(fxId, parameter, value) {
        if (this.fx[fxId].isOn) {
            this.fx[fxId][parameter] = value
        }
    }
    releaseAll() {
        if (!_.isNil(this.instrument)) {
            this.instrument.releaseAll()
        }
    }
    triggerNote(note) {
        this.instrument.triggerNote(note)
    }
    triggerAttack(pitch, velocity) {
        this.instrument.triggerAttack(pitch, velocity)
    }
    triggerRelease(pitch) {
        this.instrument.triggerRelease(pitch)
    }
    getNotes() {
        return this.notes
    }
}
