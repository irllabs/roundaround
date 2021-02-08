import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Bass Drum [BD]/index'

export default class BassDrum extends InstrumentBaseClass {
    static instrumentName = 'BassDrum';
    static label = 'Bass drum';
    static folder = 'Bass Drum [BD]'
    static articulations = Samples
    static defaultArticulation = Object.entries(BassDrum.articulations)[0];
    constructor () {
        super(BassDrum.instrumentName, BassDrum.articulations, BassDrum.folder)
        this.parameters.articulation = BassDrum.defaultArticulation;
    }
}
