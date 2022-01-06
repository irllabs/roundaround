import React from 'react'

export default function Snare({
    fill
}) {
    return (
        <svg width={14} height={16} viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.70193 0.565498L7.56364 5.3926C7.81348 5.70489 7.76285 6.16059 7.45055 6.41042C7.13826 6.66026 6.68256 6.60963 6.43272 6.29733L2.57101 1.47023C2.32118 1.15794 2.37181 0.702246 2.68411 0.452411C2.9964 0.202575 3.45209 0.253206 3.70193 0.565498Z" fill={fill || "white"} fillOpacity="0.9" />
            <path fillRule="evenodd" clipRule="evenodd" d="M0 6.08741H0.0193176C0.143768 5.18827 0.964584 4.49135 2.15778 4.00684C2.43239 3.89532 2.744 3.99047 2.92781 4.22298C3.24007 4.61798 3.04482 5.20214 2.58235 5.40125C1.84851 5.71721 1.44827 6.0699 1.44827 6.32879C1.44827 6.925 3.55551 8.01845 7 8.01845C10.4445 8.01845 12.5517 6.925 12.5517 6.32879C12.5517 5.86802 11.3269 5.13238 9.2215 4.80608C9.02505 4.77564 8.84477 4.67553 8.72058 4.5203C8.30902 4.00585 8.69315 3.26327 9.34499 3.35888C11.7705 3.71463 13.7835 4.63599 13.9807 6.08741L14 6.81155V12.3633C14 14.4222 10.4783 15.5012 7 15.5012C3.52173 15.5012 0 14.4222 0 12.3633V6.08741ZM12.5517 12.3633V8.31534C11.7942 8.71685 10.9805 9.00167 10.1379 9.16017V13.7053C11.6755 13.3288 12.5517 12.7471 12.5517 12.3633ZM8.68965 13.966V9.37983C8.12828 9.4375 7.56433 9.4665 7 9.46672C6.43567 9.4665 5.87172 9.4375 5.31035 9.37983V13.966C6.43324 14.0923 7.56676 14.0923 8.68965 13.966ZM3.86208 13.7053V9.16017C3.01953 9.00167 2.20576 8.71685 1.44827 8.31534V12.3633C1.44827 12.7471 2.32448 13.3288 3.86208 13.7053Z" fill={fill || "white"} fillOpacity="0.9" />
        </svg>
    )
}