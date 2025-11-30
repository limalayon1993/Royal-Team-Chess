import React from 'react';

export function Thermometer({ score, orientation = 'white' }) {
    // Score: +ve = White advantage, -ve = Black advantage.
    // Range: -10 to +10 roughly.
    const clampedScore = Math.max(-10, Math.min(10, score));

    // Calculate percentage for White (0% = Full Black Adv, 100% = Full White Adv)
    // 0 score = 50%
    const whitePercentage = ((clampedScore + 10) / 20) * 100;

    // We want "My Color" at the bottom.
    // If orientation is 'white' (I am White): White is Bottom.
    // If orientation is 'black' (I am Black): Black is Bottom.

    // Let's render two bars meeting.
    // Container background: Opponent Color.
    // Foreground bar: My Color (at bottom).

    const isWhite = orientation === 'white';

    // If I am White:
    // Background (Top) is Black.
    // Bar (Bottom) is White. Height = whitePercentage%.

    // If I am Black:
    // Background (Top) is White.
    // Bar (Bottom) is Black. Height = (100 - whitePercentage)%.

    const barHeight = isWhite ? whitePercentage : (100 - whitePercentage);
    const barColor = isWhite ? 'white' : '#1a1a1a'; // Use dark gray for black to be visible on dark bg? Or just black.
    const bgColor = isWhite ? '#1a1a1a' : 'white';

    return (
        <div className="w-full h-full relative border border-slate-600 rounded-full overflow-hidden" style={{ backgroundColor: bgColor }}>
            <div
                className="absolute bottom-0 w-full transition-all duration-500 ease-out"
                style={{
                    height: `${barHeight}%`,
                    backgroundColor: barColor,
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                }}
            />
            {/* Center Marker */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-red-500/50 z-10"></div>
        </div>
    );
}
