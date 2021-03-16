import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/HiHats/index'

export default class HiHats extends InstrumentBaseClass {
    static instrumentName = 'HiHats';
    static label = 'Hi Hats';
    static folder = 'HiHats';
    static articulations = Samples
    static defaultArticulation = Object.entries(HiHats.articulations)[0][0];
    constructor () {
        super(HiHats.instrumentName, HiHats.articulations, HiHats.folder)
        this.parameters.articulation = HiHats.defaultArticulation;
    }

}
