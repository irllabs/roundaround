import React, { Component } from 'react'
import PlayUI from './PlayUI'
import PatternsSidebar from './PatternsSidebar'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import EffectsSidebar from './EffectsSidebar';
import Box from '@material-ui/core/Box';
import _ from 'lodash';
import Loader from 'react-loader-spinner';
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
import { setRound, setUsers, setIsPlaying, setUserBusFxOverride, addUserBus, setRoundCurrentUsers, setRoundBpm, setRoundSwing, setIsPlayingSequence } from '../../redux/actions'
import AudioEngine from '../../audio-engine/AudioEngine'
import Instruments from '../../audio-engine/Instruments'
import FX from '../../audio-engine/FX'
import ShareDialog from '../dialogs/ShareDialog'
import { getDefaultUserBus, getDefaultUserPatterns } from '../../utils/defaultData'
import LayerSettings from './layer-settings/LayerSettings';
//import OrientationDialog from '../dialogs/OrientationDialog';
import CustomSamples from '../../audio-engine/CustomSamples';

const styles = theme => ({
    root: {
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
    },
    loader: {
        position: 'absolute',
        top: 0,
        zIndex: 9,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }
})

class PlayRoute extends Component {
    static contextType = FirebaseContext;
    constructor(props) {
        super(props)
        this.isLoadingRound = false;
        this.hasLoadedRound = false;
        this.isDisposing = false;
        this.reloadCollaborationLayers = this.reloadCollaborationLayers.bind(this)
        this.startAudioContext = this.startAudioContext.bind(this)
        this.handleUserPatternsChange = this.handleUserPatternsChange.bind(this)
        this.reloadCollaborationLayersThrottled = _.debounce(this.reloadCollaborationLayers, 1000)
        this.playUIRef = null;
    }
    componentDidMount() {
        //console.log('PlayRoute::componentDidMount()', this.props.user, this.isLoadingRound, this.hasLoadedRound, this.props.round);
        this.addStartAudioContextListener()
        if (!this.isLoadingRound && !this.hasLoadedRound && !_.isNil(this.props.user)) {
            this.loadRound()
        }
    }

    async componentDidUpdate() {
        if (!this.isLoadingRound && !this.hasLoadedRound && _.isNil(this.props.round) && !_.isNil(this.props.user)) {
            await this.loadRound()
        }
    }

    async componentWillUnmount() {
        this.isDisposing = true;
        this.removeFirebaseListeners()
        AudioEngine.stop()
        if (!_.isNil(this.props.round) && !_.isNil(this.props.round.currentUsers)) {
            this.props.setIsPlaying(false)
        }
        /*let currentUsers = _.cloneDeep(this.props.round.currentUsers)
        _.pull(currentUsers, this.props.user.id)
        await this.context.updateRound(this.props.round.id, { currentUsers })*/
        this.props.setRound(null)
        this.props.setUsers([])
        this.isLoadingRound = false;
        this.hasLoadedRound = false;
    }

    async loadRound() {
        this.isLoadingRound = true;
        let roundId = this.props.location.pathname.split('/play/')[1]
        // console.log('PlayRoute::loadRound()', roundId);
        let round = await this.context.getRound(roundId)
        if (_.isNil(round) || _.isNil(round.currentUsers)) {
            // probably deleted round
            this.props.history.push('/rounds')
            return
        }

        const userId = this.props.user.id
        if (!round.currentUsers.includes(userId)) {
            // first time user to this round
            // add ourselves to current users of this round
            round.currentUsers.push(userId)
            // check if we have a user bus and user patterns document (createdBy user will already, but collaborators wont)
            if (_.isNil(round.userBuses[userId])) {
                round.userBuses[userId] = getDefaultUserBus(userId)
                await this.context.createUserBus(roundId, userId, round.userBuses[userId])
            }
            if (_.isNil(round.userPatterns[userId])) {
                round.userPatterns[userId] = getDefaultUserPatterns(userId)
                await this.context.saveUserPatterns(roundId, userId, round.userPatterns[userId])
            }
        }
        await this.context.updateRound(round.id, { currentUsers: round.currentUsers })
        // load other current users (to get colors, avatar etc)
        let currentUsers = []
        for (const currentUser of round.currentUsers) {
            const user = await this.context.loadUser(currentUser)
            currentUsers.push(user)
        }

        // load audio
        CustomSamples.init(this.context)
        await AudioEngine.init()
        Instruments.init()
        FX.init()
        //console.log('PlayRoute loading audio engine');
        await AudioEngine.load(round)
        // console.log('PlayRoute finished loading audio engine');

        this.props.setUsers(currentUsers)
        this.props.setRound(round)
        this.hasLoadedRound = true
        this.isLoadingRound = false
        this.removeFirebaseListeners()
        this.addFirebaseListeners()
        this.addUsersListeners()
    }

