import React, { Component } from 'react'
import PlayUI from './PlayUI'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import EffectsSidebar from './EffectsSidebar';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import _ from 'lodash';
import Loader from 'react-loader-spinner';
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
import { setRound, setUsers, setIsPlaying, setUserBusFxOverride, addUserBus, setRoundCurrentUsers, setRoundContributors, setRoundBpm, setRoundSwing, setIsPlayingSequence } from '../../redux/actions'
import AudioEngine from '../../audio-engine/AudioEngine'
import Instruments from '../../audio-engine/Instruments'
import FX from '../../audio-engine/FX'
import ShareDialog from '../dialogs/ShareDialog'
import OrientationDialog from '../dialogs/OrientationDialog'
import { getDefaultUserBus, getDefaultUserPatterns } from '../../utils/defaultData'
import { derivedContributors, normalizeLegacyFxOrder } from '../../utils/index'
import LayerSettings from './layer-settings/LayerSettings';
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
    },
    error: {
        position: 'absolute',
        top: 0,
        zIndex: 9,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
    }
})

// Events that count as the user gesture browsers require before audio may start.
const AUDIO_UNLOCK_EVENTS = ['touchstart', 'pointerdown', 'keydown']

class PlayRoute extends Component {
    static contextType = FirebaseContext;
    constructor(props) {
        super(props)
        this.state = {
            loadError: null
        }
        this.isLoadingRound = false;
        this.hasLoadedRound = false;
        this.isDisposing = false;
        this.joinedRoundId = null;
        this.reloadCollaborationLayers = this.reloadCollaborationLayers.bind(this)
        this.startAudioContext = this.startAudioContext.bind(this)
        this.onPageHide = this.onPageHide.bind(this)
        this.handleUserPatternsChange = this.handleUserPatternsChange.bind(this)
        this.reloadCollaborationLayersThrottled = _.debounce(this.reloadCollaborationLayers, 1000)
        this.playUIRef = null;
        this.unsubscribers = []
        this.usersChangeListenersUnsubscribe = []
    }
    componentDidMount() {
        this.addStartAudioContextListener()
        this.addPageHideListener()
        if (this.shouldLoadRound()) {
            this.loadRound()
        }
    }

    componentDidUpdate() {
        if (this.shouldLoadRound() && _.isNil(this.props.round)) {
            this.loadRound()
        }
    }

    shouldLoadRound() {
        return !this.isLoadingRound && !this.hasLoadedRound && _.isNil(this.state.loadError) && !_.isNil(this.props.user)
    }

    componentWillUnmount() {
        this.isDisposing = true;
        this.reloadCollaborationLayersThrottled.cancel()
        this.removeStartAudioContextListener()
        this.removePageHideListener()
        this.removeFirebaseListeners()
        this.leaveRound()
        AudioEngine.stop()
        if (!_.isNil(this.props.round) && !_.isNil(this.props.round.currentUsers)) {
            this.props.setIsPlaying(false)
        }
        this.props.setRound(null)
        this.props.setUsers([])
        this.isLoadingRound = false;
        this.hasLoadedRound = false;
    }

    getRoundIdFromPath() {
        return this.props.location.pathname.split('/play/')[1]
    }

