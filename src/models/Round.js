import RoundLayer from './RoundLayer';
import Instrument from './Instrument';
import {
  uuid, getRandomNote
} from './SequencerUtil';

export default class Round {
  #layers = [];

  constructor() {
    // TODO: layers should be private
    this.#layers = [
      new RoundLayer({
        id: uuid(),
        name: 'layer-one',
        numSteps: 4,
        renderCallback: this._handleUpdate,
        instrument: new Instrument(getRandomNote(), this._handleUpdate)
      }),
      new RoundLayer({
        id: uuid(),
        name: 'layer-two',
        numSteps: 12,
        renderCallback: this._handleUpdate,
        instrument: new Instrument(getRandomNote(), this._handleUpdate)
      }),
      new RoundLayer({
        id: uuid(),
        name: 'layer-three',
        numSteps: 8,
        renderCallback: this._handleUpdate,
        instrument: new Instrument(getRandomNote(), this._handleUpdate)
      }),
    ];
    this.observers = [];
  }

  addObserver = observer => {
    this.observers.push(observer);
    console.log('addingObserver', observer);
    observer(this.#layers);
  };

  removeObserver = observer => this.observers = this.observer.filter(o => o !== observer);

  _handleUpdate = () => this.observers.forEach(observer => observer(this));

  getLayers = () => this.#layers;

  addLayer = () => {
    const newLayer = new RoundLayer({
      id: uuid(),
      name: `layer-${this.#layers.length}`,
      numSteps: 8,
      renderCallback: this._handleUpdate,
      instrument: new Instrument(getRandomNote(), this._handleUpdate)
    });
    this.#layers.push(newLayer);
    this._handleUpdate();
  };

  deleteLayerById = (id) => {
    this.#layers = this.#layers.filter(sequence => sequence.id !== id);
    this._handleUpdate();
  };

  setLayerLength = (id, length) => {
    const layer = this.#layers.find(sequence => sequence.id === id);
    layer.setLength(length);
    this._handleUpdate();
  };
}
