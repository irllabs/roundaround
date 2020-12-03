import React, { useState, useEffect, useContext } from 'react';
import { connect } from "react-redux";
import { toggleLoader, toggleRaycaster } from "../../../redux/actions";

import { uuid } from '../../../models/SequencerUtil';

import Modal from '../../modal/Modal.component';
import CollaborationLink from '../collaboration-link/CollaborationLink.component';

import { FirebaseContext } from '../../../firebase';

const LinkGenerator = ({ sharing, toggleSharing, round, toggleLoader, toggleRaycaster }) => {
    const firebase = useContext(FirebaseContext);
    const [collaborationModalOpen, setCollaborationModalOpen] = useState(false);
    const [link, setLink] = useState({ link: '', long_url: '' });

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
                    [firebase.currentUser.uid]: {color: userData.color}
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

    useEffect(() => {
        if (sharing) {
            startSharingSequence();
            toggleRaycaster(false);
        } else {
            setCollaborationModalOpen(false);
            toggleRaycaster(true);
        }
    }, [sharing])

    return (
        <>
            <Modal
                isOpen={collaborationModalOpen}
                onModalClose={toggleCollaborationModal}
            >
                <CollaborationLink
                    link={link}
                />
            </Modal>
        </>
    );
}

export default connect(
    null,
    { toggleLoader, toggleRaycaster }
)(LinkGenerator);

