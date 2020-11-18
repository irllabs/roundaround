import * as Tone from 'tone';

class Clock {
  constructor() {
    this.isRunning = false;
  }

  toggle = () => this.isRunning ? this.stop() : this.start();

  start = () => {
    Tone.Transport.start();
    this.isRunning = true;
  };

  stop = () => {
    Tone.Transport.stop();
    this.isRunning = false;
  };
}

const clock = new Clock();
export default clock;
