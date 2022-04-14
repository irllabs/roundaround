/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect, useContext } from 'react'
import { connect } from 'react-redux'
import { FirebaseContext } from '../../firebase';

import { Button, IconButton, Typography, TextField } from '@material-ui/core'
import Close from '../play/layer-settings/resources/Close'
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


import { Box, makeStyles } from '@material-ui/core'
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
        fontSize: 20,
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
        bottom: 5,
        flex: 1,
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
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
        marginTop: 15,
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
    buttonNoEffects: {
        display: 'flex',
        marginBottom: '1rem',
        textAlign: 'center',
        padding: 0,
        backgroundColor: 'transparent',
        '&:hover': {
            backgroundColor: 'transparent'
        },
        '&:active': {
            backgroundColor: 'transparent'
        }
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
    },
    inputContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 5,
        paddingBottom: 5,
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.1)',
    }
})

const CustomInstrumentDialog = ({
    toggleCustomInstrumentDialog,
    addInstrumentToRound,
    isShowingCustomInstrumentDialog,
    user
}) => {
    const firebase = useContext(FirebaseContext);
    const classes = styles()
    const uploadInputRef = useRef()
    const [showLoader, setShowLoader] = useState(false)
    const [showUploadSound, setShowUploadSound] = useState(false)
    const [preUploaded, setPreUploaded] = useState([])
    const [instrumentName, setInsrumentName] = useState('')

    const processFiles = (files) => {
        if (files && files[0]) {
            const filesArray = Array.from(files)
            const newPreUploaded = preUploaded ? [...preUploaded] : []
            filesArray.forEach((file) => {
                const fileType = file.type
                if (/**fileType.includes('aiff') || */fileType.includes('wav')) {
                    const forPlay = URL.createObjectURL(file)
                    if (file.size <= 20000000) {
                        const newSound = {
                            name: file.name,
                            type: file.type,
                            isPlaying: false,
                            file,
                            duration: 0,
                            forPlay
                        }
                        newPreUploaded.push(newSound)
                    } else alert(`file ${file.name} is too large!`)
                } else alert(`file ${file.name} is not supported!`)
            })
            setPreUploaded(newPreUploaded)
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
            toggleCustomInstrumentDialog()
        }
        setShowLoader(false)
        setPreUploaded(null)
        setShowUploadSound(false)
    }

    const soundPreLoad = (i) => {
        const newPreUploaded = cloneDeep(preUploaded)
        const isPlaying = !newPreUploaded[i].isPlaying
        newPreUploaded[i].isPlaying = isPlaying
        const sound = new Audio(newPreUploaded[i].forPlay)
        sound.addEventListener('loadedmetadata', () => {
            const duration = sound.duration
            newPreUploaded[i].duration = duration
            setPreUploaded(newPreUploaded)
        })
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
                sample.displayName = instrumentName || 'Custom'
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
        addInstrumentToRound(samples)
        onClose(true)
    }

    const convertHMS = (value) => {
        const sec = parseFloat(value)
        let hours = Math.floor(sec / 3600)
        let minutes = Math.floor((sec - (hours * 3600)) / 60)
        let seconds = Math.floor(sec - (hours * 3600) - (minutes * 60))
        let miliseconds = parseInt((sec - (hours * 3600) - (minutes * 60) - seconds) * 1000)
        if (hours < 10) { hours = "0" + hours }
        if (minutes < 10) { minutes = "0" + minutes }
        if (seconds < 10) { seconds = "0" + seconds }
        if (miliseconds < 10) { miliseconds = "0" + miliseconds }
        return hours + ':' + minutes + ':' + seconds + ':' + miliseconds
    }

    const trashSound = (index) => {
        const newPreUploaded = cloneDeep(preUploaded)
        newPreUploaded.splice(index, 1)
        if (newPreUploaded.length)
            setPreUploaded(newPreUploaded)
        else setPreUploaded(null)
    }

    const setCurrentInstrumentName = (e) => {
        const name = e.target.value
        if (name.length <= 15)
            setInsrumentName(name)
    }

    return (
        <Dialog
            classes={{ paper: classes.paper }}
            onClose={() => onClose(true)}
            aria-labelledby="simple-dialog-title"
            open={isShowingCustomInstrumentDialog}
        >
            <DialogTitle className={classes.title}>
                <Box className={classes.titleSub}>
                    <Box className={classes.closeContainer}>
                        <IconButton className={classes.buttonNoEffects} onClick={() => onClose()}>
                            <Close className={classes.close} />
                        </IconButton>
                    </Box>
                    <Typography className={classes.titleText}>
                        Upload custom sounds
                    </Typography>
                </Box>
            </DialogTitle>
            <Box className={classes.body} >
                {!showLoader ?
                    <>
                        <Box style={{ overflow: 'scroll' }}>
                            <Box style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(255,255,255, 0.1)' }}>
                                <Box className={classes.inputContainer}>
                                    <Box style={{ display: 'flex', flexDirection: 'column', padding: 0, margin: 0 }}>
                                        <Typography style={{ flex: 1, fontSize: 12 }}>Instrument Name</Typography>
                                        <TextField
                                            style={{ flex: 5, width: 250, border: '0 solid rgba(255,255,255, 0)', fontSize: 14 }}
                                            fullWidth={true}
                                            value={instrumentName}
                                            onChange={setCurrentInstrumentName}
                                            InputProps={{ disableUnderline: true }}
                                        />
                                    </Box>
                                    <Close className={classes.close} onClick={() => { }} />
                                </Box>
                                <Box style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography style={{ fontSize: 12 }}>Enter a short name</Typography>
                                    </Box>
                                    <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                        <Typography style={{ fontSize: 12 }}>{instrumentName.length}</Typography>
                                        <Box style={{ display: 'flex', lineHeight: 2 }}>/</Box>
                                        <Typography style={{ fontSize: 12 }}>15</Typography>
                                    </Box>
                                </Box>
                            </Box>
                            <input
                                hidden
                                ref={uploadInputRef}
                                onChange={(e) => {
                                    const files = e.target.files
                                    processFiles(files)
                                }}
                                multiple
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
                                style={{ height: preUploaded && preUploaded.length ? 104 : 147 }}
                            >
                                <Box>
                                    {preUploaded && preUploaded.length ? <Add /> : <Upload />}
                                </Box>
                                <Typography className={classes.tileSub}>
                                    {preUploaded && preUploaded.length ? 'Add more sounds' : 'Choose audio files or drag and drop'}
                                </Typography>
                                <Typography className={classes.tileText}>
                                    .aif or .wav
                                </Typography>
                            </Box>
                            {
                                preUploaded && preUploaded.length > 0 &&
                                <Box className={classes.preUploadList}>
                                    {preUploaded.map((item, i) => {
                                        const name = item.name
                                        const nameLength = name.length
                                        if (!item.duration)
                                            soundPreLoad(i)
                                        return (
                                            <Box className={classes.tileAlt} key={i}>
                                                <Box onClick={() => soundPlaybackToggle(i)} className={classes.tileAltIconContainer} style={{ justifyContent: 'flex-start' }}>
                                                    <Playback />
                                                </Box>
                                                <Box className={classes.tileAltTypeContainer}>
                                                    <Typography style={{ fontSize: 14 }}>{nameLength > 25 ? name.substring(0, 25) + '...' : name}</Typography>
                                                    <Typography id='dummy-time' style={{ fontSize: 12 }}>{convertHMS(item.duration)}</Typography>
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
            <Box className={classes.buttonContainer}>
                <Button onClick={onUploadSound} disabled={!preUploaded || !preUploaded.length || showLoader} className={classes.createProject}>
                    <Typography style={{ fontWeight: 700 }}>Upload</Typography>
                </Button>
            </Box>
        </Dialog>
    )
}

const mapStateToProps = state => {
    return {
        user: state.user,
        rounds: state.rounds,
        selectedRoundId: state.display.selectedRoundId,
        isShowingCustomInstrumentDialog: state.display.isShowingCustomInstrumentDialog,
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
)(CustomInstrumentDialog);
