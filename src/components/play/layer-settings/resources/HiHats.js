import React from 'react'

export default function HiHats({
    fill
}) {
    return (
        <svg width={14} height={16} viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 0C6.58579 0 6.25 0.335787 6.25 0.75V2.2725C2.78 2.465 0.25 4 0.25 6C0.262343 6.38377 0.356095 6.76053 0.525046 7.10533C0.693997 7.45012 0.934288 7.75508 1.23 8C0.934166 8.24481 0.69379 8.54975 0.524828 8.89457C0.355866 9.23939 0.262184 9.6162 0.25 10C0.25 12 2.78 13.535 6.25 13.7275V15.25C6.25 15.6642 6.58579 16 7 16V16C7.41421 16 7.75 15.6642 7.75 15.25V13.7275C11.22 13.535 13.75 12 13.75 10C13.7378 9.6162 13.6441 9.23939 13.4752 8.89457C13.3062 8.54975 13.0658 8.24481 12.77 8C13.0657 7.75508 13.306 7.45012 13.475 7.10533C13.6439 6.76053 13.7377 6.38377 13.75 6C13.75 4 11.22 2.465 7.75 2.2725V0.75C7.75 0.335787 7.41421 0 7 0V0ZM12.25 10C12.25 11.0625 10 12.25 7 12.25C4 12.25 1.75 11.0625 1.75 10C1.75 9.6175 2.0425 9.22 2.5575 8.8675C3.95681 9.48036 5.47269 9.78148 7 9.75C8.52731 9.78148 10.0432 9.48036 11.4425 8.8675C11.9575 9.22 12.25 9.6175 12.25 10ZM12.25 6C12.25 7.0625 10 8.25 7 8.25C4 8.25 1.75 7.0625 1.75 6C1.75 5.0275 3.63 3.955 6.25 3.7775V5.25C6.25 5.66421 6.58579 6 7 6V6C7.41421 6 7.75 5.66421 7.75 5.25V3.7775C10.37 3.955 12.25 5.0275 12.25 6Z" fill={fill || "white"} fillOpacity="0.9" />
        </svg>
    )
}