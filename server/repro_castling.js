const { Chess } = require('chess.js');

console.log('Testing Short Castling (White)...');
const chess = new Chess();
// Clear board to set up custom position or just play moves
// e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 O-O
chess.move('e4');
chess.move('e5');
chess.move('Nf3');
chess.move('Nc6');
chess.move('Bc4');
chess.move('Bc5');

console.log('FEN before castling:', chess.fen());
console.log('Castling rights:', chess.getCastlingRights ? chess.getCastlingRights('w') : 'N/A');

// Try move object
try {
    // Test with promotion: 'q' (as currently in ChessBoard.jsx)
    const move = { from: 'e1', to: 'g1', promotion: 'q' };
    const result = chess.move(move);
    if (result) {
        console.log('Castling (e1-g1) with promotion:q SUCCESS:', result.san);
    } else {
        console.log('Castling (e1-g1) with promotion:q FAILED');
    }
} catch (e) {
    console.log('Castling (e1-g1) with promotion:q THREW:', e.message);
}

console.log('FEN after castling:', chess.fen());

console.log('\nTesting Drag to Rook (e1-h1) behavior...');
const chess2 = new Chess();
chess2.move('e4');
chess2.move('e5');
chess2.move('Nf3');
chess2.move('Nc6');
chess2.move('Bc4');
chess2.move('Bc5');

try {
    const move = { from: 'e1', to: 'h1' }; // Drag to rook
    const result = chess2.move(move);
    if (result) {
        console.log('Drag to Rook (e1-h1) SUCCESS:', result.san);
    } else {
        console.log('Drag to Rook (e1-h1) FAILED (Expected behavior for chess.js)');
    }
} catch (e) {
    console.log('Drag to Rook (e1-h1) THREW:', e.message);
}

console.log('\nTesting En Passant...');
const chess3 = new Chess();
chess3.move('e4');
chess3.move('a6'); // black waits
chess3.move('e5');
chess3.move('d5'); // En passant target created

console.log('FEN before EP:', chess3.fen());

try {
    // White pawn on e5 captures d5 pawn by moving to d6
    const move = { from: 'e5', to: 'd6', promotion: 'q' };
    const result = chess3.move(move);
    if (result) {
        console.log('En Passant (e5-d6) with promotion:q SUCCESS:', result.san);
    } else {
        console.log('En Passant (e5-d6) with promotion:q FAILED');
    }
} catch (e) {
    console.log('En Passant (e5-d6) with promotion:q THREW:', e.message);
}