    addFirebaseListeners() {
        const _this = this

        // Round
        this.context.db.collection('rounds').doc(this.props.round.id).onSnapshot(async (doc) => {
            const updatedRound = doc.data()
            // console.log('### round change listener fired', this.props.round, updatedRound);
            if (_.isNull(this.props.round)) {
                // probably deleted round
                _this.props.history.push('/rounds')
                return
            }
            if (!this.isDisposing) {
                if (!_.isEqual(_this.props.round.currentUsers, updatedRound.currentUsers)) {
                    //    console.log('new user added or removed');
                    let users = []
                    for (const userId of updatedRound.currentUsers) {
                        let user = await _this.context.loadUser(userId)
                        users.push(user)
                    }
                    //    console.log('setUsers()', users);
                    _this.props.setUsers(users)
                    _this.props.setRoundCurrentUsers(updatedRound.currentUsers)
                    _this.addUsersListeners()
                }
                if (!_.isEqual(_this.props.round.bpm, updatedRound.bpm)) {
                    AudioEngine.setTempo(updatedRound.bpm)
                    _this.props.setRoundBpm(updatedRound.bpm)
                }
                if (!_.isEqual(_this.props.round.swing, updatedRound.swing)) {
                    AudioEngine.setSwing(updatedRound.swing)
                    _this.props.setRoundSwing(updatedRound.swing)
                }
            }
        })

        // Layers
        this.layersChangeListenerUnsubscribe = this.context.db.collection('rounds').doc(this.props.round.id).collection('layers').onSnapshot((layerCollectionSnapshot) => {
            //  console.log('### layer change listener fired');
            layerCollectionSnapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    //  console.log('Modified layer: ', change.doc.data());
                    const layer = change.doc.data()
                    if (layer.createdBy !== _this.props.user.id) {
                        _this.reloadCollaborationLayersThrottled()
                    } else {
                        // console.log('ignoring own firebase change');
                    }
                }
                if (change.type === 'added') {
                    //   console.log('New layer: ', change.doc.data());
                    _this.reloadCollaborationLayersThrottled()
                }
                if (change.type === 'removed') {
                    //    console.log('Removed layer: ', change.doc.data());
                    _this.reloadCollaborationLayersThrottled()
                }
            });
        })

        // Userbus (FX)
        this.userBusChangeListenerUnsubscribe = this.context.db.collection('rounds').doc(this.props.round.id).collection('userBuses').onSnapshot((userBusesCollectionSnapshot) => {
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

        // UserPatterns
        this.userPatternsChangeListenerUnsubscribe = this.context.db.collection('rounds').doc(this.props.round.id).collection('userPatterns').onSnapshot((userPatternsCollectionSnapshot) => {
            //  console.log('### layer change listener fired');
            userPatternsCollectionSnapshot.docChanges().forEach(async change => {
                const data = change.doc.data();
                const userId = change.doc.id;
                const newUser = await _this.context.loadUser(userId)
                const newUsers = _.cloneDeep(this.props.users)
                if (change.type === 'modified') {
                    const userPatterns = change.doc.data()
                    userPatterns.id = change.doc.id
                    _this.handleUserPatternsChange(userPatterns)
                }
                if (change.type === 'added') {
                    let newRound = _.cloneDeep(this.props.round)
                    let userPatterns = newRound.userPatterns
                    if (_.isNil(userPatterns[userId]) && this.props.user.id !== userId) {
                        /** Feels like all these should be implemented elsewhere */
                        newRound.userPatterns[userId] = data
                        newRound.currentUsers.push(userId)
                        newUsers.push(newUser)
                        _this.props.setUsers(newUsers)
                        _this.props.setRoundCurrentUsers(newRound.currentUsers)
                        _this.props.setRound(newRound)
                    }
                }
                if (change.type === 'removed') {
                    //    console.log('Removed layer: ', change.doc.data());
                    // _this.reloadCollaborationLayersThrottled()
                }
            });
        })
    }

    removeFirebaseListeners() {
        //console.log('removeFirebaseListeners()');
        if (!_.isNil(this.layersChangeListenerUnsubscribe)) {
            this.layersChangeListenerUnsubscribe();
        }
        if (!_.isNil(this.userBusChangeListenerUnsubscribe)) {
            this.userBusChangeListenerUnsubscribe();
        }
        this.removeUsersListeners()
    }

    addUsersListeners() {
        this.removeUsersListeners()
        this.usersChangeListenersUnsubscribe = []
        const _this = this;
        for (const user of this.props.users) {
            let userListenerUnsubscribe = this.context.db.collection('users').doc(user.id).onSnapshot((doc) => {
                //    console.log('### user change listener fired');
                _this.loadUsers()
            })
            this.usersChangeListenersUnsubscribe.push(userListenerUnsubscribe)
        }
    }

    async loadUsers() {
        let users = []
        for (const userId of this.props.round.currentUsers) {
            let user = await this.context.loadUser(userId)
            users.push(user)
        }
        // console.log('setUsers()', users);
        this.props.setUsers(users)
        this.props.setRoundCurrentUsers(this.props.round.currentUsers)
    }

    removeUsersListeners() {
        if (!_.isNil(this.usersChangeListenersUnsubscribe)) {
            for (const unsubscribe of this.usersChangeListenersUnsubscribe) {
                unsubscribe()
            }
        }
    }

    handleUserBusChange(userBus) {
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

    handleUserPatternsChange(userPatterns) {
        console.log('userPatternsChange', userPatterns);
        this.props.setIsPlayingSequence(userPatterns.id, userPatterns.isPlayingSequence)
    }

    // if any of the subcollections for a collaboration user change, trigger a (throttled) reload of all collaboration layers as there could be multiple changes
    // to do: maybe add an id to the query to make sure we don't overwrite the local round with an await result that comes in late
    async reloadCollaborationLayers() {
        //console.log('reloadCollaborationLayers()');
        const _this = this;
        if (!_.isNil(this.props.round)) {
            const newRound = await this.context.getRound(this.props.round.id)
            const newLayers = _.filter(newRound.layers, (layer) => {
                return layer.createdBy !== _this.props.user.id
            })
            const oldLayers = _.filter(this.props.round.layers, (layer) => {
                return layer.createdBy !== _this.props.user.id
            })
            // console.log('comparing layers', _.isEqual(newLayers, oldLayers));
            if (!_.isEqual(newLayers, oldLayers)) {
                const userLayers = _.filter(this.props.round.layers, (layer) => {
                    return layer.createdBy === _this.props.user.id
                })
                const layers = [...userLayers, ...newLayers]
                const round = _.cloneDeep(this.props.round)
                round.layers = layers
                this.props.setRound(round)
            }
        }
    }

    // user needs to click something in order to start audio context, if they're a collaborator then they may not click play so use the first click to start audio context
    addStartAudioContextListener() {
        window.addEventListener('touchstart', this.startAudioContext)
    }
    startAudioContext() {
        //console.log('startAudioContext()');
        AudioEngine.startAudioContext()
        this.removeStartAudioContextListener()
    }
    removeStartAudioContextListener() {
        window.removeEventListener('touchstart', this.startAudioContext)
    }

    adjustLayerTimingInstant(id, percent) {
        this.playUIRef.adjustLayerTiming(id, percent)
    }

    render() {
        //  console.log('PlayRoute::render()', this.props.round);
        const { classes, round } = this.props;
        return (
            <Box className={classes.root}>
                {
                    !_.isNil(round) &&
                    <PlayUI childRef={ref => (this.playUIRef = ref)} />
                }
                {
                    _.isNil(round) &&
                    <Loader
                        className={classes.loader}
                        type="Puff"
                        color="#00BFFF"
                        height={100}
                        width={100}
                        visible={true}
                    />
                }
                <PatternsSidebar />
                <EffectsSidebar />
                <ShareDialog />
                <Box style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <LayerSettings playUIRef={this.playUIRef} />
                </Box>
                {/* <OrientationDialog /> */}
            </Box>
        )
    }
}
PlayRoute.propTypes = {
    classes: PropTypes.object.isRequired,
};
const mapStateToProps = state => {
    return {
        round: state.round,
        user: state.user,
        users: state.users
    };
};


export default connect(
    mapStateToProps,
    {
        setRound,
        setUsers,
        setIsPlaying,
        setUserBusFxOverride,
        addUserBus,
        setRoundCurrentUsers,
        setRoundBpm,
        setRoundSwing,
        setIsPlayingSequence
    }
)(withStyles(styles)(PlayRoute));