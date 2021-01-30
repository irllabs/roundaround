import React, { useState, useEffect, useContext, useRef } from 'react';
import { connect } from "react-redux";
import { toggleLoader, toggleRaycaster } from "../../../redux/actions";
import { uuid } from '../../../models/SequencerUtil';
import CollaborationLink from '../collaboration-link/CollaborationLink.component';
import { FirebaseContext } from '../../../firebase';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/core/styles';
import QRCode from 'qrcode'
import { useHistory } from "react-router-dom";


const styles = makeStyles({
    title: {
        textAlign: 'center'
    },
    body: {
        padding: '1rem',
        borderTop: 'solid 1px rgba(255,255,255,0.1)'
    },
    linkContainer: {
        display: 'flex'
    },
    QRCodeContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
    },
    textField: {
        marginRight: '1rem'
    },
    copyButton: {
        marginRight: '1rem',
        minWidth: 100
    },
    goButton: {
        minWidth: 100
    }
})

const LinkGenerator = ({ sharing, toggleSharing, round, toggleLoader, toggleRaycaster }) => {
    const firebase = useContext(FirebaseContext);
    const [collaborationModalOpen, setCollaborationModalOpen] = useState(false);
    const [link, setLink] = useState({ link: '', long_url: '' });
    const QRCanvas = useRef(null)
    const textField = useRef(null)
    const history = useHistory();

    const toggleCollaborationModal = () => {
        toggleSharing();
    }

    const generateAndShortenLink = async (uuid) => {
        const generatedLink = window.location.origin + '/#/collaboration/' + uuid;

        if (window.location.hostname === 'localhost') return {
            link: generatedLink,
            long_url: generatedLink
        };

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
                    "long_url": generatedLink
                }
            )
        };

        const shortenedLink = await fetch('https://api-ssl.bitly.com/v4/shorten', requestOptions)
            .then(response => response.json())
        console.log('shortenedLink', shortenedLink)
        return shortenedLink;
    }

    const startSharingSequence = async () => {
        toggleLoader(true);
        //check if link exists
        const collaboration = await firebase.db.collection('collaborations').where('round', '==', round.id).get().then((querySnapshot) => {
            const tempDoc = querySnapshot.docs.map((doc) => {
                return { id: doc.id, ...doc.data() }
            })
            return tempDoc.find(doc => !doc.derivative)
        });

        if (!collaboration || collaboration.derivative) {
            const userData = JSON.parse(firebase.currentUser.displayName);
            const linkId = uuid();
            const shortenedLink = await generateAndShortenLink(linkId);

            firebase.db.collection('collaborations').doc(linkId).set({
                round: round.id,
                isPlaying: false,
                creator: firebase.currentUser.uid,
                contributors: {
                    [firebase.currentUser.uid]: { color: userData.color }
                },
                shortenedLink,
            }, { merge: false })
            setLink(shortenedLink);
        } else {
            setLink(collaboration.shortenedLink);
        }
        toggleLoader(false);
        setCollaborationModalOpen(true);
    }

    const handleClose = () => {
        toggleCollaborationModal()
    }

    const onGoClick = () => {
        window.location = link.link
    }
    const onCopyClick = () => {
        const textFieldComponent = textField.current;
        const inputElement = textFieldComponent.querySelectorAll("input")[0]
        inputElement.focus();
        inputElement.select();
        document.execCommand('copy');
        inputElement.blur();
    }

    useEffect(() => {
        if (sharing) {
            startSharingSequence();
            toggleRaycaster(false);

        } else {
            setCollaborationModalOpen(false);
            toggleRaycaster(true);
        }
    }, [sharing])

    useEffect(() => {
        if (collaborationModalOpen) {
            setTimeout(() => {
                console.log('rendering QR code');
                QRCode.toCanvas(document.getElementById('QRCanvas'), link.link, function (error) {
                    if (error) console.error(error)
                    console.log('success!');
                })

            }, 100)
        }
    }, [collaborationModalOpen])

    const classes = styles();

    return (
        <>
            <Dialog maxWidth="sm" fullWidth={true} onClose={handleClose} aria-labelledby="simple-dialog-title" open={collaborationModalOpen}>
                <DialogTitle className={classes.title} id="simple-dialog-title">Share project</DialogTitle>
                <Box className={classes.body}>
                    <p>Use the QR code or link to join the collaboration.</p>
                    <Box className={classes.QRCodeContainer}>

                        <canvas id="QRCanvas" className={classes.QRCode}></canvas>
                    </Box>
                    <Box className={classes.linkContainer}>
                        <TextField
                            ref={textField}

                            defaultValue={link.link}
                            variant="outlined"
                            fullWidth
                            className={classes.textField}
                        />
                        <Button className={classes.copyButton} color="secondary" variant="contained" disableElevation onClick={onCopyClick}>Copy</Button>
                        <Button className={classes.goButton} color="secondary" variant="contained" disableElevation onClick={onGoClick}>Go</Button>
                    </Box></Box>

            </Dialog>
        </>
    );
}

export default connect(
    null,
    { toggleLoader, toggleRaycaster }
)(LinkGenerator);
