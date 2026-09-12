import React, { Component } from 'react'
import PlayUI from './PlayUI'
import EffectsSidebar from './EffectsSidebar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { MUI_BUTTON, MUI_PRIMARY } from '@/lib/mui';
import { cn } from '@/lib/utils';
import _ from 'lodash';
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
import { setRound, setUsers, setIsPlaying, setUserBusFxOverride, addUserBus, setRoundCurrentUsers, setRoundContributors, setRoundBpm, setRoundSwing, setIsPlayingSequence, updateLayer, addLayer, removeLayer } from '../../redux/actions'
import AudioEngine from '../../audio-engine/AudioEngine'
import Instruments from '../../audio-engine/Instruments'
import FX from '../../audio-engine/FX'
import ShareDialog from '../dialogs/ShareDialog'
import OrientationDialog from '../dialogs/OrientationDialog'
import { getDefaultUserBus, getDefaultUserPatterns } from '../../utils/defaultData'
import { derivedContributors, normalizeLegacyFxOrder } from '../../utils/index'
import LayerSettings from './layer-settings/LayerSettings';
import CustomSamples from '../../audio-engine/CustomSamples';
import withRouter from '../../utils/withRouter'

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
        this.joinedUserId = null;
        this.startAudioContext = this.startAudioContext.bind(this)
        this.onPageHide = this.onPageHide.bind(this)
        this.onPageShow = this.onPageShow.bind(this)
        this.handleUserPatternsChange = this.handleUserPatternsChange.bind(this)
        this.playUIRef = null;
        this.unsubscribers = []
        this.usersChangeListenersUnsubscribe = []
    }
    componentDidMount() {
        // A mount is a fresh start, whether or not this instance has been mounted before. React 18
        // remounts class components in development under StrictMode, and everything componentWill-
        // Unmount set is set back there except this flag: left true, every loadRound would bail at
        // its first check and componentDidUpdate would start another one on every store change.
        this.isDisposing = false;
        this.addStartAudioContextListener()
        this.addPageTransitionListeners()
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
        this.removeStartAudioContextListener()
        this.removePageTransitionListeners()
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
            const isMember = round.currentUsers.includes(userId)
            // A member can still be missing from `contributors`: they joined through a client that
            // did not know about the field, or the round is a duplicate that inherited the list
            // from the round it was copied from.
            const isMissingFromContributors = !_.isNil(round.contributors) && !round.contributors.includes(userId)
            if (!isMember) {
                // first visit: give the user a bus and a patterns document
                round.currentUsers.push(userId)
                if (_.isNil(round.userBuses[userId])) {
                    round.userBuses[userId] = getDefaultUserBus(userId)
                    await this.context.createUserBus(roundId, userId, round.userBuses[userId])
                }
                if (_.isNil(round.userPatterns[userId])) {
                    round.userPatterns[userId] = getDefaultUserPatterns(userId)
                    await this.context.saveUserPatterns(roundId, userId, round.userPatterns[userId])
                }
            }
            if (!isMember || isMissingFromContributors) {
                // The join unions the user into both lists, so it settles either case without a
                // read-modify-write: two people joining at once cannot drop each other, and the
                // user is in the stored list the round listener reloads profiles from. Under rules
                // that predate `contributors` it takes two writes, and the second can be refused;
                // the local list only gains the user when the stored one did.
                const isInContributors = await this.joinRoundOrLegacy(roundId, userId)
                if (isMissingFromContributors && isInContributors) {
                    round.contributors.push(userId)
                }
            }
            // From here on the user is one of the round's members and has to be taken out again on
            // the way out, even if they leave before the rest of the load has finished. Their id is
            // kept with the round's: signing out clears the user from the store before this route
            // unmounts, and the leave still has to name whoever joined.
            this.joinedRoundId = roundId
            this.joinedUserId = userId
            if (this.isDisposing) {
                this.leaveRound()
                return
            }

            // Everyone who has ever been in the round: the stored list, or, for a round saved
            // before rounds had contributors, who the rest of the document says has been in it.
            const contributors = round.contributors || derivedContributors(round)
            if (_.isNil(round.contributors)) {
                try {
                    // write the derived list back, once, as a union
                    await this.context.backfillContributors(roundId, contributors)
                    round.contributors = contributors
                } catch (error) {
                    // Best effort: a round whose rules do not allow this write yet is still worth
                    // playing. The round keeps the contributors the server has (none), so the store
                    // matches the document, and the next open tries the backfill again.
                    console.error('Could not backfill contributors', roundId, error)
                }
            }

            // load a profile for every contributor, present or not (colors, avatar etc), so that a
            // layer keeps its author's colour after the author has left
            const users = await this.loadUsersById(contributors)

            // load audio
            CustomSamples.init(this.context)
            await AudioEngine.init()
            Instruments.init()
            FX.init()
            await AudioEngine.load(round)
            if (this.isDisposing) {
                return
            }

            this.props.setUsers(users)
            this.props.setRound(round)
            this.hasLoadedRound = true
            this.removeFirebaseListeners()
            this.addFirebaseListeners(round)
            this.addUsersListeners(users)
        } catch (error) {
            console.error('Could not load round', roundId, error)
            if (!this.isDisposing) {
                this.setState({ loadError: error })
            }
        } finally {
            this.isLoadingRound = false
        }
    }

    /**
     * Adds the user to the round's members and to its contributors. Answers whether they ended up
     * in the stored `contributors`, so the caller does not put them in its copy of a list the
     * server does not have them in.
     *
     * `joinRound` writes both fields together, which the rules deployed with this branch allow but
     * the ones before them do not: they let a visitor add themselves only when `currentUsers` is
     * the single field that changes. Rules are deployed by hand, so this client cannot assume the
     * new ones are live, and a round that rejects the one write is joined with two instead: the
     * one-field join those rules do accept, and then, now that the user is a member and the same
     * rules let a member write, a contributors-only union for them. Both writes are what the new
     * rules allow as well, so the fallback is safe either way. Any failure other than the rules is
     * the caller's to handle.
     */
    async joinRoundOrLegacy(roundId, userId) {
        try {
            await this.context.joinRound(roundId, userId)
            return true
        } catch (error) {
            if (_.get(error, 'code') !== 'permission-denied') {
                throw error
            }
            console.warn('This round\'s rules predate contributors; joining without it', roundId)
            await this.context.joinRoundLegacy(roundId, userId)
            try {
                await this.context.backfillContributors(roundId, [userId])
                return true
            } catch (contributorsError) {
                // The user is in the round either way. Their contributors entry is picked up on a
                // later open, by the "member missing from contributors" path above.
                console.error('Could not add the user to contributors', roundId, contributorsError)
                return false
            }
        }
    }

    async loadUsersById(userIds) {
        const users = await Promise.all(userIds.map(userId => this.context.loadUser(userId)))
        return users.filter(user => !_.isNil(user))
    }

    // Takes the round rather than reading `this.props.round`: React 18 batches the re-render that
    // a dispatch causes, so a `setRound` on the line above has not reached props yet.
    addFirebaseListeners(round) {
        const _this = this
        const roundId = round.id

        // Round
        this.unsubscribers.push(this.context.subscribeToRound(roundId, async ({ exists, data: updatedRound }) => {
            if (_this.isDisposing) {
                return
            }
            if (!exists) {
                // deleted round
                _this.props.history.push('/rounds')
                return
            }
            // The round as the store has it, falling back to the one this listener was made with:
            // React 18 schedules the re-render `setRound` asks for rather than doing it there and
            // then, so the first snapshot can arrive before props have the round in them. A missing
            // round is no longer read as a deleted one; `exists` above is what says that.
            const currentRound = _this.props.round || round
            if (!_.isEqual(currentRound.contributors, updatedRound.contributors)) {
                // somebody has contributed for the first time, or an old round has just been given
                // its contributors: every one of them needs a profile
                const users = await _this.loadUsersById(updatedRound.contributors || [])
                if (_this.isDisposing) {
                    return
                }
                _this.props.setUsers(users)
                _this.props.setRoundContributors(updatedRound.contributors || [])
                _this.addUsersListeners(users)
            }
            if (!_.isEqual(currentRound.currentUsers, updatedRound.currentUsers)) {
                // somebody has arrived or left: the avatars and voice chat follow who is here now
                _this.props.setRoundCurrentUsers(updatedRound.currentUsers)
            }
            if (!_.isEqual(currentRound.bpm, updatedRound.bpm)) {
                AudioEngine.setTempo(updatedRound.bpm)
                _this.props.setRoundBpm(updatedRound.bpm)
            }
            if (!_.isEqual(currentRound.swing, updatedRound.swing)) {
                AudioEngine.setSwing(updatedRound.swing)
                _this.props.setRoundSwing(updatedRound.swing)
            }
        }, (error) => console.error('Round listener failed', error)))

        // Layers: what a collaborator changed goes straight into the store. This client's own
        // writes come back through here as well and are already in the store, so the user's own
        // layers are left alone, and a layer that is already there, or already gone, is not added
        // or removed twice.
        this.unsubscribers.push(this.context.subscribeToLayers(roundId, (changes) => {
            if (_this.isDisposing || _.isNil(_this.props.round)) {
                return
            }
            for (const change of changes) {
                const layer = { ...change.data, id: change.id }
                const current = _.find(_this.props.round.layers, { id: change.id })
                if (change.type === 'modified') {
                    if (!_.isNil(current) && layer.createdBy !== _this.props.user.id && !_.isEqual(current, layer)) {
                        _this.props.updateLayer(change.id, change.data)
                    }
                } else if (change.type === 'added') {
                    if (_.isNil(current)) {
                        // the track first, so it is there when the layer reaches the round UI
                        AudioEngine.createTrack(layer)
                        _this.props.addLayer(layer)
                    }
                } else if (change.type === 'removed') {
                    if (!_.isNil(current)) {
                        AudioEngine.removeTrack(change.id)
                        _this.props.removeLayer(change.id)
                    }
                }
            }
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

    // Takes the users for the same reason `addFirebaseListeners` takes the round: the `setUsers`
    // that precedes every call has not reached props yet under React 18's batching.
    addUsersListeners(users) {
        this.removeUsersListeners()
        const _this = this;
        for (const user of users) {
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
    // the round is left from `pagehide` as well as from componentWillUnmount. `pagehide` also fires
    // when the page is put in the back/forward cache with everything still mounted, so `pageshow`
    // puts a restored page's user back in the round they are looking at again.
    addPageTransitionListeners() {
        window.addEventListener('pagehide', this.onPageHide)
        window.addEventListener('pageshow', this.onPageShow)
    }
    removePageTransitionListeners() {
        window.removeEventListener('pagehide', this.onPageHide)
        window.removeEventListener('pageshow', this.onPageShow)
    }
    onPageHide() {
        this.leaveRound()
    }
    onPageShow(event) {
        const hasLeft = _.isNil(this.joinedRoundId)
        if (!event.persisted || !hasLeft || _.isNil(this.props.round) || _.isNil(this.props.user)) {
            // not a restore from the cache, or the user was never taken out of the round
            return
        }
        this.rejoinRound()
    }

    /**
     * Puts the user back among the round's members after `pagehide` took them out for a page that
     * turned out to be cached rather than gone. Best effort, like leaving: the write is sent and
     * its failure logged. `joinedRoundId` is restored either way, so the next leave still happens.
     */
    rejoinRound() {
        const roundId = this.props.round.id
        const onError = (error) => console.error('Could not rejoin round', roundId, error)
        this.joinedRoundId = roundId
        this.joinedUserId = this.props.user.id
        this.joinRoundOrLegacy(roundId, this.props.user.id).catch(onError)
    }

    /**
     * Takes the user out of the round's members, once. They stay among its contributors, so their
     * layers keep their colour. Best effort: the write is fired off and its failure logged, never
     * waited on, because nothing may hold up an unmount or a page unload.
     */
    leaveRound() {
        const roundId = this.joinedRoundId
        const userId = this.joinedUserId
        if (_.isNil(roundId) || _.isNil(userId)) {
            return
        }
        this.joinedRoundId = null
        this.joinedUserId = null
        const onError = (error) => console.error('Could not leave round', roundId, error)
        try {
            // sent straight away and never waited on, so an unload has the best chance of carrying
            // the write out while nothing holds the page up
            this.context.leaveRound(roundId, userId).catch(onError)
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
        const { round } = this.props;
        const { loadError } = this.state
        return (
            // `overflow-clip`, not `overflow-hidden`: the two paint the same, but `hidden` makes
            // this a scroll container, and the always-mounted layer-settings popups sit at
            // `top: 200%` inside it. Anything that scrolls a focused descendant into view --
            // Tab used to, before the popups were made `inert` -- scrolled the whole route down
            // by ~303px with no way back, because nothing on this route is meant to scroll.
            // `clip` is not a scroll container at all, so that cannot happen again.
            <div className="relative h-full overflow-clip">
                {!_.isNil(round) && <PlayUI childRef={ref => (this.playUIRef = ref)} />}
                {_.isNil(round) && _.isNil(loadError) &&
                    <div className="absolute top-0 z-[9] flex h-full w-full items-center justify-center">
                        <Spinner className="size-[100px] text-[#00BFFF]" />
                    </div>
                }
                {!_.isNil(loadError) &&
                    <div role="alert" className="absolute top-0 z-[9] flex h-full w-full flex-col items-center justify-center p-8 text-center">
                        <p className="m-0 mb-[0.35em] text-2xl leading-[1.334] tracking-normal">This round could not be loaded.</p>
                        <p className="m-0 mb-[0.35em] text-base leading-6 tracking-[0.00938em] text-white/70">{loadError.message || String(loadError)}</p>
                        <Button
                            type="button"
                            className={cn(MUI_BUTTON, MUI_PRIMARY)}
                            onClick={this.onBackToRoundsClick}
                            data-test="button-back-to-rounds-error"
                        >
                            Back to my rounds
                        </Button>
                    </div>
                }
                <EffectsSidebar />
                <ShareDialog />
                <OrientationDialog />
                <div className="relative flex w-full justify-center">
                    <LayerSettings playUIRef={this.playUIRef} />
                </div>
            </div>
        )
    }
}
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
        setIsPlayingSequence,
        updateLayer,
        addLayer,
        removeLayer
    }
)(withRouter(PlayRoute));
