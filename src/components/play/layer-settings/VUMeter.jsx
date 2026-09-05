import { Box } from '@material-ui/core'
import React from 'react'
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        height: 8,
        border: 'solid 1px white',
        position: 'relative',
        borderRadius: 4
    },
    inner: {
        width: '0%',
        height: 6,
        backgroundColor: 'white',
        position: 'absolute',
        top: 0,
        left: 0,
        borderRadius: '4,0,4,0'
    }
}));

export default function VUMeter ({ level }) {
    const classes = useStyles()
    return (
        <Box className={classes.root}>
            <Box className={classes.inner} style={{ width: (level * 100) + '%' }}></Box>
        </Box>
    )
}
