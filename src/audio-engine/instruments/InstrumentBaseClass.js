'use strict';
import * as Tone from 'tone';
import { numberRange } from '../../utils';
const Note = require('@tonaljs/note')
import _ from 'lodash'


export default class InstrumentBaseClass {
    constructor (name, articulations) {
        this.id = Math.floor(Math.random() * 999999)
        this.parameters = {}
        this.name = name
        this.articulations = articulations
        this.instrument = null
        this.volume = 1
    }
    dispose () {
        if (!_.isNil(this.instrument) && !_.isNil(this.instrument._context)) {
            this.instrument.releaseAll()
            this.instrument.dispose()
        }
        this.clearPart()
    }
    updateParameter (parameter, value) {
        this.parameters[parameter] = value
    }
    updateParameters (parameters) {
        let _this = this
        Object.keys(parameters).forEach(function (key) {
            if (key !== 'id') {
                _this.updateParameter(key, parameters[key])
            }
        })
    }
    connect (channel) {
        this.connectedToChannel = channel
        this.instrument.connect(this.connectedToChannel)
    }
    load (articulation) {
        let _this = this
        return new Promise(async function (resolve, reject) {
            if (!_.isNil(articulation)) {
                _this.parameters.articulation = articulation
            }
            let sampleMap = _this.getSampleMap()
            _this.sampleMap = _.cloneDeep(sampleMap)
            //  console.log('instrument load()', sampleMap)
            if (!_.isNil(sampleMap)) {
                await _this.loadSamples(sampleMap)
            }
            resolve()
        })
    }
    loadSamples (sampleMap) {
        let _this = this
        return new Promise(function (resolve, reject) {
            _this.dispose()
            _this.instrument = new Tone.Sampler(sampleMap, {
                release: 0.5,
                onload: function () {
                    _this.updateParameters(_this.parameters)
                    if (!_.isNil(_this.connectedToChannel)) {
                        _this.instrument.connect(_this.connectedToChannel)
                    }
                    _this.loaded()
                    resolve()
                }
            })
        })
    }
    loaded () {
        // to be overidden
    }
    loadPart (
        notes
    ) {
        let _this = this
        console.log('instrument loading notes', notes);
        this.clearPart()
        this.notes = _.cloneDeep(notes)
        this.beforeLoadPart(this.notes)
        for (let note of this.notes) {
            note.time += 'i';
            note.duration += 'i';
        }
        this.part = new Tone.Part(function (time, note) {
            if (
                !_.isNil(_this.instrument) &&
                !_.isNil(_this.instrument.context)
            ) {
                _this.instrument.triggerAttackRelease(
                    Tone.Midi(note.midi),
                    note.duration,
                    parseFloat(time),
                    note.velocity
                )
            }
        }, this.notes)
        this.afterPartLoaded()
        this.part.start()
    }
    beforeLoadPart (notes) {
        // to be overidden if necessary
    }
    afterPartLoaded () {
        // to be overidden if necessary
    }
    getNotes () {
        return this.notes
    }
    clearPart () {
        if (!_.isNil(this.part) && !_.isNil(this.part._events)) {
            this.part.dispose()
        }
    }
    releaseAll () {
        this.instrument.releaseAll()
    }
    getSampleMap () {

        let map = {
            'C4': '/samples/Bass Drum [BD]/E808_BD[long]-01.wav'// '/samples/' + this.name + '/' + this.parameters.articulation + '.wav'
        }
        return map
    }
    triggerNote (note) {
        this.instrument.triggerAttackRelease(
            Note.fromMidi(note.midi),
            note.duration + 'i',
            undefined,
            note.velocity
        )
    }
    triggerAttack (pitch, velocity) {
        this.instrument.triggerAttack(Note.fromMidi(pitch), undefined, velocity)
    }
    triggerRelease (pitch) {
        this.instrument.triggerRelease(Note.fromMidi(pitch))
    }
    setVolume (value) {
        let percent = numberRange(value, -48, 6, 0, 1)
        this.volume = percent
    }
}
