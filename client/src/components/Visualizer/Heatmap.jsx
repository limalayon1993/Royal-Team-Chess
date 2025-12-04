import React from 'react';

export function Heatmap({ data, orientation = 'white' }) {
    if (!data) return <div className="text-slate-500">Waiting for game data...</div>;

    const getHeatmapCell = (w, b, r, c) => {
        const total = w + b;
        if (total === 0) {
            const isDark = (r + c) % 2 === 1;
            const bgColor = isDark ? '#1e293b' : '#334155';
            return { bg: bgColor, border: 'none', content: null };
        }

        let bg, border, content;
        const intensity = Math.min(total / 4, 1);

        if (w > 0 && b > 0) {
            // *** ZONA DE CONFLICTO ***
            border = '3px solid #ffffff';
            const diff = w - b;

            if (diff === 0) {
                // EMPATE: AMARILLO
                // Más intensidad (piezas) = Más oscuro/dorado
                const light = 50 - (intensity * 15);
                bg = `hsla(48, 95%, ${light}%, 0.9)`;

                // Empate: Tamaños iguales
                content = (
                    <div className="flex gap-0.5 items-center justify-center font-bold drop-shadow-md">
                        <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] text-xs font-black">{w}</span>
                        <span className="text-[8px] text-black/50">:</span>
                        <span className="text-black text-xs font-black">{b}</span>
                    </div>
                );
            } else if (diff > 0) {
                // GANA BLANCA (PÚRPURA -> AZUL)
                const hue = Math.max(270 - (diff * 10), 250);
                bg = `hsla(${hue}, 85%, 55%, 0.9)`;

                content = (
                    <div className="flex gap-0.5 items-center justify-center font-bold drop-shadow-md">
                        <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] text-sm font-black">{w}</span>
                        <span className="text-[8px] opacity-70 text-white">:</span>
                        <span className="text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.9)] text-[10px] opacity-80 font-black">{b}</span>
                    </div>
                );
            } else {
                // GANA NEGRA (PÚRPURA -> ROJO)
                const absDiff = Math.abs(diff);
                const hue = Math.min(270 + (absDiff * 15), 350);
                const light = Math.max(45 - (absDiff * 5), 25);
                bg = `hsla(${hue}, 95%, ${light}%, 0.95)`;

                content = (
                    <div className="flex gap-0.5 items-center justify-center font-bold drop-shadow-md">
                        <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] text-[10px] opacity-80 font-black">{w}</span>
                        <span className="text-[8px] opacity-70 text-white">:</span>
                        <span className="text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.9)] text-sm font-black">{b}</span>
                    </div>
                );
            }

        } else if (w > 0) {
            // *** DOMINIO BLANCO (AZUL) ***
            const light = 65 - (intensity * 25);
            bg = `hsla(220, 95%, ${light}%, 0.9)`;
            border = 'none';
            content = <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] text-sm font-extrabold">{w}</span>;

        } else {
            // *** DOMINIO NEGRO (ROJO) ***
            const light = 60 - (intensity * 25);
            bg = `hsla(0, 90%, ${light}%, 0.95)`;
            border = 'none';
            content = <span className="text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.9)] text-sm font-extrabold">{b}</span>;
        }

        return { bg, border, content };
    };

    // Handle orientation: If black, we need to reverse rows and columns
    // Data comes as [row0, row1, ... row7] where row0 is rank 8 (top)
    // If White: Top is Rank 8.
    // If Black: Top should be Rank 1. So we reverse the rows, and reverse the cells in each row.
    let displayData = data;
    if (orientation === 'black') {
        displayData = [...data].reverse().map(row => [...row].reverse());
    }

    return (
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-0.5 bg-slate-700 p-0.5 rounded overflow-hidden">
            {displayData.map((row, r) => (
                row.map((cell, c) => {
                    const { bg, border, content } = getHeatmapCell(cell.w, cell.b, r, c);

                    return (
                        <div
                            key={`${r}-${c}`}
                            className="flex items-center justify-center transition-colors duration-300 relative"
                            style={{ backgroundColor: bg, border: border }}
                        >
                            {content}
                        </div>
                    );
                })
            ))}
        </div>
    );
}

