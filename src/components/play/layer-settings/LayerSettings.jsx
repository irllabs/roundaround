import React, { Component } from 'react'
import { connect } from "react-redux";
import _ from 'lodash'
import {
    SET_LAYER_MUTE,
    REMOVE_LAYER,
    SET_IS_SHOWING_LAYER_SETTINGS,
    SET_LAYER_STEPS,
    SET_SELECTED_LAYER_ID,
    ADD_LAYER
} from '../../../redux/actionTypes'
import AudioEngine from '../../../audio-engine/AudioEngine'
import Instruments from '../../../audio-engine/Instruments'

import { FirebaseContext } from '../../../firebase';
import LayerInstrument from './LayerInstrument'
import LayerPopup from './LayerPopup'
import VolumePopup from './VolumePopup'
import { getDefaultLayerData } from '../../../utils/defaultData';
import { soloMuteStates } from '../../../utils/index';
import LayerListPopup from './LayerListPopup';
import HamburgerPopup from './HamburgerPopup';
import DeleteClearPopup from './DeleteClearPopup';
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { layerSettingsClasses as classes, ICON_BUTTON, SM_BREAKPOINT } from './styles'
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

/**
 * Every popup's own state flag: the single list `hideAllLayerInspectorModals` clears and
 * `isShowingAPopup` reads, so a tenth popup cannot arrive in one and not the other.
 */
const POPUP_FLAGS = [
    'showMixerPopup', 'showInstrumentsPopup', 'showInstrumentsList',
    'showArticulationOptions', 'showLayerPopup', 'showVolumePopup', 'showDeleteClearPopup',
    'showHamburgerPopup'
]

class LayerSettings extends Component {
    constructor(props) {
        super(props)
        this.state = {
            showMixerPopup: false,
            showInstrumentsPopup: false,
            showInstrumentsList: false,
            showArticulationOptions: false,
            showLayerPopup: false,
            showVolumePopup: false,
            showHamburgerPopup: false,
            showDeleteClearPopup: false,
            windowWidth: 340,
            instrumentOptions: Instruments.getInstrumentOptions(false),
            selectedInstrument: '',
            soloedLayerId: null
        }
        this.addLayerButton = React.createRef()
        this.mixerPopupButton = React.createRef()
        this.instrumentPopupButton = React.createRef()
        this.instrumentsListButton = React.createRef()
        this.articulationsListButton = React.createRef()
        this.showDeleteClearPopupButton = React.createRef()
        this.layerPopupButton = React.createRef()
        this.volumePopupButton = React.createRef()

        this.muteToggle = React.createRef()
        this.soloButton = React.createRef()
        this.offsetSlider = React.createRef()
        this.volumeSlider = React.createRef()

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
        window.addEventListener('keydown', this.onKeyDown)
        window.addEventListener('resize', this.updateWindowWidth)
        this.updateWindowWidth();
        if (this.props.round && this.props.selectedLayerId) {
            const selectedLayer = _.find(this.props.round.layers, { id: this.props.selectedLayerId })
            this.setSelectedInstrument(selectedLayer)
        }
    }

