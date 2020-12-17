'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';

export default class BassDrum extends InstrumentBaseClass {
    static name = 'BassDrum';
    static label = 'Bass drum';
    static articulations = {
        'bdLong04': 'E808_BD[short]-01.wav',
        '808 Bass drum 2': 'E808_BD[short]-06.wav'
    };
    static defaultArticulation = '808 Bass drum 1';
    constructor () {
        super(BassDrum.name, BassDrum.articulations)
        this.parameters.articulation = BassDrum.defaultArticulation;
    }
}
