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
import CircularProgress from '@material-ui/core/CircularProgress';
import Dropzone from 'react-dropzone'

const styles = theme => ({
    root: {
        width: '100%',
        padding: theme.spacing(1)
    },
    buttonContainer: {
        width: '100%',
        marginBottom: theme.spacing(2),
        display: 'flex',
        justifyContent: 'space-between'
    },
    button: {
        minWidth: 130,
        height: 36
    },
    uploadButton: {
        minWidth: 130,
        height: 36,
        border: '1px dashed rgba(255,255,255,0.2)'
    },

})

class LayerCustomSounds extends Component {
    static contextType = FirebaseContext
    constructor (props) {
        super(props)
        this.state = {
            isInRecordMode: false,
            isRecording: false,
            level: 0,
            recordButtonText: 'Record',
            isInUploadRecordingMode: false,
            isInUploadMode: false
        }
        //this.soundOptions = [{ value: '', label: 'Notes' }, { value: Track.TRACK_TYPE_AUTOMATION, label: 'Automation' }]
        this.onRecordClick = this.onRecordClick.bind(this)
        this.onRecordLevel = this.onRecordLevel.bind(this)
        this.onCountDown = this.onCountDown.bind(this)
        this.onRecordingStarted = this.onRecordingStarted.bind(this)
        this.onRecordingFinished = this.onRecordingFinished.bind(this)
        this.onCustomSampleFileUploaderChange = this.onCustomSampleFileUploaderChange.bind(this)
        this.onDropFile = this.onDropFile.bind(this)
    }
    /*componentDidMount () {
        window.addEventListener('drop', this.onDropFile);
    }*/
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


        let sample = getDefaultSample(this.props.user.id)

        // create local reference to this blob for local use
        sample.localURL = URL.createObjectURL(blob)

        // add to local custom sample cache
        CustomSamples.add(_.cloneDeep(sample))

        console.log('added sample', sample, CustomSamples.samples);

        this.setState({
            recordButtonText: 'Record',
            isRecording: false,
            isInRecordMode: false,
            isInUploadRecordingMode: true
        })




        // upload blob to firebase
        const metadata = {
            contentType: 'audio/wav',
        };
        const _this = this
        const fileRef = this.context.storage.ref().child(this.props.user.id + '/' + sample.id + '.wav')
        let snapshot = await fileRef.put(blob, metadata)

        let downloadURL = await snapshot.ref.getDownloadURL()
        console.log('Uploaded blob!', downloadURL);
        sample.remoteURL = downloadURL
        await _this.context.createSample(sample)

        // update state with new sample
        this.props.dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: this.props.selectedLayer.id, instrument: { sampler: 'custom', sample: sample.id }, user: this.props.user.id } })
        this.setState({
            isInUploadRecordingMode: false
        })
    }

    onCustomSampleFileUploaderChange () {

    }

    async onDropFile (files) {
        console.log('onDropFile', files);
        const file = files?.[0]
        if (!file) {
            return
        }
        console.log(file);
        this.setState({
            isInUploadMode: true
        })

        try {
            let sample = getDefaultSample(this.props.user.id)
            sample.name = file.name
            sample.localURL = URL.createObjectURL(file)
            // add to local custom sample cache
            CustomSamples.add(_.cloneDeep(sample))
            // upload blob to firebase
            const metadata = {
                contentType: 'audio/wav',
            };
            const _this = this
            const blob = await fetch(sample.localURL).then((r) => r.blob())
            const fileRef = this.context.storage.ref().child(this.props.user.id + '/' + sample.id + '.wav')
            let snapshot = await fileRef.put(blob, metadata)

            let downloadURL = await snapshot.ref.getDownloadURL()
            console.log('Uploaded blob!', downloadURL);
            sample.remoteURL = downloadURL
            await _this.context.createSample(sample)

            // update state with new sample
            this.props.dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: this.props.selectedLayer.id, instrument: { sampler: 'custom', sample: sample.id }, user: this.props.user.id } })
            this.setState({
                isInUploadMode: false
            })
        } catch (e) {
            console.log(e)
        }
    }

    render () {
        const { classes } = this.props;
        let startIcon = this.state.isRecording ? <StopIcon /> : <MicIcon />
        let uploadStartIcon = this.state.isInUploadMode ? '' : <UploadIcon />
        let recordButtonColor = this.state.isRecording ? 'red' : 'white'
        if ((this.state.isInRecordMode && !this.state.isRecording) || this.state.isInUploadRecordingMode) {
            startIcon = ''
            recordButtonColor = '#1E1E1E'
        }
        return (
            <Box className={classes.root}>

                <Box className={classes.buttonContainer} display="flex" justifyContent="space-evenly">
                    <Button
                        className={classes.button}
                        variant="contained"
                        color={(this.state.isInRecordMode || this.state.isInUploadRecordingMode) ? 'primary' : 'secondary'}
                        style={{ color: recordButtonColor }}
                        disableElevation
                        startIcon={startIcon}
                        onClick={this.onRecordClick}>
                        {
                            !this.state.isInUploadRecordingMode &&
                            <span>{this.state.recordButtonText}</span>
                        }
                        {
                            this.state.isInUploadRecordingMode &&
                            <CircularProgress color="secondary" size={24} />
                        }
                    </Button>

                    <Dropzone onDrop={this.onDropFile}>
                        {({ getRootProps, getInputProps }) => (
                            <section>
                                <div {...getRootProps()}>
                                    <input {...getInputProps()} />
                                    <Button
                                        className={classes.uploadButton}

                                        color="primary"
                                        disableElevation
                                        startIcon={
                                            uploadStartIcon
                                        }>
                                        {
                                            this.state.isInUploadMode &&
                                            <CircularProgress color="primary" size={24} />
                                        }
                                        {
                                            !this.state.isInUploadMode &&
                                            <span>Upload</span>
                                        }
                                    </Button>
                                </div>
                            </section>
                        )}
                    </Dropzone>



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
