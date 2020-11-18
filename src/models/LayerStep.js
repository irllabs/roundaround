import { uuid } from './SequencerUtil';

const ACTIVE_TTL = 0.6;

const getActivePercent = (activeTtl) => {
  const x = (ACTIVE_TTL - activeTtl) / ACTIVE_TTL;
  return Math.exp(
    -Math.PI * 2 * x ** 2
  );
};

export default class LayerStep {
  constructor(id = '', isOn = false, renderCallback) {
    this.id = id;
    this.isOn = isOn; // user has selected step to be "on"
    this.activeTtl = 0; // current step while sequencer is running
    this.renderCallback = renderCallback;
  }

  toggleStep = () => {
    this.isOn = !this.isOn;
    this.renderCallback();
  };

  handleClick = () => this.toggleStep();

  setAsActive = () => {
    this.activeTtl = ACTIVE_TTL;
  }

  update(elapsedTime) {
    if (this.activeTtl <= 0) {
      return { activePercent: 0 };
    }
    this.activeTtl = this.activeTtl - elapsedTime;
    return { activePercent: getActivePercent(this.activeTtl) };
  }

  clone() {
    const instance = new LayerStep(uuid(), this.isOn, this.renderCallback);
    instance.isActive = this.isActive;
    return instance;
  }
}
