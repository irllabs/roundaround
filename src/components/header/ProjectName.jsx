import React, { useContext } from 'react';
import { connect } from "react-redux";
import _ from 'lodash'
import { useNavigate } from 'react-router-dom';
import { duplicateRound } from '../../utils/index';
import { setRounds, setIsShowingRenameDialog, setIsShowingDeleteRoundDialog, setSelectedRoundId } from '../../redux/actions';
import { FirebaseContext } from '../../firebase';
import { AppMenu, AppMenuItem } from './AppMenu'
import { MUI_BUTTON } from '@/lib/mui'
import { Button } from '@/components/ui/button'
import { ExpandMoreIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

function ProjectName({ name, setIsShowingRenameDialog, setIsShowingDeleteRoundDialog, round, rounds, user, setRounds, setSelectedRoundId }) {
    const navigate = useNavigate();
    const [open, setOpen] = React.useState(false);
    const firebase = useContext(FirebaseContext);

    const onRenameClick = () => {
        setOpen(false);
        setSelectedRoundId(round.id)
        setIsShowingRenameDialog(true)
    }
    const onDeleteClick = () => {
        setOpen(false)
        setSelectedRoundId(round.id)
        setIsShowingDeleteRoundDialog(true)
    }
    const onDuplicateClick = async () => {
        setOpen(false)
        if (_.isNil(round) || _.isNil(user)) {
            return
        }
        try {
            const clonedRound = duplicateRound(round, user.id)
            await firebase.createRound(clonedRound)
            setRounds([clonedRound, ...rounds])
            // open the copy; the original keeps its listeners until PlayRoute unmounts
            navigate('/play/' + clonedRound.id)
        } catch (error) {
            console.error('Could not duplicate round', error)
        }
    }

    return (
        <div className="flex">
            <div className="flex flex-col">
                {/* Opening the menu selects the round, so the rename and delete dialogs know which
                    one they are about; closing it by any route puts that back. Radix owns the
                    click-away, the Escape and the focus return the Popper needed handlers for. */}
                <AppMenu
                    open={open}
                    onOpenChange={(next) => { setOpen(next); setSelectedRoundId(next ? round.id : null) }}
                    listId="project-name-menu"
                    label="Round actions"
                    align="start"
                    contentClassName="w-[130px] max-sm:w-[100px]"
                    trigger={
                        // `shrink whitespace-normal` undoes the generated Button's `shrink-0
                        // whitespace-nowrap`, which MUI's Button had neither of. On a phone the
                        // header runs out of room and the round's name wraps onto two lines;
                        // 13-round-mobile.png photographs it wrapped.
                        <Button variant="plain" aria-haspopup="menu" className={cn(MUI_BUTTON, 'shrink gap-2 whitespace-normal pl-2 pr-1')}>
                            {name}
                            <ExpandMoreIcon className="size-5" />
                        </Button>
                    }
                >
                    <AppMenuItem onClick={onDuplicateClick}>Duplicate</AppMenuItem>
                    <AppMenuItem onClick={onRenameClick}>Rename</AppMenuItem>
                    <AppMenuItem onClick={onDeleteClick}>Delete</AppMenuItem>
                </AppMenu>
            </div>
        </div>
    );
}
const mapStateToProps = state => {
    return {
        round: state.round,
        rounds: state.rounds,
        user: state.user
    };
};

export default connect(
    mapStateToProps,
    {
        setRounds,
        setIsShowingDeleteRoundDialog,
        setIsShowingRenameDialog,
        setSelectedRoundId
    }
)(ProjectName);
