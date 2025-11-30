import React from 'react';

export function Shield({ status, isCastled }) {
    let strokeColor = "none";
    let fillColor = "currentColor";
    let className = "";

    if (status === 'safe') {
        if (isCastled) {
            className = "text-emerald-500";
        } else {
            className = "text-emerald-500";
            strokeColor = "#ef4444";
        }
    } else if (status === 'warning') {
        className = "text-orange-400";
    } else {
        className = "text-red-600 animate-pulse-fast";
    }

    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth={status === 'safe' && !isCastled ? "2" : "0"} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            {status === 'safe' && <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" />}
            {status !== 'safe' && <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2" />}
            {status !== 'safe' && <line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2" />}
        </svg>
    );
}
