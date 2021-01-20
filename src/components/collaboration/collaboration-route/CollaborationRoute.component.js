import React from 'react';
import * as Tone from 'tone';
import { withRouter } from 'react-router-dom';
import { connect } from "react-redux";
import _ from 'lodash'
import {
    setRoundData,
    toggleLoader,
    resetRaycasterStore,
    resetCameraStore,
    resetEditingModeStore,
    resetLoaderStore,
    resetCollaborationStore,
    addRoundLayers,
    setCollaboration,
    updateStep,
    addStep,
    removeStep,
    addUserBus,
    setUserBusFxOverride
} from "../../../redux/actions";
import { diff } from 'deep-object-diff';
import { ThrottleDelay } from '../../../constants';
import ControlsBar from '../../controls-bar/ControlsBar.component';

import Profile from '../../profile/Profile.component';
import Modal from '../../modal/Modal.component';
import BringRoundsDialog from '../bring-rounds-dialog/BringRoundsDialog.component';

import { uuid } from '../../../models/SequencerUtil';
import clock from '../../../models/Clock';

import { FirebaseContext } from '../../../firebase';

import styles from './CollaborationRoute.styles.scss';
import HtmlUi from '../../html-ui/HtmlUi';
import LayerSettings from '../../layer-settings/LayerSettings'
import EffectsSidebar from '../../effects-sidebar/EffectsSidebar'
import { getDefaultUserBus, getDefaultUserPatterns } from '../../../utils/dummyData';
import AudioEngine from '../../../audio-engine/AudioEngine';
import JitsiComponent from '../../jitsi/JitsiComponent';
import UserPatterns from '../../user-patterns/UserPatterns';

class CollaborationRoute extends React.Component {
    static contextType = FirebaseContext;
    constructor (props) {
        super(props);
        this.state = {
            isOn: Tone.Transport.state === 'started',
            settingsAreOpen: false,
            profileOpened: false,
            toneActivated: Tone.context.state === 'running',
            bringRoundsDialogOpened: false,
            bringRoundConfig: {
                round: null,
                editableByOthers: false
            }
        };

        this.finishBringRoundDialog = this.finishBringRoundDialog.bind(this);
        this.updateBringRoundConfig = this.updateBringRoundConfig.bind(this);
        this.reloadCollaborationLayers = this.reloadCollaborationLayers.bind(this)
        this.throttleLock = null;
        this.rounChangeFromBackend = false;
        this.throttleQueue = 0;
        this.reloadCollaborationLayersThrottled = _.debounce(this.reloadCollaborationLayers, 1000)
        this.reloadCollaborationLayersTimer = null;
        this.layersChangeListenerUnsubscribe = null;
        this.userBusChangeListenerUnsubscribe = null;
        this.stepsChangeListenerUnsubscribe = {}
        this.collaborationId = this.props.match.params.id;
    }

    componentDidMount () {
        // console.log('CollaborationRoute::componentDidMount()', this.state.toneActivated);
        this.firebase = this.context;
        if (this.state.toneActivated) {
            this.initiateCollaboration();
        } else {
            this.props.toggleLoader(false);
        }
    }

    async initiateCollaboration () {
        const { id } = this.props.match.params;
        const _this = this;
        console.log('CollaborationRoute::initiateCollaboration()', id);

        const collaboration = await this.firebase.getCollaboration(id)

        // offer to bring round
        if (
            this.props.user.email &&
            collaboration.creator !== this.props.user.id &&
            !collaboration.contributors[this.props.user.id]) {
            this.setState({ bringRoundsDialogOpened: true });
        }

        this.props.setCollaboration(collaboration);
        if (this.props.user.id && _.isNil(collaboration.contributors[this.props.user.id])) {
            // we are a user joining an existing collaboration
            //console.log('joining existing collaboration');
            this.updateUserInContributors();

        }
        // console.log('got collaboration', collaboration);

        let derivativeRound;
        if (_.isNil(collaboration.derivative)) {
            derivativeRound = await this.createDerivative(collaboration.round)
        } else {
            derivativeRound = await this.firebase.getRound(collaboration.derivative)
        }



        // console.log('loading derivativeRound', derivativeRound);

        if (_.isNil(derivativeRound.userBuses[this.props.user.id])) {
            // first time joining this collaboration
            derivativeRound.userBuses[this.props.user.id] = getDefaultUserBus(this.props.user.id)
            await this.firebase.updateUserBus(derivativeRound.id, this.props.user.id, derivativeRound.userBuses[this.props.user.id])
            derivativeRound.userPatterns[this.props.user.id] = getDefaultUserPatterns(this.props.user.id)
            await this.firebase.saveUserPatterns(derivativeRound.id, this.props.user.id, derivativeRound.userPatterns[this.props.user.id])
            // console.log('added userbus');
        }
        this.props.setRoundData(derivativeRound)

        // listen for collaboration changes
        this.firebase.db.collection('collaborations').doc(id).onSnapshot((doc) => {
            const collaboration = { id: doc.id, ...doc.data() };
            if (_this.state.isOn !== collaboration.isPlaying) {
                this.togglePlay();
            }
            if (_this.state)
                this.props.setCollaboration(collaboration);
        })

        //listen for round and layers changes
        this.addRoundChangeListener(derivativeRound.id)
        this.addLayersChangeListener(derivativeRound.id)
        this.addUserBusChangeListener(derivativeRound.id)

        this.props.toggleLoader(false);


    }

