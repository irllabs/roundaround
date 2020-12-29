'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Hi Hat Open [OH]/index'

export default class HitHatOpen extends InstrumentBaseClass {
    static name = 'HitHatOpen';
    static label = 'HitHatOpen';
    static articulations = Samples
    static defaultArticulation = Object.entries(HitHatOpen.articulations)[0];
    constructor () {
        super(HitHatOpen.name, HitHatOpen.articulations)
        this.parameters.articulation = HitHatOpen.defaultArticulation;
    }
}