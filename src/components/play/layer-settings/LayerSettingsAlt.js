import React, { Component } from 'react'
import { connect } from "react-redux";
import { Divider, Typography } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import _ from 'lodash'
import {
    SET_LAYER_MUTE,
    REMOVE_LAYER,
    SET_IS_SHOWING_LAYER_SETTINGS,
    SET_LAYER_STEPS,
    SET_SELECTED_LAYER_ID,
    ADD_LAYER
} from '../../../redux/actionTypes'
import Box from '@material-ui/core/Box';
import { withStyles } from '@material-ui/core/styles';
import AudioEngine from '../../../audio-engine/AudioEngine'
import Instruments from '../../../audio-engine/Instruments'

/** SVGs */
import Close from './resources/svg/close.svg'
import AddLayer from './resources/svg/add.svg'
import LayerIcon from './resources/svg/layer.svg'
import ChangeInstrument from './resources/svg/instruments.svg'
import HiHats from './resources/svg/hihat.svg'
import Kick from './resources/svg/kick.svg'
import Snare from './resources/svg/snare.svg'
import Perc from './resources/svg/perc.svg'
import Volume from './resources/svg/volume.svg'
import Muted from './resources/svg/muted.svg'
import Erasor from './resources/svg/erasor.svg'
import Trash from './resources/svg/trash.svg'

import VolumeSlider from './VolumeSlider'
import LayerInstrument from './LayerInstrument'
//import LayerNumberOfSteps from './LayerNumberOfSteps'
import { FirebaseContext } from '../../../firebase';
import LayerAutomation from './LayerAutomation';
import Track from '../../../audio-engine/Track'
import LayerInstrumentAlt from './LayerInstrumentAlt'
import LayerPopup from './LayerPopup'
import VolumePopup from './VolumePopup'
import LayerCustomSounds from './LayerCustomSounds'
import { getDefaultLayerData } from '../../../utils/defaultData';
import LayerListPopup from './LayerListPopup';

const styles = theme => ({
    container: {
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
        bottom: 0,
        right: '30%',
        left: '30%',
        [theme.breakpoints.down('md')]: {
            right: '20%',
            left: '20%'
        },
    },
    drawer: {
        backgroundColor: '#2E2E2E',
        '& .MuiPaper-root': {
            backgroundColor: '#2E2E2E',
        }
    },
    root: {
        position: 'relative',
        display: "flex",
        flexDirection: "row",
        height: 48,
        borderRadius: 32,
        marginBottom: 20,
        justifyContent: "flex-start",
        alignItems: "center",
        width: 547,
        /*'& > *': {
            marginBottom: '1rem'
        },*/
        backgroundColor: '#333333',
        [theme.breakpoints.down('md')]: {
            height: 48,
        },
    },
    mixerPopup: {
        position: 'absolute',
        opacity: 1,
        top: -247,
        height: 243,
        right: 0,
        left: 48,
        borderRadius: 8,
        zIndex: 100,
        boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.15), 0px 4px 6px rgba(0, 0, 0, 0.15)',
        backgroundColor: '#333333',
        overflow: 'hidden',
        overflowY: 'scroll',
        transition: 'opacity 0.2s ease-in',
        [theme.breakpoints.down('sm')]: {
            top: -247,
        },
        [theme.breakpoints.down('sm')]: {
            left: 0,
        },
    },
    mixerPopupHeader: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: '10px 15px',
        borderBottom: 'thin solid rgba(255, 255, 255, 0.1)'
    },
    mixerPopupHeaderText: {
        marginLeft: 13,
        fontSize: 18
    },
    instrumentPopup: {
        position: 'absolute',
        bottom: 47,
        backgroundColor: '#333333',
        right: 0,
        left: 0,
        borderRadius: 8,
        padding: '5px 0',
        zIndex: 100,
        boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.15), 0px 4px 6px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        transition: 'opacity 0.2s ease-in',
    },
    addLayerContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
        backgroundColor: '#4D4D4D',
        height: '100%',
        borderRadius: 30
    },
    iconButtons: {
        width: 48,
        height: 48,
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
        },
        [theme.breakpoints.down('sm')]: {
            width: 32,
            height: 32,
        },
    },
    rectButton: {
        display: 'flex',
        flexDirection: 'row',
        padding: '5px 15px',
        width: '100%',
        borderRadius: 0
    },
    mixerButton: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        height: 32,
        width: 32,
        marginLeft: 5,
        marginRight: 5,
        [theme.breakpoints.down('sm')]: {
            width: 32,
            height: 32,
        },
    },
    volumeSliderContainer: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center'
    },
    instrumentIcon: {
        width: 13.5,
        height: 16
    },
    instrumentSummary: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        margin: '10px 0',
        width: 216,
        height: 32,
        fontWeight: 'bold',
        padding: '6px 15px',
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255, 0.1)'
    },
    stepCount: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        margin: '10px 0',
        width: 59,
        height: 32,
        padding: '5px 15px',
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255, 0.1)'
    },
    stepLength: {
        display: 'flex',
        alignItems: 'flex-start',
        lineHeight: 1,
    },
    actionButtonContainer: {
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButton: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        height: 32,
        width: 32,
        margin: '10px 0',
        backgroundColor: 'rgba(255,255,255, 0.1)',
    },
    msg: {
        flex: 1,
        textAlign: 'center'
    },
    containerSoloMute: {
        flex: 1,
        display: 'flex',
        paddingLeft: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    layerContainer: {
        display: 'flex',
        flexDirection: 'column',
    },
    layerSubContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
        }
    },
    layer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        borderBottom: 'thin solid rgba(255, 255, 255, 0.1)',
        paddingTop: 10,
        paddingBottom: 10,
        marginLeft: 20,
        marginRight: 20
    },
    layerOptions: {
        position: 'relative',
        width: '90%',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center'
    },
    plainButton: {
        '&:hover': {
            backgroundColor: 'transparent'
        }
    },
    buttonContainer: {
        width: '100%',
        marginBottom: theme.spacing(2),
        [theme.breakpoints.down('sm')]: {
            flexDirection: "column"
        },
    },
    containedButton: {
        [theme.breakpoints.down('sm')]: {
            marginBottom: theme.spacing(1)
        },
    },
    soundTabs: {
        marginBottom: theme.spacing(2),
        '& .MuiTab-root': {
            minWidth: 134
        }
    },
    divider: {
        width: '100%',
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
    hidden: {
        opacity: 0,
        position: 'absolute',
        top: '200%',
        transition: 'opacity 0.2s ease-out'
    }
})

