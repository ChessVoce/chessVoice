const express = require('express');
const Stockfish = require('stockfish.wasm');
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
    if (game.isGameOver()) {
        return res.json({ fen: game.fen(), robotMove: null, gameOver: true, result: game.result() });
    }

    // Stockfish.wasm setup
    const engine = await Stockfish();
    let bestMove = null;

    function onMessage(event) {
        if (typeof event === 'string' && event.startsWith('bestmove')) {
            bestMove = event.split(' ')[1];
        }
    }
    engine.addMessageListener(onMessage);

    await engine.postMessage('uci');
    await engine.postMessage('ucinewgame');
    await engine.postMessage('isready');
    await engine.postMessage('position fen ' + game.fen());
    // Difficulty: set depth (default 10, easy 3, medium 6, hard 12)
    let depth = 10;
    if (difficulty === 'easy') depth = 3;
    else if (difficulty === 'medium') depth = 6;
    else if (difficulty === 'hard') depth = 12;
    await engine.postMessage('go depth ' + depth);

    // Wait for bestMove
    let tries = 0;
    while (!bestMove && tries < 50) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
    }
    engine.removeMessageListener(onMessage);
    if (engine.terminate) engine.terminate();

    if (bestMove) {
        game.move({ from: bestMove.slice(0,2), to: bestMove.slice(2,4) });
    }
    res.json({ fen: game.fen(), robotMove: bestMove, gameOver: game.isGameOver(), result: game.result() });
});

module.exports = router; 