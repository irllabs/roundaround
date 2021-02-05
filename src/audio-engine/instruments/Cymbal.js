import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Cymbal [CY]/index'

export default class Cymbal extends InstrumentBaseClass {
    static instrumentName = 'Cymbal';
    static label = 'Cymbal';
    static folder = 'Cymbal [CY]';
    static articulations = Samples
    static defaultArticulation = Object.entries(Cymbal.articulations)[0];
    constructor () {
        super(Cymbal.instrumentName, Cymbal.articulations, Cymbal.folder)
        this.parameters.articulation = Cymbal.defaultArticulation;
    }
}