class LayerSettings extends Component {
    constructor(props) {
        super(props)
        this.state = {
            showMixerPopup: false,
            showInstrumentsPopup: false,
            showInstrumentsList: false,
            showSoundsList: false,
            showArticulationOptions: false,
            showLayerPopup: false,
            showVolumePopup: false,
            instrumentOptions: Instruments.getInstrumentOptions(false),
            selectedInstrument: ''
        }
        this.addLayerButton = React.createRef()
        this.mixerPopupButton = React.createRef()
        this.instrumentPopupButton = React.createRef()
        this.layerPopupButton = React.createRef()
        this.volumePopupButton = React.createRef()
        this.instrumentsButton = React.createRef()
        this.soundsButton = React.createRef()
        this.addStepsButton = React.createRef()
        this.subtractStepsButton = React.createRef()
        this.percentageButton = React.createRef()
        this.msButton = React.createRef()
    }

    static contextType = FirebaseContext;

    componentDidMount() {
        window.addEventListener('click', this.onClick)
        if (this.props.round && this.props.selectedLayerId) {
            const selectedLayer = _.find(this.props.round.layers, { id: this.props.selectedLayerId })
            this.setSelectedInstrument(selectedLayer)
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.round && this.props.selectedLayerId) {
            const selectedLayer = _.find(this.props.round.layers, { id: this.props.selectedLayerId })
            //console.log('instrument in sampler', !selectedLayer.instrument.sampler.indexOf(this.state.selectedInstrument) > -1)
            if (selectedLayer &&
                (
                    (prevProps.selectedLayerId !== this.props.selectedLayerId) ||
                    (!this.state.selectedInstrument && selectedLayer)
                    //|| (this.state.selectedInstrument && (selectedLayer.instrument.sampler.indexOf(this.state.selectedInstrument) === -1))
                )
            ) {
                this.setSelectedInstrument(selectedLayer)
            }
            if (this.state.selectedInstrument) {
                const selectedInstArray = this.state.selectedInstrument.split('');
                const firstTwo = selectedInstArray[0] + selectedInstArray[1];
                selectedLayer.instrument.sampler.indexOf(firstTwo) === -1 && this.setSelectedInstrument(selectedLayer)
            }
        }
    }

    componentWillUnmount() {
        window.removeEventListener('click', this.onClick)
    }

