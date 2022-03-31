/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect, useContext } from 'react'
import { connect } from 'react-redux'
import { FirebaseContext } from '../../firebase';

import { Button, Typography } from '@material-ui/core'
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

import { getDefaultSample } from '../../utils/defaultData'
// import CustomSamples from '../../audio-engine/CustomSamples'
// import { UPDATE_LAYER_INSTRUMENT, SET_IS_PLAYING } from '../../redux/actionTypes'
// import AudioEngine from '../../audio-engine/AudioEngine';


import { Box, makeStyles } from '@material-ui/core'
import Di from '../play/layer-settings/resources/Di'
import Upload from '../play/layer-settings/resources/Upload'
import Loader from 'react-loader-spinner'
import Add from '../play/layer-settings/resources/Add'
import Playback from '../play/layer-settings/resources/Playback'
import Trash from '../play/layer-settings/resources/Trash'
import { cloneDeep } from 'lodash'

const styles = makeStyles({
    paper: {
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        width: 363
    },
    title: {
        position: 'relative',
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
        height: 283,
        padding: '1rem',
        paddingBottom: 0,
        overflow: 'hidden',
        borderTop: 'solid 1px rgba(255,255,255,0.1)'
    },
    close: {
        width: 17.78,
        height: 17.78,
        cursor: 'pointer'
    },
    closeContainer: {
        position: 'absolute',
        flex: 1,
        display: 'flex',
        justifyContent: 'flex-start',
        cursor: 'pointer'
    },
    titleText: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        textAlign: 'center',
        marginLeft: 5
    },
    tileAlt: {
        display: 'flex',
        flexDirection: 'row',
        width: 331,
        height: 48,
        borderRadius: 12,
        marginBottom: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255, 0.1)',
        transition: 'all 0.2s ease-in-out'
    },
    tileAltIconContainer: {
        display: 'flex',
        flex: 1,
        paddingLeft: 17,
        paddingRight: 17,
        alignItems: 'center',
        cursor: 'pointer'
    },
    tileAltTypeContainer: {
        display: 'flex',
        flex: 8,
        flexDirection: 'column',
        textAlign: 'left',
        justifyContent: 'flex-start'
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
    loader: {},
    buttonContainer: {
        padding: '1rem',
        borderTop: 'solid 1px rgba(255,255,255,0.1)'
    },
    createProject: {
        paddingLeft: 10,
        paddingRight: 10,
        width: 331,
        height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
    },
    preUploadList: {
        height: 150,
        overflow: 'scroll',
        scrollBehavior: 'smooth',
        scrollbarWidth: 3
    }
})

