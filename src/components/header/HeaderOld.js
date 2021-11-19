import React, { useEffect, useContext } from 'react'
import { connect } from "react-redux";
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Box from '@material-ui/core/Box';
import {
    Link
} from "react-router-dom";
import { makeStyles } from '@material-ui/core/styles';
import ShareIcon from '@material-ui/icons/Share';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import PlayButton from './PlayButton';
import { useLocation } from 'react-router-dom'
import { setUser, setIsShowingSignInDialog, setRedirectAfterSignIn, setRounds, setUserDisplayName, setSignUpDisplayName, setIsShowingShareDialog } from '../../redux/actions'
import _ from 'lodash'
import HeaderAvatar from './HeaderAvatar'
import JitsiComponent from '../play/JitsiComponent';
import ProjectName from './ProjectName'
import HeaderMenu from './HeaderMenu';
import { FirebaseContext } from '../../firebase';
import { getRandomColor } from '../../utils/index'


const headerStyles = makeStyles((theme) => ({
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
}))

function Header({ user, users, round, setUser, setIsShowingSignInDialog, redirectAfterSignIn, setRedirectAfterSignIn, rounds, setRounds, signupDisplayName, setIsShowingShareDialog }) {
    const firebaseContext = useContext(FirebaseContext);
    const classes = headerStyles();
    const location = useLocation();
    const isPlayMode = location.pathname.includes('/play/') ? true : false

    const onSignInClick = () => {
        setIsShowingSignInDialog(true)
    }

    const onShareClick = () => {
        setIsShowingShareDialog(true)
    }

    const redirect = () => {
        console.log('redirect', redirectAfterSignIn);
        location.push(redirectAfterSignIn)
        setRedirectAfterSignIn(null)
    }

    useEffect(() => {
        firebaseContext.onUserUpdatedObservers.push(async (authUser) => {
            if (!_.isNil(authUser)) {
                // see if this user exists in users collection, if not then we're probably in the middle of signing up so ignore
                let user = await firebaseContext.loadUser(authUser.uid)
                if (!_.isNil(user)) {
                    setUser(user)
                    //if (!user.emailVerified) {
                    //   console.log('need to verify email');
                    //  } else {
                    const rounds = await firebaseContext.getRoundsList(user.id, 1.5)
                    setRounds(rounds)

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
                    await firebaseContext.createUser(user)
                    setUser(user)
                }
                console.log('redirectAfterSignIn', redirectAfterSignIn);
                redirect()
            } else {
                console.log('signed out', location.pathname);
                if (location.pathname !== '/') {
                    setIsShowingSignInDialog(true)
                }
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps


    }, [])

    return (

        <Box className={classes.root} bgcolor={"background.default"}>
            {isPlayMode &&
                <>
                    <div>
                        <IconButton to="/rounds" component={Link}>
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
                            <Button className={classes.rightSideChild} onClick={onShareClick} variant="contained" color="secondary" disableElevation startIcon={<ShareIcon />}>Share</Button>
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
                        <Button variant="contained" color="secondary" disableElevation onClick={onSignInClick}>Sign in</Button>
                    }

                </>
            }
        </Box >
    )
}
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
)(Header);