import * as Tone from 'tone';
import LayerStep from './LayerStep';
import clock from './Clock';
import { uuid, } from './SequencerUtil';

// TODO: put this alongside other global settings
Tone.Draw.anticipation = 0.008 * 4;

export default class RoundLayer {
  constructor({ id = '', name = '', numSteps = 8, renderCallback, instrument }) {
    this.id = id;
    this.name = name;
    this.renderCallback = renderCallback;
    this.instrument = instrument;
    this.steps = new Array(numSteps).fill(null).map(() => new LayerStep(uuid(), false, renderCallback));
    this.toneSequence = new Tone.Sequence(this.#scheduleStepActivation, this.steps, `${this.steps.length}n`);
    this.toneSequence.start(0);
    this.nextNumSteps = -1;
  }

  #scheduleStepActivation = (time, step) => {
    // an attempt at real time sequence length editing:
    // if (step.id === this.steps[0].id && this.nextNumSteps >= 0) {
    //   this.toneSequence.stop(0);
    //   this.#calcSequenceModel();
    //   this.nextNumSteps = -1;
    //   this.toneSequence.start(time);
    //   return;
    // }

    if (step.isOn) {
      this.instrument.playAtTime(time);
    }
    Tone.Draw.schedule(() => step.setAsActive(), time);
  };

  #calcSequenceModel = () => {
    if (this.nextNumSteps < this.steps.length) {
      console.log('decrease length...', this.nextNumSteps);
      this.toneSequence.stop(0);

      const steps = this.steps
        .filter((_, index) => index < this.nextNumSteps)
        .map(ele => ele.clone());
      
      this.toneSequence = new Tone.Sequence(this.#scheduleStepActivation, steps, `${steps.length}n`);
      this.steps = steps;
      this.toneSequence.start(0);
      this.nextNumSteps = -1;
      console.log('after', this.steps.length)
      this.renderCallback();
      return;
    }
    if (this.nextNumSteps > this.steps.length) {
      const diff = this.nextNumSteps - this.steps.length;
      const additionalsteps = new Array(diff).fill(null).map(() => new LayerStep(uuid(), false, this.renderCallback));
      
      this.toneSequence.stop(0);
      const steps = this.steps
        .map(ele => ele.clone())
        .concat(additionalsteps);
      this.toneSequence = new Tone.Sequence(this.#scheduleStepActivation, steps, `${steps.length}n`);
      this.steps = steps;
      this.toneSequence.start(0);
      this.nextNumSteps = -1;
      console.log('after...', this.steps.length);
      console.log('seq', this.toneSequence);
      this.renderCallback();
    }
  };

  setLength = (trackLength) => {
    this.nextNumSteps = trackLength;
    if (!clock.isRunning) {
      this.#calcSequenceModel();
    }
  };
}