const CreateRoundModal = ({
    toggleCreateRoundModal,
    defaultRoundCreate,
    isShowingCreateRoundModal,
    user
}) => {
    const firebase = useContext(FirebaseContext);
    const classes = styles()
    const uploadInputRef = useRef()
    const [showLoader, setShowLoader] = useState(false)
    const [showUploadSound, setShowUploadSound] = useState(false)
    const [preUploaded, setPreUploaded] = useState()

    const processFiles = (files) => {
        if (files && files[0]) {
            const file = files[0]
            const fileType = file.type
            if (fileType.includes('aiff') || fileType.includes('wav')) {
                const newSound = {
                    name: file.name,
                    type: file.type,
                    isPlaying: false,
                    file,
                    forPlay: URL.createObjectURL(file)
                }
                if (preUploaded) {
                    const newPreUploaded = [...preUploaded, newSound]
                    setPreUploaded(newPreUploaded)
                } else {
                    setPreUploaded([newSound])
                }
            }
        }
    }

    useEffect(() => {
        setUpEventListeners()
    })

    const setUpEventListeners = () => {
        /** Stop default behaviour on drag related events */
        const events = ['dragenter', 'dragover', 'dragleave', 'drop']
        events.forEach((event) => {
            document.addEventListener(event, (e) => {
                e.preventDefault()
                e.stopPropagation()
            })
        })
    }

    const onClose = (all) => {
        if (!showUploadSound || all) {
            toggleCreateRoundModal()
        }
        setShowLoader(false)
        setPreUploaded(null)
        setShowUploadSound(false)
    }

    const soundPlaybackToggle = (i) => {
        const newPreUploaded = cloneDeep(preUploaded)
        const isPlaying = !newPreUploaded[i].isPlaying
        newPreUploaded[i].isPlaying = isPlaying
        const sound = new Audio(newPreUploaded[i].forPlay)
        if (isPlaying)
            sound.play().catch(e => {
                if (e.message.indexOf('supported'))
                    /** temp alert TODO: use proper user friendly alerts */
                    alert('browser doesn\'t support aiff files')
                else
                    alert('an error occured white trying to playback sound')
            })
        else
            sound.pause()
        setPreUploaded(newPreUploaded)
    }

    const createSamples = (urls) => {
        return new Promise(async resolve => {
            const newSamples = []
            urls && Array.isArray(urls) && urls.forEach(async url => {
                let sample = getDefaultSample(user.id)
                sample.remoteURL = url
                await firebase.createSample(sample)
                newSamples.push(sample)
                if (newSamples.length === urls.length) {
                    resolve(newSamples)
                }
            })
        })

    }

    const onUploadSound = async () => {
        setShowLoader(true)
        const urls = await firebase.uploadSound(user.id, preUploaded)
        const samples = await createSamples(urls)
        setShowLoader(false)
        defaultRoundCreate(null, samples)
        onClose(true)
    }

    const trashSound = (index) => {
        const newPreUploaded = cloneDeep(preUploaded)
        newPreUploaded.splice(index, 1)
        if (newPreUploaded.length)
            setPreUploaded(newPreUploaded)
        else setPreUploaded(null)
    }

    return (
        <Dialog
            classes={{ paper: classes.paper }}
            onClose={() => onClose(true)}
            aria-labelledby="simple-dialog-title"
            open={isShowingCreateRoundModal}
        >
            <DialogTitle className={classes.title}>
                <Box className={classes.titleSub}>
                    <Box className={classes.closeContainer}>
                        <Close className={classes.close} onClick={() => onClose()} />
                    </Box>
                    <Typography className={classes.titleText}>
                        {showUploadSound ? 'Upload custom sounds' : 'New Project'}
                    </Typography>
                </Box>
            </DialogTitle>
            <Box className={classes.body} >
                {!showLoader && !showUploadSound ?
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
                        <Box id='default-round' onClick={() => setShowUploadSound(true)} className={classes.tile}>
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
                    showUploadSound && !showLoader ?
                        <>
                            {
                                <Box>
                                    <input
                                        hidden
                                        ref={uploadInputRef}
                                        onChange={(e) => {
                                            const files = e.target.files
                                            processFiles(files)
                                        }}
                                        type='file'
                                    />
                                    <Box
                                        className={classes.tile}
                                        id='file-drop-zone'
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            const dt = e.dataTransfer
                                            const files = dt.files
                                            processFiles(files)
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            uploadInputRef.current.click()
                                        }}
                                        style={{ height: preUploaded ? 104 : 252 }}
                                    >
                                        <Box>
                                            {preUploaded ? <Add /> : <Upload />}
                                        </Box>
                                        <Typography className={classes.tileSub}>
                                            {preUploaded ? 'Add more sounds' : 'Choose audio files or drag and drop'}
                                        </Typography>
                                        <Typography className={classes.tileText}>
                                            .aif or .wav
                                        </Typography>
                                    </Box>
                                    {
                                        preUploaded && preUploaded.length &&
                                        <Box className={classes.preUploadList}>
                                            {preUploaded.map((item, i) => {
                                                return (
                                                    <Box className={classes.tileAlt} key={i}>
                                                        <Box onClick={() => soundPlaybackToggle(i)} className={classes.tileAltIconContainer} style={{ justifyContent: 'flex-start' }}>
                                                            <Playback />
                                                        </Box>
                                                        <Box className={classes.tileAltTypeContainer}>
                                                            <Typography style={{ fontSize: 14 }}>{item.name}</Typography>
                                                            <Typography id='dummy-time' style={{ fontSize: 12 }}>00:01:34</Typography>
                                                        </Box>
                                                        <Box onClick={() => trashSound(i)} className={classes.tileAltIconContainer} style={{ justifyContent: 'flex-end' }}>
                                                            <Trash />
                                                        </Box>
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                    }
                                </Box>
                            }
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
            {
                showUploadSound && <Box className={classes.buttonContainer}>
                    <Button onClick={onUploadSound} disabled={!preUploaded || showLoader} className={classes.createProject}>
                        <Typography style={{ fontWeight: 700 }}>Upload and create project</Typography>
                    </Button>
                </Box>
            }
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
)(CreateRoundModal);
