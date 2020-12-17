'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Clap [CP]/index'

export default class Clap extends InstrumentBaseClass {
    static name = 'Clap';
    static label = 'Clap';
    static articulations = Samples
    static defaultArticulation = Object.entries(Clap.articulations)[0];
    constructor () {
        super(Clap.name, Clap.articulations)
        this.parameters.articulation = Clap.defaultArticulation;
    }
}
