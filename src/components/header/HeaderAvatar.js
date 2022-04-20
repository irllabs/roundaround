import React, { useContext } from 'react'
import { connect } from "react-redux";
import Box from '@material-ui/core/Box';
import Avatar from '@material-ui/core/Avatar';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import Divider from '@material-ui/core/Divider';
import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import _ from 'lodash'
import { FirebaseContext } from '../../firebase';
import {
	setUser, setRounds, setUsers, setRound, setUserColor
} from '../../redux/actions'
import { CirclePicker } from 'react-color'
import { Colors } from '../../utils/constants'

const useStyles = makeStyles((theme) => ({
	root: {
		display: 'flex',
	},
	paper: {
		marginRight: theme.spacing(2),
		borderRadius: 8
	},
	colorPicker: {
		padding: '1rem'
	},
	menuList: {
	},
	menuListItem: {
		paddingTop: '1rem',
		paddingBottom: '1rem',
		textAlign: 'center'
	},
	avatar: props => ({
		border: 'solid 2px ' + props.userColor
	}),
	avatarInitialsOnly: props => ({
		backgroundColor: props.userColor,
		color: '#FFFFFF'
	}),
	userDisplayName: {
		marginTop: 0,
		marginBottom: '0rem',
		paddingTop: '1rem',
		marginLeft: '1rem',
		marginRight: '1rem'
	},
	userEmail: {
		marginLeft: '1rem',
		marginRight: '1rem',
		marginTop: 0,
		fontWeight: 500
	}

}));

function HeaderAvatar({ user, users, setUser, setRounds, shouldShowMenu, setUsers, setRound, setUserColor }) {
	const firebaseContext = useContext(FirebaseContext)
	const [open, setOpen] = React.useState(false);
	const anchorRef = React.useRef(null);

	const handleToggle = () => {
		setOpen((prevOpen) => !prevOpen);
	};

	const handleClose = (event) => {
		if (anchorRef.current && anchorRef.current.contains(event.target)) {
			return;
		}

		setOpen(false);
	};

	function handleListKeyDown(event) {
		if (event.key === 'Tab') {
			event.preventDefault();
			setOpen(false);
		}
	}

	const onSignOutClick = () => {
		firebaseContext.signOut()
		setRounds([])
		setUser(null)
		setRound(null)
		setUsers([])
	}

	const getInitials = (name) => {
		let initials = '??'
		if (!_.isNil(name)) {
			const nameParts = name.split(' ')
			if (nameParts.length > 1) {
				initials = nameParts[0][0] + nameParts[1][0]
			} else {
				initials = name[0]
				if (name.length > 1) {
					initials += name[1]
				}
			}
		}
		return initials
	}

	const onColorChosen = ({ hex }) => {
		setUserColor(hex)
		firebaseContext.updateUser(user.id, { color: hex })
		let usersClone = _.cloneDeep(users)
		let me = _.find(usersClone, { id: user.id })
		me.color = hex
		setUsers(usersClone)
	}

	// return focus to the button when we transitioned from !open -> open
	const prevOpen = React.useRef(open);
	React.useEffect(() => {
		if (prevOpen.current === true && open === false) {
			anchorRef.current.focus();
		}

		prevOpen.current = open;
	}, [open]);

	const classes = useStyles({ userColor: user.color });

	return (
		<Box className={classes.root}>
			<Box data-test="header">
				{
					shouldShowMenu &&
					<>
						<IconButton
							className="signed-in"
							ref={anchorRef}
							aria-controls={open ? 'menu-list-grow' : undefined}
							aria-haspopup="true"
							data-test="button-sign-in-out"
							onClick={handleToggle}
						>
							{
								!_.isNil(user.avatar) &&
								<Avatar className={classes.avatar} alt={user.displayName} src={user.avatar} />
							}
							{
								_.isNil(user.avatar) &&
								<Avatar className={classes.avatarInitialsOnly} alt={user.displayName} >{getInitials(user.displayName)}</Avatar>
							}
						</IconButton>

						<Popper open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
							{({ TransitionProps, placement }) => (
								<Grow
									{...TransitionProps}
									style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
								>
									<Paper className={classes.paper} size="md">
										<ClickAwayListener onClickAway={handleClose}>
											<Box >

												<h2 className={classes.userDisplayName}>{user.displayName}</h2>
												<h3 className={classes.userEmail}>{user.email}</h3>
												<CirclePicker className={classes.colorPicker} onChangeComplete={onColorChosen} colors={Colors} />
												<Divider />
												<MenuList
													autoFocusItem={open}
													id="menu-list-grow"
													onKeyDown={handleListKeyDown}
												>
													<MenuItem
														onClick={onSignOutClick}
														className={classes.menuListItem}
														data-test="button-sign-out"
													>
														Sign out
													</MenuItem>
												</MenuList>
											</Box>
										</ClickAwayListener>
									</Paper>
								</Grow>
							)}
						</Popper>

					</>
				}
				{
					!shouldShowMenu &&
					<>
						{
							!_.isNil(user.avatar) &&
							<IconButton disabled={true}>
								<Avatar className={classes.avatar} alt={user.displayName} src={user.avatar} />
							</IconButton>
						}
						{
							_.isNil(user.avatar) &&
							<IconButton disabled={true}>
								<Avatar className={classes.avatarInitialsOnly} alt={user.displayName} >{getInitials(user.displayName)}</Avatar>
							</IconButton>
						}
					</>
				}

			</Box>
		</Box>
	);
}
export default connect(
	null,
	{
		setUser,
		setUsers,
		setRound,
		setRounds,
		setUserColor
	}
)(HeaderAvatar);