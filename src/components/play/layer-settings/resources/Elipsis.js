import React from 'react'

export default function Elipsis({
    user,
    userColors,
    height,
    width
}) {
    return (
        <svg width={width || 16} height={height || 4} viewBox="0 0 16 4" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.00058 2C4.00058 3.10457 3.10513 4 2.00053 4C0.895939 4 0.000488281 3.10457 0.000488281 2C0.000488281 0.895431 0.895939 0 2.00053 0C3.10513 0 4.00058 0.895431 4.00058 2Z" fill={user && user.id && userColors[user.id]} fillOpacity="0.9" />
            <path d="M10.0007 2C10.0007 3.10457 9.10527 4 8.00067 4C6.89608 4 6.00063 3.10457 6.00063 2C6.00063 0.895431 6.89608 0 8.00067 0C9.10527 0 10.0007 0.895431 10.0007 2Z" fill={user && user.id && userColors[user.id]} fillOpacity="0.9" />
            <path d="M16.0009 2C16.0009 3.10457 15.1054 4 14.0008 4C12.8962 4 12.0008 3.10457 12.0008 2C12.0008 0.895431 12.8962 0 14.0008 0C15.1054 0 16.0009 0.895431 16.0009 2Z" fill={user && user.id && userColors[user.id]} fillOpacity="0.9" />
        </svg>
    )
}