    async createDerivative (roundId) {
        // console.log('createDerivative()', roundId, this.props.collaboration);
        return new Promise(async (resolve, reject) => {
            const round = await this.firebase.getRound(roundId)
            const derivativeId = uuid();
            await this.firebase.createRound(derivativeId, { ...round, id: derivativeId })
            const derivativeRound = this.firebase.getRound(derivativeId)
            //console.log('created derivative round', derivativeRound);
            const collaboration = { ...this.props.collaboration, derivative: derivativeId };
            await this.firebase.updateCollaboration(collaboration.id, collaboration);
            this.props.setCollaboration(collaboration);
            resolve(derivativeRound)
        })
    }

    async addDerivative () {
        //  console.log('addDerivative()');
        const derivativeId = uuid();
        const derivedRound = { ...this.props.round, id: derivativeId };
        const round = await this.firebase.createRound(derivativeId, derivedRound)

        const collaboration = { ...this.props.collaboration, derivative: derivativeId };
        await this.firebase.updateCollaboration(collaboration.id, collaboration);
        this.props.setCollaboration(collaboration);
        this.loadRound(round)

    }

    loadRound (round) {
        this.addRoundChangeListener(round.id)
        this.addLayersChangeListener(round.id)
        this.addUserBusChangeListener(round.id)
        //this.props.setRoundData(round)
    }

    addRoundChangeListener (roundId) {
        this.firebase.db.collection('rounds').doc(roundId).onSnapshot(async (doc) => {
            // console.log('### round change listener fired');
        })
    }

