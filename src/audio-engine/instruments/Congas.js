'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Congas [HC-MC-LC]/index'

export default class Congas extends InstrumentBaseClass {
    static name = 'Congas';
    static label = 'Congas';
    static articulations = Samples
    static defaultArticulation = Object.entries(Congas.articulations)[0];
    constructor () {
        super(Congas.name, Congas.articulations)
        this.parameters.articulation = Congas.defaultArticulation;
    }
}
