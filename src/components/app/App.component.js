import React, { useState, useContext, useEffect } from 'react';
import 'regenerator-runtime/runtime' // Add to prevent Babel error.
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
import JitsiRoute from '../jitsi/JitsiRoute';

import { FirebaseContext } from '../../firebase';

import styles from './App.styles.scss';
import '../../styles/baseStyles.scss';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';

const App = ({
    loaderActive,
    toggleLoader,
    user,
    setUser
}) => {
    const firebase = useContext(FirebaseContext);

    const theme = React.useMemo(
        () =>
            createMuiTheme({
                palette: {
                    type: 'dark',
                    primary: {
                        dark: '#AAAAAA',
                        main: '#EAEAEA',
                        light: '#FFFFFF'
                    },
                    secondary: {
                        dark: '#333333',
                        main: '#474747',
                        light: '#C1C1C1'
                    },
                    text: {
                        primary: '#EAEAEA'
                    },
                    action: {
                        active: '#EAEAEA'
                    }
                },
                shape: {
                    borderRadius: 32
                },
                typography: {
                    button: {
                        textTransform: 'none'
                    }
                }
            }),
        [],
    );

    useEffect(() => {
        toggleLoader(true);
        firebase.onUserUpdatedObservers.push((fbUser) => {
            if (firebase.currentUser) {
                console.log('firebase.currentUser', firebase.currentUser);
                const userData = JSON.parse(firebase.currentUser.displayName);
                console.log('user: ', user)
                setUser({ ...user, id: fbUser.uid, email: fbUser.email, ...userData });
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
                console.log('no user present, retrieve from localstorage or create', { id, color })
                setUser({ id, color })
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
        <ThemeProvider theme={theme}>
            <CssBaseline />
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
                            <Route path="/jitsi/:id" render={() => <JitsiRoute />} />
                        </Switch>
                    </Router>
                }
            </div>
        </ThemeProvider>
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
