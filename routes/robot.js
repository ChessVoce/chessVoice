const express = require('express');
// const Stockfish = require('stockfish');
const { Chess } = require('chess.js');

const router = express.Router();

// In-memory store for games (for demo; use DB for production)
const robotGames = {};

// Simple chess engine that generates reasonable moves
class SimpleChessEngine {
    constructor() {
        this.pieceValues = {
            'p': 1,   // pawn
            'n': 3,   // knight
            'b': 3,   // bishop
            'r': 5,   // rook
            'q': 9,   // queen
            'k': 0    // king (infinite value, but we don't want to lose it)
        };
    }

    // Get all legal moves for a color
    getLegalMoves(game, color) {
        const moves = [];
        const board = game.board();
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece && piece.color === color) {
                    const square = String.fromCharCode(97 + j) + (8 - i);
                    const legalMoves = game.moves({ square, verbose: true });
                    moves.push(...legalMoves);
                }
            }
        }
        return moves;
    }

    // Evaluate board position (positive for white, negative for black)
    evaluatePosition(game) {
        const board = game.board();
        let score = 0;
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece) {
                    const value = this.pieceValues[piece.type];
                    if (piece.color === 'w') {
                        score += value;
                    } else {
                        score -= value;
                    }
                }
            }
        }
        return score;
    }

    // Get best move using simple evaluation
    getBestMove(game, difficulty = 'medium') {
        const color = game.turn();
        const legalMoves = this.getLegalMoves(game, color);
        
        if (legalMoves.length === 0) return null;
        
        let bestMove = null;
        let bestScore = color === 'w' ? -Infinity : Infinity;
        
        // Adjust search depth based on difficulty
        const maxDepth = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
        
        for (const move of legalMoves) {
            // Make the move
            game.move(move);
            
            // Evaluate the resulting position
            const score = this.minimax(game, maxDepth - 1, -Infinity, Infinity, color === 'w');
            
            // Undo the move
            game.undo();
            
            // Update best move
            if (color === 'w' && score > bestScore) {
                bestScore = score;
                bestMove = move;
            } else if (color === 'b' && score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    // Simple minimax with alpha-beta pruning
    minimax(game, depth, alpha, beta, maximizingPlayer) {
        if (depth === 0 || game.isGameOver()) {
            return this.evaluatePosition(game);
        }
        
        const legalMoves = this.getLegalMoves(game, game.turn());
        
        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of legalMoves) {
                game.move(move);
                const evaluation = this.minimax(game, depth - 1, alpha, beta, false);
                game.undo();
                if (evaluation > maxEval) {
                    maxEval = evaluation;
                }
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of legalMoves) {
                game.move(move);
                const evaluation = this.minimax(game, depth - 1, alpha, beta, true);
                game.undo();
                if (evaluation < minEval) {
                    minEval = evaluation;
                }
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }
}

const engine = new SimpleChessEngine();

// Start a new game with robot
router.post('/new-game', (req, res) => {
    const game = new Chess();
    const gameId = Math.random().toString(36).substr(2, 9);
    robotGames[gameId] = { game };
    res.json({ gameId, fen: game.fen() });
});

// Get robot move
router.post('/move', async (req, res) => {
    const { gameId, move, difficulty } = req.body;
    const gameData = robotGames[gameId];
    if (!gameData) return res.status(404).json({ error: 'Game not found' });
    const game = gameData.game;

    // Player move
    const playerMove = game.move(move);
    if (!playerMove) return res.status(400).json({ error: 'Invalid move' });

    // If game over after player move
    if (game.isGameOver()) {
        return res.json({ fen: game.fen(), robotMove: null, gameOver: true, result: game.result() });
    }

    // Get robot move using our simple engine
    const robotMove = engine.getBestMove(game, difficulty);
    
    if (robotMove) {
        game.move(robotMove);
    }
    
    res.json({ 
        fen: game.fen(), 
        robotMove: robotMove ? robotMove.from + robotMove.to : null, 
        gameOver: game.isGameOver(), 
        result: game.result() 
    });
});

module.exports = router; 