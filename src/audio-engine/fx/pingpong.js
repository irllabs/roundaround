
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';

export default class PingPong extends FXBaseClass {
    static fxName = 'pingpong';
    static icon =
        `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.000488281" width="32.0004" height="32" rx="16" fill="white" fill-opacity="0.1"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M14.6388 20.6881C14.9781 21.0573 15.431 21.3333 16.0008 21.3333C17.0644 21.3333 17.6931 20.5446 18.078 19.7634C18.4623 18.9834 18.7264 17.9712 18.9676 17.0462L18.9793 17.0016C19.2348 16.0219 19.4685 15.1376 19.7864 14.4926C20.1098 13.8362 20.3978 13.6667 20.6675 13.6667C21.0357 13.6667 21.3342 13.3682 21.3342 13C21.3342 12.6318 21.0357 12.3333 20.6675 12.3333C19.604 12.3333 18.9752 13.1221 18.5903 13.9032C18.206 14.6832 17.942 15.6955 17.7007 16.6205L17.6891 16.6651C17.4335 17.6448 17.1998 18.5291 16.882 19.1741C16.5585 19.8305 16.2706 20 16.0008 20C15.9039 20 15.7838 19.9635 15.6205 19.7859C15.4463 19.5963 15.2661 19.2886 15.0861 18.8507C14.7255 17.9737 14.4458 16.783 14.15 15.5152L14.1408 15.4759C13.856 14.2553 13.5545 12.9631 13.1486 11.9757C12.9432 11.4761 12.6911 11.0026 12.3626 10.6452C12.0233 10.276 11.5704 10 11.0007 10C10.0851 10 9.41949 10.4454 8.97343 11.0537C8.54677 11.6355 8.31348 12.3696 8.18021 13.0359C8.04492 13.7124 8.00126 14.3793 7.99034 14.8706C7.98485 15.1179 7.98758 15.3247 7.99175 15.4709C7.99384 15.544 7.9963 15.6023 7.9983 15.6431C7.9993 15.6635 8.00018 15.6795 8.00084 15.691L8.00166 15.7046L8.00201 15.7101L8.00207 15.711C8.02657 16.0784 8.34424 16.3563 8.71163 16.3319C9.07886 16.3074 9.35675 15.99 9.33251 15.6228L9.33243 15.6215L9.33196 15.6137L9.33007 15.578C9.32849 15.5455 9.32639 15.4963 9.32457 15.4328C9.32094 15.3055 9.31846 15.1216 9.32338 14.9002C9.33329 14.4541 9.37297 13.871 9.48768 13.2974C9.60442 12.7137 9.7878 12.1979 10.0487 11.8422C10.2901 11.5129 10.5829 11.3333 11.0007 11.3333C11.0976 11.3333 11.2176 11.3698 11.3809 11.5475C11.5551 11.737 11.7353 12.0447 11.9153 12.4827C12.2759 13.3596 12.5556 14.5503 12.8515 15.8182L12.8606 15.8574C13.1454 17.0781 13.4469 18.3702 13.8529 19.3577C14.0583 19.8572 14.3104 20.3308 14.6388 20.6881Z" fill="white" fill-opacity="0.9"/>
            <path opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" d="M17.3187 10.6452C17.6581 10.2759 18.1109 9.99992 18.6807 9.99992C19.7443 9.99992 20.373 10.7887 20.7579 11.5698C21.1423 12.3498 21.4063 13.362 21.6476 14.2871L21.6592 14.3316C21.9148 15.3113 22.1485 16.1957 22.4663 16.8407C22.7897 17.497 23.0777 17.6666 23.3475 17.6666C23.7157 17.6666 24.0142 17.9651 24.0142 18.3333C24.0142 18.7014 23.7157 18.9999 23.3475 18.9999C22.2839 18.9999 21.6552 18.2111 21.2703 17.43C20.8859 16.65 20.6219 15.6378 20.3806 14.7128L20.369 14.6682C20.1134 13.6885 19.8797 12.8041 19.5619 12.1592C19.2384 11.5028 18.9505 11.3333 18.6807 11.3333C18.5838 11.3333 18.4637 11.3697 18.3005 11.5474C18.1263 11.7369 17.9461 12.0447 17.766 12.4826C17.4055 13.3596 17.1257 14.5502 16.8299 15.8181L16.8207 15.8573C16.5359 17.078 16.2344 18.3702 15.8285 19.3576C15.6231 19.8572 15.371 20.3307 15.0426 20.688C14.7032 21.0572 14.2504 21.3333 13.6806 21.3333C12.765 21.3333 12.0994 20.8878 11.6534 20.2796C11.2267 19.6978 10.9934 18.9637 10.8601 18.2973C10.7248 17.6209 10.6812 16.954 10.6703 16.4626C10.6648 16.2153 10.6675 16.0086 10.6717 15.8624C10.6738 15.7892 10.6762 15.731 10.6782 15.6902C10.6792 15.6698 10.6801 15.6537 10.6808 15.6423L10.6816 15.6287L10.6819 15.6232L10.682 15.6222C10.7065 15.2549 11.0242 14.9769 11.3916 15.0014C11.7588 15.0259 12.0367 15.3433 12.0124 15.7105L12.0124 15.7118L12.0119 15.7196L12.01 15.7553C12.0084 15.7877 12.0063 15.8369 12.0045 15.9005C12.0009 16.0277 11.9984 16.2116 12.0033 16.433C12.0132 16.8792 12.0529 17.4623 12.1676 18.0358C12.2843 18.6195 12.4677 19.1354 12.7286 19.4911C12.97 19.8203 13.2628 19.9999 13.6806 19.9999C13.7775 19.9999 13.8975 19.9634 14.0608 19.7858C14.235 19.5962 14.4152 19.2885 14.5953 18.8506C14.9558 17.9736 15.2356 16.7829 15.5314 15.5151L15.5406 15.4759C15.8254 14.2552 16.1269 12.963 16.5328 11.9756C16.7382 11.476 16.9903 11.0025 17.3187 10.6452Z" fill="white" fill-opacity="0.9"/>
        </svg>`