    setSelectedInstrument = async (selectedLayer) => {
        const instrumentOptions = await Instruments.getInstrumentOptions(false)
        if (instrumentOptions && this.props.round) {
            const localLayer = _.find(this.props.round.layers, { id: this.props.selectedLayerId })
            const sampler = selectedLayer?.instrument?.sampler || localLayer?.instrument?.sampler;
            const instrument = _.find(instrumentOptions, { name: sampler })
            if (instrument)
                this.setState({ selectedInstrument: instrument.label })
        }
    }

    onClick = (e) => {
        const target = e.target;
        if ((
            (!this.instrumentPopupButton.current || (this.instrumentPopupButton.current && !this.instrumentPopupButton.current.contains(target)))
            //&& (!this.addLayerButton.current || (this.addLayerButton.current && !this.addLayerButton.current.contains(target)))
            && (!this.instrumentsButton.current || (this.instrumentsButton.current && !this.instrumentsButton.current.contains(target)))
            && (!this.soundsButton.current || (this.soundsButton.current && !this.soundsButton.current.contains(target)))
            && (!this.addStepsButton.current || (this.addStepsButton.current && !this.addStepsButton.current.contains(target)))
            && (!this.subtractStepsButton.current || (this.subtractStepsButton.current && !this.subtractStepsButton.current.contains(target)))
            && (!this.percentageButton.current || (this.percentageButton.current && !this.percentageButton.current.contains(target)))
            && (!this.msButton.current || (this.msButton.current && !this.msButton.current.contains(target)))
            && (!this.layerPopupButton.current || (this.layerPopupButton.current && !this.layerPopupButton.current.contains(target)))
            && (!this.mixerPopupButton.current || (this.mixerPopupButton.current && !this.mixerPopupButton.current.contains(target)))
            && (!this.volumePopupButton.current || (this.volumePopupButton && !this.volumePopupButton.current.contains(target)))
        )) {
            this.setState({
                showMixerPopup: false,
                showInstrumentsPopup: false,
                showInstrumentsList: false,
                showSoundsList: false,
                showArticulationOptions: false,
                showLayerPopup: false,
                showVolumePopup: false,
            });
        }
    }

