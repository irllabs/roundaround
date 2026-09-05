import React, { useState, useEffect, useContext, useRef } from 'react';
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/core/styles';
import QRCode from 'qrcode'
import { setIsShowingShareDialog, setRoundShortLink } from '../../redux/actions'
import _ from 'lodash'

const styles = makeStyles({
    title: {
        textAlign: 'center'
    },
    body: {
        padding: '1rem',
        borderTop: 'solid 1px rgba(255,255,255,0.1)'
    },
    linkContainer: {
        display: 'flex',
    },
    paper: {
        borderRadius: 8,
    },
    QRCodeContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
    },
    textField: {
        marginRight: '1rem',
        [`& fieldset`]: {
            borderRadius: 8,
        },
    },
    copyButton: {
        marginRight: '1rem',
        minWidth: 100
    }
})

const getFullUrl = (roundId) => window.location.origin + '/play/' + roundId

const ShareDialog = ({ round, isShowingShareDialog, setIsShowingShareDialog, setRoundShortLink }) => {
    const firebase = useContext(FirebaseContext);
    const inputRef = useRef(null)
    const canvasRef = useRef(null)
    const [link, setLink] = useState('')
    const [copied, setCopied] = useState(false)

    const roundId = round ? round.id : null
    const storedShortLink = round ? round.shortLink : null

    // Resolve the link to show: the stored short link, otherwise ask the backend for one,
    // otherwise fall back to the full URL. The full URL always works, so a shortener
    // failure is never fatal.
    useEffect(() => {
        if (!isShowingShareDialog || _.isNil(roundId)) {
            return undefined
        }
        let cancelled = false
        const fullUrl = getFullUrl(roundId)
        setLink(_.isEmpty(storedShortLink) ? fullUrl : storedShortLink)
        setCopied(false)

        if (_.isEmpty(storedShortLink)) {
            firebase.createShortLink(roundId)
                .then((result) => {
                    if (cancelled || _.isNil(result) || _.isEmpty(result.link)) {
                        return
                    }
                    setLink(result.link)
                    setRoundShortLink(result.link)
                })
                .catch((error) => {
                    // Not fatal: the full URL is already shown.
                    console.warn('Could not create a short link', error)
                })
        }

        return () => {
            cancelled = true
        }
    }, [isShowingShareDialog, roundId, storedShortLink, firebase, setRoundShortLink])

    // The QR code always encodes the full URL so it keeps working if the shortener does not.
    useEffect(() => {
        if (!isShowingShareDialog || _.isNil(roundId)) {
            return undefined
        }
        const timer = setTimeout(() => {
            if (canvasRef.current) {
                QRCode.toCanvas(canvasRef.current, getFullUrl(roundId), (error) => {
                    if (error) {
                        console.error(error)
                    }
                })
            }
        }, 100)
        return () => clearTimeout(timer)
    }, [isShowingShareDialog, roundId])

    const handleClose = () => {
        setIsShowingShareDialog(false)
    }

    const onCopyClick = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link)
            } else if (inputRef.current) {
                inputRef.current.focus()
                inputRef.current.select()
                document.execCommand('copy')
                inputRef.current.blur()
            }
            setCopied(true)
        } catch (error) {
            console.warn('Could not copy the link', error)
        }
    }

    const classes = styles();

    return (
        <Dialog classes={{ paper: classes.paper }} onClose={handleClose} aria-labelledby="share-dialog-title" open={isShowingShareDialog}>
            <DialogTitle className={classes.title} id="share-dialog-title">Share project</DialogTitle>
            <Box className={classes.body}>
                <p>Use the QR code or link to join the collaboration.</p>
                <Box className={classes.QRCodeContainer}>
                    <canvas ref={canvasRef} id="QRCanvas" aria-label="QR code for this round's link" role="img"></canvas>
                </Box>
                <Box className={classes.linkContainer}>
                    <TextField
                        id="share-link"
                        inputRef={inputRef}
                        value={link}
                        label="Link"
                        variant="outlined"
                        fullWidth
                        InputProps={{ readOnly: true }}
                        className={classes.textField}
                    />
                    <Button className={classes.copyButton} color="secondary" variant="contained" disableElevation onClick={onCopyClick}>{copied ? 'Copied' : 'Copy'}</Button>
                </Box>
            </Box>
        </Dialog>
    );
}
const mapStateToProps = state => {
    return {
        round: state.round,
        isShowingShareDialog: state.display.isShowingShareDialog
    };
};

export default connect(
    mapStateToProps,
    {
        setIsShowingShareDialog,
        setRoundShortLink
    }
)(ShareDialog);
