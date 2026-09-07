import { cn } from '@/lib/utils'

export function ArrowBackIcon({ className, ...props }) {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false" className={cn('inline-block shrink-0', className)} {...props}>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
    )
}
