import React, { Component } from 'react'
import { connect } from "react-redux";
import _ from 'lodash';
import {
    setRounds, setIsShowingDeleteRoundDialog, setIsShowingRenameDialog, setSelectedRoundId
} from '../../redux/actions'
import { createRound, duplicateRound } from '../../utils/index'
import { FirebaseContext } from '../../firebase';
import { AppMenu, AppMenuItem } from '../header/AppMenu'
import { MUI_BUTTON, MUI_SECONDARY } from '@/lib/mui'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AddIcon, ImageIcon, MoreHorizIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

class RoundsListRoute extends Component {
    static contextType = FirebaseContext;
    constructor(props) {
        super(props);
        // One id, not an anchor element and a flag: each row owns an AppMenu, and the open one is
        // the row whose id this holds. Radix anchors the popover on its own trigger.
        this.state = {
            openRoundId: null
        }
        this.onNewRoundClick = this.onNewRoundClick.bind(this)
        this.onLaunchRoundClick = this.onLaunchRoundClick.bind(this)
    }

    async onNewRoundClick() {
        let newRound = await createRound(this.props.user.id)
        let newRounds = [newRound, ...this.props.rounds]
        await this.context.createRound(newRound)
        this.props.setRounds(newRounds)
        // redirect to new round
        this.onLaunchRoundClick(newRound.id)
    }

    onLaunchRoundClick(id) {
        this.props.history.push('/play/' + id)
    }

    getCreatedString(round) {
        const date = new Date(round.createdAt)
        let dateString = date.toLocaleTimeString(
            'en-gb',
            {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }
        )
        return dateString
    }

    onRenameClick = () => {
        this.setState({
            openRoundId: null
        })
        this.props.setIsShowingRenameDialog(true)
    }
    onDuplicateClick = async () => {
        this.setState({
            openRoundId: null
        })
        try {
            const selectedRound = await this.context.getRound(this.props.selectedRoundId)
            if (_.isNil(selectedRound)) {
                return
            }
            const clonedRound = duplicateRound(selectedRound, this.props.user.id)
            await this.context.createRound(clonedRound)
            this.props.setRounds([clonedRound, ...this.props.rounds])
        } catch (error) {
            console.error('Could not duplicate round', error)
        }
    }
    onDeleteClick = () => {
        this.setState({
            openRoundId: null
        })
        this.props.setIsShowingDeleteRoundDialog(true)
    }

