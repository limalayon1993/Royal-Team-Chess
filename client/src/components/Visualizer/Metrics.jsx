import React from 'react';

export function Metrics({ label, icon, value }) {
    return (
        <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-400">
                {icon}
                {label}
            </div>
            <span className="font-bold text-sm">{value}</span>
        </div>
    );
}
