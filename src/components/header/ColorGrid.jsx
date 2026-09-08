import { Colors } from '../../utils/constants'
import { cn } from '@/lib/utils'

/** One literal Tailwind class per user colour; `Colors` is the source of truth for the order. */
export const SWATCH_CLASS = {
    '#f44336': 'bg-[#f44336]', '#e91e63': 'bg-[#e91e63]', '#9c27b0': 'bg-[#9c27b0]',
    '#673ab7': 'bg-[#673ab7]', '#3f51b5': 'bg-[#3f51b5]', '#2196f3': 'bg-[#2196f3]',
    '#00bcd4': 'bg-[#00bcd4]', '#009688': 'bg-[#009688]', '#4caf50': 'bg-[#4caf50]',
    '#8bc34a': 'bg-[#8bc34a]', '#cddc39': 'bg-[#cddc39]', '#ffeb3b': 'bg-[#ffeb3b]',
    '#ffc107': 'bg-[#ffc107]', '#ff9800': 'bg-[#ff9800]', '#ff5722': 'bg-[#ff5722]'
}

/**
 * react-color's CirclePicker, in Tailwind: 28px circles on a 42px pitch inside a 252px box with
 * 1rem of padding, and the -14px right margin that pulls the wrapper's margin box back to the
 * 238px the avatar menu is wide. The `circle-picker` class and the `title` attributes are kept
 * because docs/ui-baseline/capture.py forces the guest colour through them.
 */
export function ColorGrid({ onChange, className }) {
    return (
        <div className={cn('circle-picker -mb-[14px] -mr-[14px] flex w-[252px] flex-wrap p-4', className)}>
            {Colors.map((hex) => (
                <button
                    key={hex}
                    type="button"
                    title={hex}
                    aria-label={hex}
                    onClick={() => onChange({ hex })}
                    className={cn('mb-[14px] mr-[14px] size-7 rounded-full outline-none transition-transform hover:scale-110 focus-visible:scale-110', SWATCH_CLASS[hex])}
                />
            ))}
        </div>
    )
}
