const express = require('express');
const Stockfish = require('stockfish');
const { Chess } = require('chess.js');

const router = express.Router();

// In-memory store for games (for demo; use DB for production)
const robotGames = {};

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
    if (game.game_over()) {
        return res.json({ fen: game.fen(), robotMove: null, gameOver: true, result: game.result() });
    }

    // Stockfish setup
    const engine = Stockfish();
    let bestMove = null;
    let resolved = false;

    engine.onmessage = function(event) {
        if (typeof event === 'string' && event.startsWith('bestmove')) {
            bestMove = event.split(' ')[1];
            if (!resolved) {
                resolved = true;
                game.move(bestMove);
                res.json({ fen: game.fen(), robotMove: bestMove, gameOver: game.game_over(), result: game.result() });
                engine.terminate && engine.terminate();
            }
        }
    };

    engine.postMessage('uci');
    engine.postMessage('ucinewgame');
    engine.postMessage('isready');
    engine.postMessage('position fen ' + game.fen());
    // Difficulty: set depth (default 10, easy 3, medium 6, hard 12)
    let depth = 10;
    if (difficulty === 'easy') depth = 3;
    else if (difficulty === 'medium') depth = 6;
    else if (difficulty === 'hard') depth = 12;
    engine.postMessage('go depth ' + depth);
});

module.exports = router; 