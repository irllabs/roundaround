import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * MUI's outlined TextField: a 56px box with an 8px radius, a white-at-23% outline that goes to
 * the foreground colour on hover and focus, and a label that starts inside the box and floats
 * onto the border once the field is filled or focused. Works controlled or uncontrolled; the
 * wrapper takes the ref, which is where MUI's TextField puts one, so callers can go on reading
 * the input with `ref.current.querySelectorAll('input')[0]`. onChange gets the native event.
 *
 * forwardRef is only needed on React 18; drop it with the React 19 upgrade in PR 3.
 */
export const OutlinedField = React.forwardRef(function OutlinedField(
    { id, label, value, defaultValue, onChange, onFocus, onBlur, type = 'text', placeholder, autoFocus, disabled, error = false, helperText, className, inputProps = {}, ...rest },
    ref
) {
    const [focused, setFocused] = React.useState(false)
    const [filled, setFilled] = React.useState(() => !!(value ?? defaultValue))
    React.useEffect(() => {
        if (value !== undefined) setFilled(!!value)
    }, [value])
    const shrink = focused || filled
    const helperId = helperText ? `${id}-helper` : undefined
    return (
        <div ref={ref} className={cn('relative w-full', className)} {...rest}>
            <label
                htmlFor={id}
                className={cn(
                    'pointer-events-none absolute left-0 top-0 z-10 origin-top-left translate-x-[14px] text-base leading-none transition-transform duration-200 ease-out',
                    shrink ? '-translate-y-1.5 scale-75 px-[6.67px] bg-input' : 'translate-y-5 scale-100',
                    error ? 'text-destructive' : 'text-white/70'
                )}
            >
                {label}
            </label>
            {/* md:text-base and focus-visible:border-destructive are spelled out to beat the
                generated Input's md:text-sm and focus-visible:border-ring, which the class merge
                leaves standing: MUI's InputBase is 16px at every width, and a field that is wrong
                stays red while it has the caret. */}
            <Input
                {...inputProps}
                id={id}
                type={type}
                value={value}
                defaultValue={defaultValue}
                onChange={(event) => { setFilled(!!event.target.value); onChange && onChange(event) }}
                onFocus={(event) => { setFocused(true); onFocus && onFocus(event) }}
                onBlur={(event) => { setFocused(false); onBlur && onBlur(event) }}
                placeholder={placeholder}
                autoFocus={autoFocus}
                disabled={disabled}
                aria-invalid={error || undefined}
                aria-describedby={helperId}
                className={cn(
                    'h-14 rounded-lg border bg-input px-[14px] py-0 text-base md:text-base text-foreground shadow-none',
                    error ? 'border-destructive focus-visible:border-destructive' : 'border-white/23 hover:border-foreground focus-visible:border-foreground',
                    'focus-visible:ring-0 aria-invalid:ring-0',
                    inputProps.className
                )}
            />
            {helperText && <p id={helperId} className={cn('mt-1 px-3 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>{helperText}</p>}
        </div>
    )
})
