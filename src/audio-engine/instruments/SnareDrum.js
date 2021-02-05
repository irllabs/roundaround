import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Snare Drum [SD]/index'

export default class SnareDrum extends InstrumentBaseClass {
    static instrumentName = 'SnareDrum';
    static label = 'SnareDrum';
    static folder = 'Snare Drum [SD]'
    static articulations = Samples
    static defaultArticulation = Object.entries(SnareDrum.articulations)[0];
    constructor () {
        super(SnareDrum.instrumentName, SnareDrum.articulations, SnareDrum.folder)
        this.parameters.articulation = SnareDrum.defaultArticulation;
    }
}
