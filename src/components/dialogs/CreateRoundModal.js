import React, { useState } from 'react'
import { connect } from 'react-redux'
import { withStyles } from '@material-ui/styles'

import { Typography } from '@material-ui/core'
import { Close } from '@material-ui/icons'
import DialogTitle from '@material-ui/core/DialogTitle'
import Dialog from '@material-ui/core/Dialog'

import {
    setRedirectAfterSignIn,
    setRounds,
    setIsShowingDeleteRoundDialog,
    setIsShowingRenameDialog,
    setSelectedRoundId
} from '../../redux/actions'

import { Box, makeStyles } from '@material-ui/core'
import Di from '../play/layer-settings/resources/Di'
import Upload from '../play/layer-settings/resources/Upload'
import Loader from 'react-loader-spinner'

const styles = makeStyles({
    paper: {
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        width: 363
    },
    title: {
        textAlign: 'center',
        fontSize: 20
    },
    titleSub: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    body: {
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem',
        paddingBottom: 0,
        borderTop: 'solid 1px rgba(255,255,255,0.1)'
    },
    close: {
        width: 17.78,
        height: 17.78,
        cursor: 'pointer'
    },
    closeContainer: {
        flex: 2,
        display: 'flex',
        justifyContent: 'flex-start',
        cursor: 'pointer'
    },
    titleText: {
        flex: 4,
        display: 'flex',
        marginLeft: 5
    },
    tile: {
        display: 'flex',
        flexDirection: 'column',
        width: 331,
        height: 104,
        borderRadius: 8,
        marginBottom: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
            boxShadow: '0 1px 2px 1px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease-in-out',
        },
        '&:active': {
            boxShadow: 'none',
            transition: 'all 0.2s ease-in-out',
        }
    },
    tileSub: {
        display: 'flex',
        fontSize: 16,
        fontWeight: 900
    },
    tileText: {
        display: 'flex',
        textAlign: 'center',
        fontSize: 12
    },
    button: {
        marginBottom: '1rem',
        textAlign: 'center',
    },
    loaderContainer: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },
    loader: {

    }
})

const CreateRoundModal = ({
    toggleCreateRoundModal,
    defaultRoundCreate,
    isShowingCreateRoundModal
}) => {
    const classes = styles()
    const [showLoader, setShowLoader] = useState(false)
    return (
        <Dialog classes={{ paper: classes.paper }} onClose={() => toggleCreateRoundModal()} aria-labelledby="simple-dialog-title" open={isShowingCreateRoundModal}>
            <DialogTitle className={classes.title}>
                <Box className={classes.titleSub}>
                    <Box className={classes.closeContainer}><Close className={classes.close} onClick={() => toggleCreateRoundModal()} /></Box>
                    <Typography className={classes.titleText}>New Project</Typography>
                </Box>
            </DialogTitle>
            <Box className={classes.body}>
                {!showLoader ?
                    <>
                        <Box
                            id='random-round'
                            onClick={() => {
                                setShowLoader(true)
                                defaultRoundCreate(() => {
                                    toggleCreateRoundModal()
                                    setShowLoader(false)
                                })
                            }}
                            className={classes.tile}
                        >
                            <Box>
                                <Di />
                            </Box>
                            <Typography className={classes.tileSub}>
                                Feeling Lucky
                            </Typography>
                            <Typography className={classes.tileText}>
                                Random sound from 3 different stock instruments
                            </Typography>
                        </Box>
                        <Box id='default-round' className={classes.tile}>
                            <Box>
                                <Upload />
                            </Box>
                            <Typography className={classes.tileSub}>
                                My Sounds
                            </Typography>
                            <Typography className={classes.tileText}>
                                Upload audio files
                            </Typography>
                        </Box>
                    </> :
                    <Box className={classes.loaderContainer}>
                        <Loader
                            className={classes.loader}
                            type="Puff"
                            color="#FFFFFF"
                            height={60}
                            width={50}
                            visible={true}
                        />
                    </Box>
                }
            </Box>
        </Dialog>
    )
}

const mapStateToProps = state => {
    return {
        user: state.user,
        rounds: state.rounds,
        selectedRoundId: state.display.selectedRoundId,
        isShowingCreateRoundModal: state.display.isShowingCreateRoundModal,
    };
};

export default connect(
    mapStateToProps,
    {
        setRedirectAfterSignIn,
        setRounds,
        setIsShowingDeleteRoundDialog,
        setIsShowingRenameDialog,
        setSelectedRoundId
    }
)(withStyles(styles)(CreateRoundModal));
