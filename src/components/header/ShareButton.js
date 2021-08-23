import React from 'react'
import IconButton from '@material-ui/core/IconButton';
import { makeStyles } from '@material-ui/core/styles';
import ShareIcon from '@material-ui/icons/Share';


const shareButtonStyles = makeStyles(function (theme) {
    // console.log('creating play button styles', theme)
    return {
        root: {
            backgroundColor: theme.palette.secondary.main,
            marginRight: '1rem'
        }
    }
})


function ShareButton ({onShareClick}) {    
   
    const classes = shareButtonStyles();
    return (
        <IconButton className={classes.root} onClick={onShareClick} >
           <ShareIcon />
        </IconButton>
    )
}

export default ShareButton;