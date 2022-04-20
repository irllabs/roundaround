import React from 'react'

export default function Custom({
    fill
}) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M7.99963 9C6.34278 9 4.99963 7.65685 4.99963 6C4.99963 4.34315 6.34278 3 7.99963 3C9.65649 3 10.9996 4.34315 10.9996 6C10.9996 7.65685 9.65649 9 7.99963 9ZM7.99963 7.5C8.82806 7.5 9.49963 6.82843 9.49963 6C9.49963 5.17157 8.82806 4.5 7.99963 4.5C7.17121 4.5 6.49963 5.17157 6.49963 6C6.49963 6.82843 7.17121 7.5 7.99963 7.5Z" fill={fill || "white"} />
            <path fillRule="evenodd" clipRule="evenodd" d="M3.00577 14.25C1.17354 12.784 0 10.529 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8C16 10.5294 14.8261 12.7846 12.9935 14.2506C11.6249 15.3454 9.88888 16 8 16C6.34315 16 4.80393 15.4963 3.52712 14.6337C3.34805 14.5127 3.17413 14.3847 3.00577 14.25ZM12.7504 12.4367C13.8357 11.2751 14.5 9.71513 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 9.71485 2.16407 11.2746 3.24908 12.4361C3.90562 10.4406 5.78439 9 7.99963 9C10.2151 9 12.094 10.4409 12.7504 12.4367ZM11.4643 13.5009C11.2221 11.8043 9.76317 10.5 7.99963 10.5C6.23624 10.5 4.77744 11.8041 4.53502 13.5004C5.50488 14.1127 6.64793 14.4755 7.87408 14.4988C7.91596 14.4996 7.95793 14.5 8 14.5C8.05606 14.5 8.11196 14.4993 8.16768 14.4979C9.37773 14.4672 10.5056 14.1059 11.4643 13.5009Z" fill={fill || "white"} />
        </svg>
    )
}