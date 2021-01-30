import React from 'react'
import Avatar from '@material-ui/core/Avatar';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        alignItems: 'center',

        marginRight: '1rem',
        '& > *': {
            marginLeft: '-8px'
        },
    }
}));
const userInitials = (name) => {
    return '??'
}
export default function HeaderAvatar ({ users }) {
    const classes = useStyles();
    console.log('rendering header avatatrs', users);
    const userAvatars = ['SA', 'LC', 'AA', 'EA']

    return (
        <div className={classes.root}>
            {Object.keys(users).map((userId, i) => (
                <Avatar key={userId} style={{ backgroundColor: users[userId].color, color: 'white' }}>{userInitials(users[userId])}</Avatar>
            ))}


        </div>
    );
}
