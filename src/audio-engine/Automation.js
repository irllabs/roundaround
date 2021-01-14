'use strict';
import * as Tone from 'tone';
const Note = require('@tonaljs/note')
import _ from 'lodash'
import AudioEngine from '../audio-engine/AudioEngine'

export default class Automation {
    constructor (fxId, userId) {
        this.userId = userId
        this.fx = null
        this.setFx(fxId)
    }
    setFx (fxId) {
        console.log('Automation::setFx()', fxId, this.userId, AudioEngine.busesByUser);
        this.dispose()
        if (!_.isNil(fxId)) {
            this.fxId = fxId
            this.fx = _.find(AudioEngine.busesByUser[this.userId].sortedFx, { id: this.fxId })
            console.log('automation fx', this.fx);
        }
    }
    loadSteps (steps) {
        console.log('automation loading steps', steps, this.fx);
        this.clearPart()
        let notes = this.convertStepsToNotes(steps)

        const toneNotes = _.cloneDeep(notes)
        for (let toneNote of toneNotes) {
            toneNote.time += 'i';
            toneNote.duration += 'i';
        }
        const fx = this.fx
        const automationOptions = fx.getAutomationOptions()
        const enabledOption = _.find(automationOptions, { name: 'enabled' })

        this.part = new Tone.Part(function (time, note) {
            //const frequency = note.isOn ? 500 : 20000
            //fx.fx.frequency.setValueAtTime(frequency, time)
            if (note.isOn) {
                enabledOption.setParameter(enabledOption.calculateValue(true), time)
            } else {
                enabledOption.setParameter(enabledOption.calculateValue(false), time)
            }

        }, toneNotes)
        this.part.start(0)
    }
    convertStepsToNotes (steps) {
        const PPQ = Tone.Transport.PPQ
        const totalTicks = PPQ * 4
        const ticksPerStep = Math.round(totalTicks / steps.length)
        let notes = []
        let currentNote;
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i]
            if (step.isOn) {
                if (_.isNil(currentNote)) {
                    currentNote = {
                        time: i * ticksPerStep,
                        duration: 0
                    }
                }
                currentNote.duration += ticksPerStep
            } else {
                if (!_.isNil(currentNote)) {
                    let noteOn = _.cloneDeep(currentNote)
                    noteOn.isOn = true
                    let noteOff = _.cloneDeep(currentNote)
                    noteOff.isOn = false
                    noteOff.time = currentNote.time + currentNote.duration
                    notes.push(noteOn)
                    notes.push(noteOff)
                    currentNote = null
                } else if (i === 0) {
                    currentNote = {
                        time: 0,
                        duration: ticksPerStep
                    }
                    let noteOff = _.cloneDeep(currentNote)
                    noteOff.isOn = false
                    notes.push(noteOff)
                    currentNote = null
                }
            }
            if (i === steps.length - 1) {
                if (!_.isNil(currentNote)) {
                    let noteOn = _.cloneDeep(currentNote)
                    noteOn.isOn = true
                    let noteOff = _.cloneDeep(currentNote)
                    noteOff.isOn = false
                    noteOff.time = currentNote.time + currentNote.duration
                    notes.push(noteOn)
                    notes.push(noteOff)
                    currentNote = null
                }
            }
        }
        return notes
    }
    clearPart () {
        if (!_.isNil(this.part) && !_.isNil(this.part._events)) {
            this.part.dispose()
        }
    }
    dispose () {
        console.log('automation dispose()');
        if (!_.isNil(this.fx)) {
            this.clearPart()
            // restore fx back to default (bypassed) state
            console.log('bypassing old fx');
            const fx = this.fx
            const automationOptions = fx.getAutomationOptions()
            const enabledOption = _.find(automationOptions, { name: 'enabled' })
            enabledOption.setParameter(enabledOption.calculateValue(false))
            this.fx = null
        }
    }
}
