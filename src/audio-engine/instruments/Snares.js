import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Snares/index'

export default class Snares extends InstrumentBaseClass {
    static instrumentName = 'Snares';
    static label = 'Snare';
    static folder = 'Snares';
    static articulations = Samples
    static samplesCount = Object.entries(Snares.articulations).length;
    static defaultArticulation = Object.entries(Snares.articulations)[Math.floor(Math.random() * Snares.samplesCount)][0];
    constructor () {
        super(Snares.instrumentName, Snares.articulations, Snares.folder)
        this.parameters.articulation = Snares.defaultArticulation;
    }

}
