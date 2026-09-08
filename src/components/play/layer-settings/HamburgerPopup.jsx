import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ICON_BUTTON } from './styles'
import {
    PlusIcon,
    EqualiserIcon
} from './resources'

export default function HamburgerPopup({
    classes,
    user,
    userColors,
    showMixerPopup,
    showHamburgerPopup,
    addLayerButtonRef,
    mixerPopupButtonRef,
    toggleShowMixerPopup,
    onAddLayerClick
}) {
    return (
        <div data-test="hamburger-popup" data-open={String(showHamburgerPopup)} className={showHamburgerPopup ? classes.hamburgerPopup : classes.hidden}>
            <Button
                type="button"
                variant="plain"
                size="icon-app"
                ref={addLayerButtonRef}
                onClick={onAddLayerClick}
                className={cn(ICON_BUTTON, classes.buttonWithText)}
            >
                <p className={classes.buttonText}>Add round</p>
                <PlusIcon width={16} height={16} user={user} userColors={userColors} />
            </Button>
            <Button
                type="button"
                variant="plain"
                size="icon-app"
                ref={mixerPopupButtonRef}
                onClick={toggleShowMixerPopup}
                className={cn(ICON_BUTTON, classes.buttonWithText, showMixerPopup && 'bg-white/20')}
            >
                <p className={classes.buttonText}>Mixer</p>
                <EqualiserIcon width={12} height={16} user={user} userColors={userColors} />
            </Button>
        </div>
    )
}
