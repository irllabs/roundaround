import React, { useContext, useEffect, useState } from 'react';
import { connect } from "react-redux";
import { setRoundName, setIsShowingRenameDialog, setRounds, setDisableKeyListener } from '../../redux/actions'
import { FirebaseContext } from '../../firebase';
import { AppDialog, AppDialogActions, AppDialogContent } from './AppDialog'
import { MUI_BUTTON, MUI_PRIMARY } from '@/lib/mui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import _ from 'lodash'

function RenameDialog ({ selectedRoundId, round, rounds, setRoundName, setIsShowingRenameDialog, isShowingRenameDialog, setRounds, setDisableKeyListener }) {
    const firebase = useContext(FirebaseContext);
    const handleClose = () => {
        setIsShowingRenameDialog(false)
    }

    // The round being renamed is either the one that is open or one from the user's list.
    const isOpenRound = !_.isNil(round) && round.id === selectedRoundId
    const listedRound = _.find(rounds, { id: selectedRoundId })
    const currentName = isOpenRound ? round.name : (listedRound ? listedRound.name : '')

    // Controlled, where MUI's TextField was uncontrolled behind an inputRef: the generated Input
    // is a plain function component and cannot take a ref on React 18. The effect is what the
    // old `key={selectedRoundId}` plus defaultValue did -- seed the box from the round being
    // renamed each time the dialog opens or the round changes -- without throwing the DOM node
    // away. Deliberately keyed on the round and the flag rather than on currentName: a
    // collaborator renaming this round while the dialog is open would otherwise wipe whatever
    // is half typed into it.
    const [name, setName] = useState(currentName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setName(currentName) }, [selectedRoundId, isShowingRenameDialog])

    const onOkClick = () => {
        const newName = name.trim()
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

    // rounded-[32px]: this dialog never overrode Paper's radius, so it takes the MUI theme's
    // shape.borderRadius of 32. No baseline screen photographs it.
    return (
        <AppDialog open={isShowingRenameDialog} onOpenChange={(next) => { if (!next) handleClose() }} titleId="rename-dialog-title" title="Rename" className="rounded-[32px]">
            <form onSubmit={onSubmit} noValidate>
                <AppDialogContent>
                    {/* MUI's standard variant, not outlined: a 1px bottom rule at white 70% that
                        doubles and turns foreground on focus, with the label above it. */}
                    <Label htmlFor="name" className="mt-1 block text-xs font-normal text-white/70">Round name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="mb-1 h-8 w-full rounded-none border-0 border-b border-white/70 bg-transparent px-0 text-base md:text-base focus-visible:border-b-2 focus-visible:border-foreground focus-visible:ring-0" />
                </AppDialogContent>
                <AppDialogActions>
                    <Button type="button" variant="plain" className={cn(MUI_BUTTON, 'px-2')} onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button type="submit" className={cn(MUI_BUTTON, MUI_PRIMARY)}>
                        Rename
                    </Button>
                </AppDialogActions>
            </form>
        </AppDialog>
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
