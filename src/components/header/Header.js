import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { connect } from "react-redux";
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Box from '@material-ui/core/Box';
import {
	Link, withRouter
} from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import ShareIcon from '@material-ui/icons/Share';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import PlayButton from './PlayButton';
import { setUser, setIsShowingSignInDialog, setRedirectAfterSignIn, setRounds, setUserDisplayName, setSignUpDisplayName, setIsShowingShareDialog } from '../../redux/actions'
import _ from 'lodash'
import HeaderAvatar from './HeaderAvatar'
import JitsiComponent from '../play/JitsiComponent';
import ProjectName from './ProjectName'
import HeaderMenu from './HeaderMenu';
import { FirebaseContext } from '../../firebase';
import { getRandomColor } from '../../utils/index'
import CustomSamples from '../../audio-engine/CustomSamples'
import { createRound } from '../../utils/index'

const styles = theme => ({
	root: {
		height: '64px',
		width: '100%',
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingLeft: '1rem',
		paddingRight: '1rem',
		position: 'fixed',
		zIndex: 4,
		backgroundColor: 'rgba(47,47,47,0.9)',
	},
	rightSide: {
		display: 'flex',
		alignItems: 'center'
	},
	rightSideChild: {
		marginRight: '1rem',
	},
	roundAroundLogoButton: {
		fontWeight: 600
	},
	avatars: {
		display: 'flex',
		marginRight: '1rem',
		alignItems: 'center'
	},
	avatar: {
		position: 'relative',

	}
})

class Header extends Component {
	static contextType = FirebaseContext;
	constructor(props) {
		super(props);
		this.onSignInClick = this.onSignInClick.bind(this)
		this.onShareClick = this.onShareClick.bind(this)
	}

	componentDidMount() {
		const _this = this
		_this.context.onUserUpdatedObservers.push(async (authUser) => {
			if (!_.isNil(authUser)) {
				// see if this user exists in users collection, if not then we're probably in the middle of signing up so ignore
				let user = await _this.context.loadUser(authUser.uid)
				if (!_.isNil(user)) {
					_this.props.setUser(user)
					//if (!user.emailVerified) {
					//   console.log('need to verify email');
					//  } else {
					const rounds = await _this.context.getRoundsList(user.id, 1.5)
					_this.props.setRounds(rounds)
					const samples = await _this.context.getSamples(user.id)
					for (let sample of samples) {
						CustomSamples.add(sample)
					}
					//console.log('CustomSamples', CustomSamples.samples);

					// }
				} else {
					///console.log('ignoring auth change, probably signing up');
					//new user, create user document
					user = {
						displayName: authUser.displayName,
						email: authUser.email,
						avatar: authUser.photoURL,
						id: authUser.uid,
						color: getRandomColor(),
						isGuest: false,
					}
					//console.log('creating user', user);
					await _this.context.createUser(user)
					_this.props.setUser(user)
				}
				// console.log('redirectAfterSignIn', _this.props.redirectAfterSignIn);
				if (!_.isNil(_this.props.redirectAfterSignIn)) {
					_this.redirect(authUser)
				}
			} else {
				// console.log('signed out', _this.props.location.pathname);
				if (_this.props.location.pathname !== '/') {
					// _this.props.history.push('/')
					_this.props.setIsShowingSignInDialog(true)
				}
			}
		})
	}

	redirect = async (authUser) => {
		//console.log('redirect', this.props.redirectAfterSignIn, authUser);
		if (!authUser.isAnonymous) {
			// if not guest user go to rounds list
			this.props.history.push(this.props.redirectAfterSignIn)
			this.props.setRedirectAfterSignIn(null)
		} else if (this.props.redirectAfterSignIn === '/rounds') {
			// guest user, create a new round and redirect to there instead of /rounds
			let newRound = await createRound(this.props.user.id)
			let newRounds = [...this.props.rounds, newRound]
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
		const { classes, location, round, users, user } = this.props;
		const isPlayMode = location.pathname.includes('/play/') ? true : false
		return (
			<Box className={classes.root} bgcolor={"background.default"}>
				{isPlayMode &&
					<>
						<div>
							<IconButton data-test="button-back-to-rounds" to="/rounds" component={Link}>
								<ArrowBackIosIcon />
							</IconButton>
						</div>
						<div>
							{
								round &&
								<div><ProjectName name={round.name} /></div>
							}
							{
								_.isNil(round) &&
								<div>Loading...</div>

							}
						</div>
						<Box className={classes.rightSide} >
							<Box className={classes.avatars}>
								{
									users.map((currentUser) => (
										<HeaderAvatar className={classes.avatar} key={currentUser.id} user={currentUser} users={users} shouldShowMenu={!_.isNil(user) && (currentUser.id === user.id)} />
									))
								}
							</Box>
							<JitsiComponent />
							<div>
								<Button className={classes.rightSideChild} onClick={this.onShareClick} variant="contained" color="secondary" disableElevation startIcon={<ShareIcon />}>Share</Button>
							</div>
							<div>
								<PlayButton className={classes.rightSideChild} />
							</div>
							<div>
								<HeaderMenu />
							</div>
						</Box>
					</>
				}
				{!isPlayMode &&
					<>
						<div></div>
						<div><Button className={classes.roundAroundLogoButton} component={Link} to="/">RoundAround</Button></div>
						{
							user &&
							<HeaderAvatar user={user} users={users} shouldShowMenu={true} />
						}
						{
							!user &&
							<Button
								variant="contained"
								color="secondary"
								disableElevation
								onClick={this.onSignInClick}
								data-test="button-sign-in-out"
								className="signed-out"
							>Sign in</Button>
						}

					</>
				}


			</Box >
		)
	}
}
Header.propTypes = {
	classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => {
	return {
		user: state.user,
		users: state.users,
		redirectAfterSignIn: state.display.redirectAfterSignIn,
		signupDisplayName: state.display.signupDisplayName,
		rounds: state.rounds,
		round: state.round
	};
};

export default connect(
	mapStateToProps,
	{
		setUser,
		setUserDisplayName,
		setSignUpDisplayName,
		setIsShowingSignInDialog,
		setRedirectAfterSignIn,
		setRounds,
		setIsShowingShareDialog
	}
)(withRouter((withStyles(styles)(Header))));