import React, { useEffect, useState, useContext, useMemo } from 'react';
import { connect } from "react-redux";
import { setUser } from '../../redux/actions';
import { SketchPicker } from 'react-color';
import { getRandomColor } from '../../utils';
import { FirebaseContext } from '../../firebase';

import styles from './Profile.styles.scss';

const ProfileComponent = ({
    user,
    setUser
}) => {
    const firebase = useContext(FirebaseContext);
    //const userData = firebase.currentUser ? JSON.parse(firebase.currentUser.displayName) : {};
    const [color, setColor] = useState(user.color || getRandomColor());

    const handleChangeComplete = (color) => {
        setColor(color.hex);
        firebase.currentUser.updateProfile({
            displayName: JSON.stringify({ ...userData, color: color.hex })
        }).then(function () {
            console.log('set user', { ...user, color: color.hex })
            setUser({ ...user, color: color.hex });
            console.log('profile color updated: ', color.hex)
        }).catch(e => {
            console.error(e)
        })
    };

    const handleChange = (color) => {
        setColor(color.hex);
    }

    useEffect(() => {
        setColor(user.color)
    }, [user.color]);

    return (
        <div>
            <div>
                <span>Email: </span>{user.email}
            </div>
            <div>
                <span>Color: </span>
                <SketchPicker
                    color={color}
                    onChangeComplete={handleChangeComplete}
                    onChange={handleChange}
                />
            </div>
        </div>
    );
}

const mapStateToProps = state => {
    return {
        user: state.user
    };
};

export default connect(
    mapStateToProps,
    {
        setUser
    }
)(ProfileComponent);