    addLayersChangeListener (roundId) {
        const _this = this;
        this.layersChangeListenerUnsubscribe = this.firebase.db.collection('rounds').doc(roundId).collection('layers').onSnapshot((layerCollectionSnapshot) => {
            //  console.log('### layer change listener fired');
            layerCollectionSnapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    //   console.log('Modified layer: ', change.doc.data());
                    _this.reloadCollaborationLayersThrottled()
                }
                if (change.type === 'added') {
                    //  console.log('New layer: ', change.doc.data());
                    _this.addStepsChangeListener(roundId, change.doc.id)
                    _this.reloadCollaborationLayersThrottled()
                }
                if (change.type === 'removed') {
                    //    console.log('Removed layer: ', change.doc.data());
                    _this.removeStepsChangeListener(change.doc.id)
                    _this.reloadCollaborationLayersThrottled()
                }
            });
        })
    }

    addUserBusChangeListener (roundId) {
        const _this = this;
        // console.log('addUserBusChangeListener()', roundId);
        this.userBusChangeListenerUnsubscribe = this.firebase.db.collection('rounds').doc(roundId).collection('userBuses').onSnapshot((userBusesCollectionSnapshot) => {
            //  console.log('### userbus change listener fired');
            userBusesCollectionSnapshot.docChanges().forEach(change => {
                const userBus = change.doc.data()
                userBus.id = change.doc.id
                if (change.type === 'modified') {
                    //  console.log('Modified userbus: ', change.doc.data(), _this.props.round.userBuses[userBus.id]);
                    _this.handleUserBusChange(userBus)
                }
                if (change.type === 'added') {
                    if (_.isNil(_this.props.round.userBuses[userBus.id])) {
                        _this.props.addUserBus(userBus.id, userBus)
                        AudioEngine.addUser(userBus.id, userBus.fx)
                    }
                }
                if (change.type === 'removed') {
                    //console.log('Removed userbus: ', change.doc.data());
                }
            });
        })
    }

    addStepsChangeListener (roundId, layerId) {
        //console.log('addStepsChangeListener()', layerId);
        const _this = this;
        this.removeStepsChangeListener(layerId)
        this.stepsChangeListenerUnsubscribe[layerId] = this.firebase.db.collection('rounds').doc(roundId).collection('layers').doc(layerId).collection('steps').onSnapshot((stepCollectionSnapshot) => {
            //  console.log('### step change listener fired');
            stepCollectionSnapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    //console.log('Modified step: ', change.doc.data());
                    _this.reloadCollaborationLayersThrottled()
                }
                if (change.type === 'added') {
                    //  console.log('New step: ', change.doc.data());
                    _this.reloadCollaborationLayersThrottled()
                }
                if (change.type === 'removed') {
                    //   console.log('Removed step: ', change.doc.data());
                    _this.reloadCollaborationLayersThrottled()
                }
            });
        })
    }

    removeStepsChangeListener (layerId) {
        if (!_.isNil(this.stepsChangeListenerUnsubscribe[layerId])) {
            // console.log('removing StepsChangeListener()', layerId);
            this.stepsChangeListenerUnsubscribe[layerId]()
        }
    }

    handleUserBusChange (userBus) {
        let fxOrderChanged = false
        for (let fx of userBus.fx) {
            const currentFx = _.find(this.props.round.userBuses[userBus.id].fx, { id: fx.id })
            if (!_.isEqual(fx.isOverride, currentFx.isOverride)) {
                //  console.log('found fx override change', fx, currentFx);
                AudioEngine.busesByUser[userBus.id].fx[fx.id].override = fx.isOverride
                this.props.setUserBusFxOverride(userBus.id, fx.id, fx.isOverride)
            }
            if (!_.isEqual(fx.order, currentFx.order)) {
                fxOrderChanged = true
            }
        }
        if (fxOrderChanged) {
            AudioEngine.busesByUser[userBus.id].setFxOrder(userBus.fx)
        }
    }

    // if any of the subcollections for a collaboration user change, trigger a (throttled) reload of all collaboration layers as there could be multiple changes
    // to do: maybe add an id to the query to make sure we don't overwrite the local round with an await result that comes in late
    async reloadCollaborationLayers () {
        //console.log('reloadCollaborationLayers()');
        const _this = this;
        const newRound = await this.firebase.getRound(this.props.round.id)
        const newLayers = _.filter(newRound.layers, (layer) => {
            return layer.creator !== _this.props.user.id
        })
        const oldLayers = _.filter(this.props.round.layers, (layer) => {
            return layer.creator !== _this.props.user.id
        })
        if (!_.isEqual(newLayers, oldLayers)) {
            const userLayers = _.filter(this.props.round.layers, (layer) => {
                return layer.creator === _this.props.user.id
            })
            const layers = [...userLayers, ...newLayers]
            const round = _.cloneDeep(this.props.round)
            round.layers = layers
            this.props.setRoundData(round)
        }
    }

    updateUserInContributors () {
        const { collaboration, user } = this.props;
        const contributors = { ...collaboration.contributors, [user.id]: { color: user.color } }
        collaboration.contributors = contributors
        this.props.setCollaboration(collaboration);
        this.firebase.updateCollaboration(collaboration.id, { contributors })
    }

    createUserBus (userId) {
        // return new Promise((resolve, reject) => {
        const userBus = getDefaultUserBus(userId)
        //this.props.addUserBus(userId, userBus)
        return this.firebase.createUserBus(this.props.round.id, userId, userBus)
        // })
    }

    async initialSetup () {
        const { collaboration, user } = this.props;
        // console.log('initialSetup()', collaboration.derivative);
        let round;
        if (!_.isNil(collaboration.derivative)) {
            round = await this.firebase.getRound(collaboration.derivative);
        } else {
            await this.addDerivative()

            //round = await this.firebase.createRound(collaboration.round);
        }

        this.loadRound(round)

        // offer to bring round
        if (
            user.email &&
            collaboration.creator !== user.id &&
            !collaboration.contributors[user.id]) {
            this.setState({ bringRoundsDialogOpened: true });
        }

        // sync colors
        if (user.color && (collaboration.contributors[user.id] !== user.color)) {
            this.updateUserInContributors();
        }
    }

    async componentDidUpdate (prevProps) {
        const userDifference = diff(prevProps.user, this.props.user);
        if ('color' in userDifference) {
            this.updateUserInContributors();
        }
    }

    async updatePlayStatus (isPlaying) {
        await this.firebase.updateCollaboration(this.props.collaboration.id, { isPlaying })
    }

    togglePlay = () => {
        //console.log('toggle')
        clock.toggle();
        this.updatePlayStatus(clock.isRunning);
        this.setState({ isOn: clock.isRunning });
    };

    toggleProfile = () => {
        this.setState(state => ({ profileOpened: !state.profileOpened }));
    }

    toggleSettings = () => {
        this.setState(state => ({ settingsAreOpen: !state.settingsAreOpen }));
    };

    activateTone = async () => {
        await Tone.start();
        this.setState({ toneActivated: true })
        this.initiateCollaboration();
    }

    updateBringRoundConfig (data) {
        this.setState(state => ({ bringRoundConfig: { ...state.bringRoundConfig, ...data } }))
    }

    finishBringRoundDialog () {
        this.setState({ bringRoundsDialogOpened: false });

        if (this.state.bringRoundConfig.round) {
            this.addCollaboratorRound();
        }
    }

    async addCollaboratorRound () {
        this.props.toggleLoader(true);
        const layers = [...this.state.bringRoundConfig.round.layers];

        layers.map(layer => {
            layer.creator = this.props.user.id;
            layer.readonly = !this.state.bringRoundConfig.editableByOthers;
        });

        this.props.addRoundLayers(layers);
        this.props.toggleLoader(false);
    }

    componentWillUnmount () {
        //console.log('collaboration component getting unmounted')
        this.props.resetRaycasterStore()
        this.props.resetCameraStore()
        this.props.resetEditingModeStore()
        this.props.resetLoaderStore()
        this.props.resetCollaborationStore()
    }

    render () {
        return (
            <>
                <Modal
                    onModalClose={this.toggleProfile}
                    isOpen={this.state.profileOpened}
                >
                    <Profile />
                </Modal>
                <Modal
                    onModalClose={this.activateTone}
                    isOpen={!this.state.toneActivated}
                >
                    <button
                        onClick={this.activateTone}
                        className={styles.toneButton}
                    >
                        Click me and have fun ;)
                    </button>
                </Modal>
                <Modal
                    allowCloseByClickOutside={false}
                    onModalClose={this.finishBringRoundDialog}
                    isOpen={this.state.bringRoundsDialogOpened}
                >
                    <BringRoundsDialog
                        onFinishDialog={this.finishBringRoundDialog}
                        updateBringRoundConfig={this.updateBringRoundConfig}
                        firebase={this.firebase}
                        toggleLoader={this.props.toggleLoader}
                    />
                </Modal>

                {
                    this.props.round && this.state.toneActivated &&
                    <>
                        <LayerSettings />
                        <div
                            className={styles.mainContainer}
                        >
                            <HtmlUi isOn={this.state.isOn} togglePlay={this.togglePlay} disableKeyListener={this.props.disableKeyListener} />


                        </div>
                        <UserPatterns />
                        <EffectsSidebar isOn={this.state.isOn} mode="collaboration" user={this.firebase ? this.firebase.currentUser : {}} shareRound={this.shareRound} toggleProfile={this.toggleProfile}
                            togglePlay={this.togglePlay}
                            toggleSettings={this.toggleSettings}
                            toggleSidebar={this.toggleSidebar} />
                        <JitsiComponent roomName={this.collaborationId} />
                    </>
                }
            </>
        )
    }
}

const mapStateToProps = state => {
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration,
        disableKeyListener: state.display.disableKeyListener,
        display: state.display
    };
};

export default connect(
    mapStateToProps,
    {
        setRoundData,
        toggleLoader,
        resetRaycasterStore,
        resetCameraStore,
        resetEditingModeStore,
        resetLoaderStore,
        resetCollaborationStore,
        addRoundLayers,
        setCollaboration,
        updateStep,
        addStep,
        removeStep,
        addUserBus,
        setUserBusFxOverride
    }
)(withRouter(CollaborationRoute));