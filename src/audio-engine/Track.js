'use strict';
import * as Tone from 'tone';
import Instruments from './Instruments';
import _ from 'lodash'
//import FX from '../helpers/FX';
import AudioEngine from './AudioEngine';

export default class Track {
    static TRACK_TYPE_MASTER = 'TRACK_TYPE_MASTER'
    static TRACK_TYPE_LAYER = 'TRACK_TYPE_LAYER'
    constructor (trackParameters, type) {
        this.id = trackParameters.id
        this.type = type
        this.instrument = null
        this.notes = null
        if (this.type !== Track.TRACK_TYPE_MASTER) {
            this.channel = new Tone.Channel()
        } else {
            this.channel = new Tone.Gain()
        }
        this.fx = null
        this.sortedFx = null
        //this.createFX(trackParameters.fx)
        this.createFX({})
    }
    load (layer) {
        if (!_.isNil(this.instrument)) {
            this.calculatePart(layer)
        }
    }
    async createFX (fxList) {
        this.fx = {}
        this.sortedFx = []
        for (let [fxId, fxObject] of Object.entries(fxList)) {
            let fx = await FX.create(fxObject)
            this.fx[fx.id] = fx
            this.sortedFx.push(fx)
        }
        this.sortedFx = _.sortBy(this.sortedFx, 'order')
    }
    buildAudioChain () {
        if (this.type === Track.TRACK_TYPE_MASTER) {
            this.channel.toMaster()
        } else {
            if (!_.isNil(this.instrument)) {
                this.disconnectAudioChain()

                this.instrument.connect(this.channel)
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

                        // connect last fx to master
                        if (i === onFx.length - 1) {
                            if (this.type !== Track.TRACK_TYPE_MASTER) {
                                fx.fx.connect(AudioEngine.master.channel)
                            } else {
                                fx.fx.toMaster()
                            }
                        }
                    }
                } else {
                    if (this.type !== Track.TRACK_TYPE_MASTER) {
                        this.channel.connect(AudioEngine.master.channel)
                    } else {
                        this.channel.toMaster()
                    }
                }
            }
        }
    }
    disconnectAudioChain () {
        if (!_.isNil(this.instrument)) {
            if (!_.isNil(this.channel._context)) {
                this.channel.disconnect(0)
            }
            for (let fx of this.sortedFx) {
                if (!_.isNil(fx.fx) && !_.isNil(fx.fx._context)) {
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
        for (let fx of this.sortedFx) {
            fx.dispose()
        }
        if (!_.isNil(this.channel)) {
            try {
                this.channel.dispose()
            } catch (e) {
                console.log('caught channel dispose error', e)
            }
        }
    }
    calculatePart (layer) {
        if (_.isNil(this.instrument) || _.isNil(layer)) {
            return
        }
        this.instrument.clearPart()
        this.notes = this.convertStepsToNotes(layer.steps)
        _.sortBy(this.notes, 'time')
        this.instrument.loadPart(this.notes, false)
    }
    convertStepsToNotes (steps) {
        const PPQ = Tone.Transport.PPQ
        const totalTicks = PPQ * 4
        const ticksPerStep = Math.round(totalTicks / steps.length)
        //  console.log('convertStepsToNotes()', steps, PPQ, ticksPerStep);
        let notes = []
        for (let i = 0; i < steps.length; i++) {
            let step = steps[i]
            if (step.isOn) {
                const note = {
                    time: i * ticksPerStep,
                    duration: ticksPerStep,
                    midi: 60,
                    velocity: Number(step.velocity),
                    probability: step.probability
                }
                notes.push(note)
            }
        }
        // console.log('notes', notes);
        return notes
    }
    async setInstrument (instrument) {
        // console.time('setInstrument')
        const instrumentName = instrument.sampler
        const articulation = instrument.sample
        let _this = this
        return new Promise(async function (resolve, reject) {
            if (!_.isNil(_this.instrument)) {
                Instruments.dispose(_this.instrument.id)
            }
            _this.instrument = await Instruments.create(
                instrumentName,
                articulation
            )
            //console.timeEnd('setInstrument')
            _this.buildAudioChain()
            if (!_.isNil(_this.notes)) {
                _this.instrument.loadPart(_this.notes, false)
            }
            // _this.calculatePart()
            _this.instrument.setVolume(_this.channel.volume.value)
            resolve(_this.instrument)
        })
    }
    setVolume (value) {
        this.channel.volume.value = value
        if (!_.isNil(this.instrument)) {
            this.instrument.setVolume(value)
        }
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
        this.instrument.triggerNote(note)
    }
    triggerAttack (pitch, velocity) {
        this.instrument.triggerAttack(pitch, velocity)
    }
    triggerRelease (pitch) {
        this.instrument.triggerRelease(pitch)
    }
    getNotes () {
        return this.notes
    }
}
