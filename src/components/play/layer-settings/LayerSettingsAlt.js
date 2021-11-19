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
    ADD_LAYER
} from '../../../redux/actionTypes'
import Box from '@material-ui/core/Box';
import { withStyles } from '@material-ui/core/styles';
import AudioEngine from '../../../audio-engine/AudioEngine'

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
import StepsPopup from './StepsPopup'
import VolumePopup from './VolumePopup'
import LayerCustomSounds from './LayerCustomSounds'
import { getDefaultLayerData } from '../../../utils/defaultData';
import MixerPopup from './MixerPopup';

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
            showStepPopup: false,
            showVolumePopup: false,
            selectedInstrument: props.selectedLayer?.instrument?.sampler
        }
    }

    static contextType = FirebaseContext;

    onCloseClick() {
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: false } })
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

    toggleInstrumentPopup = () => this.setState(prevState => ({ showInstrumentsPopup: !prevState.showInstrumentsPopup }))

    toggleShowInstrumentList = () => this.setState(prevState => ({ showInstrumentsList: !prevState.showInstrumentsList }))

    toggleArticulationOptions = () => this.setState(prevState => ({ showArticulationOptions: !prevState.showArticulationOptions }))

    toggleStepsPopup = () => this.setState(prevState => ({ showStepPopup: !prevState.showStepPopup }))

    toggleVolumePopup = () => this.setState(prevState => ({ showVolumePopup: !prevState.showVolumePopup }))

    render() {
        // console.log('Layer settings render()', this.props.user);
        const {
            showMixerPopup,
            showInstrumentsPopup,
            showInstrumentsList,
            showArticulationOptions,
            showStepPopup,
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
                <MixerPopup
                    instrumentIcon={instrumentIcon}
                    classes={classes}
                    round={this.props.round}
                    user={user}
                    onMuteClick={this.onMuteClick.bind(this)}
                    showMixerPopup={showMixerPopup}
                    Close={Close}
                />
                <Box className={classes.addLayerContainer}>
                    <IconButton onClick={this.onAddLayerClick} className={classes.iconButtons}>
                        <img alt='add layer' src={AddLayer} />
                    </IconButton>
                    <IconButton className={classes.iconButtons} onClick={() => this.setState(prevState => ({ showMixerPopup: !prevState.showMixerPopup }))}>
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
                                    toggleShowInstrumentList={this.toggleShowInstrumentList}
                                    toggleArticulationOptions={this.toggleArticulationOptions}
                                    classes={classes}
                                    showArticulationOptions={showArticulationOptions}
                                    selectedLayer={selectedLayer}
                                    roundId={this.props.round.id}
                                    user={user}
                                />
                                <IconButton id='instrument-summary' className={classes.instrumentSummary} onClick={this.toggleInstrumentPopup}>
                                    <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingRight: 5 }}>
                                        {instrumentIcon(selectedLayer?.instrument?.sampler)}
                                    </Box>
                                    <Typography style={{ fontWeight: 'bolder', lineHeight: 1, textTransform: 'capitalize' }}>
                                        {selectedLayer?.instrument?.sampler}
                                    </Typography>
                                    <Box style={{ fontSize: 30, marginLeft: 5, marginRight: 5, lineHeight: .3 }}>&#183;</Box>
                                    <Typography style={{ fontWeight: 'bolder', lineHeight: 1, textTransform: 'capitalize' }}>
                                        {selectedLayer?.instrument?.sample}
                                    </Typography>
                                </IconButton>
                            </Box>
                            <Box className={classes.actionButtonContainer}>
                                <StepsPopup showStepPopup={showStepPopup} selectedLayer={selectedLayer} round={this.props.round} user={user} playUIRef={this.props.playUIRef} />
                                <IconButton onClick={this.toggleStepsPopup} className={classes.stepCount}>
                                    <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
                                        <img alt='layer-small' src={LayerIcon} />
                                    </Box>
                                    <Typography className={classes.stepLength} style={{ fontWeight: 'bolder' }}>{selectedLayer.steps.length}</Typography>
                                </IconButton>
                            </Box>
                            <Box className={classes.actionButtonContainer}>
                                <VolumePopup onMute={this.onMuteClick.bind(this, selectedLayer)} showVolumePopup={showVolumePopup} selectedLayer={selectedLayer} round={this.props.round} user={user} />
                                <IconButton onClick={this.toggleVolumePopup} className={classes.actionButton}>
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
        selectedLayer,
        isOpen: state.display.isShowingLayerSettings
    };
};


export default connect(
    mapStateToProps
)(withStyles(styles)(LayerSettings))