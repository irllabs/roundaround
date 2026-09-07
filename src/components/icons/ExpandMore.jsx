import { cn } from '@/lib/utils'

export function ExpandMoreIcon({ className, ...props }) {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false" className={cn('inline-block shrink-0', className)} {...props}>
            <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
        </svg>
    )
}
