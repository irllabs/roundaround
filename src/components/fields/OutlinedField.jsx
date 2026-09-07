import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * A text field that looks like MUI's outlined TextField: 8px radius, 56px tall, the label
 * sitting on the border in 12px muted text, a white-at-35% outline that turns to the
 * foreground colour on focus. onChange receives the native event.
 */
export function OutlinedField({ id, label, value, onChange, type = 'text', placeholder, autoFocus, disabled, error = false, helperText, className, inputProps = {} }) {
    const helperId = helperText ? `${id}-helper` : undefined
    return (
        <div className={cn('relative w-full', className)}>
            <label htmlFor={id} className={cn('absolute -top-2 left-3 bg-input px-1 text-xs leading-4', error ? 'text-destructive' : 'text-muted-foreground')}>{label}</label>
            {/* md:text-base and focus-visible:border-destructive are spelled out below to beat the
                generated Input's own md:text-sm and focus-visible:border-ring, which the class
                merge would otherwise leave standing: MUI's InputBase is 16px at every width, and a
                field that is wrong stays red while it has the caret. */}
            <Input
                {...inputProps}
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                disabled={disabled}
                aria-invalid={error || undefined}
                aria-describedby={helperId}
                className={cn('h-14 rounded-lg border bg-input px-4 text-base md:text-base text-foreground shadow-none', error ? 'border-destructive focus-visible:border-destructive' : 'border-white/35 focus-visible:border-foreground', 'focus-visible:ring-0 aria-invalid:ring-0', inputProps.className)}
            />
            {helperText && <p id={helperId} className={cn('mt-1 px-3 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>{helperText}</p>}
        </div>
    )
}
