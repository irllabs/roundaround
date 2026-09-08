import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ICON_BUTTON } from './styles'
import {
    ErasorIcon,
    TrashIcon
} from './resources'

export default function DeleteClearPopup({
    classes,
    onClearStepsClick,
    showDeleteClearPopup,
    onDeleteLayerClick
}) {
    return (
        <div id="delete-clear-popup" data-test="delete-clear-popup" data-open={String(showDeleteClearPopup)} inert={!showDeleteClearPopup} className={showDeleteClearPopup ? classes.deleteClearPopup : classes.hidden}>
            <Button
                type="button"
                variant="plain"
                size="icon-app"
                onClick={onClearStepsClick}
                className={cn(ICON_BUTTON, classes.buttonWithText)}
            >
                <p className={classes.buttonText}>Clear</p>
                <ErasorIcon />
            </Button>
            <Button
                type="button"
                variant="plain"
                size="icon-app"
                onClick={onDeleteLayerClick}
                className={cn(ICON_BUTTON, classes.buttonWithText)}
            >
                <p className={classes.buttonText}>Delete</p>
                <TrashIcon />
            </Button>
        </div>
    )
}
