import * as React from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** MUI's Paper at elevation 1, with the 8px radius the app's JSS gives all four menus. */
const PAPER = 'w-auto min-w-0 gap-0 rounded-lg bg-popover p-0 text-sm text-popover-foreground ring-0 shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]'

/**
 * MUI's Popper + Grow + ClickAwayListener + Paper + MenuList, on Radix's Popover.
 *
 * Popover, not DropdownMenu: DropdownMenu's trigger opens on pointerdown, and both capture.py
 * and anything else driving the app from script open these menus with element.click(). The
 * arrow-key roving focus that MenuList gave us is re-implemented here so the menus stay
 * keyboard-navigable.
 */
export function AppMenu({ open, onOpenChange, trigger, listId, label, align = 'center', alignOffset = 0, sideOffset = 0, contentClassName, listClassName, footer, children }) {
    const onKeyDown = (event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        const items = [...event.currentTarget.querySelectorAll('[data-menu-item]')]
        if (items.length === 0) return
        event.preventDefault()
        const at = items.indexOf(document.activeElement)
        const next =
            event.key === 'Home' ? 0 :
            event.key === 'End' ? items.length - 1 :
            event.key === 'ArrowDown' ? (at + 1) % items.length :
            (at - 1 + items.length) % items.length
        items[next].focus()
    }
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            {/* The arrow keys are handled on the content, not on the list: the items are
                tabIndex -1, so focus on open lands on the content element itself. A handler on
                the list would sit below where the keydown starts and never see it. On the
                content it fires exactly once whether the content or one of the items has
                focus. */}
            {/* `label` names the popover. Radix's PopoverContent is a `role="dialog"`, and an
                unnamed dialog is announced as nothing at all; MUI's Popper had no role to name.
                Callers pass the menu's own name ("Round options", "Account"). */}
            <PopoverContent
                side="bottom"
                align={align}
                alignOffset={alignOffset}
                sideOffset={sideOffset}
                aria-label={label}
                onKeyDown={onKeyDown}
                // Radix's FocusScope walks to the first tabbable control inside the content on
                // open, and only falls back to the content itself when it finds none. Three of
                // the four menus have none, so they land on the content by accident; the header
                // menu's footer holds the tempo slider, whose thumb is tabIndex 0, so it opened
                // with focus on the slider -- past every menu item, and on a control that takes
                // the arrow keys for itself before the roving handler above sees them. MUI's
                // TrapFocus parked focus on the MenuList, which the slider sits outside of.
                // Taking the content (already tabIndex -1, and the element the arrow keys are
                // handled on) is the same thing AppDialog does with the paper, and for the same
                // reason. It is also what keeps the tempo thumb's focus halo out of
                // 09-header-menu.png.
                onOpenAutoFocus={(event) => { event.preventDefault(); event.currentTarget.focus({ preventScroll: true }) }}
                className={cn(PAPER, contentClassName)}
            >
                <div id={listId} role="menu" className={cn('py-2', listClassName)}>
                    {children}
                </div>
                {/* Below the list, not in it. MUI's header menu puts its tempo slider after the
                    MenuList's closing tag, so the list's 8px bottom padding sits between the
                    divider and the slider; and a slider is not a menuitem, so it has no business
                    inside a role="menu" either. */}
                {footer}
            </PopoverContent>
        </Popover>
    )
}

/**
 * MUI's MenuItem: body1 at 6px/16px, 48px minimum height below the sm breakpoint and
 * content height above it. `max-sm` is 500px here, matching the theme.
 */
export const AppMenuItem = React.forwardRef(function AppMenuItem({ className, ...props }, ref) {
    return (
        <button
            ref={ref}
            type="button"
            role="menuitem"
            data-menu-item=""
            tabIndex={-1}
            className={cn(
                'flex w-full items-center overflow-hidden whitespace-nowrap px-4 py-1.5 text-left text-base leading-6 tracking-[0.00938em] text-foreground outline-none hover:bg-white/8 focus-visible:bg-white/8 max-sm:min-h-12',
                className
            )}
            {...props}
        />
    )
})
