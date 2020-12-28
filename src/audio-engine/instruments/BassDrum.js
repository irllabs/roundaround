'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Bass Drum [BD]/index'

export default class BassDrum extends InstrumentBaseClass {
    static name = 'BassDrum';
    static label = 'Bass drum';
    //static articulations = { 'bdLong01': 'samples/Bass Drum [BD]/E808_BD[long]-01.wav', 'bdLong04': 'samples/Bass Drum [BD]/E808_BD[long]-04.wav' }
    static articulations = Samples
    static defaultArticulation = Object.entries(BassDrum.articulations)[0];
    constructor () {
        super(BassDrum.name, BassDrum.articulations)
        this.parameters.articulation = BassDrum.defaultArticulation;
    }
}
