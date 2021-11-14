import React, { Component } from 'react'
import { connect } from "react-redux";
import { Divider, Typography } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import _ from 'lodash'
import { SET_LAYER_MUTE, REMOVE_LAYER, SET_IS_SHOWING_LAYER_SETTINGS, SET_LAYER_STEPS } from '../../../redux/actionTypes'
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
import Erasor from './resources/svg/erasor.svg'
import Trash from './resources/svg/trash.svg'

import VolumeSlider from './VolumeSlider'
import LayerInstrument from './LayerInstrument'
//import LayerNumberOfSteps from './LayerNumberOfSteps'
import { FirebaseContext } from '../../../firebase';
import LayerAutomation from './LayerAutomation';
import Track from '../../../audio-engine/Track'
//import LayerPercentOffset from './LayerPercentOffset'
import LayerCustomSounds from './LayerCustomSounds'

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
        height: 52,
        borderRadius: 32,
        marginBottom: 20,
        justifyContent: "flex-start",
        alignItems: "center",
        width: '100%',
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
        bottom: 56,
        right: 0,
        left: 50,
        borderRadius: 8,
        zIndex: 100,
        boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.15), 0px 4px 6px rgba(0, 0, 0, 0.15)',
        backgroundColor: '#333333',
        overflow: 'hidden',
        transition: 'opacity 0.3s linear',
        [theme.breakpoints.down('sm')]: {
            bottom: 52,
        },
        [theme.breakpoints.down('sm')]: {
            left: 0,
        },
    },
    mixerPopupHeader: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 10,
        borderBottom: 'thin solid rgba(255, 255, 255, 0.1)'
    },
    mixerPopupHeaderText: {
        marginLeft: 10,
        fontSize: 18
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
    mixerButton: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        height: 40,
        width: 40,
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
    stepLength: {
        display: 'flex',
        alignItems: 'flex-start',
        lineHeight: 1,
    },
    instrumentIcon: {

    },
    instrumentSummary: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        margin: '10px',
        width: 216,
        fontWeight: 'bold',
        padding: '6px 15px',
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255, 0.1)'
    },
    stepCount: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        margin: '10px',
        padding: '6px 15px',
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255, 0.1)'
    },
    actionButton: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        height: 'auto',
        width: 'auto',
        margin: '10px',
        backgroundColor: 'rgba(255,255,255, 0.1)',
        [theme.breakpoints.down('md')]: {
            margin: '10px 5px',
        },
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
        paddingTop: 10,
        paddingBottom: 10,
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
        }
    },
    layer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
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
        left: '200%',
        transition: 'opacity 0.3s linear'
    }
})

class LayerSettings extends Component {
    constructor() {
        super()
        this.state = {
            showMixerPopup: false
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

    onClearStepsClick() {
        let selectedLayerClone = _.cloneDeep(this.props.selectedLayer)
        for (let step of selectedLayerClone.steps) {
            step.isOn = false
        }
        this.props.dispatch({ type: SET_LAYER_STEPS, payload: { id: selectedLayerClone.id, steps: selectedLayerClone.steps } })
        this.context.updateLayer(this.props.round.id, selectedLayerClone.id, { steps: selectedLayerClone.steps })
    }


    render() {
        // console.log('Layer settings render()', this.props.user);
        const { showMixerPopup } = this.state;
        const { classes } = this.props
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

        const mixerPopup = (
            <Box className={showMixerPopup ? classes.mixerPopup : classes.hidden}>
                <Box className={classes.mixerPopupHeader}>
                    <IconButton className={classes.plainButton} onClick={() => this.setState(prevState => ({ showMixerPopup: !prevState.showMixerPopup }))}><img alt='close popup' src={Close} /></IconButton>
                    <Typography className={classes.mixerPopupHeaderText}>Mixer</Typography>
                </Box>
                <Box className={classes.layerContainer}>
                    {
                        this.props.round && this.props.round?.layers.map((layer, i) =>
                            <Box key={i} className={classes.layerSubContainer}>
                                <Box className={classes.layer}>
                                    <Box style={{ display: 'flex', flexDirection: 'column', flex: 4 }}>
                                        <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', paddingBottom: 5 }}>
                                            <Box style={{ marginRight: 5 }}>{instrumentIcon(layer?.instrument?.sampler)}</Box>
                                            <Typography style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'flex-start', lineHeight: 1 }}>
                                                {layer.instrument?.sample}
                                            </Typography>
                                        </Box>
                                        <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                            <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
                                                <img alt='layer-small' src={LayerIcon} />
                                            </Box>
                                            <Typography className={classes.stepLength}>{layer.steps.length}</Typography>
                                        </Box>
                                    </Box>
                                    <Box className={classes.volumeSliderContainer}>
                                        <VolumeSlider hideText={true} selectedLayer={layer} roundId={this.props.round.id} user={this.props.user} />
                                    </Box>
                                    <Box className={classes.containerSoloMute}>
                                        <IconButton className={classes.mixerButton}>
                                            <Typography style={{ fontWeight: 'bold' }}>S</Typography>
                                        </IconButton>
                                        <IconButton onClick={this.onMuteClick.bind(this, layer)} className={classes.mixerButton}>
                                            <Typography style={{ fontWeight: 'bold' }}>M</Typography>
                                        </IconButton>
                                    </Box>
                                </Box>
                            </Box>)
                    }
                </Box>
            </Box>
        )

        const form = (
            <Box className={classes.root}>
                {mixerPopup}
                <Box className={classes.addLayerContainer}>
                    <IconButton className={classes.iconButtons}>
                        <img alt='add layer' src={AddLayer} />
                    </IconButton>
                    <IconButton className={classes.iconButtons} onClick={() => this.setState(prevState => ({ showMixerPopup: !prevState.showMixerPopup }))}>
                        <img alt='change instrument' src={ChangeInstrument} />
                    </IconButton>
                </Box>
                <Box className={classes.layerOptions}>
                    {!selectedLayer && <Typography className={classes.msg}>Long Press a round to edit</Typography>}
                    {selectedLayer &&
                        <Box style={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Box className={classes.instrumentSummary}>
                                <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingRight: 5 }}>
                                    {instrumentIcon(selectedLayer?.instrument?.sampler)}
                                </Box>
                                <Typography style={{ fontWeight: 'bold', lineHeight: 1, textTransform: 'capitalize' }}>{selectedLayer?.instrument?.sampler}</Typography>
                                <Box style={{ fontSize: 30, marginLeft: 5, marginRight: 5, lineHeight: .3 }}>&#183;</Box>
                                <Typography style={{ fontWeight: 'bold', lineHeight: 1, textTransform: 'capitalize' }}>{selectedLayer?.instrument?.sample}</Typography>
                            </Box>
                            <Box className={classes.stepCount}>
                                <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
                                    <img alt='layer-small' src={LayerIcon} />
                                </Box>
                                <Typography className={classes.stepLength} style={{ fontWeight: 'bold' }}>{selectedLayer.steps.length}</Typography>
                            </Box>
                            <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <IconButton className={classes.actionButton}>
                                    <img alt='layer-small' src={Volume} />
                                </IconButton>
                            </Box>
                            <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <IconButton className={classes.actionButton}>
                                    <img alt='layer-small' src={Erasor} />
                                </IconButton>
                            </Box>
                            <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <IconButton className={classes.actionButton}>
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