    async loadRound() {
        this.isLoadingRound = true;
        const roundId = this.getRoundIdFromPath()
        try {
            const round = normalizeLegacyFxOrder(await this.context.getRound(roundId))
            if (this.isDisposing) {
                return
            }
            if (_.isNil(round) || _.isNil(round.currentUsers)) {
                // deleted or never existed
                this.props.history.push('/rounds')
                return
            }

            const userId = this.props.user.id
            if (!round.currentUsers.includes(userId)) {
                // first visit: give the user a bus and a patterns document, then add them to the
                // round's members atomically so two people joining at once cannot drop each other
                round.currentUsers.push(userId)
                if (_.isNil(round.userBuses[userId])) {
                    round.userBuses[userId] = getDefaultUserBus(userId)
                    await this.context.createUserBus(roundId, userId, round.userBuses[userId])
                }
                if (_.isNil(round.userPatterns[userId])) {
                    round.userPatterns[userId] = getDefaultUserPatterns(userId)
                    await this.context.saveUserPatterns(roundId, userId, round.userPatterns[userId])
                }
                await this.context.joinRound(roundId, userId)
            }
            // From here on the user is one of the round's members and has to be taken out again on
            // the way out, even if they leave before the rest of the load has finished.
            this.joinedRoundId = roundId
            if (this.isDisposing) {
                this.leaveRound()
                return
            }

            if (_.isNil(round.contributors)) {
                // A round saved before rounds had contributors: work out who has been in it from
                // what the document does say, and write that back once, as a union.
                round.contributors = derivedContributors(round)
                await this.context.backfillContributors(roundId, round.contributors)
            } else if (!round.contributors.includes(userId)) {
                // joinRound has just added the user to the stored list
                round.contributors.push(userId)
            }

            // load a profile for every contributor, present or not (colors, avatar etc), so that a
            // layer keeps its author's colour after the author has left
            const contributors = await this.loadUsersById(round.contributors)

            // load audio
            CustomSamples.init(this.context)
            await AudioEngine.init()
            Instruments.init()
            FX.init()
            await AudioEngine.load(round)
            if (this.isDisposing) {
                return
            }

            this.props.setUsers(contributors)
            this.props.setRound(round)
            this.hasLoadedRound = true
            this.removeFirebaseListeners()
            this.addFirebaseListeners()
            this.addUsersListeners()
        } catch (error) {
            console.error('Could not load round', roundId, error)
            if (!this.isDisposing) {
                this.setState({ loadError: error })
            }
        } finally {
            this.isLoadingRound = false
        }
    }

    async loadUsersById(userIds) {
        const users = await Promise.all(userIds.map(userId => this.context.loadUser(userId)))
        return users.filter(user => !_.isNil(user))
    }

    addFirebaseListeners() {
        const _this = this
        const roundId = this.props.round.id

        // Round
        this.unsubscribers.push(this.context.subscribeToRound(roundId, async ({ exists, data: updatedRound }) => {
            if (_this.isDisposing) {
                return
            }
            if (!exists || _.isNil(_this.props.round)) {
                // deleted round
                _this.props.history.push('/rounds')
                return
            }
            if (!_.isEqual(_this.props.round.contributors, updatedRound.contributors)) {
                // somebody has contributed for the first time, or an old round has just been given
                // its contributors: every one of them needs a profile
                const users = await _this.loadUsersById(updatedRound.contributors || [])
                if (_this.isDisposing) {
                    return
                }
                _this.props.setUsers(users)
                _this.props.setRoundContributors(updatedRound.contributors || [])
                _this.addUsersListeners()
            }
            if (!_.isEqual(_this.props.round.currentUsers, updatedRound.currentUsers)) {
                // somebody has arrived or left: the avatars and voice chat follow who is here now
                _this.props.setRoundCurrentUsers(updatedRound.currentUsers)
            }
            if (!_.isEqual(_this.props.round.bpm, updatedRound.bpm)) {
                AudioEngine.setTempo(updatedRound.bpm)
                _this.props.setRoundBpm(updatedRound.bpm)
            }
            if (!_.isEqual(_this.props.round.swing, updatedRound.swing)) {
                AudioEngine.setSwing(updatedRound.swing)
                _this.props.setRoundSwing(updatedRound.swing)
            }
        }, (error) => console.error('Round listener failed', error)))

        // Layers
        this.unsubscribers.push(this.context.subscribeToLayers(roundId, (changes) => {
            if (_this.isDisposing) {
                return
            }
            changes.forEach(change => {
                if (change.type === 'modified') {
                    if (change.data.createdBy !== _this.props.user.id) {
                        _this.reloadCollaborationLayersThrottled()
                    }
                }
                if (change.type === 'added' || change.type === 'removed') {
                    _this.reloadCollaborationLayersThrottled()
                }
            });
        }, (error) => console.error('Layers listener failed', error)))

        // Userbus (FX)
        this.unsubscribers.push(this.context.subscribeToUserBuses(roundId, (changes) => {
            if (_this.isDisposing || _.isNil(_this.props.round)) {
                return
            }
            changes.forEach(change => {
                const userBus = { ...change.data, id: change.id }
                if (change.type === 'modified') {
                    _this.handleUserBusChange(userBus)
                }
                if (change.type === 'added') {
                    if (_.isNil(_this.props.round.userBuses[userBus.id])) {
                        _this.props.addUserBus(userBus.id, userBus)
                        AudioEngine.addUser(userBus.id, userBus.fx)
                    }
                }
            });
        }, (error) => console.error('User buses listener failed', error)))

        // UserPatterns
        this.unsubscribers.push(this.context.subscribeToUserPatterns(roundId, (changes) => {
            if (_this.isDisposing || _.isNil(_this.props.round)) {
                return
            }
            changes.forEach(async change => {
                const data = change.data;
                const userId = change.id;
                if (change.type === 'modified') {
                    const userPatterns = { ...data, id: userId }
                    _this.handleUserPatternsChange(userPatterns)
                }
                if (change.type === 'added') {
                    if (_.isNil(_this.props.round.userPatterns[userId]) && _this.props.user.id !== userId) {
                        const newUser = await _this.context.loadUser(userId)
                        if (_this.isDisposing || _.isNil(_this.props.round)) {
                            return
                        }
                        const newRound = _.cloneDeep(_this.props.round)
                        newRound.userPatterns[userId] = data
                        if (!newRound.currentUsers.includes(userId)) {
                            newRound.currentUsers.push(userId)
                        }
                        newRound.contributors = newRound.contributors || []
                        if (!newRound.contributors.includes(userId)) {
                            newRound.contributors.push(userId)
                        }
                        const newUsers = _.cloneDeep(_this.props.users)
                        if (!_.isNil(newUser) && _.isNil(_.find(newUsers, { id: userId }))) {
                            newUsers.push(newUser)
                        }
                        _this.props.setUsers(newUsers)
                        _this.props.setRoundCurrentUsers(newRound.currentUsers)
                        _this.props.setRound(newRound)
                    }
                }
            });
        }, (error) => console.error('User patterns listener failed', error)))
    }

