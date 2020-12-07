import * as Tone from 'tone';

class Clock {
  constructor () {
    this.isRunning = false;
  }

  toggle = () => this.isRunning ? this.stop() : this.start();

  start = async () => {
    // if (!Tone.Transport.loop) Tone.Transport.loop = true;
    Tone.Transport.start("+0");
    this.isRunning = true;
  };

  stop = () => {
    Tone.Transport.stop();
    this.isRunning = false;
  };
}

const clock = new Clock();
export default clock;
