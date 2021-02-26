
import * as Tone from 'tone';
import _ from 'lodash'
import { randomBool } from '../../utils/index'
const Note = require('@tonaljs/note')

export default class InstrumentBaseClass {
    constructor (name, articulations, folder) {
        this.id = Math.floor(Math.random() * 999999)
        this.parameters = {}
        this.name = name
        this.articulations = articulations
        this.folder = folder
        this.instrument = null
    }
    dispose () {
        if (!_.isNil(this.instrument) && !_.isNil(this.instrument._context)) {
            this.instrument.releaseAll()
            this.instrument.dispose()
        }
        this.instrument = null
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
        //  console.log('InstrumentBaseClass::load()', articulation);
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
            //   console.log('instrument finished loading');
            resolve()
        })
    }
    loadSamples (sampleMap) {
        let _this = this
        return new Promise(function (resolve, reject) {
            _this.dispose()
            try {
                _this.instrument = new Tone.Sampler(sampleMap, {
                    onload: function () {
                        _this.updateParameters(_this.parameters)
                        if (!_.isNil(_this.connectedToChannel)) {
                            _this.instrument.connect(_this.connectedToChannel)
                        }
                        _this.loaded()
                        resolve()
                    }
                })
            } catch (e) {
                console.log('error loading samples', e);
            }

        })
    }
    loaded () {
        // to be overidden
    }
    loadPart (
        notes
    ) {
        let _this = this
        //console.log('instrument loading notes', notes);
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
                let shouldPlayNote = true
                if (note.probability < 1) {
                    shouldPlayNote = randomBool(note.probability)
                }
                if (shouldPlayNote) {
                    _this.instrument.triggerAttackRelease(
                        Tone.Midi(note.midi),
                        note.duration,
                        time,
                        note.velocity
                    )
                }
            }
        }, this.notes)
        this.afterPartLoaded()
        // console.log('this.part', this.part);
        this.part.start(0)
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
        // console.log('getSampleMap', this.name, this.folder, this.articulations, this.parameters.articulation);
        let map = {
            'C4': '/samples/' + this.folder + '/' + this.parameters.articulation
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
}
