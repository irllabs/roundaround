import React, { useState, useContext, useRef } from 'react';
import { connect } from "react-redux";
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { setIsShowingSignInDialog, setSignUpDisplayName, setUser, setRounds, setRedirectAfterSignIn } from '../../redux/actions'
import { FirebaseContext } from '../../firebase';
import firebase from "firebase/app";
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import { getRandomColor } from '../../utils/index'

import _ from 'lodash'

const styles = makeStyles({
    paper: {
        borderRadius: 8
    },
    title: {
        textAlign: 'center'
    },
    body: {
        padding: '1rem',
        borderTop: 'solid 1px rgba(255,255,255,0.1)'
    },
    button: {
        marginBottom: '1rem',
        textAlign: 'center'
    },
    emailForm: {
        display: 'flex',
        flexDirection: 'column'
    },
    emailFormItem: {
        marginBottom: '1rem',
        minWidth: '300px',
        [`& fieldset`]: {
            borderRadius: 8,
            backgroundColor: 'transparent',
        },
    },
    input: {
        borderRadius: 8,
    },
    signUpButton: {
        fontWeight: 600
    },
    backButton: {
        position: 'absolute',
        left: 4,
        top: 8
    },
    error: {
        textAlign: 'center',
        marginBottom: '2rem',
        fontWeight: 600
    }
})

