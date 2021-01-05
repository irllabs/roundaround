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
    removeStep
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
        this.handleLocalRoundUpdate = this.handleLocalRoundUpdate.bind(this);
        this.reloadCollaborationLayers = this.reloadCollaborationLayers.bind(this)
        this.throttleLock = null;
        this.rounChangeFromBackend = false;
        this.throttleQueue = 0;
        this.reloadCollaborationLayersThrottled = _.debounce(this.reloadCollaborationLayers, 1000)
        this.reloadCollaborationLayersTimer = null;
        this.layersChangeListenerUnsubscribe = null;
        this.stepsChangeListenerUnsubscribe = {}
    }

    componentDidMount () {
        this.firebase = this.context;
        if (this.state.toneActivated) {
            this.initiateCollaboration();
        } else {
            this.props.toggleLoader(false);
        }
    }

    async initiateCollaboration () {
        const { id } = this.props.match.params;

        // listen for collaboration changes
        this.firebase.db.collection('collaborations').doc(id).onSnapshot((doc) => {
            const collaboration = { id: doc.id, ...doc.data() };
            this.props.setCollaboration(collaboration);
        })

        this.props.toggleLoader(false);
    }

    loadRound (round) {
        //  console.log('loadRound', round);
        this.addRoundChangeListener(round.id)
        this.addLayersChangeListener(round.id)
        this.props.setRoundData(round)
    }

    addRoundChangeListener (roundId) {
        this.firebase.db.collection('rounds').doc(roundId).onSnapshot(async (doc) => {
            //   console.log('### round change listener fired');
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

    // if any of the subcollections for a collaboration user change, trigger a (throttled) reload of all collaboration layers as there could be multiple changes
    // to do: maybe add an id to the query to make sure we don't overwrite the local round with an await result that comes in late
    async reloadCollaborationLayers () {
        //  console.log('reloadCollaborationLayers()');
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

    throttle (changes) {
        // removing last editor info, not needed?
        delete changes.lastEdition
        delete changes.lastEditor

        this.throttleLock = true;
        setTimeout(() => {
            const collaboration = this.props.collaboration;
            const derivative = {
                ...this.props.round,
                user: collaboration.creator,
                id: collaboration.derivative,
                lastEditor: this.props.user.id
            };

            //this.firebase.updateRound(collaboration.derivative, changes);
            // check queue, if queue - self-repeat and eraise queue      
            if (this.throttleQueue) {
                this.throttleQueue = 0;
                this.throttle(changes);
            } else {
                this.throttleLock = false;
            }
        }, ThrottleDelay)
    }

    async addDerivative () {
        const derivativeId = uuid();

        const collaboration = { ...this.props.collaboration, derivative: derivativeId };
        await this.firebase.updateCollaboration(collaboration.id, collaboration);
        this.props.setCollaboration(collaboration);

        const derivedRound = { ...this.props.round, id: derivativeId };
        const round = await this.firebase.createRound(derivativeId, derivedRound)
        this.loadRound(round)
    }

    updateUserInContributors () {
        const { collaboration, user } = this.props;
        const contributors = { ...collaboration.contributors, [user.id]: { color: user.color } }
        this.firebase.updateCollaboration(collaboration.id, { contributors })
    }

    handleLocalRoundUpdate (changes) {
        //  console.log('handleLocalRoundUpdate()', changes);
        // don't run compare on changes recieved from backend to avoid infinity updates
        if (this.rounChangeFromBackend) {
            this.rounChangeFromBackend = false;
            return;
        }
        if (_.isEmpty(changes)) return;

        const { collaboration, user } = this.props;

        if (collaboration.derivative) {
            if (this.throttleLock) {
                this.throttleQueue = 1;
                return;
            } else {
                //execute throttle
                this.throttle(changes);
            }
        } else {
            //   console.log('no derivative, adding...');
            this.addDerivative()
        }

        if (user.id && !collaboration.contributors[user.id]) {
            this.updateUserInContributors();
        }
    }

    async initialSetup () {
        const { collaboration, user } = this.props;
        let round;
        if (collaboration.derivative) {
            round = await this.firebase.getRound(collaboration.round);
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

    async handleCollabChanges (changes) {
        if (_.isEmpty(changes)) return;

        if ('isPlaying' in changes && this.state.isOn !== changes.isPlaying) {
            this.togglePlay();
        }

        // first call
        if (!this.props.round) {
            this.initialSetup()
        } else if ('derivative' in changes) {
            const round = await this.firebase.getRound(changes.derivative)
            this.loadRound(round)
        }
    }

    handleUserChanges (changes) {
        if (_.isEmpty(changes)) return;

        if ('color' in changes) {
            this.updateUserInContributors();
        }
    }

    async componentDidUpdate (prevProps) {
        const roundDifference = diff(prevProps.round, this.props.round);
        const userDifference = diff(prevProps.user, this.props.user);
        const collabDifference = diff(prevProps.collaboration, this.props.collaboration);

        // console.log('collaboration::componentDidUpdate()', roundDifference, userDifference, collabDifference);

        this.handleLocalRoundUpdate(roundDifference);
        this.handleUserChanges(userDifference);
        this.handleCollabChanges(collabDifference);
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
                        <LayerSettings

                        />
                        <div
                            className={styles.mainContainer}
                        >
                            <HtmlUi isOn={this.state.isOn} />
                            <ControlsBar
                                user={this.firebase ? this.firebase.currentUser : {}}
                                mode="collaboration"
                                isOn={this.state.isOn}
                                shareRound={this.shareRound}
                                toggleProfile={this.toggleProfile}
                                togglePlay={this.togglePlay}
                                toggleSettings={this.toggleSettings}
                                toggleSidebar={this.toggleSidebar}
                            />

                        </div>
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
        collaboration: state.collaboration
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
        removeStep
    }
)(withRouter(CollaborationRoute));