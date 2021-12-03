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

/** SVGs */
import Close from './resources/svg/close.svg'
import HiHats from './resources/svg/hihat.svg'
import Kick from './resources/svg/kick.svg'
import Snare from './resources/svg/snare.svg'
import Perc from './resources/svg/perc.svg'
import Volume from './resources/svg/volume.svg'
import Muted from './resources/svg/muted.svg'
import Erasor from './resources/svg/erasor.svg'
import Trash from './resources/svg/trash.svg'

//import LayerNumberOfSteps from './LayerNumberOfSteps'
import { FirebaseContext } from '../../../firebase';
import LayerInstrument from './LayerInstrument'
import LayerPopup from './LayerPopup'
import VolumePopup from './VolumePopup'
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
        backgroundColor: 'rgba(255,255,255, 0.1)',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
        },
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
    },
    actionButton: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        height: 32,
        width: 32,
        margin: '10px 0',
        backgroundColor: 'rgba(255,255,255, 0.1)',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
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
        this.instrumentsListButton = React.createRef()
        this.articulationsListButton = React.createRef()
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
        const userColors = this.getUserColors()

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

        //selectedLayer ? userColors[user.id] : '#E6D64C'

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
                    Close={Close}
                />
                <Box className={classes.addLayerContainer}>
                    <IconButton ref={this.addLayerButton} onClick={this.onAddLayerClick} className={classes.iconButtons}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0C11.2353 0 10.6154 0.619913 10.6154 1.38461V10.6154H1.38462C0.619913 10.6154 0 11.2353 0 12C0 12.7647 0.619913 13.3846 1.38461 13.3846H10.6154L10.6154 22.6154C10.6154 23.3801 11.2353 24 12 24C12.7647 24 13.3846 23.3801 13.3846 22.6154L13.3846 13.3846L22.6154 13.3846C23.3801 13.3846 24 12.7647 24 12C24 11.2353 23.3801 10.6154 22.6154 10.6154L13.3846 10.6154V1.38462C13.3846 0.619914 12.7647 0 12 0Z" fill={user && user.id && userColors[user.id]} />
                        </svg>
                    </IconButton>
                    <IconButton
                        style={showMixerPopup ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
                        ref={this.mixerPopupButton}
                        className={classes.iconButtons}
                        onClick={this.toggleShowMixerPopup}
                    >
                        <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M4.2006 3.24925C5.25982 3.71232 6 4.7694 6 5.99936C6 7.22932 5.25982 8.2864 4.2006 8.74947L4.2006 18.3994C4.2006 19.0716 3.67279 19.5994 3.0006 19.5994C2.32841 19.5994 1.8006 19.0716 1.8006 18.3994L1.8006 8.74999C0.740735 8.2872 1.47506e-07 7.22978 1.62178e-07 5.99936C1.76851e-07 4.76894 0.740736 3.71152 1.8006 3.24872L1.8006 1.59937C1.8006 0.927176 2.32841 0.399366 3.0006 0.399366C3.67279 0.399366 4.2006 0.927176 4.2006 1.59937L4.2006 3.24925ZM3 4.99936C3.55228 4.99936 4 5.44707 4 5.99936C4 6.55164 3.55228 6.99936 3 6.99936C2.44772 6.99936 2 6.55164 2 5.99936C2 5.44707 2.44772 4.99936 3 4.99936Z" fill={user && user.id && userColors[user.id]} />
                            <path fillRule="evenodd" clipRule="evenodd" d="M10.2006 11.2492L10.2006 1.59937C10.2006 0.927176 9.67279 0.399366 9.0006 0.399366C8.32841 0.399366 7.8006 0.927176 7.8006 1.59937L7.8006 11.2487C6.74074 11.7115 6 12.7689 6 13.9994C6 15.2298 6.74074 16.2872 7.8006 16.75L7.8006 18.3994C7.8006 19.0716 8.32841 19.5994 9.0006 19.5994C9.67279 19.5994 10.2006 19.0716 10.2006 18.3994L10.2006 16.7495C11.2598 16.2864 12 15.2293 12 13.9994C12 12.7694 11.2598 11.7123 10.2006 11.2492ZM9 12.9994C9.55228 12.9994 10 13.4471 10 13.9994C10 14.5516 9.55228 14.9994 9 14.9994C8.44772 14.9994 8 14.5516 8 13.9994C8 13.4471 8.44772 12.9994 9 12.9994Z" fill={user && user.id && userColors[user.id]} />
                            <path fillRule="evenodd" clipRule="evenodd" d="M13.8006 1.59937L13.8006 3.24872C12.7407 3.71152 12 4.76894 12 5.99936C12 7.22978 12.7407 8.2872 13.8006 8.74999L13.8006 18.3994C13.8006 19.0716 14.3284 19.5994 15.0006 19.5994C15.6728 19.5994 16.2006 19.0716 16.2006 18.3994L16.2006 8.74947C17.2598 8.2864 18 7.22932 18 5.99936C18 4.7694 17.2598 3.71232 16.2006 3.24925L16.2006 1.59937C16.2006 0.927176 15.6728 0.399367 15.0006 0.399367C14.3284 0.399367 13.8006 0.927176 13.8006 1.59937ZM15 4.99936C15.5523 4.99936 16 5.44708 16 5.99936C16 6.55164 15.5523 6.99936 15 6.99936C14.4477 6.99936 14 6.55164 14 5.99936C14 5.44708 14.4477 4.99936 15 4.99936Z" fill={user && user.id && userColors[user.id]} />
                        </svg>
                    </IconButton>
                </Box>
                <Box className={classes.layerOptions}>
                    {!selectedLayer && <Typography className={classes.msg}>Long Press a round to edit</Typography>}
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