    removeFirebaseListeners() {
        for (const unsubscribe of this.unsubscribers) {
            unsubscribe()
        }
        this.unsubscribers = []
        this.removeUsersListeners()
    }

    addUsersListeners() {
        this.removeUsersListeners()
        const _this = this;
        for (const user of this.props.users) {
            const userListenerUnsubscribe = this.context.subscribeToUser(user.id, () => {
                if (!_this.isDisposing) {
                    _this.loadUsers()
                }
            }, (error) => console.error('User listener failed', error))
            this.usersChangeListenersUnsubscribe.push(userListenerUnsubscribe)
        }
    }

    async loadUsers() {
        if (_.isNil(this.props.round)) {
            return
        }
        try {
            const users = await this.loadUsersById(this.props.round.contributors || [])
            if (this.isDisposing || _.isNil(this.props.round)) {
                return
            }
            this.props.setUsers(users)
        } catch (error) {
            console.error('Could not reload users', error)
        }
    }

    removeUsersListeners() {
        for (const unsubscribe of this.usersChangeListenersUnsubscribe) {
            unsubscribe()
        }
        this.usersChangeListenersUnsubscribe = []
    }

    handleUserBusChange(userBus) {
        const localBus = this.props.round.userBuses[userBus.id]
        const audioBus = AudioEngine.busesByUser[userBus.id]
        if (_.isNil(localBus) || _.isNil(audioBus) || !Array.isArray(userBus.fx)) {
            return
        }
        let fxOrderChanged = false
        for (let fx of userBus.fx) {
            const currentFx = _.find(localBus.fx, { id: fx.id })
            if (_.isNil(currentFx)) {
                continue
            }
            if (!_.isEqual(fx.isOverride, currentFx.isOverride)) {
                if (!_.isNil(audioBus.fx) && !_.isNil(audioBus.fx[fx.id])) {
                    audioBus.fx[fx.id].override = fx.isOverride
                }
                this.props.setUserBusFxOverride(userBus.id, fx.id, fx.isOverride)
            }
            if (!_.isEqual(fx.order, currentFx.order)) {
                fxOrderChanged = true
            }
        }
        if (fxOrderChanged) {
            audioBus.setFxOrder(userBus.fx)
        }
    }

    handleUserPatternsChange(userPatterns) {
        this.props.setIsPlayingSequence(userPatterns.id, userPatterns.isPlayingSequence)
    }

