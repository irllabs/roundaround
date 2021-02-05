import React, { useContext, useState } from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
import { setIsShowingDeleteRoundDialog, setRounds, setRound } from '../../redux/actions'
import _ from 'lodash'
import CircularProgress from '@material-ui/core/CircularProgress';

function DeleteRoundDialog ({ isShowingDeleteRoundDialog, selectedRoundId, rounds, setRounds, setRound, round, setIsShowingDeleteRoundDialog }) {
    const firebase = useContext(FirebaseContext);
    const [isDeleting, setIsDeleting] = useState(false)
    const handleClose = () => {
        setIsShowingDeleteRoundDialog(false)
    }
    const onOkClick = async () => {
        console.log('on delete click');
        setIsDeleting(true)
        let roundsClone = _.cloneDeep(rounds)
        _.remove(roundsClone, { id: selectedRoundId })
        if (!_.isNil(round) && round.id === selectedRoundId) {
            setRound(null)
        }
        // load round so we have all the layers etc
        let selectedRound = await firebase.getRound(selectedRoundId)
        await firebase.deleteRound(selectedRound)
        console.log('setting rounds to ', roundsClone);
        setRounds(roundsClone)
        setIsDeleting(false)
        setIsShowingDeleteRoundDialog(false)
    }
    return (
        <Dialog open={isShowingDeleteRoundDialog} onClose={handleClose} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title">Are you sure you want to delete this round?</DialogTitle>
            <DialogContent>

            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    Cancel
          </Button>
                <Button onClick={onOkClick} >
                    {
                        !isDeleting &&
                        <p>Delete</p>
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
        setRound,
        setRounds,
        setIsShowingDeleteRoundDialog
    }
)(DeleteRoundDialog);