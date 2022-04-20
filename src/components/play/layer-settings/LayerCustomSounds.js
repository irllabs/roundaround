import React, { Component } from 'react'
import { withStyles } from '@material-ui/styles';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import { connect } from "react-redux";
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
        display: 'flex',
        width: '100%',
        padding: theme.spacing(1)
    },
    buttonContainer: {
        flex: 1,
        marginBottom: theme.spacing(2),
        display: 'flex',
        justifyContent: 'space-between',
        [theme.breakpoints.down('sm')]: {
            flexDirection: "column"
        }
    },
    fullWidthFlex: {
        display: 'flex',
        flex: 1
    },
    button: {
        minWidth: 130,
        height: 36,
        [theme.breakpoints.down('sm')]: {
            marginBottom: theme.spacing(1),
            minWidth: 118
        }
    },
    uploadButton: {
        flex: 1,
        width: '100%',
        minWidth: '100%',
        border: '1px dashed rgba(255,255,255,0.2)',
    },

})

class LayerCustomSounds extends Component {
    static contextType = FirebaseContext
    constructor(props) {
        super(props)
        this.state = {
            mode: null,
            //isInRecordMode: false,
            isRecording: false,
            level: 0,
            recordButtonText: 'Record',
            //isInUploadRecordingMode: false,
            //isInUploadMode: false,
            //
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
    async onRecordClick() {
        // console.log('onRecordClick', this.state.mode)
        if (_.isNil(this.state.mode)) {
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
            this.setState({
                recordButtonText: 'Ready...',
                mode: 'countdown'
            })
        } else if (this.state.mode === 'recording') {
            AudioRecorder.stop()
        } else {
            // console.log('ignoring click');
        }
    }
    onCountDown(value) {
        this.setState({ recordButtonText: value })
    }
    onRecordLevel(level) {
        this.setState({
            level
        })
    }
    onRecordingStarted() {
        this.setState({ mode: 'recording', recordButtonText: 'Recording' })
    }
    async onRecordingFinished(blob) {
        // console.log('recording finsished');
        this.setState({ mode: 'upload' })

        let sample = getDefaultSample(this.props.user.id)

        // create local reference to this blob for local use
        sample.localURL = URL.createObjectURL(blob)

        // add to local custom sample cache
        CustomSamples.add(_.cloneDeep(sample))

        // console.log('added sample', sample, CustomSamples.samples);

        // upload blob to firebase
        const metadata = {
            contentType: 'audio/wav',
        };
        const _this = this
        const fileRef = this.context.storage.ref().child(this.props.user.id + '/' + sample.id + '.wav')
        let snapshot = await fileRef.put(blob, metadata)

        let downloadURL = await snapshot.ref.getDownloadURL()
        // console.log('Uploaded blob!', downloadURL);
        sample.remoteURL = downloadURL
        await _this.context.createSample(sample)

        // update state with new sample
        this.props.dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: this.props.selectedLayer.id, instrument: { sampler: 'custom', sample: sample.id }, user: this.props.user.id } })
        this.setState({
            mode: null,
            recordButtonText: 'Record'
        })
        this.context.updateLayer(this.props.roundId, this.props.selectedLayer.id, { instrument: { sampler: 'custom', sample: sample.id } })

    }

    onCustomSampleFileUploaderChange() {

    }

    async onDropFile(files) {
        // console.log('onDropFile', files);
        const file = files?.[0]
        if (!file) {
            return
        }
        // console.log(file);
        this.setState({
            mode: 'fileUpload'
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
            //  console.log('Uploaded blob!', downloadURL);
            sample.remoteURL = downloadURL
            await _this.context.createSample(sample)

            // update state with new sample
            this.props.dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: this.props.selectedLayer.id, instrument: { sampler: 'custom', sample: sample.id }, user: this.props.user.id } })
            this.setState({
                mode: null
            })
            this.context.updateLayer(this.props.roundId, this.props.selectedLayer.id, { instrument: { sampler: 'custom', sample: sample.id } })

        } catch (e) {
            console.log(e)
        }
    }

    render() {
        //console.log('########### render()', this.state.mode);
        const { classes } = this.props;
        let uploadStartIcon = this.state.mode === 'fileUpload' ? '' : <UploadIcon />
        return (
            <Box className={classes.root}>
                <Box className={classes.buttonContainer} display="flex">
                    <Dropzone className={classes.fullWidthFlex} onDrop={this.onDropFile}>
                        {({ getRootProps, getInputProps }) => (
                            <section className={classes.fullWidthFlex}>
                                <div className={classes.fullWidthFlex} {...getRootProps()}>
                                    <input {...getInputProps()} />
                                    <Button
                                        className={classes.uploadButton}
                                        color="primary"
                                        disableElevation
                                        startIcon={
                                            uploadStartIcon
                                        }>
                                        {
                                            this.state.mode === 'fileUpload' &&
                                            <CircularProgress color="primary" size={24} />
                                        }
                                        {
                                            !this.state.mode === 'fileUpload' &&
                                            <span>Upload</span>
                                        }
                                    </Button>
                                </div>
                            </section>
                        )}
                    </Dropzone>
                </Box>
                {
                    (this.state.mode === 'recording' || this.state.mode === 'countdown') &&
                    <VUMeter className={classes.vuMeter} level={this.state.level} />
                }
            </Box>
        )
    }
}

const mapStateToProps = state => {
    return {
        user: state.user
    };
};


export default connect(
    mapStateToProps
)(withStyles(styles)(LayerCustomSounds));
