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
    const textField = useRef(null)
    const handleClose = () => {
        setIsShowingRenameDialog(false)

    }
    const onOkClick = () => {
        const newName = textField.current.querySelectorAll("input")[0].value
        console.log('on rename click', newName);
        let roundsClone = _.cloneDeep(rounds)
        let selectedRound = _.find(roundsClone, { id: selectedRoundId })
        selectedRound.name = newName
        setRounds(roundsClone)
        if (!_.isNil(round) && round.id === selectedRoundId) {
            setRoundName(newName)
        }
        firebase.updateRound(selectedRoundId, { name: newName })
        setIsShowingRenameDialog(false)
    }
    useEffect(() => {
        if (isShowingRenameDialog) {
            setDisableKeyListener(true)
        } else {
            setDisableKeyListener(false)
        }
    }, [isShowingRenameDialog, setDisableKeyListener])
    return (
        <Dialog open={isShowingRenameDialog} onClose={handleClose} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title">Rename</DialogTitle>
            <DialogContent>
                <TextField
                    ref={textField}
                    defaultValue={round ? round.name : ''}
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
                <Button color="primary" variant="contained" disableElevation autoFocus onClick={onOkClick}>
                    Rename
          </Button>
            </DialogActions>
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