const SignInDialog = ({ isShowingSignInDialog, setIsShowingSignInDialog, setSignUpDisplayName, setUser, setRounds, redirectAfterSignIn, setRedirectAfterSignIn }) => {
    const firebaseContext = useContext(FirebaseContext);
    const onClose = () => {
        setIsShowingEmailForm(false)
        setIsShowingEmailSignupForm(false)
        setErrorMessage(null)
        setIsShowingSignInDialog(false)
        setIsShowingUseAsGuestForm(false)
    }
    const [isShowingEmailForm, setIsShowingEmailForm] = useState(false)
    const [isShowingUseAsGuestForm, setIsShowingUseAsGuestForm] = useState(false)
    const [isShowingEmailSignupForm, setIsShowingEmailSignupForm] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)

    const emailAddressInput = useRef()
    const emailAddressSignupInput = useRef()
    const passwordInput = useRef()
    const passwordSignupInput = useRef()
    const displayNameSignupInput = useRef()
    const displayNameGuestInput = useRef()

    const onGoogleSigninClick = async () => {
        onClose()
        let provider = new firebase.auth.GoogleAuthProvider();
        try {
            await firebaseContext.auth.signInWithPopup(provider)
            // const authUser = authResult.user
            /*let user = await firebaseContext.loadUser(authUser.uid)
            if (_.isNil(user)) {
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
            if (!_.isNil(redirectAfterSignIn)) {
                location.push(redirectAfterSignIn)
                setRedirectAfterSignIn(null)
            }*/
        } catch (e) {
            console.log('error logging in', e);
        }
    }

    const onShowEmailSigninClick = () => {
        setIsShowingEmailForm(true)
    }

    const onEmailSigninClick = async () => {
        const email = emailAddressInput.current.querySelectorAll("input")[0].value
        const password = passwordInput.current.querySelectorAll("input")[0].value
        try {
            await firebaseContext.auth.signInWithEmailAndPassword(email, password)
            onClose()
        } catch (e) {
            console.log('email error', e);
            setErrorMessage(e.message)
        }
    }

    const onEmailSignupClick = async () => {
        const email = emailAddressSignupInput.current.querySelectorAll("input")[0].value
        const password = passwordSignupInput.current.querySelectorAll("input")[0].value
        const displayName = displayNameSignupInput.current.querySelectorAll("input")[0].value
        if (!_.isEmpty(displayName)) {
            try {
                const authResult = await firebaseContext.auth.createUserWithEmailAndPassword(email, password)
                const authUser = authResult.user
                let user = {
                    displayName,
                    email: email,
                    id: authUser.uid,
                    color: getRandomColor(),
                    isGuest: false,
                }
                console.log('creating user', user);
                await firebaseContext.createUser(user)
                setUser(user)
                onClose()

            } catch (e) {
                console.log('email error', e);
                setErrorMessage(e.message)
            }
        } else {
            setErrorMessage('Please enter a name')
        }
    }

    const onShowEmailSignupClick = () => {
        setIsShowingEmailForm(false)
        setIsShowingEmailSignupForm(true)
        setIsShowingUseAsGuestForm(false)
    }

    const onUseAsGuestClick = () => {
        setIsShowingUseAsGuestForm(true)
    }

    const onContinueAsGuestClick = async () => {
        const displayName = displayNameGuestInput.current.querySelectorAll("input")[0].value
        if (!_.isEmpty(displayName)) {
            try {
                const authResult = await firebaseContext.auth.signInAnonymously()
                console.log('authResult', authResult);
                const authUser = authResult.user
                console.log('authUser', authUser);
                let user = {
                    isGuest: true,
                    displayName,
                    id: authUser.uid,
                    color: getRandomColor()
                }
                console.log('creating user', user);
                await firebaseContext.createUser(user)
                setUser(user)
                onClose()

            } catch (e) {
                console.log('email error', e);
                setErrorMessage(e.message)
            }
        } else {
            setErrorMessage('Please enter a name')
        }
    }

    const onBackClick = () => {
        setIsShowingEmailForm(false)
        setIsShowingEmailSignupForm(false)
        setErrorMessage(null)
        setIsShowingUseAsGuestForm(false)
    }

    const classes = styles();

    return (
        <Dialog classes={{ paper: classes.paper }} onClose={onClose} aria-labelledby="simple-dialog-title" open={isShowingSignInDialog}>
            {
                !isShowingEmailForm && !isShowingEmailSignupForm && !isShowingUseAsGuestForm &&
                <>
                    <DialogTitle className={classes.title} id="simple-dialog-title">

                        Sign in
                    </DialogTitle>
                    <Box className={classes.body}>
                        <Button className={classes.button} fullWidth color="secondary" variant="contained" disableElevation onClick={onGoogleSigninClick}>Continue with Google</Button>
                        <Button
                            className={classes.button}
                            fullWidth
                            color="secondary"
                            variant="contained"
                            disableElevation
                            onClick={onShowEmailSigninClick}
                            data-test="button-email"
                        >Sign in with email</Button>
                        <Button
                            className={classes.button}
                            fullWidth
                            color="secondary"
                            variant="contained"
                            disableElevation
                            onClick={onUseAsGuestClick}
                            data-test="button-guest"
                        >
                            Use as guest
                        </Button>
                        <p style={{ textAlign: 'center' }}>Don't have an account yet?</p>
                        <Button className={classes.signUpButton} fullWidth disableElevation onClick={onShowEmailSignupClick}>Sign up</Button>
                    </Box>
                </>
            }
            {
                isShowingEmailForm &&
                <>
                    <DialogTitle className={classes.title} id="simple-dialog-title"><IconButton aria-label="close" className={classes.backButton} onClick={onBackClick}>
                        <ArrowBackIcon />
                    </IconButton>Sign in with email</DialogTitle>
                    <Box className={classes.body}>
                        <form className={classes.emailForm} noValidate autoComplete="off">
                            <TextField
                                type="email"
                                ref={emailAddressInput}
                                className={classes.emailFormItem}
                                label="Email address"
                                variant="outlined"
                                data-test="input-email"
                                InputProps={{
                                    className: classes.input
                                }}
                            />
                            <TextField
                                ref={passwordInput}
                                className={classes.emailFormItem}
                                label="Password"
                                variant="outlined"
                                type="password"
                                data-test="input-password"
                                InputProps={{
                                    className: classes.input
                                }}
                            />
                            {
                                errorMessage &&
                                <p className={classes.error}>{errorMessage}</p>
                            }
                            <Button
                                className={classes.button}
                                fullWidth color="primary"
                                variant="contained"
                                disableElevation
                                onClick={onEmailSigninClick}
                                data-test="button-sign-in"
                            >

                                <strong>Sign in</strong>
                            </Button>
                        </form>

                    </Box>
                </>
            }
            {
                isShowingUseAsGuestForm &&
                <>
                    <DialogTitle className={classes.title} id="simple-dialog-title"><IconButton aria-label="close" className={classes.backButton} onClick={onBackClick}>
                        <ArrowBackIcon />
                    </IconButton>Continue as guest</DialogTitle>
                    <Box className={classes.body}>
                        <form className={classes.emailForm} noValidate autoComplete="off">
                            <TextField
                                ref={displayNameGuestInput}
                                className={classes.emailFormItem}
                                label="Name"
                                variant="outlined"
                                data-test="input-name"
                                InputProps={{
                                    className: classes.input
                                }}
                            />
                            {
                                errorMessage &&
                                <p className={classes.error}>{errorMessage}</p>
                            }
                            <Button
                                className={classes.button}
                                fullWidth color="primary"
                                variant="contained"
                                disableElevation
                                onClick={onContinueAsGuestClick}
                                data-test="button-name"
                            >
                                <strong>Continue as guest</strong>
                            </Button>
                        </form>

                    </Box>
                </>
            }
            {
                isShowingEmailSignupForm &&
                <>
                    <DialogTitle className={classes.title} id="simple-dialog-title"><IconButton aria-label="close" className={classes.backButton} onClick={onBackClick}>
                        <ArrowBackIcon />
                    </IconButton>Sign up with email</DialogTitle>
                    <Box className={classes.body}>
                        <form className={classes.emailForm} noValidate autoComplete="off">
                            <TextField ref={displayNameSignupInput} className={classes.emailFormItem} label="Name" variant="outlined" InputProps={{
                                className: classes.input
                            }} />
                            <TextField type="email" ref={emailAddressSignupInput} className={classes.emailFormItem} label="Email address" variant="outlined" InputProps={{
                                className: classes.input
                            }} />
                            <TextField ref={passwordSignupInput} className={classes.emailFormItem} label="Password" variant="outlined" type="password" InputProps={{
                                className: classes.input
                            }} />
                            {
                                errorMessage &&
                                <p className={classes.error}>{errorMessage}</p>
                            }
                            <Button className={classes.button} fullWidth color="primary" variant="contained" disableElevation onClick={onEmailSignupClick} ><strong>Sign up</strong></Button>
                        </form>

                    </Box>
                </>
            }

        </Dialog>
    );
}

const mapStateToProps = state => {
    return {
        user: state.user,
        isShowingSignInDialog: state.display.isShowingSignInDialog,
        redirectAfterSignIn: state.display.redirectAfterSignIn
    };
};

export default connect(
    mapStateToProps,
    {
        setIsShowingSignInDialog,
        setSignUpDisplayName,
        setUser,
        setRounds,
        setRedirectAfterSignIn
    }
)(SignInDialog);

