import React from 'react';
import * as Tone from 'tone';
import { withRouter } from 'react-router-dom';
import { connect } from "react-redux";
import {
    setRoundData,
    toggleLoader,
    resetRaycasterStore,
    resetCameraStore,
    resetEditingModeStore,
    resetLoaderStore,
    resetCollaborationStore,
    addRoundLayers,
    setCollaboration
} from "../../../redux/actions";
import { diff } from 'deep-object-diff';
var _ = require('lodash/core');
import { ThrottleDelay } from '../../graphics-context/constants';
import GraphicsContext from '../../graphics-context/GraphicsContext.component';
import ControlsBar from '../../controls-bar/ControlsBar.component';
import SettingsPane from '../../settings-pane/SettingsPane.component';
import Profile from '../../profile/Profile.component';
import Modal from '../../modal/Modal.component';
import BringRoundsDialog from '../bring-rounds-dialog/BringRoundsDialog.component';

import { uuid } from '../../../models/SequencerUtil';
import clock from '../../../models/Clock';

import { FirebaseContext } from '../../../firebase';

import styles from './CollaborationRoute.styles.scss';

class CollaborationRoute extends React.Component {
    static contextType = FirebaseContext;
    constructor(props) {
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
        
        this.listenForDerivative = this.listenForDerivative.bind(this);
        this.finishBringRoundDialog = this.finishBringRoundDialog.bind(this);
        this.updateBringRoundConfig = this.updateBringRoundConfig.bind(this);
        this.handleLocalRoundUpdate = this.handleLocalRoundUpdate.bind(this);
        this.throttleLock = null;
        this.rounChangeFromBackend = false;
        this.throttleQueue = 0;
    }

    componentDidMount() {
        this.firebase = this.context;
        if (this.state.toneActivated) {
            this.initiateCollaboration();
        } else {
            this.props.toggleLoader(false);
        }
    }

    async initiateCollaboration() {
        const { id } = this.props.match.params;

        // listen for collaboration changes
        this.firebase.db.collection('collaborations').doc(id).onSnapshot((doc) => {
            const collaboration = { id: doc.id, ...doc.data() };
            this.props.setCollaboration(collaboration);
        })

        this.props.toggleLoader(false);
    }
    
    listenForDerivative(derivativeId) {
        this.firebase.db.collection('rounds').doc(derivativeId).onSnapshot((doc) => {
            // console.log('doc.metadata', doc.metadata)
            if (!doc.data() || doc.metadata.hasPendingWrites) return;
            const tempDoc = { id: doc.id, ...doc.data() };
            this.rounChangeFromBackend = true;
            
            this.props.setRoundData(tempDoc)
        })
    }

    throttle() {
        this.throttleLock = true;
        setTimeout(() => {
            const collaboration = this.props.collaboration;
            const derivative = {
                ...this.props.round,
                user: collaboration.creator,
                id: collaboration.derivative,
                lastEditor: this.props.user.id
            };
            
            this.firebase.updateRound(collaboration.derivative, derivative);
            // check queue, if queue - self-repeat and eraise queue      
            if (this.throttleQueue) {
                this.throttleQueue = 0;
                this.throttle(this.props.round);
            } else {
                this.throttleLock = false;
            }
        }, ThrottleDelay)
    }

    async addDerivative() {
        const derivativeId = uuid();

        const collaboration = { ...this.props.collaboration, derivative: derivativeId };
        await this.firebase.updateCollaboration(collaboration.id, collaboration);
        this.props.setCollaboration(collaboration);

        const derivedRound = { ...this.props.round, id: derivativeId };
        this.firebase.createRound(derivativeId, derivedRound)
        this.listenForDerivative(collaboration.derivative)
        console.log('listenForDerivative')
    }

    updateUserInContributors() {
        const { collaboration, user } = this.props;
        const contributors = {...collaboration.contributors, [user.id]: {color: user.color}}
        this.firebase.updateCollaboration(collaboration.id, {contributors})
    }

    handleLocalRoundUpdate(changes) {
        // don't run compare on changes recieved from backend to avoid infinity updates
        if(this.rounChangeFromBackend) {
            this.rounChangeFromBackend = false;
            return;
        }
        if(_.isEmpty(changes)) return;

        const { collaboration, user } = this.props;

        if (collaboration.derivative) {
            if (this.throttleLock) {
                this.throttleQueue = 1;
                return;
            } else {
                //execute throttle
                this.throttle();
            }
        } else {
            this.addDerivative()
        }

        if (user.id && !collaboration.contributors[user.id]) {
            this.updateUserInContributors();
        }
    }

    async initialSetup() {
        const { collaboration, user }  = this.props;

        if (collaboration.derivative) {
            this.listenForDerivative(collaboration.derivative)
            console.log('listenForDerivative')
        } else {
            const round = await this.firebase.getRound(collaboration.round);
            this.rounChangeFromBackend = true;
            this.props.setRoundData(round);
        }
          
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

    async handleCollabChanges(changes) {
        if(_.isEmpty(changes)) return;
        
        if ('isPlaying' in changes && this.state.isOn !== changes.isPlaying) {
            this.togglePlay();
        }

        // first call
        if (!this.props.round) {
            this.initialSetup()
        } else if ('derivative' in changes) {
            this.listenForDerivative(changes.derivative)
            console.log('listenForDerivative')
        }
    }

    handleUserChanges(changes) {
        if(_.isEmpty(changes)) return;
        
        if ('color' in changes) {
            this.updateUserInContributors();
        }
    }

    async componentDidUpdate(prevProps) {
        const roundDifference = diff(prevProps.round, this.props.round);
        const userDifference = diff(prevProps.user, this.props.user);
        const collabDifference = diff(prevProps.collaboration, this.props.collaboration);
        
        this.handleLocalRoundUpdate(roundDifference);
        this.handleUserChanges(userDifference);
        this.handleCollabChanges(collabDifference);
    }

    async updatePlayStatus(isPlaying) {
        await this.firebase.updateCollaboration(this.props.collaboration.id, {isPlaying})
    }

    togglePlay = () => {
        console.log('toggle')
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

    updateBringRoundConfig(data) {
        this.setState(state => ({ bringRoundConfig: { ...state.bringRoundConfig, ...data } }))
    }

    finishBringRoundDialog() {
        this.setState({ bringRoundsDialogOpened: false });

        if (this.state.bringRoundConfig.round) {
            this.addCollaboratorRound();
        }
    }

    async addCollaboratorRound() {
        this.props.toggleLoader(true);
        const layers = [...this.state.bringRoundConfig.round.layers];

        layers.map(layer => {
            layer.creator = this.props.user.id;
            layer.readonly = !this.state.bringRoundConfig.editableByOthers;
        });
        
        this.props.addRoundLayers(layers);
        this.props.toggleLoader(false);
    }

    componentWillUnmount() {
        console.log('collaboration component getting unmounted')
        this.props.resetRaycasterStore()
        this.props.resetCameraStore()
        this.props.resetEditingModeStore()
        this.props.resetLoaderStore()
        this.props.resetCollaborationStore()
    }

    render() {
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
                    <div
                        className={styles.mainContainer}
                    >
                        <GraphicsContext
                            className={styles.graphicsContext}
                        />
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
                        <SettingsPane
                            isActive={this.state.settingsAreOpen}
                        />
                    </div>
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
    }
)(withRouter(CollaborationRoute));