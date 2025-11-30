import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export function ChessBoard({ socket, roomId, role, fen }) {
    const [game, setGame] = useState(fen ? new Chess(fen) : new Chess());

    // Update local game state when FEN changes from server
    React.useEffect(() => {
        if (fen) {
            const newGame = new Chess(fen);
            setGame(newGame);
        }
    }, [fen]);

    function onDrop(sourceSquare, targetSquare) {
        console.log('onDrop called:', sourceSquare, targetSquare, 'Role:', role);
        if (role === 'spectator') return false;

        // Validation: Prevent moving if it's not my turn or not my piece
        if ((game.turn() === 'w' && role !== 'white') || (game.turn() === 'b' && role !== 'black')) {
            console.warn('Attempted to move opponent piece or out of turn');
            return false;
        }

        try {
            const move = {
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            };

            console.log('Attempting move:', move);
            let result = null;

            // Safe mutation
            const gameCopy = new Chess(game.fen());
            try {
                result = gameCopy.move(move);
            } catch (err) {
                console.error('Chess.js move error:', err);
                return false;
            }

            if (!result) {
                console.error('Move failed (illegal):', move);
                return false;
            }

            console.log('Move successful:', result);
            setGame(gameCopy);
            socket.emit('makeMove', { roomId, move });
            return true;
        } catch (e) {
            console.error('General move error:', e);
            return false;
        }
    }

    console.log('Current FEN:', game.fen());

    // Calculate custom square styles for check highlight
    const customSquareStyles = {};
    if (game.inCheck()) {
        const turn = game.turn(); // 'w' or 'b'
        // Find the king's square
        let kingSquare = null;
        game.board().forEach((row, rowIndex) => {
            row.forEach((piece, colIndex) => {
                if (piece && piece.type === 'k' && piece.color === turn) {
                    const file = String.fromCharCode('a'.charCodeAt(0) + colIndex);
                    const rank = 8 - rowIndex;
                    kingSquare = `${file}${rank}`;
                }
            });
        });

        if (kingSquare) {
            customSquareStyles[kingSquare] = {
                boxShadow: 'inset 0 0 10px 4px rgba(255, 0, 0, 0.8)',
                background: 'radial-gradient(circle, rgba(255,0,0,0.4) 0%, rgba(255,0,0,0) 70%)'
            };
        }
    }

    return (
        <div className="w-full h-full flex items-center justify-center" style={{ minWidth: '300px', minHeight: '300px' }}>
            <Chessboard
                id="BasicBoard"
                key={role}
                position={game.fen()}
                onPieceDrop={onDrop}
                boardOrientation={role === 'black' ? 'black' : 'white'}
                arePiecesDraggable={role === 'white' || role === 'black'}
                customBoardStyle={{
                    borderRadius: '4px',
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
                }}
                customDarkSquareStyle={{ backgroundColor: '#334155' }}
                customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
                customSquareStyles={customSquareStyles}
            />
        </div>
    );
}
