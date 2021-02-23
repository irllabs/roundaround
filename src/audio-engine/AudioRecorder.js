import * as Tone from 'tone';
import Track from './Track';
import _ from 'lodash'
import { numberRange } from '../utils/index'
import AudioEngine from './AudioEngine'

const AudioRecorder = {
    async start ({ levelCallback, countdownCallack, recordingStartedCallback, recordingFinishedCallback }) {
        this.levelCallback = levelCallback
        this.countdownCallack = countdownCallack
        this.recordingStartedCallback = recordingStartedCallback
        this.recordingFinishedCallback = recordingFinishedCallback
        AudioEngine.startAudioContext()
        this.inputMeter = new Tone.Meter();
        this.mic = new Tone.UserMedia().connect(this.inputMeter);
        const _this = this

        try {
            await this.mic.open()
            console.log("mic open");

            _this.inputMeterInterval = setInterval(() => {
                if (!_.isNil(levelCallback)) {
                    let level = _this.inputMeter.getValue()
                    if (level < -65) {
                        level = -65
                    } else if (level > 0) {
                        level = 0
                    }
                    levelCallback(numberRange(level, -65, 0, 0, 1))
                }
            }, 100);

            // create event to actually start recording on 1st beat of the bar
            _this.scheduleCountdown()


        } catch (e) {
            console.log('Error opening mic', e);
        }
    },
    scheduleCountdown () {
        let _this = this
        this.hasBegunCountdown = false
        this.scheduleCountdownEvent = new Tone.ToneEvent(function () {
            if (!_this.hasBegunCountdown) {
                console.log('first 0 event');
                _this.hasBegunCountdown = true
                _this.startCountdown()
            } else {
                // second time we've passed 0, start recording
                console.log('second 0 event');
                _this.countDownPart.dispose()
                _this.scheduleCountdownEvent.dispose()
                _this.recordingStartedCallback()
                _this.startRecording()
            }
        });
        this.scheduleCountdownEvent.start("0m");
        // todo: start round playing if not already playing

    },
    startCountdown () {
        const _this = this
        let PPQ = Tone.Transport.PPQ
        let events = [
            {
                time: '0i',
                type: 'countdown',
                value: 4
            },
            {
                time: PPQ + 'i',
                type: 'countdown',
                value: 3
            },
            {
                time: (PPQ * 2) + 'i',
                type: 'countdown',
                value: 2
            },
            {
                time: (PPQ * 3) + 'i',
                type: 'countdown',
                value: 1
            }
        ]

        this.countDownPart = new Tone.Part(function (time, event) {
            Tone.Draw.schedule(function () {
                if (!_.isNil(_this.countdownCallack)) {
                    _this.countdownCallack(event.value)
                }

            }, time)
        }, events)
        this.countDownPart.start("0m")
        // will probably miss the first event as it's just happened (to trigger this function) so call straightaway
        _this.countdownCallack(4)
    },
    async stop () {
        return new Promise(async (resolve, reject) => {
            let sampleId = null
            if (!_.isNil(this.mic)) {
                this.mic.close()
                clearInterval(this.inputMeterInterval)
            }
            if (!_.isNil(this.recorder)) {
                const recording = await this.recorder.stop()
                const url = URL.createObjectURL(recording);
                // todo upload file to firebase to get sample id
                sampleId = url
            }
            resolve(sampleId)
        })
    },
    startRecording () {
        console.log('startRecording()');
        this.recorder = new Tone.Recorder();
        this.mic.connect(this.recorder)
        this.recorder.start();
    }
}
export default AudioRecorder