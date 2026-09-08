import * as React from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowBackIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * MUI's Dialog paper: elevation 24, shrink-to-fit up to the sm breakpoint, 32px away from the edges.
 *
 * The max-width is spelled twice on purpose. The generated DialogContent carries `sm:max-w-sm`,
 * and tailwind-merge treats a variant-prefixed utility as its own group, so an unprefixed
 * `max-w-*` does not replace it -- it only wins below 500px, and `sm:max-w-sm` is emitted later
 * in the sheet. Left alone it caps every dialog at 24rem/384px from the sm breakpoint up, which
 * is every capture width; screen 02's paper measures 472px. The `sm:` copy here is in the same
 * group as `sm:max-w-sm` and does replace it.
 *
 * `inset-0 m-auto h-fit w-fit translate-x-0 translate-y-0` replaces the generated
 * `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`, and tailwind-merge drops those four.
 * MUI centres the paper with flexbox, so it lands on a fractional layout position that Chrome
 * pixel-snaps as it paints. A -50% translate does not snap: the box is laid out on an integer
 * and then shifted half its own height, so the whole layer rasterises off the pixel grid and
 * every edge antialiases and every glyph softens. Centring by layout puts the fractional
 * position back in the layout, where it snaps. `w-fit`, not `w-auto`: with left and right both
 * 0 an auto width fills instead of shrinking to fit, and the paper's width is what makes screen
 * 02 472px. `h-fit` keeps `max-h` and `overflow-y-auto` scrolling a tall dialog.
 */
const PAPER = 'block inset-0 m-auto h-fit w-fit translate-x-0 translate-y-0 max-w-[min(500px,calc(100%-64px))] sm:max-w-[min(500px,calc(100%-64px))] max-h-[calc(100%-64px)] overflow-y-auto gap-0 rounded-lg bg-popover p-0 text-sm text-popover-foreground ring-0 shadow-[0px_11px_15px_-7px_rgba(0,0,0,0.2),0px_24px_38px_3px_rgba(0,0,0,0.14),0px_9px_46px_8px_rgba(0,0,0,0.12)]'

/**
 * Who to hand focus back to, given whatever held it at the moment the dialog opened.
 *
 * Usually that is the element itself. The exception is a dialog opened from one of the app's
 * menus: Rename and Delete are opened from a menu item, and that item's own click handler closes
 * the popover and opens the dialog together, so React commits both in one pass and the item is
 * unmounted by the time the dialog closes. The close-time guard below then finds a detached node,
 * declines to focus it, and leaves focus on <body>. MUI landed on the round-name button, because
 * MUI's Menu had already returned focus to its anchor before the dialog went up.
 *
 * So a menu item is resolved to the menu's own trigger here, at capture time. Radix keeps no
 * back-reference from a popover's content to its trigger; what it does keep is `aria-controls` on
 * the trigger, holding the content's id -- and only while the popover is open, which is exactly
 * now: this runs during the render that closes it, so the DOM is still the previous commit's.
 * If that lookup finds nothing the element itself is used, which is what the old code did.
 */
function openerFor(active) {
    if (!active || active === document.body || !active.closest) return active
    const popover = active.closest('[data-slot="popover-content"]')
    if (!popover || !popover.id) return active
    // The id comes from Radix's useId and reads `radix-«r1»`/`radix-:r1:`, so it has to be
    // quoted in the attribute selector rather than pasted in bare.
    return document.querySelector('[aria-controls="' + popover.id + '"]') || active
}

export function AppDialog({ open, onOpenChange, titleId, title, titleClassName, onBack, backLabel = 'close', className, children }) {
    // Radix's modal DialogContent closes by calling `context.triggerRef.current?.focus()` and
    // preventDefaulting FocusScope's own restore. Every dialog in this app is opened from Redux
    // or component state rather than from a DialogTrigger, so that ref is always null and the
    // close would leave focus on <body>. MUI's Dialog hands focus back to whatever opened it, so
    // remember that element as the dialog opens and put focus back on it as the dialog closes.
    //
    // The opener is read during render rather than from onOpenAutoFocus. FocusScope only
    // dispatches its mount event when the paper does not already contain the active element
    // (`container.contains(previouslyFocusedElement)`), so a dialog whose child carries
    // autoFocus -- Rename's input, Delete's Cancel -- never fires it and would close dropping
    // focus on <body>. A layout effect does work today, because Radix's Portal defers mounting
    // the content by a commit and the effect therefore runs while the opener still has focus,
    // but that is an implementation detail of Radix's portal: a Radix bump or the React 19
    // upgrade could reorder it and the restore would silently start pointing at the dialog's own
    // control. Reading during render does not depend on it. Reopening inside the ~100ms close
    // animation can capture a node in the outgoing content, which the guards below turn into no
    // restore at all rather than a restore to something detached.
    //
    // Reading during render is also what lets `openerFor` resolve a menu item to the menu's own
    // trigger: that lookup needs the popover still open, and during this render it still is.
    const restoreFocusTo = React.useRef(null)
    const wasOpen = React.useRef(false)
    if (open && !wasOpen.current) {
        restoreFocusTo.current = openerFor(document.activeElement)
    }
    wasOpen.current = open
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                aria-labelledby={titleId}
                aria-describedby={undefined}
                // MUI's TrapFocus parks focus on the paper itself and lets a child's autoFocus
                // win; Radix's FocusScope walks to the first tabbable control, which lights up
                // the share dialog's read-only link field with the focused outline. Take the
                // paper (the FocusScope container, already tabIndex=-1) instead. Dialogs whose
                // child has autoFocus never get here at all, so they keep their own behaviour.
                onOpenAutoFocus={(event) => { event.preventDefault(); event.currentTarget.focus({ preventScroll: true }) }}
                onCloseAutoFocus={(event) => {
                    event.preventDefault()
                    const opener = restoreFocusTo.current
                    if (opener && opener !== document.body && document.contains(opener) && opener.focus) {
                        opener.focus({ preventScroll: true })
                    }
                }}
                className={cn(PAPER, className)}
            >
                {/* Not `relative`: MUI's DialogTitle is static and the back arrow is positioned
                    against the paper, 4px in and 8px down from its top-left corner. */}
                <DialogTitle id={titleId} className={cn('m-0 px-6 py-4 text-[1.25rem] font-medium leading-[1.6] tracking-[0.0075em] text-foreground', titleClassName)}>
                    {onBack && (
                        <Button type="button" variant="plain" size="icon-round" aria-label={backLabel} data-test="dialog-back" className="absolute left-1 top-2" onClick={onBack}>
                            <ArrowBackIcon />
                        </Button>
                    )}
                    {title}
                </DialogTitle>
                {children}
            </DialogContent>
        </Dialog>
    )
}

/** The sign-in and share dialogs' body: 1rem of padding under a white-at-10% rule. */
export function AppDialogBody({ className, ...props }) {
    return <div className={cn('border-t border-white/10 p-4', className)} {...props} />
}

/** MUI's DialogContent. */
export function AppDialogContent({ className, ...props }) {
    return <div className={cn('px-6 py-2', className)} {...props} />
}

/** MUI's DialogActions. */
export function AppDialogActions({ className, ...props }) {
    return <div className={cn('flex flex-none items-center justify-end p-2 [&>*+*]:ml-2', className)} {...props} />
}
