import React from 'react'

export default function Playback({ fill }) {
    return (
        <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M13.0629 5.19797C14.5728 5.92492 14.5728 8.07502 13.0629 8.80198L2.86807 13.7106C1.54022 14.35 0.000440016 13.3824 0.000440081 11.9086L0.000439556 2.09134C0.000439621 0.617593 1.54022 -0.349997 2.86807 0.289337L13.0629 5.19797ZM2.00044 11.9086L12.1953 6.99997L2.00044 2.09134L2.00044 11.9086Z" fill={fill || "white"} fillOpacity="0.9" />
        </svg>
    )
}