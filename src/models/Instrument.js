import * as Tone from 'tone';

export default class Instrument {
  #note = 'C4';

  constructor(note = 'C4', renderCallback) {
    this.#note = note;
    this.renderCallback = renderCallback;
    this.noteLength = '64n';
    this.gain = new Tone.Gain(0.2);
    this.synth = new Tone.Synth().chain(
      this.gain,
      Tone.Master
    );
  }

  playAtTime(time) {
    this.synth.triggerAttackRelease(this.#note, this.noteLength, time);
  }

  setNote(note) {
    this.#note = note;
    this.renderCallback();
  }

  getNote() {
    return this.#note;
  }

  setGainLevel(gain) {
    this.gain.gain.linearRampToValueAtTime(gain, 0);
    this.renderCallback();
  }

  getGainLevel() {
    return this.gain.gain.value;
  }
}
