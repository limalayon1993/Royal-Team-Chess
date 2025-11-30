const { Chess } = require('chess.js');

class Heatmap {
    constructor() {
        this.grid = Array(8).fill(null).map(() =>
            Array(8).fill(null).map(() => ({ w: 0, b: 0 }))
        );
        this.kingStatus = { w: { status: 'safe', isCastled: false }, b: { status: 'safe', isCastled: false } };
    }

    update(fen) {
        const game = new Chess(fen);
        const board = game.board(); // 8x8 array of { type, color } or null

        // Reset grid
        this.grid = Array(8).fill(null).map(() =>
            Array(8).fill(null).map(() => ({ w: 0, b: 0 }))
        );

        // Helper to check if coordinate is on board
        const isValid = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

        let wKingPos = null;
        let bKingPos = null;

        // Iterate all squares
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                const colorKey = piece.color; // 'w' or 'b'
                const isWhite = colorKey === 'w';

                // Track Kings
                if (piece.type === 'k') {
                    if (isWhite) wKingPos = { r, c };
                    else bKingPos = { r, c };
                }

                // Logic per piece type
                if (piece.type === 'p') {
                    // Pawns attack diagonals
                    // Note: Chess.js board[0][0] is a8. 
                    // White pawns move UP (decreasing row index). Black pawns move DOWN (increasing row index).
                    const direction = isWhite ? -1 : 1;
                    [[r + direction, c - 1], [r + direction, c + 1]].forEach(([tr, tc]) => {
                        if (isValid(tr, tc)) this.grid[tr][tc][colorKey]++;
                    });
                } else if (piece.type === 'n') {
                    // Knight moves
                    const moves = [
                        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                        [1, -2], [1, 2], [2, -1], [2, 1]
                    ];
                    moves.forEach(([dr, dc]) => {
                        const tr = r + dr, tc = c + dc;
                        if (isValid(tr, tc)) this.grid[tr][tc][colorKey]++;
                    });
                } else if (piece.type === 'k') {
                    // King moves
                    const moves = [
                        [-1, -1], [-1, 0], [-1, 1],
                        [0, -1], [0, 1],
                        [1, -1], [1, 0], [1, 1]
                    ];
                    moves.forEach(([dr, dc]) => {
                        const tr = r + dr, tc = c + dc;
                        if (isValid(tr, tc)) this.grid[tr][tc][colorKey]++;
                    });
                } else {
                    // Sliding pieces (r, b, q)
                    const directions = [];
                    if (piece.type === 'r' || piece.type === 'q') {
                        directions.push([-1, 0], [1, 0], [0, -1], [0, 1]); // Orthogonal
                    }
                    if (piece.type === 'b' || piece.type === 'q') {
                        directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]); // Diagonal
                    }

                    directions.forEach(([dr, dc]) => {
                        let tr = r + dr;
                        let tc = c + dc;

                        while (isValid(tr, tc)) {
                            // Add pressure
                            this.grid[tr][tc][colorKey]++;

                            const target = board[tr][tc];
                            if (target) {
                                // Hit a piece
                                if (target.color !== piece.color) {
                                    // Enemy piece: Break (standard chess rules, ray stops at capture)
                                    break;
                                } else {
                                    // Friendly piece: Check if it allows X-Ray (Battery)
                                    // Matches visualizador de partida.html logic
                                    const isDiagonal = Math.abs(dr) === 1 && Math.abs(dc) === 1;
                                    const isStraight = !isDiagonal;

                                    let isCompatible = false;
                                    if (target.type === 'q') isCompatible = true;
                                    else if (isDiagonal && target.type === 'b') isCompatible = true;
                                    else if (isStraight && target.type === 'r') isCompatible = true;

                                    if (!isCompatible) {
                                        break; // Blocked by non-compatible friendly piece (e.g. Pawn)
                                    }
                                    // Else continue ray (Battery X-Ray)
                                }
                            }

                            tr += dr;
                            tc += dc;
                        }
                    });
                }
            }
        }

        // Evaluate King Safety
        const evalKing = (kingPos, color) => {
            if (!kingPos) return { status: 'danger', isCastled: false };
            const enemyColor = color === 'w' ? 'b' : 'w';

            // Direct threats (check)
            const directThreats = enemyColor === 'b' ? this.grid[kingPos.r][kingPos.c].b : this.grid[kingPos.r][kingPos.c].w;
            if (directThreats > 0) return { status: 'danger', isCastled: false };

            // Surrounding pressure
            let pressure = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = kingPos.r + dr, nc = kingPos.c + dc;
                    if (isValid(nr, nc)) pressure += enemyColor === 'b' ? this.grid[nr][nc].b : this.grid[nr][nc].w;
                }
            }
            if (pressure > 0) return { status: 'warning', isCastled: false };

            // Safe - Check Castling
            // White starts at r=7, Black at r=0.
            // Castling usually lands King at c=6 (Kingside) or c=2 (Queenside).
            const isCastlingSquare = (color === 'w' && kingPos.r === 7 && (kingPos.c === 6 || kingPos.c === 2)) ||
                (color === 'b' && kingPos.r === 0 && (kingPos.c === 6 || kingPos.c === 2));

            return { status: 'safe', isCastled: isCastlingSquare };
        };

        this.kingStatus = {
            w: evalKing(wKingPos, 'w'),
            b: evalKing(bKingPos, 'b')
        };
    }
}

module.exports = Heatmap;
