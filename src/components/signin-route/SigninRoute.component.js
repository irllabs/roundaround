import React, { useMemo, useContext, useEffect } from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from "react-redux";
import { setUser } from '../../redux/actions';
import { SignInDialog, Theme } from 'irlui';
import { getRandomColor } from '../../utils';
import { FirebaseContext } from '../../firebase';
import firebase from "firebase/app";

const SigninRoute = (props) => {
    const theme = useMemo(() => new Theme({}));
    const firebaseContext = useContext(FirebaseContext);

    useEffect(() => {
        console.log('initiate signin route')
        props.onRouteReady();
        if (firebaseContext.currentUser) {
            props.history.push('/session');
        }
    }, [])

    const onSignUpAsync = (email, password) => {
        return firebaseContext.doCreateUserWithEmailAndPassword(email, password).then(authUser => {
            const userColor = getRandomColor();
            authUser.user.updateProfile({
                displayName: JSON.stringify({ color: userColor })
            }).then(() => {
                const payload = { color: userColor, id: authUser.user.uid, email: authUser.user.email };
                console.log(`new color assigned: `, payload);
                props.setUser(payload)
                props.history.push('/session');
            })
                .catch(e => console.error(e))
        })
            .catch(error => {
                console.error(error)
            });
    }

    const onSignInAsync = (email, password) => {
        return firebaseContext.doSignInWithEmailAndPassword(email, password).then(authUser => {
            props.history.push('/session');
        })
            .catch(error => {
                console.error(error)
            });
    }

    const onSignInWithGoogleAsync = () => {
        console.log('onSignInWithGoogleAsync');
        let provider = new firebase.auth.GoogleAuthProvider();
        firebaseContext.auth
            .signInWithPopup(provider)
            .then((result) => {
                /** @type {firebase.auth.OAuthCredential} */
                var credential = result.credential;

                // This gives you a Google Access Token. You can use it to access the Google API.
                var token = credential.accessToken;
                // The signed-in user info.
                var user = result.user;
                console.log('user signed in', user);
                props.history.push('/session');
                // ...
            }).catch((error) => {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                // The email of the user's account used.
                var email = error.email;
                // The firebase.auth.AuthCredential type that was used.
                var credential = error.credential;
                // ...
            });
    }

    const onClose = (close) => {
        console.log('close', close)
    }


    return (
        <SignInDialog
            onSignUpAsync={onSignUpAsync}
            onSignInAsync={onSignInAsync}
            onSignInWithGoogleAsync={onSignInWithGoogleAsync}
            onClose={onClose}
            theme={theme} />
    )
}

export default connect(
    null,
    {
        setUser
    }
)(withRouter(SigninRoute));
