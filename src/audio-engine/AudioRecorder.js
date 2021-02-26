import * as Tone from 'tone';
import _ from 'lodash'
import { numberRange } from '../utils/index'
import AudioEngine from './AudioEngine'
import MediaRecorder from 'opus-media-recorder';

// opus-media-recorder options
const workerOptions = {
    encoderWorkerFactory: function () {
        return new Worker(process.env.PUBLIC_URL + '/opus-media-recorder/encoderWorker.umd.js')
    },
    OggOpusEncoderWasmPath: process.env.PUBLIC_URL + '/opus-media-recorder/OggOpusEncoder.wasm',
    WebMOpusEncoderWasmPath: process.env.PUBLIC_URL + '/opus-media-recorder/WebMOpusEncoder.wasm',
};

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
        this.hasBegunRecording = false
        this.scheduleCountdownEvent = new Tone.ToneEvent(function () {
            if (!_this.hasBegunCountdown) {
                console.log('first 0 event');
                _this.hasBegunCountdown = true
                _this.startCountdown()
            } else if (!_this.hasBegunRecording) {
                // second time we've passed 0, start recording
                console.log('second 0 event');
                _this.hasBegunRecording = true
                _this.countDownPart.dispose()

                _this.recordingStartedCallback()
                _this.startRecording()
            } else {
                // third time we've passed 0, stop the recording
                console.log('third 0 event');
                _this.scheduleCountdownEvent.dispose()
                _this.stop()
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
        console.log('AudioRecorder::stop()');
        this.hasBegunCountdown = false
        this.hasBegunRecording = false
        if (!_.isNil(this.mic)) {
            this.mic.close()
            clearInterval(this.inputMeterInterval)
        }
        if (!_.isNil(this.recorder)) {
            this.recorder.stop()
        }

    },
    startRecording () {
        console.log('startRecording()');
        const _this = this

        console.log('start recording called');
        this.chunks = []
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const options = { mimeType: 'audio/wav' }
            _this.recorder = new MediaRecorder(stream, options, workerOptions);
            // this.setState({ state: 'inactive' });
            _this.recorder.start();

            _this.recorder.addEventListener('dataavailable', (e) => {
                console.log('Recording stopped, data available');
                _this.chunks.push(e.data)
            });
            _this.recorder.addEventListener('start', (e) => {
                console.log('start');
                //this.setState({ state: 'recording' });
            })
            _this.recorder.addEventListener('stop', (e) => {
                console.log('stop');
                // this.setState({ state: 'inactive' });
                let blob = new Blob(_this.chunks, {
                    type: 'audio/wav'
                })
                _this.recordingFinishedCallback(blob)
            })
            _this.recorder.addEventListener('pause', (e) => {
                console.log('pause');
                // this.setState({ state: 'paused' });
            })
            _this.recorder.addEventListener('resume', (e) => {
                console.log('resume');
                // this.setState({ state: 'recording' });
            })
            _this.recorder.addEventListener('error', (e) => {
                console.log('error');
            })
        });


    }
}
export default AudioRecorder