    componentDidUpdate(prevProps) {
        const { soloedLayerId } = this.state
        if (!_.isNil(soloedLayerId) && this.props.round && prevProps.round !== this.props.round) {
            if (_.isNil(_.find(this.props.round.layers, { id: soloedLayerId }))) {
                // the soloed layer is gone
                this.applySolo(null)
                this.setState({ soloedLayerId: null })
            } else {
                // layers or mute flags changed underneath the solo: re-apply it
                this.applySolo(soloedLayerId)
            }
        }
        if (this.props.round && this.props.selectedLayerId) {
            const selectedLayer = _.find(this.props.round.layers, { id: this.props.selectedLayerId })
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
        if (!_.isNil(this.state.soloedLayerId)) {
            this.applySolo(null)
        }
        window.removeEventListener('click', this.onClick)
        window.removeEventListener('keydown', this.onKeyDown)
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
        // Click-away for the popups only; it must not cancel the click's default action or
        // stop it reaching anything else (it used to preventDefault every click in the play view).
        const target = e.target;
        if ((
            (!this.instrumentPopupButton.current || (this.instrumentPopupButton.current && !this.instrumentPopupButton.current.contains(target)))
            //&& (!this.addLayerButton.current || (this.addLayerButton.current && !this.addLayerButton.current.contains(target)))
            && (!this.articulationsListButton.current || (this.articulationsListButton.current && !this.articulationsListButton.current.contains(target)))
            && (!this.hamburgerButton.current || (this.hamburgerButton.current && !this.hamburgerButton.current.contains(target)))
            && (!this.showDeleteClearPopupButton.current || (this.showDeleteClearPopupButton.current && !this.showDeleteClearPopupButton.current.contains(target)))
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
            && (!this.muteToggle.current || (this.muteToggle && !this.muteToggle.current.contains(target)))
            && (!this.soloButton.current || (this.soloButton && !this.soloButton.current.contains(target)))
            && (!this.volumeSlider.current || (this.volumeSlider && !this.volumeSlider.current.contains(target)))
            && (!this.offsetSlider.current || (this.offsetSlider && !this.offsetSlider.current.contains(target)))
        )) {
            this.hideAllLayerInspectorModals()
        }
    }

    /**
     * The popups are opened by pointer and were, until now, only closable by pointer.
     *
     * An Escape another handler has already answered -- a Radix dialog or popover over the play
     * route dismisses on Escape and marks it -- is left alone. `PlayUI.onKeypress`'s guards against
     * a disabled key listener and against typing are not needed here, because Escape types nothing
     * and no field on this route reads it.
     *
     * Only an Escape that actually closes something is taken, and taking it means saying so with
     * `preventDefault`, the way every other Escape handler in the app (Radix's dismissable layers)
     * does. An Escape this component ignores stays the browser's: in Chrome that is Stop, and
     * headless Chrome answers it by freezing the document's animation frames, after which no
     * popover's exit animation ever ends and every closed one stays in the DOM. Consuming every
     * Escape on the play route instead would take Stop away from keys this component has nothing
     * to do with.
     */
    onKeyDown = (e) => {
        if (e.key !== 'Escape' || e.defaultPrevented || !this.isShowingAPopup()) {
            return
        }
        e.preventDefault()
        this.hideAllLayerInspectorModals()
    }

    /** Whether there is a popup for Escape to close. */
    isShowingAPopup() {
        return POPUP_FLAGS.some(flag => this.state[flag])
    }

    hideAllLayerInspectorModals = () => {
        this.setState(Object.fromEntries(POPUP_FLAGS.map(flag => [flag, false])))
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

    // Solo is local to this listener: it silences the other layers in this browser's audio graph
    // and never writes anyone's mute state. (The previous version inverted every other layer's
    // saved mute flag, including collaborators' layers, for everyone in the round.)
    onSoloClick = (selectedLayer) => {
        if (!selectedLayer) {
            return
        }
        const soloedLayerId = this.state.soloedLayerId === selectedLayer.id ? null : selectedLayer.id
        this.applySolo(soloedLayerId)
        this.setState({ soloedLayerId })
    }

    applySolo(soloedLayerId) {
        if (_.isNil(this.props.round)) {
            return
        }
        const muteStates = soloMuteStates(this.props.round.layers, soloedLayerId)
        for (const [layerId, isMuted] of Object.entries(muteStates)) {
            const track = AudioEngine.tracksById[layerId]
            if (!_.isNil(track)) {
                track.setMute(isMuted)
            }
        }
    }

    onMuteClick = (selectedLayer) => {
        if (selectedLayer) {
            const isMuted = !selectedLayer.isMuted
            AudioEngine.tracksById[selectedLayer.id].setMute(isMuted)
            this.props.dispatch({ type: SET_LAYER_MUTE, payload: { id: selectedLayer.id, value: isMuted, user: this.props.user.id } })
            this.context.updateLayer(this.props.round.id, selectedLayer.id, { isMuted })
        }
    }

    onDeleteLayerClick() {
        const selectedLayer = this.props.selectedLayer
        if (selectedLayer) {
            this.props.dispatch({ type: REMOVE_LAYER, payload: { id: selectedLayer.id, user: this.props.user.id } })
            this.context.deleteLayer(this.props.round.id, selectedLayer.id)
            this.onCloseClick()
        }
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

    toggleShowDeleteClearPopup = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const showDeleteClearPopup = !this.state.showDeleteClearPopup
        this.hideAllLayerInspectorModals()
        this.setState({ showDeleteClearPopup })
    }

    render() {
        const {
            showMixerPopup,
            showInstrumentsPopup,
            showInstrumentsList,
            showArticulationOptions,
            showLayerPopup,
            showHamburgerPopup,
            selectedInstrument,
            showVolumePopup,
            showDeleteClearPopup,
            windowWidth
        } = this.state;

        const { user } = this.props
        const selectedLayer = this.props.selectedLayer
        const userColors = this.getUserColors()
        const isMobile = windowWidth < SM_BREAKPOINT
        const sample = selectedLayer?.instrument?.sample

        const instrumentIcon = (name) => {
            let Icon = () => <svg></svg>;
            if (name === 'HiHats')
                Icon = HiHatsIcon
            if (name === 'Kicks')
                Icon = KickIcon
            if (name === 'Snares')
                Icon = SnareIcon
            if (name === 'Perc')
                Icon = PercIcon
            return <div className="m-0 flex items-center justify-center p-0">
                <Icon />
            </div>
        }

        // Each bar trigger says which popup it owns and whether that popup is open, the way the
        // effects sidebar's chevron does: the popups are never unmounted, so the wrapper the
        // `aria-controls` id sits on is always there to be pointed at. Six triggers, six popups --
        // "More" and the ellipsis are the phone-size halves of the pair the desktop splits in two.
        const form = (
            <div className={classes.root}>
                <LayerListPopup
                    instrumentIcon={instrumentIcon}
                    classes={classes}
                    round={this.props.round}
                    user={user}
                    onLayerSelect={this.onLayerClicked}
                    onMuteClick={this.onMuteClick}
                    onSoloClick={this.onSoloClick}
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
                <div className={classes.addLayerContainer}>
                    <div className={classes.addLayerDesktop}>
                        <Button
                            type="button"
                            variant="plain"
                            size="icon-app"
                            aria-label="Add a layer"
                            ref={this.addLayerButton}
                            onClick={this.onAddLayerClick}
                            className={cn(ICON_BUTTON, classes.iconButtons)}
                        >
                            <PlusIcon user={user} userColors={userColors} />
                        </Button>
                        <Button
                            type="button"
                            variant="plain"
                            size="icon-app"
                            aria-label="Open the mixer"
                            aria-expanded={showMixerPopup}
                            aria-controls="mixer-popup"
                            ref={this.mixerPopupButton}
                            className={cn(ICON_BUTTON, classes.iconButtons, showMixerPopup && 'bg-white/20')}
                            onClick={this.toggleShowMixerPopup}
                        >
                            <EqualiserIcon user={user} userColors={userColors} />
                        </Button>
                    </div>
                    <div className={classes.addLayerMobile}>
                        <Button
                            type="button"
                            variant="plain"
                            size="icon-app"
                            aria-label="More"
                            aria-expanded={showHamburgerPopup}
                            aria-controls="hamburger-popup"
                            ref={this.hamburgerButton}
                            className={cn(ICON_BUTTON, classes.iconButtons)}
                            onClick={this.toggleShowHamburgerPop}
                        >
                            {showHamburgerPopup ?
                                <CloseIcon fill={user && userColors[user.id]} /> :
                                <HamburgerMenuIcon user={user} userColors={userColors} />}
                        </Button>
                    </div>
                </div>
                <div className={classes.layerOptions}>
                    {!selectedLayer &&
                        <p className={classes.msg}>
                            Long Press a round to edit
                        </p>}
                    {selectedLayer &&
                        <div className="flex flex-1 flex-row">
                            <div className={classes.actionButtonContainer}>
                                <LayerInstrument
                                    key={selectedLayer.id}
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
                                <Button
                                    type="button"
                                    variant="plain"
                                    size="icon-app"
                                    ref={this.instrumentPopupButton}
                                    id='instrument-summary'
                                    aria-expanded={showInstrumentsPopup}
                                    aria-controls="instrument-popup"
                                    className={cn(ICON_BUTTON, classes.instrumentSummary, showInstrumentsPopup && 'bg-white/20')}
                                    onClick={this.toggleInstrumentPopup}
                                >
                                    <div className="flex flex-row items-center justify-center pr-[5px]">
                                        {instrumentIcon(selectedLayer?.instrument?.sampler)}
                                    </div>
                                    <div className={classes.selectedInstrumentInfo}>
                                        <p className="m-0 text-base leading-none tracking-[0.00938em] capitalize [font-weight:bolder]">
                                            {selectedInstrument}
                                        </p>
                                        <p className="m-0 mx-[5px] text-[30px] leading-[0.5]">&#183;</p>
                                    </div>
                                    <p className={classes.instrumentSample}>
                                        {`${selectedLayer?.instrument?.sample.substring(0, isMobile ? 6 : sample.length)}${isMobile &&
                                            selectedLayer?.instrument?.sample.length > 6 ? '...' : ''}`}
                                    </p>
                                </Button>
                            </div>
                            <div className={classes.actionButtonContainer}>
                                <LayerPopup
                                    key={selectedLayer.id}
                                    addStepsButtonRef={this.addStepsButton}
                                    subtractStepsButtonRef={this.subtractStepsButton}
                                    percentageButtonRef={this.percentageButton}
                                    msButtonRef={this.msButton}
                                    showLayerPopup={showLayerPopup}
                                    selectedLayer={selectedLayer}
                                    round={this.props.round}
                                    offsetSliderRef={this.offsetSlider}
                                    user={user}
                                    playUIRef={this.props.playUIRef}
                                />
                                <Button
                                    type="button"
                                    variant="plain"
                                    size="icon-app"
                                    aria-label="Layer options"
                                    aria-expanded={showLayerPopup}
                                    aria-controls="layer-popup"
                                    ref={this.layerPopupButton}
                                    onClick={this.toggleLayerPopup}
                                    className={cn(ICON_BUTTON, classes.stepCount, showLayerPopup && 'bg-white/20')}
                                >
                                    <div className="flex flex-row items-center">
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="6" cy="6" r="5" stroke={user && user.id && userColors[user.id]} strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <p className={classes.stepLengthBold}>{selectedLayer.steps.length}</p>
                                </Button>
                            </div>
                            <div className={classes.actionButtonContainer}>
                                <VolumePopup
                                    key={selectedLayer.id}
                                    onMute={this.onMuteClick}
                                    onSolo={this.onSoloClick}
                                    isSoloed={this.state.soloedLayerId === selectedLayer.id}
                                    muteRef={this.muteToggle}
                                    soloRef={this.soloButton}
                                    volumeSliderRef={this.volumeSlider}
                                    showVolumePopup={showVolumePopup}
                                    selectedLayer={selectedLayer}
                                    round={this.props.round}
                                    user={user}
                                />
                                <Button
                                    type="button"
                                    variant="plain"
                                    size="icon-app"
                                    aria-label="Volume, solo and mute"
                                    aria-expanded={showVolumePopup}
                                    aria-controls="volume-popup"
                                    ref={this.volumePopupButton}
                                    onClick={this.toggleVolumePopup}
                                    className={cn(ICON_BUTTON, classes.actionButton, showVolumePopup && 'bg-white/20')}
                                >
                                    {selectedLayer.isMuted ? <MutedIcon /> : <MuteIcon />}
                                </Button>
                            </div>
                            <div className={classes.mobileDeleteClear}>
                                <div className={classes.actionButtonContainer}>
                                    <DeleteClearPopup
                                        showDeleteClearPopup={showDeleteClearPopup}
                                        classes={classes}
                                        onClearStepsClick={this.onClearStepsClick.bind(this)}
                                        onDeleteLayerClick={this.onDeleteLayerClick.bind(this)}
                                    />
                                    <Button
                                        type="button"
                                        variant="plain"
                                        size="icon-app"
                                        aria-label="Clear or delete this layer"
                                        aria-expanded={showDeleteClearPopup}
                                        aria-controls="delete-clear-popup"
                                        className={cn(ICON_BUTTON, classes.actionButton)}
                                        onClick={this.toggleShowDeleteClearPopup}
                                        ref={this.showDeleteClearPopupButton}
                                    >
                                        <ElipsisIcon />
                                    </Button>
                                </div>
                            </div>
                            <div className={classes.desktopDeleteClear}>
                                <div className={classes.actionButtonContainer}>
                                    <Button
                                        type="button"
                                        variant="plain"
                                        size="icon-app"
                                        aria-label="Clear this layer"
                                        onClick={this.onClearStepsClick.bind(this)}
                                        className={cn(ICON_BUTTON, classes.actionButton)}
                                    >
                                        <ErasorIcon />
                                    </Button>
                                </div>
                                <div className={classes.actionButtonContainer}>
                                    <Button
                                        type="button"
                                        variant="plain"
                                        size="icon-app"
                                        aria-label="Delete this layer"
                                        onClick={this.onDeleteLayerClick.bind(this)}
                                        className={cn(ICON_BUTTON, classes.actionButton)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </div>
                            </div>
                        </div>}
                </div>
            </div>
        )

        return (
            <div className={classes.container} >
                {user && user.id && form}
            </div>
        )
    }
}

const mapStateToProps = state => {
    let selectedLayer = null;
    if (!_.isNil(state.display.selectedLayerId) && !_.isNil(state.round) && !_.isNil(state.round.layers)) {
        selectedLayer = _.find(state.round.layers, { id: state.display.selectedLayerId })
    }
    return {
        round: state.round,
        user: state.user,
        users: state.users,
        selectedLayerId: state.display.selectedLayerId,
        selectedLayer
    };
};

export default connect(
    mapStateToProps
)(LayerSettings)