    constructor(fxParameters) {
        super(fxParameters)
        this._mix = 0.2
        this._mixBeforeBypass = this._mix
        this.label = 'Ping-pong delay'
        this._delayTime = '9t';
        this._feedback = 0.7
        this.isOn = fxParameters.isOn
    }

    setDelayTime(value) {
        this._delayTime = value
        if (this.isOn) {
            this.fx.delayTime.value = value
        }
    }
    setFeedback(value) {
        this._feedback = value
        if (this.isOn) {
            this.fx.feedback.value = value
        }
    }
    setMix(value, time) {
        this._mix = value
        if (this.isOn) {
            if (!_.isNil(time)) {
                this.fx.wet.setValueAtTime(value, time)
            } else {
                this.fx.wet.value = value
            }
        }
    }
    setBypass(value, time) {
        if (value === true && !this._override) {
            // set mix to 0 rather than turn off so that we can do this rapidly without needing to rebuild the audio chain
            if (this._mix > 0) {
                this._mixBeforeBypass = this._mix
            }
            this.setMix(0, time)
        } else {
            this.setMix(this._mixBeforeBypass, time)
        }
    }

    enable() {
        this.fx = new Tone.PingPongDelay(this._delayTime, this._feedback)
        this.fx.wet.value = this._mix
        this.setBypass(true)
    }

    getAutomationOptions() {
        return [
            {
                label: 'Enabled',
                name: 'enabled',
                setParameter: this.setBypass.bind(this),
                calculateValue: function (value) {
                    return value === true ? false : true
                }
            },
            /*{
                label: 'Time',
                value: 'delayTime',
                calculateValue: function (value) {
                    // function to take a 0 - 1 value from interface and return appropriate value for this FX parameter
                    return numberRange(value, 0, 1, 0, 2000)
                }
            },
            {
                label: 'Feedback',
                value: 'feedback',
                calculateValue: function (value) {
                    // function to take a 0 - 1 value from interface and return appropriate value for this FX parameter
                    return value
                }
            },
            {
                label: 'Mix',
                value: 'mix',
                calculateValue: function (value) {
                    // function to take a 0 - 1 value from interface and return appropriate value for this FX parameter
                    return value
                }
            }*/
        ]
    }
}
