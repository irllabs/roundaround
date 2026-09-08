import React, { useContext, useState } from 'react';
import { connect } from "react-redux";
import { useHistory } from 'react-router-dom';
import { FirebaseContext } from '../../firebase';
import { setIsShowingDeleteRoundDialog, setRounds } from '../../redux/actions'
import { AppDialog, AppDialogActions, AppDialogContent, MUI_BUTTON } from './AppDialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import _ from 'lodash'

/** MUI's DialogContentText: body1 with 12px under it. */
const CONTENT_TEXT = 'mb-3 mt-0 text-base leading-6 tracking-[0.00938em]'

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
    // rounded-[32px]: no JSS overrode Paper here, so the radius is the MUI theme's 32.
    return (
        <AppDialog open={isShowingDeleteRoundDialog} onOpenChange={(next) => { if (!next) handleClose() }} titleId="delete-dialog-title" title="Are you sure you want to delete this round?" className="rounded-[32px]">
            <AppDialogContent>
                <p className={cn(CONTENT_TEXT, 'text-white/70')}>This removes the round and all of its layers for everyone. It cannot be undone.</p>
                {errorMessage && <p className={cn(CONTENT_TEXT, 'text-destructive')} role="alert">{errorMessage}</p>}
            </AppDialogContent>
            <AppDialogActions>
                <Button type="button" variant="plain" className={cn(MUI_BUTTON, 'px-2')} onClick={handleClose} autoFocus disabled={isDeleting}>
                    Cancel
                </Button>
                <Button className={cn(MUI_BUTTON, 'bg-primary text-primary-foreground hover:bg-primary/90')} onClick={onOkClick} disabled={isDeleting}>
                    {
                        !isDeleting &&
                        <span>Delete</span>
                    }
                    {
                        // text-primary is the button's own fill, so the spinner is invisible while
                        // it turns. That is what CircularProgress color="primary" does on a #EAEAEA
                        // contained button today; it is not a bug to fix here.
                        isDeleting &&
                        <Spinner className="size-6 text-primary" />
                    }
                </Button>
            </AppDialogActions>
        </AppDialog>
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
