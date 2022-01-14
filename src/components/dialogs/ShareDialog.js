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

const ShareDialog = ({ round, isShowingShareDialog, setIsShowingShareDialog, setRoundShortLink }) => {
    const firebase = useContext(FirebaseContext);
    const textField = useRef(null)
    const [shortLink, setShortLink] = useState(round ? round.shortLink : '')

    useEffect(() => {
        if (isShowingShareDialog) {
            draw()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isShowingShareDialog])

    const draw = async () => {
        let fullUrl = window.location.origin + '/play/' + round.id;
        //if (window.location.hostname === 'localhost') return null
        if (window.location.hostname === 'localhost') {
            fullUrl = 'http://192.168.136.154:3000/play/' + round.id;
        }

        if (_.isEmpty(round.shortLink)) {
            const result = await generateShortLink(fullUrl)
            setShortLink(result.link)
            firebase.updateRound(round.id, { shortLink: result.link })
            setRoundShortLink(result.link)
        } else {
            setShortLink(round.shortLink)
        }

        setTimeout(() => {
            //console.log('rendering QR code');
            QRCode.toCanvas(document.getElementById('QRCanvas'), fullUrl, function (error) {
                if (error) console.error(error)
                // console.log('success!');
            })

        }, 100)
    }

    const generateShortLink = async (fullUrl) => {
        return new Promise(async (resolve, reject) => {
            const bitlyToken = 'c48cf8ef04cb1e9bf0c8f320418b5b3bde599764';
            const bitlyGroupGuid = 'Bk8q4epOSuG';
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bitlyToken}`
                },
                body: JSON.stringify(
                    {
                        "group_guid": bitlyGroupGuid,
                        "domain": "bit.ly",
                        "long_url": fullUrl
                    }
                )
            };

            const shortenedLink = await fetch('https://api-ssl.bitly.com/v4/shorten', requestOptions)
                .then(response => response.json())
            console.log('shortenedLink', shortenedLink)
            resolve(shortenedLink);
        })
    }

    const handleClose = () => {
        setIsShowingShareDialog(false)
    }

    const onCopyClick = () => {
        const textFieldComponent = textField.current;
        const inputElement = textFieldComponent.querySelectorAll("input")[0]
        inputElement.focus();
        inputElement.select();
        document.execCommand('copy');
        inputElement.blur();
    }



    const classes = styles();

    return (
        <Dialog classes={{ paper: classes.paper }} onClose={handleClose} aria-labelledby="simple-dialog-title" open={isShowingShareDialog}>
            <DialogTitle className={classes.title} id="simple-dialog-title">Share project</DialogTitle>
            <Box className={classes.body}>
                <p>Use the QR code or link to join the collaboration.</p>
                <Box className={classes.QRCodeContainer}>
                    <canvas id="QRCanvas" className={classes.QRCode}></canvas>
                </Box>
                <Box className={classes.linkContainer}>
                    <TextField
                        ref={textField}
                        value={shortLink}
                        variant="outlined"
                        fullWidth
                        className={classes.textField}
                    />
                    <Button className={classes.copyButton} color="secondary" variant="contained" disableElevation onClick={onCopyClick}>Copy</Button>
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
