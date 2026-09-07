import * as React from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowBackIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

/** MUI's Button, which the theme's 32px radius turns into a pill. */
export const MUI_BUTTON = 'h-auto min-w-16 rounded-full border-0 px-4 py-1.5 text-sm font-medium leading-[1.75] tracking-[0.02857em] shadow-none'

/**
 * MUI's Dialog paper: elevation 24, shrink-to-fit up to the sm breakpoint, 32px away from the edges.
 *
 * The max-width is spelled twice on purpose. The generated DialogContent carries `sm:max-w-sm`,
 * and tailwind-merge treats a variant-prefixed utility as its own group, so an unprefixed
 * `max-w-*` does not replace it -- it only wins below 500px, and `sm:max-w-sm` is emitted later
 * in the sheet. Left alone it caps every dialog at 24rem/384px from the sm breakpoint up, which
 * is every capture width; screen 02's paper measures 472px. The `sm:` copy here is in the same
 * group as `sm:max-w-sm` and does replace it.
 */
const PAPER = 'block w-auto max-w-[min(500px,calc(100%-64px))] sm:max-w-[min(500px,calc(100%-64px))] max-h-[calc(100%-64px)] overflow-y-auto gap-0 rounded-lg bg-popover p-0 text-sm text-popover-foreground ring-0 shadow-[0px_11px_15px_-7px_rgba(0,0,0,0.2),0px_24px_38px_3px_rgba(0,0,0,0.14),0px_9px_46px_8px_rgba(0,0,0,0.12)]'

export function AppDialog({ open, onOpenChange, titleId, title, titleClassName, onBack, backLabel = 'close', className, children }) {
    // Radix's modal DialogContent closes by calling `context.triggerRef.current?.focus()` and
    // preventDefaulting FocusScope's own restore. Every dialog in this app is opened from Redux
    // or component state rather than from a DialogTrigger, so that ref is always null and the
    // close would leave focus on <body>. MUI's Dialog hands focus back to whatever opened it;
    // remember that element as the dialog opens (FocusScope dispatches this before it moves
    // focus) and put focus back on it as the dialog closes.
    const restoreFocusTo = React.useRef(null)
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                aria-labelledby={titleId}
                aria-describedby={undefined}
                onOpenAutoFocus={() => { restoreFocusTo.current = document.activeElement }}
                onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocusTo.current && restoreFocusTo.current.focus() }}
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
