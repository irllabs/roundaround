import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Hi Hat Open [OH]/index'

export default class HitHatOpen extends InstrumentBaseClass {
    static instrumentName = 'HitHatOpen';
    static label = 'HitHatOpen';
    static folder = 'Hi Hat Open [OH]'
    static articulations = Samples
    static defaultArticulation = Object.entries(HitHatOpen.articulations)[0];
    constructor () {
        super(HitHatOpen.instrumentName, HitHatOpen.articulations, HitHatOpen.folder)
        this.parameters.articulation = HitHatOpen.defaultArticulation;
    }
}
