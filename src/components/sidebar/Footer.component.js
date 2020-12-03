import React, { useState, useContext, useEffect } from 'react';
import { withRouter } from 'react-router-dom';
import  { FirebaseContext } from '../../firebase';
import styles from './Footer.styles.scss';

const Footer = ({addRound, history}) => {
    const firebase = useContext(FirebaseContext);
    const [user, setUser] = useState(firebase.currentUser);

    const onSignOut = () => {
        // toggle tone transport to stop and clear redux store
        // also clear all locks etc
        firebase.doSignOut();
        history.push('/login');
    }

    useEffect(() => {
        // setUser(firebase.currentUser)
    }, [])
    
    return (
        <div className={styles.footer}>
        <button
            onClick={addRound}
            className={styles.addRoundBtn}
        >
            Add new
        </button>
        {
            user &&
            <div className={styles.userInfo}>
                <div>{user.email}</div>
                <button
                    onClick={onSignOut}
                    className={styles.addRoundBtn}
                >
                    Signout
                </button>
            </div>
        }
        </div>
    );
};

export default withRouter(Footer);