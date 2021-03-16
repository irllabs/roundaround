
import * as Tone from 'tone';
import _ from 'lodash'
import { randomBool, numberRange } from '../../utils/index'
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
    load (articulationId) {
        // console.log('InstrumentBaseClass::load()', articulationId);
        let articulation = this.articulations[articulationId]
        let _this = this
        return new Promise(async function (resolve, reject) {
            if (!_.isNil(articulationId)) {
                _this.parameters.articulation = articulationId
            }
            let sampleMap = _this.getSampleMap(articulation)
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
        // console.log('instrument loading notes', notes);
        this.clearPart()
        this.notes = _.cloneDeep(notes)
        this.beforeLoadPart(this.notes)
        for (let note of this.notes) {
            note.time += 'i';
            note.duration += 'i';
            note.midi = this.calculateMidiNoteFromVelocity(note.velocity)
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
    getSampleMap (articulation) {
        // console.log('getSampleMap', articulation);
        let map = {}
        let sampleIndex = 0
        for (let sample of articulation.samples) {
            map['C' + sampleIndex++] = '/samples/' + this.folder + '/' + sample.sample
        }
        /*let map = {
            'C0': '/samples/' + this.folder + '/' + articulation.samples[0].sample,
            'C1': '/samples/' + this.folder + '/' + articulation.samples[1].sample
        }*/
        return map
    }
    /* getSampleMap () {
         // console.log('getSampleMap', this.name, this.folder, this.articulations, this.parameters.articulation);
         let map = {
             'C4': '/samples/' + this.folder + '/' + this.parameters.articulation
         }
         return map
     }*/
    calculateMidiNoteFromVelocity (velocity) {
        // based on this.parameters.articulation.samples calculate midi note that coresponds with velocity
        //return 12 // default 'C0' as midi note 12 ?
        let midiVelocity = numberRange(velocity, 0, 1, 0, 127)
        //console.log('calculateMidiNoteFromVelocity', velocity, midiVelocity, this.articulations);

        const articulation = this.articulations[this.parameters.articulation]
        let sampleIndex = _.findIndex(articulation.samples, (articulation) => {
            return (midiVelocity >= articulation.lovel) && (midiVelocity <= articulation.hivel)
        })
        return (sampleIndex + 1) * 12
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
