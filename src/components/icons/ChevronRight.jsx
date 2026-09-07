import { cn } from '@/lib/utils'

export function ChevronRightIcon({ className, ...props }) {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false" className={cn('inline-block shrink-0', className)} {...props}>
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
    )
}
