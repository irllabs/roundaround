import React from 'react';
import _ from 'lodash'
import { AppMenu, AppMenuItem } from './AppMenu'
import TempoSlider from './TempoSlider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MoreHorizIcon, FullscreenIcon } from '@/components/icons'

export default function HeaderMenu() {
    const [open, setOpen] = React.useState(false);

    const onFullscreenClick = () => {
        var element = document.documentElement;
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement
        if (_.isNil(fullscreenElement)) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) { /* Safari */
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) { /* IE11 */
                element.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }
    }

    return (
        <div className="flex">
            <div>
                {/* aria-controls and aria-expanded are Radix's job now: PopoverTrigger writes both
                    onto whatever it is given. aria-haspopup it writes as "dialog", which is what
                    the trigger overrides here, because what opens is a menu.

                    alignOffset 5: this menu is 391px wide against a trigger 16px from the right
                    edge, so MUI never got to centre it. popper.js pushed it in from the viewport
                    instead, by its own 5px preventOverflow padding on top of the paper's 16px
                    right margin, landing the paper's right edge 5px inside the trigger's. Radix
                    has no collision to resolve at this width, so the 5px is spelled out. */}
                <AppMenu
                    open={open}
                    onOpenChange={setOpen}
                    listId="header-menu-list"
                    label="Round options"
                    align="end"
                    alignOffset={5}
                    trigger={<Button variant="plain" size="icon-round" aria-label="More options" aria-haspopup="menu"><MoreHorizIcon /></Button>}
                    listClassName="py-2"
                    footer={<TempoSlider />}
                >
                    <AppMenuItem onClick={onFullscreenClick} className="py-4">
                        <span className="inline-flex w-14 shrink-0 items-center text-foreground"><FullscreenIcon className="size-5" /></span>
                        Fullscreen
                    </AppMenuItem>
                    <Separator className="bg-white/12" />
                </AppMenu>
            </div>
        </div>
    );
}
