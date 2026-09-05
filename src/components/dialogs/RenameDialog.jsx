import React, { useContext, useRef, useEffect } from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { connect } from "react-redux";
import { setRoundName, setIsShowingRenameDialog, setRounds, setDisableKeyListener } from '../../redux/actions'
import { FirebaseContext } from '../../firebase';
import _ from 'lodash'

function RenameDialog ({ selectedRoundId, round, rounds, setRoundName, setIsShowingRenameDialog, isShowingRenameDialog, setRounds, setDisableKeyListener }) {
    const firebase = useContext(FirebaseContext);
    const inputRef = useRef(null)
    const handleClose = () => {
        setIsShowingRenameDialog(false)
    }

    // The round being renamed is either the one that is open or one from the user's list.
    const isOpenRound = !_.isNil(round) && round.id === selectedRoundId
    const listedRound = _.find(rounds, { id: selectedRoundId })
    const currentName = isOpenRound ? round.name : (listedRound ? listedRound.name : '')

    const onOkClick = () => {
        const newName = inputRef.current ? inputRef.current.value.trim() : ''
        if (_.isEmpty(newName) || _.isNil(selectedRoundId)) {
            return
        }
        if (!_.isNil(listedRound)) {
            const roundsClone = _.cloneDeep(rounds)
            _.find(roundsClone, { id: selectedRoundId }).name = newName
            setRounds(roundsClone)
        }
        if (isOpenRound) {
            setRoundName(newName)
        }
        firebase.updateRound(selectedRoundId, { name: newName }).catch(error => console.error('Could not rename round', error))
        setIsShowingRenameDialog(false)
    }

    const onSubmit = (e) => {
        e.preventDefault()
        onOkClick()
    }

    useEffect(() => {
        setDisableKeyListener(isShowingRenameDialog)
    }, [isShowingRenameDialog, setDisableKeyListener])

    return (
        <Dialog open={isShowingRenameDialog} onClose={handleClose} aria-labelledby="rename-dialog-title">
            <form onSubmit={onSubmit} noValidate>
                <DialogTitle id="rename-dialog-title">Rename</DialogTitle>
                <DialogContent>
                    <TextField
                        key={selectedRoundId || 'none'}
                        inputRef={inputRef}
                        defaultValue={currentName}
                        label="Round name"
                        autoFocus
                        margin="dense"
                        id="name"
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button type="submit" color="primary" variant="contained" disableElevation>
                        Rename
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}
const mapStateToProps = state => {
    return {
        selectedRoundId: state.display.selectedRoundId,
        round: state.round,
        isShowingRenameDialog: state.display.isShowingRenameDialog,
        rounds: state.rounds
    };
};

export default connect(
    mapStateToProps,
    {
        setRoundName,
        setIsShowingRenameDialog,
        setRounds,
        setDisableKeyListener
    }
)(RenameDialog);
