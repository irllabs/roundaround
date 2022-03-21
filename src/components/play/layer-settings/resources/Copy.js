import React from 'react'

export default function Copy({
    fill
}) {
    return (
        <svg width="19" height="22" viewBox="0 0 19 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M4.5 1.99951C4.5 0.894942 5.39543 -0.000488281 6.5 -0.000488281L16.5 -0.000488281C17.6046 -0.000488281 18.5 0.894942 18.5 1.99951L18.5 15.9995C18.5 17.1041 17.6046 17.9995 16.5 17.9995L6.5 17.9995C5.39543 17.9995 4.5 17.1041 4.5 15.9995L4.5 1.99951ZM6.5 1.99951L16.5 1.99951V15.9995L6.5 15.9995L6.5 1.99951Z" fill={fill || "white"} fill-opacity="0.9" />
            <path d="M2.5 3.99951L3.5 3.99951L3.5 5.99951L2.5 5.99951L2.5 19.9995L12.5 19.9995V18.9995H14.5V19.9995C14.5 21.1041 13.6046 21.9995 12.5 21.9995L2.5 21.9995C1.39543 21.9995 0.5 21.1041 0.5 19.9995L0.5 5.99951C0.5 4.89494 1.39543 3.99951 2.5 3.99951Z" fill={fill || "white"} fill-opacity="0.9" />
        </svg>
    )
}