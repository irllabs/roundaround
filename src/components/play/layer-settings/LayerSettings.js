import React, { Component } from 'react'
import { connect } from "react-redux";
import { Typography } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
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

import { FirebaseContext } from '../../../firebase';
import LayerInstrument from './LayerInstrument'
import LayerPopup from './LayerPopup'
import VolumePopup from './VolumePopup'
import { getDefaultLayerData } from '../../../utils/defaultData';
import LayerListPopup from './LayerListPopup';
import HamburgerPopup from './HamburgerPopup';
import {
    PlusIcon,
    EqualiserIcon,
    HiHatsIcon,
    KickIcon,
    PercIcon,
    SnareIcon,
    MuteIcon,
    MutedIcon,
    ErasorIcon,
    TrashIcon,
    HamburgerMenuIcon,
    CloseIcon,
    ElipsisIcon
} from './resources'

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
        [theme.breakpoints.down('sm')]: {
            right: '5%',
            left: '5%'
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
            marginBottom: 10,
        },
        [theme.breakpoints.down('sm')]: {
            marginBottom: 5,
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
        marginRight: 3,
        fontWeight: 'bold',
        padding: '6px 15px',
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255, 0.1)',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
        }
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
        backgroundColor: 'rgba(255,255,255, 0.1)',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
        },
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
        // [theme.breakpoints.down('sm')]: {
        //     width: 106,
        // },
    },
    hamburgerPopup: {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        opacity: 1,
        top: -108,
        height: 104,
        width: 155,
        left: 0,
        borderRadius: 8,
        zIndex: 100,
        boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.15), 0px 4px 6px rgba(0, 0, 0, 0.15)',
        backgroundColor: '#333333',
        overflow: 'hidden',
        transition: 'opacity 0.2s ease-in',
        [theme.breakpoints.down('sm')]: {
            left: 0,
        },
    },
    actionButton: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
        marginLeft: 3,
        marginRight: 3,
        height: 32,
        width: 32,
        margin: '10px 0',
        backgroundColor: 'rgba(255,255,255, 0.1)',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
        }
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
            showHamburgerPopup: false,
            windowWidth: 340,
            instrumentOptions: Instruments.getInstrumentOptions(false),
            selectedInstrument: ''
        }
        this.addLayerButton = React.createRef()
        this.mixerPopupButton = React.createRef()
        this.instrumentPopupButton = React.createRef()
        this.instrumentsListButton = React.createRef()
        this.articulationsListButton = React.createRef()
        this.layerPopupButton = React.createRef()
        this.volumePopupButton = React.createRef()
        this.instrumentsButton = React.createRef()
        this.soundsButton = React.createRef()
        this.hamburgerButton = React.createRef()
        this.addStepsButton = React.createRef()
        this.subtractStepsButton = React.createRef()
        this.percentageButton = React.createRef()
        this.msButton = React.createRef()
    }

    static contextType = FirebaseContext;

    componentDidMount() {
        window.addEventListener('click', this.onClick)
        window.addEventListener('resize', this.updateWindowWidth)
        this.updateWindowWidth();
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
                const selectedInstArray = this.state?.selectedInstrument.split('');
                const firstTwo = selectedInstArray[0] + selectedInstArray[1];
                selectedLayer?.instrument?.sampler.indexOf(firstTwo) === -1 && this.setSelectedInstrument(selectedLayer)
            }
        }
    }

    componentWillUnmount() {
        window.removeEventListener('click', this.onClick)
        window.removeEventListener('resize', this.updateWindowWidth)
    }

    updateWindowWidth = () => this.setState({ windowWidth: window.innerWidth })

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

    getUserColors() {
        let userColors = {};
        for (const user of this.props.users) {
            userColors[user.id] = user.color
        }
        return userColors
    }

    onClick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const target = e.target;
        if ((
            (!this.instrumentPopupButton.current || (this.instrumentPopupButton.current && !this.instrumentPopupButton.current.contains(target)))
            //&& (!this.addLayerButton.current || (this.addLayerButton.current && !this.addLayerButton.current.contains(target)))
            && (!this.articulationsListButton.current || (this.articulationsListButton.current && !this.articulationsListButton.current.contains(target)))
            && (!this.hamburgerButton.current || (this.hamburgerButton.current && !this.hamburgerButton.current.contains(target)))
            && (!this.instrumentsListButton.current || (this.instrumentsListButton.current && !this.instrumentsListButton.current.contains(target)))
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
            this.hideAllLayerInspectorModals()
        }
    }

    hideAllLayerInspectorModals = () => this.setState({
        showMixerPopup: false,
        showInstrumentsPopup: false,
        showInstrumentsList: false,
        showSoundsList: false,
        showArticulationOptions: false,
        showLayerPopup: false,
        showVolumePopup: false,
        showHamburgerPopup: false
    })

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

    onSoloClick = async () => {
        const selectedLayer = this.props.selectedLayer;
        const layers = this.props.round.layers;
        if (selectedLayer) {
            await layers.forEach(layer => {
                const id = layer.id;
                const isMuted = !layer.isMuted;
                if (selectedLayer.id !== id) {
                    AudioEngine.tracksById[id].setMute(isMuted)
                    this.props.dispatch({ type: SET_LAYER_MUTE, payload: { id, value: isMuted, user: this.props.user.id } })
                    this.context.updateLayer(this.props.round.id, id, { isMuted })
                }
            });
        }
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
        const showInstrumentsPopup = !this.state.showInstrumentsPopup
        this.hideAllLayerInspectorModals()
        this.setState({ showInstrumentsPopup })
    }

    toggleShowInstrumentList = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const showInstrumentsList = !this.state.showInstrumentsList
        this.hideAllLayerInspectorModals()
        this.setState({ showInstrumentsList, showInstrumentsPopup: true })
    }

    toggleArticulationOptions = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const showArticulationOptions = !this.state.showArticulationOptions
        this.hideAllLayerInspectorModals()
        this.setState({ showArticulationOptions, showInstrumentsPopup: true })
    }

    toggleLayerPopup = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const showLayerPopup = !this.state.showLayerPopup
        this.hideAllLayerInspectorModals()
        this.setState({ showLayerPopup })
    }

    toggleVolumePopup = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const showVolumePopup = !this.state.showVolumePopup
        this.hideAllLayerInspectorModals()
        this.setState({ showVolumePopup })
    }

    toggleShowMixerPopup = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const showMixerPopup = !this.state.showMixerPopup
        this.hideAllLayerInspectorModals()
        this.setState({ showMixerPopup })
    }

    toggleShowHamburgerPop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const showHamburgerPopup = !this.state.showHamburgerPopup
        this.hideAllLayerInspectorModals()
        this.setState({ showHamburgerPopup })
    }

    render() {
        // console.log('Layer settings render()', this.props.user);
        const {
            showMixerPopup,
            showInstrumentsPopup,
            showInstrumentsList,
            showArticulationOptions,
            showLayerPopup,
            showHamburgerPopup,
            selectedInstrument,
            showVolumePopup,
            windowWidth
        } = this.state;

        const { classes, user } = this.props
        const selectedLayer = this.props.selectedLayer
        const userColors = this.getUserColors()
        const isMobile = windowWidth <= 480

        const instrumentIcon = (name) => {
            let Icon = <svg></svg>;
            if (name === 'HiHats')
                Icon = HiHatsIcon
            if (name === 'Kicks')
                Icon = KickIcon
            if (name === 'Snares')
                Icon = SnareIcon
            if (name === 'Perc')
                Icon = PercIcon
            return <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 0, padding: 0 }}>
                <Icon />
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
                    userColors={userColors}
                    toggleShowMixerPopup={this.toggleShowMixerPopup}
                    showMixerPopup={showMixerPopup}
                />
                <HamburgerPopup
                    classes={classes}
                    user={user}
                    userColors={userColors}
                    addLayerButtonRef={this.addLayerButton}
                    onAddLayerClick={this.onAddLayerClick}
                    mixerPopupButtonRef={this.mixerPopupButton}
                    toggleShowMixerPopup={this.toggleShowMixerPopup}
                    showMixerPopup={showMixerPopup}
                    showHamburgerPopup={showHamburgerPopup}
                />
                <Box className={classes.addLayerContainer}>
                    {!isMobile ?
                        <>
                            <IconButton ref={this.addLayerButton} onClick={this.onAddLayerClick} className={classes.iconButtons}>
                                <PlusIcon user={user} userColors={userColors} />
                            </IconButton>
                            <IconButton
                                style={showMixerPopup ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
                                ref={this.mixerPopupButton}
                                className={classes.iconButtons}
                                onClick={this.toggleShowMixerPopup}
                            >
                                <EqualiserIcon user={user} userColors={userColors} />
                            </IconButton>
                        </> :
                        <IconButton
                            ref={this.hamburgerButton}
                            className={classes.iconButtons}
                            onClick={this.toggleShowHamburgerPop}
                        >
                            {showHamburgerPopup ?
                                <CloseIcon fill={user && userColors[user.id]} /> :
                                <HamburgerMenuIcon user={user} userColors={userColors} />}
                        </IconButton>
                    }

                </Box>
                <Box className={classes.layerOptions}>
                    {!selectedLayer &&
                        <Typography
                            className={classes.msg}
                            style={isMobile ? { fontSize: 14, padding: '0 15px' } : { padding: '0 15px' }}
                        >
                            Long Press a round to edit
                        </Typography>}
                    {selectedLayer &&
                        <Box style={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: 10, marginRight: 10 }}>
                            <Box className={classes.actionButtonContainer}>
                                <LayerInstrument
                                    showInstrumentsPopup={showInstrumentsPopup}
                                    instrumentsListRef={this.instrumentsListButton}
                                    articulationsListRef={this.articulationsListButton}
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
                                    style={showInstrumentsPopup ?
                                        { backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', flexDirection: 'row', width: isMobile ? 115 : 216, justifyContent: isMobile ? 'center' : 'flex-starts' } :
                                        { display: 'flex', flexDirection: 'row', justifyContent: isMobile ? 'center' : 'flex-starts', width: isMobile ? 115 : 216, }
                                    }
                                    className={classes.instrumentSummary}
                                    onClick={this.toggleInstrumentPopup}
                                >
                                    <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingRight: 5 }}>
                                        {instrumentIcon(selectedLayer?.instrument?.sampler)}
                                    </Box>
                                    {!isMobile &&
                                        <>
                                            <Typography style={{ fontWeight: 'bolder', lineHeight: 1, textTransform: 'capitalize' }}>
                                                {selectedInstrument}
                                            </Typography>
                                            <Box style={{ fontSize: 30, marginLeft: 5, marginRight: 5, lineHeight: .3 }}>&#183;</Box>
                                        </>
                                    }
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
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="6" cy="6" r="5" stroke={user && user.id && userColors[user.id]} strokeWidth="2" />
                                        </svg>
                                    </Box>
                                    <Typography className={classes.stepLength} style={{ fontWeight: 'bolder' }}>{selectedLayer.steps.length}</Typography>
                                </IconButton>
                            </Box>
                            <Box className={classes.actionButtonContainer}>
                                <VolumePopup
                                    onMute={this.onMuteClick.bind(this, selectedLayer)}
                                    onSolo={this.onSoloClick}
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
                                    {selectedLayer.isMuted ? <MutedIcon /> : <MuteIcon />}
                                </IconButton>
                            </Box>
                            {isMobile ?
                                <IconButton
                                    className={classes.actionButton}
                                //style={showMixerPopup ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
                                >
                                    <ElipsisIcon user={user} userColors={userColors} />
                                </IconButton> :
                                <>
                                    <Box className={classes.actionButtonContainer}>
                                        <IconButton onClick={this.onClearStepsClick.bind(this)} className={classes.actionButton}>
                                            <ErasorIcon />
                                        </IconButton>
                                    </Box>
                                    <Box className={classes.actionButtonContainer}>
                                        <IconButton onClick={this.onDeleteLayerClick.bind(this)} className={classes.actionButton}>
                                            <TrashIcon />
                                        </IconButton>
                                    </Box>
                                </>
                            }

                        </Box>}
                </Box>
            </Box>
        )

        return (
            <div className={classes.container} >
                {user && user.id && form}
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
        users: state.users,
        selectedLayerId: state.display.selectedLayerId,
        selectedLayer,
        isOpen: state.display.isShowingLayerSettings
    };
};


export default connect(
    mapStateToProps
)(withStyles(styles)(LayerSettings))