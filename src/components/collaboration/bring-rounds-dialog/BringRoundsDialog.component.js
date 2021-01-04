import React, { useState } from 'react';
import { contributorsColors } from './colors';
const classNames = require('classnames');
import styles from './BringRoundsDialog.styles.scss';
import { removeOldRounds } from '../../../utils/index'

const BringRoundsDialogComponent = ({ onFinishDialog, updateBringRoundConfig, firebase, toggleLoader }) => {
    const [stage, setStage] = useState(0);
    const [rounds, setRounds] = useState([]);
    const [roundToBring, setRoundToBring] = useState();
    const [allowEditingByOthers, setAllowEditingByOthers] = useState(false);

    const finishDialog = () => {
        onFinishDialog();

        // clean up
        setStage(0);
        setRounds([]);
    }

    const moveToNextStage = () => {
        setStage(stage + 1);
    }


    const loadUserRounds = () => {
        toggleLoader(true);
        const user = firebase.currentUser;
        const userData = JSON.parse(user.displayName);

        firebase.db.collection('rounds').where('user', '==', user.uid).get().then((querySnapshot) => {
            const userRounds = querySnapshot.docs.map((doc) => {
                return { id: doc.id, ...doc.data() }
            })

            removeOldRounds(userRounds)

            const lastVisitedRound = userRounds.find(round => round.id === userData.lastVisitedRound);

            const roundToBring = lastVisitedRound || userRounds[0];
            setRounds(userRounds);
            setRoundToBring(roundToBring.id);
            updateBringRoundConfig({ round: roundToBring })

            moveToNextStage();
            toggleLoader(false);
        })
            .catch(e => {
                console.log(e);
            })
    }

    const onRoundSelect = (event) => {
        const roundId = event.target.value;
        const round = rounds.find(round => round.id === roundId);

        updateBringRoundConfig({ round })
    }

    const onAllowEditingByOthers = () => {
        updateBringRoundConfig({ editableByOthers: true })
        setAllowEditingByOthers(true);
    }

    const onDenyEditingByOthers = () => {
        updateBringRoundConfig({ editableByOthers: false })
        setAllowEditingByOthers(false);
    }

    return (
        <>
            {
                stage === 0 &&
                <div className={styles.dialog}>
                    <div className={styles.dialogText}>
                        Would you like to bring one of your own rounds to the collaboration?
                        <br />
                        Don't worry, you won't loose your original one, it just gets copied here.
                    </div>
                    <div className={styles.dialogControls}>
                        <button
                            className={styles.dialogButton}
                            onClick={loadUserRounds}
                        >
                            Yes
                        </button>
                        <button
                            className={styles.dialogButton}
                            onClick={finishDialog}
                        >
                            No
                        </button>
                    </div>
                </div>
            }
            {
                stage === 1 &&
                <div className={styles.settingsForm}>
                    <div className={styles.dialog}>
                        The last round you visited is chosen by default, but you can select a different one:
                        <select
                            className={styles.dialogSelect}
                            defaultValue={roundToBring}
                            onChange={onRoundSelect}
                        >
                            {
                                rounds.map(round => (
                                    <option key={round.id} value={round.id}>{round.name}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className={styles.dialog}>
                        <div className={styles.dialogText}>
                            Should other users be able to modify your round in the collaboration?
                        </div>
                        <div className={styles.dialogControls}>
                            <button
                                className={classNames(
                                    allowEditingByOthers
                                        ?
                                        [styles.dialogButton, styles.dialogButtonSelected]
                                        :
                                        styles.dialogButton)}
                                onClick={onAllowEditingByOthers}
                            >
                                Yes
                            </button>
                            <button
                                className={classNames(
                                    !allowEditingByOthers
                                        ?
                                        [styles.dialogButton, styles.dialogButtonSelected]
                                        :
                                        styles.dialogButton)}
                                onClick={onDenyEditingByOthers}
                            >
                                No
                            </button>
                        </div>
                    </div>
                    <button
                        className={styles.dialogButton}
                        onClick={finishDialog}
                    >
                        Go!
                    </button>
                </div>
            }
        </>
    );
}

export default BringRoundsDialogComponent;
