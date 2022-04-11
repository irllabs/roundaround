import * as Tone from 'tone'
import InstrumentBaseClass from './InstrumentBaseClass'
import { randomBool } from '../../utils/index'
import _ from 'lodash'
import CustomSamples from '../CustomSamples'

export default class Custom extends InstrumentBaseClass {
    static instrumentName = 'custom'
    static label = 'Custom'
    static folder = ''
    static articulations = {}
    static defaultArticulation = null
    constructor(folder) {
        super(Custom.instrumentName, Custom.articulations, Custom.folder)
        this.parameters = {}
        this.parameters.articulation = Custom.defaultArticulation;
        this.name = 'custom'
        this.articulations = {}
        this.folder = folder
        this.instrument = null
        this.part = null
        this.connectedToChannel = null
    }
    updateParameter(parameter, value) {
        this.parameters[parameter] = value
    }
    updateParameters(parameters) {
        Object.keys(parameters).forEach((key) => {
            if (key !== 'id') {
                this.updateParameter(key, parameters[key])
            }
        })
    }
    connect(channel) {
        this.connectedToChannel = channel
        this.instrument.connect(this.connectedToChannel)
    }
    getSampleMap(sample) {
        let url = sample.localURL
        if (_.isNil(url)) {
            url = sample.remoteURL
        }
        let map = {
            'C4': url
        }
        return map
    }
    loaded() {
        // to be overidden
    }
    load(sampleId) {
        // console.log('custom::load()', sampleId);
        return new Promise(async (resolve, reject) => {
            let sample = await CustomSamples.get(sampleId)
            let sampleMap = this.getSampleMap(sample)
            this.sampleMap = _.cloneDeep(sampleMap)
            if (!_.isNil(sampleMap)) {
                await this.loadSamples(sampleMap)
            }
            resolve()
        })
    }
    loadSamples(sampleMap) {
        return new Promise((resolve, reject) => {
            this.dispose()
            try {
                this.instrument = new Tone.Sampler(sampleMap, {
                    onload: () => {
                        this.updateParameters(this.parameters)
                        if (!_.isNil(this.connectedToChannel)) {
                            this.instrument.connect(this.connectedToChannel)
                        }
                        this.loaded()
                        resolve()
                    }
                })
                resolve()
            } catch (e) {
                console.log('error loading samples', e);
            }
        })
    }
    loadPart(
        notes, numberOfBars
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
        this.part.loop = true
        this.part.loopEnd = numberOfBars + ":0:0"
        this.part.start(0)
    }
    beforeLoadPart(notes) {
        // to be overidden if necessary
    }
    afterPartLoaded() {
        // to be overidden if necessary
    }
    dispose() {
        if (!_.isNil(this.instrument) && !_.isNil(this.instrument._context)) {
            this.instrument.releaseAll()
            this.instrument.dispose()
        }
        this.instrument = null
        this.clearPart()
    }
    clearPart() {
        if (!_.isNil(this.part) && !_.isNil(this.part._events)) {
            this.part.dispose()
        }
    }
    calculateMidiNoteFromVelocity(velocity) {
        return 60
    }
}
