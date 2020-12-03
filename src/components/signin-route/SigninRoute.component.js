import React, { useMemo, useContext, useEffect } from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from "react-redux";
import { setUser } from '../../redux/actions';
import { SignInDialog, Theme } from 'irlui';
import { getRandomColor } from '../../utils';
import { FirebaseContext } from '../../firebase';

const SigninRoute = (props) => {
    const theme = useMemo(() => new Theme({}));
    const firebase = useContext(FirebaseContext);

    useEffect(() => {
        console.log('initiate signin route')
        props.onRouteReady();
        if (firebase.currentUser) {
            props.history.push('/session');
        }
    }, [])

    const onSignUpAsync = (email, password) => {
        return firebase.doCreateUserWithEmailAndPassword(email, password).then(authUser => {
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
        return firebase.doSignInWithEmailAndPassword(email, password).then(authUser => {
            props.history.push('/session');
        })
        .catch(error => {
            console.error(error)
        });
    }

    const onClose = (close) => {
        console.log('close', close)
    }


    return (
        <SignInDialog
            onSignUpAsync={onSignUpAsync}
            onSignInAsync={onSignInAsync}
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