    // if any of the subcollections for a collaboration user change, trigger a (throttled) reload of all collaboration layers as there could be multiple changes
    // to do: maybe add an id to the query to make sure we don't overwrite the local round with an await result that comes in late
    async reloadCollaborationLayers() {
        const _this = this;
        if (_.isNil(this.props.round)) {
            return
        }
        try {
            const newRound = await this.context.getRound(this.props.round.id)
            if (this.isDisposing || _.isNil(newRound) || _.isNil(this.props.round)) {
                return
            }
            const newLayers = _.filter(newRound.layers, (layer) => {
                return layer.createdBy !== _this.props.user.id
            })
            const oldLayers = _.filter(this.props.round.layers, (layer) => {
                return layer.createdBy !== _this.props.user.id
            })
            if (!_.isEqual(newLayers, oldLayers)) {
                const userLayers = _.filter(this.props.round.layers, (layer) => {
                    return layer.createdBy === _this.props.user.id
                })
                const layers = [...userLayers, ...newLayers]
                const round = _.cloneDeep(this.props.round)
                round.layers = layers
                this.props.setRound(round)
            }
        } catch (error) {
            console.error('Could not reload collaborators\' layers', error)
        }
    }

    // Browsers only start audio after a user gesture. The person who presses play gets one for free;
    // a collaborator who only listens needs their first touch, click or key press to unlock audio.
    addStartAudioContextListener() {
        for (const eventName of AUDIO_UNLOCK_EVENTS) {
            window.addEventListener(eventName, this.startAudioContext, { passive: true })
        }
    }
    startAudioContext() {
        AudioEngine.startAudioContext()
        this.removeStartAudioContextListener()
    }
    removeStartAudioContextListener() {
        for (const eventName of AUDIO_UNLOCK_EVENTS) {
            window.removeEventListener(eventName, this.startAudioContext)
        }
    }

    // A browser does not unmount a component when the tab is closed or the page is replaced, so
    // the round is left from `pagehide` as well as from componentWillUnmount.
    addPageHideListener() {
        window.addEventListener('pagehide', this.onPageHide)
    }
    onPageHide() {
        this.leaveRound()
    }
    removePageHideListener() {
        window.removeEventListener('pagehide', this.onPageHide)
    }

    /**
     * Takes the user out of the round's members, once. They stay among its contributors, so their
     * layers keep their colour. Best effort: the write is fired off and its failure logged, never
     * waited on, because nothing may hold up an unmount or a page unload.
     */
    leaveRound() {
        const roundId = this.joinedRoundId
        if (_.isNil(roundId) || _.isNil(this.props.user)) {
            return
        }
        this.joinedRoundId = null
        const onError = (error) => console.error('Could not leave round', roundId, error)
        try {
            // sent straight away and never waited on, so an unload has the best chance of carrying
            // the write out while nothing holds the page up
            this.context.leaveRound(roundId, this.props.user.id).catch(onError)
        } catch (error) {
            onError(error)
        }
    }

    adjustLayerTimingInstant(id, percent) {
        this.playUIRef.adjustLayerTiming(id, percent)
    }

    onBackToRoundsClick = () => {
        this.props.history.push('/rounds')
    }

    render() {
        const { classes, round } = this.props;
        const { loadError } = this.state
        return (
            <Box className={classes.root}>
                {
                    !_.isNil(round) &&
                    <PlayUI childRef={ref => (this.playUIRef = ref)} />
                }
                {
                    _.isNil(round) && _.isNil(loadError) &&
                    <Loader
                        className={classes.loader}
                        type="Puff"
                        color="#00BFFF"
                        height={100}
                        width={100}
                        visible={true}
                    />
                }
                {
                    !_.isNil(loadError) &&
                    <Box className={classes.error} role="alert">
                        <Typography variant="h5" gutterBottom>This round could not be loaded.</Typography>
                        <Typography color="textSecondary" gutterBottom>{loadError.message || String(loadError)}</Typography>
                        <Button variant="contained" color="primary" disableElevation onClick={this.onBackToRoundsClick} data-test="button-back-to-rounds-error">
                            Back to my rounds
                        </Button>
                    </Box>
                }
                <EffectsSidebar />
                <ShareDialog />
                <OrientationDialog />
                <Box style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <LayerSettings playUIRef={this.playUIRef} />
                </Box>
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
        setRoundContributors,
        setRoundBpm,
        setRoundSwing,
        setIsPlayingSequence
    }
)(withStyles(styles)(PlayRoute));