    render() {
        const rounds = [...this.props.rounds];
        return (
            <>
                {/* MUI's Container at maxWidth="lg" (1200px in this theme) with the JSS root's
                    64px of head room under the fixed header. `sm:px-6` is the theme's 500px
                    breakpoint, which src/index.css already defines. */}
                <div className="mx-auto w-full max-w-[1200px] px-4 pt-16 sm:px-6">
                    <div className="flex w-full items-center justify-between">
                        {/* The browser's own h1 over the 14px body font: 28px on 40px lines with
                            an 18.76px margin. Spelled out so PR 3 can drop CssBaseline without
                            moving the heading. */}
                        <div><h1 className="my-[18.76px] text-[28px] font-bold leading-[1.43]">My rounds</h1></div>
                        <div>
                            {/* MUI's contained secondary with a startIcon: the fill and the
                                hover come from MUI_SECONDARY, and the button adds the startIcon's
                                geometry -- the icon's -4px left margin folded into `pl-3` and its
                                8px right margin into `gap-2`, over the pill's own 6px/16px. The 20px of a medium
                                SvgIcon is spelled on the icon itself, not as `[&_svg]:size-5` on
                                the button: the generated Button already carries
                                `[&_svg:not([class*='size-'])]:size-4`, and :not() takes its
                                argument's specificity, so that attribute selector outranks a bare
                                `[&_svg]:` variant and the plus came out 16px -- which the shrink-
                                to-fit pill then wore as a 4px-narrower left edge (x 1103 against
                                the baseline's 1099). */}
                            <Button data-test="button-new-round" onClick={this.onNewRoundClick} className={cn(MUI_BUTTON, MUI_SECONDARY, 'gap-2 pl-3 pr-4')}>
                                <AddIcon className="size-5" />New round
                            </Button>
                        </div>
                    </div>
                    <div>
                        {/* MUI's List: 8px of vertical padding and no bullets. `m-0 list-none
                            px-0` restates Tailwind preflight's own list reset, so the rows keep
                            their spacing whatever PR 3 does to the base layer. */}
                        <ul className="relative m-0 list-none px-0 py-2">
                            {rounds.map((round) => (
                                <li key={round.id} className="relative">
                                    {/* MUI rendered the row as a ButtonBase div with role="button";
                                        a real <button> is the same box and the same hover, and it
                                        keeps `data-test=list-item-round` on the element Cypress and
                                        capture.py click. ListItem is 8px/16px, plus the 48px of
                                        right padding it takes on when it has a secondary action. */}
                                    <button
                                        type="button"
                                        data-test="list-item-round"
                                        onClick={this.onLaunchRoundClick.bind(this, round.id)}
                                        // focus-visible is MUI's ButtonBase focusVisible tint on a
                                        // ListItem: action.selected, rgba(255,255,255,0.16).
                                        className="flex w-full items-center justify-start px-4 py-2 pr-12 text-left hover:bg-white/8 focus-visible:bg-white/16"
                                    >
                                        {/* ListItemAvatar: 56px of gutter around a 40px avatar. */}
                                        <span className="w-14 shrink-0">
                                            {/* `after:hidden` drops the generated Avatar's ring;
                                                MUI's has none. The glyph is background.default
                                                #303030, which the theme never overrides -- not
                                                --background (#1b1b1b), which is the app's own body
                                                colour and 21/255 away from what 12-rounds-list.png
                                                photographs inside the circle. */}
                                            <Avatar className="size-10 after:hidden">
                                                <AvatarFallback className="bg-[#757575] text-[#303030]"><ImageIcon className="size-6" /></AvatarFallback>
                                            </Avatar>
                                        </span>
                                        {/* ListItemText with both lines present: 6px of vertical
                                            margin, body1 over body2 at 70% white. */}
                                        <span className="my-1.5 min-w-0 flex-auto">
                                            <span className="block text-base leading-6 tracking-[0.00938em]">{round.name}</span>
                                            <span className="block text-sm leading-[1.43] tracking-[0.01071em] text-white/70">{this.getCreatedString(round)}</span>
                                        </span>
                                    </button>
                                    {/* ListItemSecondaryAction. */}
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {/* Opening the menu selects the round so the rename and
                                            delete dialogs know which one they are about; closing it
                                            by any route puts that back. No `alignOffset`: this
                                            menu's JSS, unlike the three in the header, sets no
                                            right margin on its paper, so MUI's default `bottom`
                                            placement centred it on the trigger -- and floating-ui
                                            ignores an offset on the alignment axis when there is
                                            no alignment, which is what align="center" is. */}
                                        <AppMenu
                                            open={this.state.openRoundId === round.id}
                                            onOpenChange={(next) => { this.setState({ openRoundId: next ? round.id : null }); this.props.setSelectedRoundId(next ? round.id : null) }}
                                            listId="menu-list-grow"
                                            label="Round options"
                                            align="center"
                                            trigger={<Button variant="plain" size="icon-round" aria-haspopup="menu" aria-label="Round options"><MoreHorizIcon /></Button>}
                                        >
                                            <AppMenuItem onClick={this.onRenameClick}>Rename</AppMenuItem>
                                            <AppMenuItem onClick={this.onDuplicateClick}>Duplicate</AppMenuItem>
                                            <AppMenuItem onClick={this.onDeleteClick}>Delete</AppMenuItem>
                                        </AppMenu>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </>
        )
    }
}

const mapStateToProps = state => {
    return {
        user: state.user,
        rounds: state.rounds,
        selectedRoundId: state.display.selectedRoundId
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
)(RoundsListRoute);
