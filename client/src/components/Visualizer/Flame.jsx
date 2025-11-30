import React from 'react';
import { Flame as FlameIcon } from 'lucide-react';

export function Flame({ level }) {
    // Level 0: Green (Good/Fast)
    // Level 2: Red (Bad/Slow)

    const colorClass = level === 2 ? "text-red-500 animate-pulse" : "text-emerald-500";

    return (
        <div className={`flex items-center justify-center ${colorClass}`}>
            <FlameIcon size={20} fill="currentColor" />
        </div>
    );
}
