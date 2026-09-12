import React, { Component } from 'react'
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import withRouter from '../../utils/withRouter';
import { Button } from '@/components/ui/button';
import { MUI_BUTTON, MUI_SECONDARY } from '@/lib/mui';
import { ShareIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { BackButton } from '../play/layer-settings/resources';
import { setUser, setIsShowingSignInDialog, setRedirectAfterSignIn, setRounds, setIsShowingShareDialog } from '../../redux/actions'
import _ from 'lodash'
import HeaderAvatar from './HeaderAvatar'
import JitsiComponent from '../play/JitsiComponent';
import ProjectName from './ProjectName'
import HeaderMenu from './HeaderMenu';
import { FirebaseContext } from '../../firebase';
import { getRandomColor, presentUsers, profileFromAuthUser } from '../../utils/index'
import CustomSamples from '../../audio-engine/CustomSamples'
import { createRound } from '../../utils/index'

class Header extends Component {
	static contextType = FirebaseContext;
	constructor(props) {
		super(props);
		this.unsubscribeFromAuth = null
		this.onSignInClick = this.onSignInClick.bind(this)
		this.onShareClick = this.onShareClick.bind(this)
	}

	componentDidMount() {
		const _this = this
		this.unsubscribeFromAuth = this.context.onAuthStateChanged(async (authUser) => {
			if (!_.isNil(authUser)) {
				try {
					let user = await _this.context.loadUser(authUser.uid)
					if (!_.isNil(user)) {
						_this.props.setUser(user)
						const rounds = await _this.context.getRoundsList(user.id, 1.5)
						_this.props.setRounds(rounds)
						const samples = await _this.context.getSamples(user.id)
						for (let sample of samples) {
							CustomSamples.add(sample)
						}
					} else {
						// No profile yet: a first Google sign-in, or a sign-up whose dialog is writing the
						// profile right now. Merge only the fields the auth user provides (never a null
						// name) and then read back whatever both writers produced.
						const profile = { ...profileFromAuthUser(authUser), color: getRandomColor() }
						await _this.context.createUser(profile)
						user = (await _this.context.loadUser(authUser.uid)) || profile
						_this.props.setUser(user)
					}
					if (!_.isNil(_this.props.redirectAfterSignIn)) {
						// The user goes to `redirect` rather than being read back off props: React 18
						// schedules the re-render `setUser` asks for, so `this.props.user` here is
						// still whoever was signed in before, and for a first sign-in that is nobody.
						_this.redirect(authUser, user)
					}
				} catch (error) {
					console.error('Could not load the signed-in user', error)
				}
			} else {
				if (_this.props.location.pathname !== '/') {
					// _this.props.history.push('/')
					_this.props.setIsShowingSignInDialog(true)
				}
			}
		})
	}

	componentWillUnmount() {
		if (!_.isNil(this.unsubscribeFromAuth)) {
			this.unsubscribeFromAuth()
			this.unsubscribeFromAuth = null
		}
	}

	redirect = async (authUser, signedInUser) => {
		if (!authUser.isAnonymous) {
			// if not guest user go to rounds list
			this.props.history.push(this.props.redirectAfterSignIn)
			this.props.setRedirectAfterSignIn(null)
		} else if (this.props.redirectAfterSignIn === '/rounds') {
			// guest user, create a new round and redirect to there instead of /rounds
			let newRound = await createRound(signedInUser.id)
			if (!newRound) return;
			let newRounds = [newRound, ...this.props.rounds]
			await this.context.createRound(newRound)
			this.props.setRounds(newRounds)
			this.props.setRedirectAfterSignIn(null)
			this.props.history.push('/play/' + newRound.id)
		}
	}

	onSignInClick = () => {
		this.props.setIsShowingSignInDialog(true)
	}

	onShareClick = () => {
		this.props.setIsShowingShareDialog(true)
	}

	render() {
		const { location, round, users, user } = this.props;
		const isPlayMode = location.pathname.includes('/play/')
		// `users` holds a profile for every contributor so that layers keep their colour; only the
		// people who are in the round right now get an avatar, and voice chat only opens for them.
		const usersPresent = presentUsers(users, round)
		// The bar stays translucent: on the play route the round is drawn underneath it and shows
		// through, so `--surface` (opaque #2d2d2d) is not the same colour at all.
		return (
			<div className="fixed z-[4] flex h-16 w-full flex-row items-center justify-between bg-[rgba(47,47,47,0.9)] px-4">
				{isPlayMode &&
					<>
						<div className="flex flex-row items-center">
							{/* 44x42, not the 48x48 of `icon-round`: MUI's IconButton is 12px of padding
							    around whatever it holds, and BackButton is a 20x18 SVG, not a 24px
							    glyph. Its own width is what puts the round's name at x 76 on
							    05-round.png, so the button has to size to its content and the icon
							    has to keep its natural size. border-0 for the same reason: the generated
							    Button's transparent 1px border is part of a shrink-to-fit width, and
							    MUI's ButtonBase has none. */}
							<Button asChild variant="plain" size="icon-round" className="size-auto border-0 p-3 [&_svg:not([class*='size-'])]:size-auto">
								<Link data-test="button-back-to-rounds" aria-label="Back to my rounds" to="/rounds"><BackButton /></Link>
							</Button>
							<div className="ml-2">
								{
									round &&
									<div>
										<ProjectName name={round.name} />
									</div>
								}
								{
									_.isNil(round) &&
									<p className="m-0 text-base leading-6 tracking-[0.00938em]">Loading...</p>
								}
							</div>
						</div>
						<div className="flex items-center">
							<div className="mr-4 flex items-center">
								{
									usersPresent.map((currentUser) => (
										<HeaderAvatar className="relative" key={currentUser.id} user={currentUser} users={users} shouldShowMenu={!_.isNil(user) && (currentUser.id === user.id)} />
									))
								}
							</div>
							{round && usersPresent.length > 1 && <JitsiComponent />}
							{round &&
								<div>
									{/* border-0 because the generated Button carries a transparent 1px border
									    and `bg-clip-padding`, which would inset this one's fill to a 46px
									    circle inside its 48px box. MUI's IconButton has `border: 0`. */}
									<Button aria-label="Share this round" variant="plain" size="icon-round" className="mr-4 border-0 bg-secondary hover:bg-secondary" onClick={this.onShareClick}><ShareIcon /></Button>
								</div>
							}
							{round &&
								<div>
									<HeaderMenu />
								</div>
							}
						</div>
					</>
				}
				{!isPlayMode &&
					<>
						<div>
							<Button asChild variant="plain" className={cn(MUI_BUTTON, 'px-2 font-semibold')}>
								<Link to="/">RoundAround</Link>
							</Button>
						</div>
						{
							user &&
							<HeaderAvatar user={user} users={users} shouldShowMenu={true} />
						}
						{
							!user &&
							<Button
								className={cn(MUI_BUTTON, MUI_SECONDARY, 'signed-out')}
								onClick={this.onSignInClick}
								data-test="button-sign-in-out"
							>Sign in</Button>
						}

					</>
				}
			</div>
		)
	}
}

const mapStateToProps = state => {
	return {
		user: state.user,
		users: state.users,
		redirectAfterSignIn: state.display.redirectAfterSignIn,
		rounds: state.rounds,
		round: state.round
	};
};

export default connect(
	mapStateToProps,
	{
		setUser,
		setIsShowingSignInDialog,
		setRedirectAfterSignIn,
		setRounds,
		setIsShowingShareDialog
	}
)(withRouter(Header));
