import React, { useContext, useState } from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { connect } from "react-redux";
import { useHistory } from 'react-router-dom';
import { FirebaseContext } from '../../firebase';
import { setIsShowingDeleteRoundDialog, setRounds } from '../../redux/actions'
import _ from 'lodash'
import CircularProgress from '@material-ui/core/CircularProgress';

function DeleteRoundDialog ({ isShowingDeleteRoundDialog, selectedRoundId, rounds, setRounds, round, setIsShowingDeleteRoundDialog }) {
    const firebase = useContext(FirebaseContext);
    const history = useHistory();
    const [isDeleting, setIsDeleting] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)
    const handleClose = () => {
        if (!isDeleting) {
            setErrorMessage(null)
            setIsShowingDeleteRoundDialog(false)
        }
    }
    const onOkClick = async () => {
        if (_.isNil(selectedRoundId)) {
            return
        }
        setIsDeleting(true)
        setErrorMessage(null)
        try {
            await firebase.deleteRound({ id: selectedRoundId })
            const roundsClone = _.cloneDeep(rounds)
            _.remove(roundsClone, { id: selectedRoundId })
            setRounds(roundsClone)
            setIsShowingDeleteRoundDialog(false)
            if (!_.isNil(round) && round.id === selectedRoundId) {
                // we deleted the round we are looking at
                history.push('/rounds')
            }
        } catch (error) {
            console.error('Could not delete round', error)
            setErrorMessage('The round could not be deleted. ' + (error.message || ''))
        } finally {
            setIsDeleting(false)
        }
    }
    return (
        <Dialog open={isShowingDeleteRoundDialog} onClose={handleClose} aria-labelledby="delete-dialog-title">
            <DialogTitle id="delete-dialog-title">Are you sure you want to delete this round?</DialogTitle>
            <DialogContent>
                <DialogContentText>This removes the round and all of its layers for everyone. It cannot be undone.</DialogContentText>
                {errorMessage && <DialogContentText color="error" role="alert">{errorMessage}</DialogContentText>}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} autoFocus disabled={isDeleting}>
                    Cancel
                </Button>
                <Button color="primary" variant="contained" disableElevation onClick={onOkClick} disabled={isDeleting}>
                    {
                        !isDeleting &&
                        <span>Delete</span>
                    }
                    {
                        isDeleting &&
                        <CircularProgress size={24} />
                    }
                </Button>
            </DialogActions>
        </Dialog>
    )
}
const mapStateToProps = state => {
    return {
        round: state.round,
        selectedRoundId: state.display.selectedRoundId,
        rounds: state.rounds,
        isShowingDeleteRoundDialog: state.display.isShowingDeleteRoundDialog
    };
};

export default connect(
    mapStateToProps,
    {
        setRounds,
        setIsShowingDeleteRoundDialog
    }
)(DeleteRoundDialog);