    onCloseClick() {
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: false } })
    }

    onLayerClicked = (layerId) => {
        //this.selectedLayerId = layerId
        this.props.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId } })
        //this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: true } })
        //this.highlightLayer(_.find(this.layerGraphics, { id: layerId }))
    }

    onPreviewClick() {
        // TODO: only audible to this user (mute for all others)
    }

    onSoloClick = () => {
        //TODO: play single layer on solo click
    }

    onMuteClick(selectedLayer) {
        const isMuted = !selectedLayer.isMuted
        AudioEngine.tracksById[selectedLayer.id].setMute(isMuted)
        this.props.dispatch({ type: SET_LAYER_MUTE, payload: { id: selectedLayer.id, value: isMuted, user: this.props.user.id } })
        this.context.updateLayer(this.props.round.id, selectedLayer.id, { isMuted })
    }

    onDeleteLayerClick() {
        this.props.dispatch({ type: REMOVE_LAYER, payload: { id: this.props.selectedLayer.id, user: this.props.user.id } })
        this.context.deleteLayer(this.props.round.id, this.props.selectedLayer.id)
        this.onCloseClick()
    }

    onAddLayerClick = async () => {
        const newLayer = await getDefaultLayerData(this.props.user.id);
        newLayer.name = 'Layer ' + (this.props.round.layers.length + 1)
        this.props.dispatch({ type: ADD_LAYER, payload: { layer: newLayer, user: this.props.user.id } })
        this.context.createLayer(this.props.round.id, newLayer)
    }

    onClearStepsClick() {
        let selectedLayerClone = _.cloneDeep(this.props.selectedLayer)
        for (let step of selectedLayerClone.steps) {
            step.isOn = false
        }
        this.props.dispatch({ type: SET_LAYER_STEPS, payload: { id: selectedLayerClone.id, steps: selectedLayerClone.steps } })
        this.context.updateLayer(this.props.round.id, selectedLayerClone.id, { steps: selectedLayerClone.steps })
    }

    toggleInstrumentPopup = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.setState(prevState => ({ showInstrumentsPopup: !prevState.showInstrumentsPopup }))
    }

    toggleShowInstrumentList = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.setState(prevState => ({ showInstrumentsList: !prevState.showInstrumentsList }))
    }

    toggleArticulationOptions = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.setState(prevState => ({ showArticulationOptions: !prevState.showArticulationOptions }))
    }

    toggleLayerPopup = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.setState(prevState => ({ showLayerPopup: !prevState.showLayerPopup }))
    }

    toggleVolumePopup = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.setState(prevState => ({ showVolumePopup: !prevState.showVolumePopup }))
    }

    render() {
        // console.log('Layer settings render()', this.props.user);
        const {
            showMixerPopup,
            showInstrumentsPopup,
            showInstrumentsList,
            showArticulationOptions,
            showLayerPopup,
            selectedInstrument,
            showVolumePopup
        } = this.state;

        const { classes, user } = this.props
        const selectedLayer = this.props.selectedLayer
        let layerTypeFormItems;
        if (!_.isNil(selectedLayer)) {
            //layerVolumePercent = convertDBToPercent(selectedLayer.instrument.gain)
            if (selectedLayer.type === Track.TRACK_TYPE_AUTOMATION) {
                layerTypeFormItems = (
                    <>
                        <LayerAutomation selectedLayer={selectedLayer} roundId={this.props.round.id} userId={this.props.user.id} />
                        <Box className={classes.buttonContainer} display="flex" justifyContent="space-evenly">
                            <Button className={classes.containedButton} onClick={this.onClearStepsClick.bind(this)} variant="contained" color="secondary" disableElevation>Clear</Button>
                            <Button className={classes.containedButton} onClick={this.onDeleteLayerClick.bind(this)} variant="contained" color="secondary" disableElevation>Delete</Button>
                        </Box>
                    </>
                )
            } else {
                layerTypeFormItems = (
                    <>
                        <VolumeSlider selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                        <Box className={classes.buttonContainer} display="flex" justifyContent="space-evenly">
                            <Button className={classes.containedButton} onClick={this.onMuteClick.bind(this)} variant="contained" color={selectedLayer.isMuted ? 'primary' : 'secondary'} disableElevation>Mute</Button>
                            <Button className={classes.containedButton} onClick={this.onClearStepsClick.bind(this)} variant="contained" color="secondary" disableElevation>Clear</Button>
                            <Button className={classes.containedButton} onClick={this.onDeleteLayerClick.bind(this)} variant="contained" color="secondary" disableElevation>Delete</Button>
                        </Box>
                        <Divider className={classes.divider} />
                        <LayerInstrument selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                        <LayerCustomSounds selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                    </>
                )
            }
        }

        const instrumentIcon = (name) => {
            let Icon = <svg></svg>;
            if (name === 'HiHats')
                Icon = HiHats
            if (name === 'Kicks')
                Icon = Kick
            if (name === 'Snares')
                Icon = Snare
            if (name === 'Perc')
                Icon = Perc
            return <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 0, padding: 0 }}>
                <img alt={name} className={classes.instrumentIcon} src={Icon} />
            </Box>
        }

        const form = (
            <Box className={classes.root}>
                <LayerListPopup
                    instrumentIcon={instrumentIcon}
                    classes={classes}
                    round={this.props.round}
                    user={user}
                    onLayerSelect={this.onLayerClicked}
                    onMuteClick={this.onMuteClick.bind(this)}
                    toggleShowMixerPopup={() => this.setState(prevState => ({ showMixerPopup: !prevState.showMixerPopup }))}
                    showMixerPopup={showMixerPopup}
                    Close={Close}
                />
                <Box className={classes.addLayerContainer}>
                    <IconButton ref={this.addLayerButton} onClick={this.onAddLayerClick} className={classes.iconButtons}>
                        <img alt='add layer' src={AddLayer} />
                    </IconButton>
                    <IconButton
                        style={showMixerPopup ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
                        ref={this.mixerPopupButton}
                        className={classes.iconButtons}
                        onClick={() => this.setState(prevState => ({ showMixerPopup: !prevState.showMixerPopup }))}
                    >
                        <img alt='change instrument' src={ChangeInstrument} />
                    </IconButton>
                </Box>
                <Box className={classes.layerOptions}>
                    {!selectedLayer && <Typography className={classes.msg}>Long Press a round to edit</Typography>}
                    {selectedLayer &&
                        <Box style={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: 10, marginRight: 10 }}>
                            <Box className={classes.actionButtonContainer}>
                                <LayerInstrumentAlt
                                    showInstrumentsPopup={showInstrumentsPopup}
                                    showInstrumentsList={showInstrumentsList}
                                    selectedInstrumentLabel={selectedInstrument}
                                    toggleShowInstrumentList={this.toggleShowInstrumentList}
                                    toggleArticulationOptions={this.toggleArticulationOptions}
                                    classes={classes}
                                    showArticulationOptions={showArticulationOptions}
                                    selectedLayer={selectedLayer}
                                    roundId={this.props.round.id}
                                    instrumentsButtonRef={this.instrumentsButton}
                                    soundsButtonRef={this.soundsButton}
                                    user={user}
                                />
                                <IconButton
                                    ref={this.instrumentPopupButton}
                                    id='instrument-summary'
                                    style={showInstrumentsPopup ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
                                    className={classes.instrumentSummary}
                                    onClick={this.toggleInstrumentPopup}
                                >
                                    <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingRight: 5 }}>
                                        {instrumentIcon(selectedLayer?.instrument?.sampler)}
                                    </Box>
                                    <Typography style={{ fontWeight: 'bolder', lineHeight: 1, textTransform: 'capitalize' }}>
                                        {selectedInstrument}
                                    </Typography>
                                    <Box style={{ fontSize: 30, marginLeft: 5, marginRight: 5, lineHeight: .3 }}>&#183;</Box>
                                    <Typography style={{ fontWeight: 'bolder', lineHeight: 1, textTransform: 'capitalize' }}>
                                        {selectedLayer?.instrument?.sample}
                                    </Typography>
                                </IconButton>
                            </Box>
                            <Box className={classes.actionButtonContainer}>
                                <LayerPopup
                                    addStepsButtonRef={this.addStepsButton}
                                    subtractStepsButtonRef={this.subtractStepsButton}
                                    percentageButtonRef={this.percentageButton}
                                    msButtonRef={this.msButton}
                                    showLayerPopup={showLayerPopup}
                                    selectedLayer={selectedLayer}
                                    round={this.props.round}
                                    user={user}
                                    playUIRef={this.props.playUIRef}
                                />
                                <IconButton
                                    ref={this.layerPopupButton}
                                    onClick={this.toggleLayerPopup}
                                    style={showLayerPopup ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
                                    className={classes.stepCount}
                                >
                                    <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
                                        <img alt='layer-small' src={LayerIcon} />
                                    </Box>
                                    <Typography className={classes.stepLength} style={{ fontWeight: 'bolder' }}>{selectedLayer.steps.length}</Typography>
                                </IconButton>
                            </Box>
                            <Box className={classes.actionButtonContainer}>
                                <VolumePopup
                                    onMute={this.onMuteClick.bind(this, selectedLayer)}
                                    showVolumePopup={showVolumePopup}
                                    selectedLayer={selectedLayer}
                                    round={this.props.round} user={user}
                                />
                                <IconButton
                                    ref={this.volumePopupButton}
                                    onClick={this.toggleVolumePopup}
                                    style={showVolumePopup ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
                                    className={classes.actionButton}
                                >
                                    <img alt='layer-small' src={selectedLayer.isMuted ? Muted : Volume} />
                                </IconButton>
                            </Box>
                            <Box className={classes.actionButtonContainer}>
                                <IconButton onClick={this.onClearStepsClick.bind(this)} className={classes.actionButton}>
                                    <img alt='layer-small' src={Erasor} />
                                </IconButton>
                            </Box>
                            <Box className={classes.actionButtonContainer}>
                                <IconButton onClick={this.onDeleteLayerClick.bind(this)} className={classes.actionButton}>
                                    <img alt='layer-small' src={Trash} />
                                </IconButton>
                            </Box>
                        </Box>}
                    {/* <LayerNumberOfSteps selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                    <LayerPercentOffset selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} playUIRef={this.props.playUIRef} />
                    {/* <LayerTimeOffset selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} playUIRef={this.props.playUIRef} /> */}
                    {/** Temp disable */}
                    {false && layerTypeFormItems}
                </Box>
            </Box>
        )

        return (
            <div className={classes.container} >
                {form}
            </div>
        )
    }
}

const mapStateToProps = state => {
    //  console.log('mapStateToProps', state);
    let selectedLayer = null;
    if (!_.isNil(state.display.selectedLayerId) && !_.isNil(state.round) && !_.isNil(state.round.layers)) {
        selectedLayer = _.find(state.round.layers, { id: state.display.selectedLayerId })
    }
    return {
        round: state.round,
        user: state.user,
        selectedLayerId: state.display.selectedLayerId,
        selectedLayer,
        isOpen: state.display.isShowingLayerSettings
    };
};


export default connect(
    mapStateToProps
)(withStyles(styles)(LayerSettings))