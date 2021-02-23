import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import { connect } from "react-redux";
import MicIcon from '@material-ui/icons/MicOutlined';
import StopIcon from '@material-ui/icons/Stop';
import UploadIcon from '@material-ui/icons/CloudUploadOutlined';
import AudioEngine from '../../../audio-engine/AudioEngine'
import AudioRecorder from '../../../audio-engine/AudioRecorder'
import VUMeter from './VUMeter';
import _ from 'lodash'
import { UPDATE_LAYER_INSTRUMENT, SET_IS_PLAYING } from '../../../redux/actionTypes'
import { FirebaseContext } from '../../../firebase'
import { getDefaultSample } from '../../../utils/defaultData'
import CustomSamples from '../../../audio-engine/CustomSamples'


const styles = theme => ({
    root: {
        width: '100%',
        padding: theme.spacing(1)
    },
    buttonContainer: {
        width: '100%',
        padding: theme.spacing(1),
        marginBottom: theme.spacing(1)
    },
    recordButton: {
        minWidth: 130
    }

})

class LayerCustomSounds extends Component {
    static contextType = FirebaseContext
    constructor (props) {
        super(props)
        this.state = {
            isInRecordMode: false,
            isRecording: false,
            level: 0,
            recordButtonText: 'Record'
        }
        //this.soundOptions = [{ value: '', label: 'Notes' }, { value: Track.TRACK_TYPE_AUTOMATION, label: 'Automation' }]
        this.onRecordClick = this.onRecordClick.bind(this)
        this.onRecordLevel = this.onRecordLevel.bind(this)
        this.onCountDown = this.onCountDown.bind(this)
        this.onRecordingStarted = this.onRecordingStarted.bind(this)
        this.onRecordingFinished = this.onRecordingFinished.bind(this)
    }
    async onRecordClick () {
        if (!this.state.isInRecordMode) {
            console.log('onRecordClick', AudioEngine.isOn);
            if (!AudioEngine.isOn()) {
                AudioEngine.play()
                this.props.dispatch({ type: SET_IS_PLAYING, payload: { value: true } })
            }
            AudioRecorder.start(
                {
                    levelCallback: this.onRecordLevel,
                    countdownCallack: this.onCountDown,
                    recordingStartedCallback: this.onRecordingStarted,
                    recordingFinishedCallback: this.onRecordingFinished
                })
            this.setState({ recordButtonText: 'Ready...' })
        } else {
            AudioRecorder.stop()
        }
        this.setState({
            isInRecordMode: !this.state.isInRecordMode,
        })
    }
    onCountDown (value) {
        this.setState({ recordButtonText: value })
    }
    onRecordLevel (level) {
        this.setState({
            level
        })
    }
    onRecordingStarted () {
        this.setState({ isRecording: true, recordButtonText: 'Recording' })
    }
    async onRecordingFinished (blob) {
        console.log('recording finsished');
        this.setState({
            recordButtonText: 'Record',
            isRecording: false,
            isInRecordMode: false
        })

        let sample = getDefaultSample()

        // create local reference to this blob for local use
        sample.localURL = URL.createObjectURL(blob)

        // add to local custom sample cache
        CustomSamples.add(sample)

        // update state with new sample
        this.props.dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: this.props.selectedLayer.id, instrument: { sampler: 'custom', sample: sample.id }, user: this.props.user.id } })


        // upload blob to firebase
        const metadata = {
            contentType: 'audio/wav',
        };
        const _this = this
        const fileRef = this.context.storage.ref().child(sample.id + '.wav')
        let snapshot = await fileRef.put(blob, metadata)

        let downloadURL = await snapshot.ref.getDownloadURL()
        console.log('Uploaded blob!', downloadURL);
        sample.remoteURL = downloadURL
        await _this.context.createSample(sample)
    }

    render () {
        const { classes } = this.props;
        let startIcon = this.state.isRecording ? <StopIcon /> : <MicIcon />
        let recordButtonColor = this.state.isRecording ? 'red' : 'white'
        if (this.state.isInRecordMode && !this.state.isRecording) {
            startIcon = ''
            recordButtonColor = '#1E1E1E'
        }
        return (
            <Box className={classes.root}>

                <Box className={classes.buttonContainer} display="flex" justifyContent="space-evenly">
                    <Button
                        variant="contained"
                        color="secondary"
                        disableElevation
                        startIcon={<UploadIcon />}>
                        Upload
                        </Button>
                    <Button
                        className={classes.recordButton}
                        variant="contained"
                        color={this.state.isInRecordMode ? 'primary' : 'secondary'}
                        style={{ color: recordButtonColor }}
                        disableElevation
                        startIcon={startIcon}
                        onClick={this.onRecordClick}>
                        {this.state.recordButtonText}
                    </Button>
                </Box>
                {
                    this.state.isInRecordMode &&
                    <VUMeter className={classes.vuMeter} level={this.state.level} />
                }
            </Box>
        )
    }
}

LayerCustomSounds.propTypes = {
    classes: PropTypes.object.isRequired,
};
const mapStateToProps = state => {
    return {
        user: state.user
    };
};


export default connect(
    mapStateToProps
)(withStyles(styles)(LayerCustomSounds));
