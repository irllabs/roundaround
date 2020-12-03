import React, { useState, useContext, useEffect } from 'react';
import {
    HashRouter as Router,
    Route,
    Switch,
    Redirect
} from 'react-router-dom';
import { connect } from "react-redux";
import { getRandomColor } from '../../utils';
import { uuid } from '../../models/SequencerUtil';
import { toggleLoader, setUser } from "../../redux/actions";

import Loader from 'react-loader-spinner';
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";

import ProtectedRoute from './ProtectedRoute.components';

import SessionRoute from '../session-route/SessionRoute.component';
import SigninRoute from '../signin-route/SigninRoute.component';
import CollaborationRoute from '../collaboration/collaboration-route/CollaborationRoute.component';

import { FirebaseContext } from '../../firebase';

import styles from './App.styles.scss';
import '../../styles/baseStyles.scss';

const App = ({
    loaderActive,
    toggleLoader,
    user,
    setUser
}) => {
    const firebase = useContext(FirebaseContext);

    useEffect(() => {
        toggleLoader(true);
        firebase.onUserUpdatedObservers.push((fbUser) => {
            if (firebase.currentUser) {
                const userData = JSON.parse(firebase.currentUser.displayName);
                console.log('user: ', user)
                setUser({...user, id: fbUser.uid, email: fbUser.email, ...userData});
            } else {
                let color = localStorage.getItem('color');
                let id = localStorage.getItem('id');
                
                if (!color) {
                    console.log('assign anonymous color')
                    color = getRandomColor();
                    localStorage.setItem('color', color);
                }
                
                if (!id) {
                    console.log('assign anonymous id')
                    id = uuid();
                    localStorage.setItem('id', id);
                }
                console.log('no user present, retrieve from localstorage or create', {id, color})
                setUser({id, color})
            }
        })

        return () => {
            console.log('main component unmount')
        }
    }, [])

    const onRouteReady = () => {
        toggleLoader(false);
    }

    return (
        <div className={styles.container} >
            <Loader
                className={styles.loader}
                type="Puff"
                color="#00BFFF"
                height={100}
                width={100}
                visible={loaderActive}
            />
            {
                user &&
                <Router>
                    <Switch>
                        <Redirect exact from='/' to='/login' />
                        <Route path="/login" render={() => <SigninRoute onRouteReady={onRouteReady} />} />
                        <ProtectedRoute path="/session" authenticated={firebase.currentUser} component={SessionRoute} />
                        <Route path="/collaboration/:id" render={() => <CollaborationRoute />} />
                    </Switch>
                </Router>
            }
        </div>
    )
}

const mapStateToProps = state => {
    return {
        loaderActive: state.loader.active,
        user: state.user
    };
};

export default connect(
    mapStateToProps,
    {
        toggleLoader,
        setUser
    }
)(App);
