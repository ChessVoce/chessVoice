require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://akashch347:test123456@cluster0.iweijkn.mongodb.net/chessvoice?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️  Running in offline mode - authentication features disabled');
    console.log('📝 To enable full features, check your MongoDB Atlas connection string');
});

// Add a flag to track database connection
let isDatabaseConnected = false;
mongoose.connection.on('connected', () => {
    isDatabaseConnected = true;
    app.locals.isDatabaseConnected = true;
    console.log('✅ Database connection established');
});

mongoose.connection.on('error', () => {
    isDatabaseConnected = false;
    app.locals.isDatabaseConnected = false;
    console.log('❌ Database connection failed');
});

mongoose.connection.on('disconnected', () => {
    isDatabaseConnected = false;
    app.locals.isDatabaseConnected = false;
    console.log('❌ Database disconnected');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');

// Use routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: isDatabaseConnected ? 'Connected' : 'Disconnected',
        uptime: process.uptime()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'ChessVoice Backend API',
        status: 'Running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'The requested resource was not found'
    });
});

// Import models
const Game = require('./models/Game');
const User = require('./models/User');

// Socket.IO authentication middleware
io.use(async (socket, next) => {
    try {
        // Get token from handshake auth or query
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
            // Allow connection without authentication for basic features
            return next();
        }

        // Verify JWT token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        if (decoded && decoded.userId) {
            socket.userId = decoded.userId;
        }
        
        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next();
    }
});

// Store active games
const activeGames = new Map();
const playerSockets = new Map();
const randomMatchQueue = [];

// Store active matchmaking users
const matchmakingUsers = new Map(); // userId -> { user, preferences, socketId, timestamp }
const activeMatches = new Map(); // matchId -> { player1, player2, gameId }

// Generate random 6-digit team code
function generateTeamCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Find available team code
async function findAvailableTeamCode() {
    let code;
    let attempts = 0;
    let existingGame;
    do {
        code = generateTeamCode();
        attempts++;
        // Check both active games and database
        existingGame = await Game.findOne({ teamCode: code });
        if (attempts > 100) {
            throw new Error('Unable to generate unique team code');
        }
    } while (activeGames.has(code) || existingGame);
    return code;
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new online game
    socket.on('createGame', async (playerName) => {
        try {
            const teamCode = await findAvailableTeamCode();
            
            const game = {
                teamCode,
                players: [{
                    id: socket.id,
                    name: playerName,
                    color: 'white'
                }],
                board: null, // Will be initialized when second player joins
                currentPlayer: 'white',
                moveHistory: [],
                chatMessages: [], // Add chat messages array
                gameOver: false,
                createdAt: Date.now()
            };

            activeGames.set(teamCode, game);
            playerSockets.set(socket.id, teamCode);

            socket.join(teamCode);
            socket.emit('gameCreated', { teamCode, playerColor: 'white' });
            
            console.log(`Game created: ${teamCode} by ${playerName}`);
        } catch (error) {
            console.error('Error creating game:', error);
            socket.emit('joinError', 'Failed to create game');
        }
    });

    // Join an existing game
    socket.on('joinGame', async ({ teamCode, playerName }) => {
        try {
            // Check active games first
            let game = activeGames.get(teamCode);
            
            // If not in active games, check database
            if (!game) {
                const dbGame = await Game.findOne({ teamCode, 'gameState.gameOver': false });
                if (dbGame) {
                    // Convert database game to active game format
                    game = {
                        teamCode: dbGame.teamCode,
                        players: dbGame.players.map(p => ({
                            id: p.userId.toString(),
                            name: p.username,
                            color: p.color
                        })),
                        board: dbGame.gameState.board,
                        currentPlayer: dbGame.gameState.currentPlayer,
                        moveHistory: dbGame.moves,
                        chatMessages: dbGame.chatMessages,
                        gameOver: dbGame.gameState.gameOver,
                        createdAt: dbGame.startTime
                    };
                    activeGames.set(teamCode, game);
                }
            }
            
            if (!game) {
                socket.emit('joinError', 'Game not found');
                return;
            }

            if (game.players.length >= 2) {
                socket.emit('joinError', 'Game is full');
                return;
            }

            // Add second player
            game.players.push({
                id: socket.id,
                name: playerName,
                color: 'black'
            });

            // Initialize the chess board if not already done
            if (!game.board) {
                game.board = initializeChessBoard();
            }
            
            playerSockets.set(socket.id, teamCode);
            socket.join(teamCode);

            // Add system message for player joining
            addSystemMessage(game, `${playerName} joined the game!`);

            // Notify both players that game is ready, and send their color
            for (const player of game.players) {
                io.to(player.id).emit('gameReady', {
                    players: game.players,
                    board: game.board,
                    currentPlayer: game.currentPlayer,
                    playerColor: player.color,
                    chatMessages: game.chatMessages
                });
            }

            // Add system message for game start
            addSystemMessage(game, 'Game started! White moves first.');

            console.log(`Player ${playerName} joined game ${teamCode}`);
        } catch (error) {
            console.error('Error joining game:', error);
            socket.emit('joinError', 'Failed to join game');
        }
    });

    // Handle chess moves
    socket.on('makeMove', async ({ fromRow, fromCol, toRow, toCol }) => {
        const teamCode = playerSockets.get(socket.id);
        if (!teamCode) {
            console.log('No team code found for socket:', socket.id);
            return;
        }

        const game = activeGames.get(teamCode);
        if (!game || game.gameOver) {
            console.log('Game not found or game over for team code:', teamCode);
            return;
        }

        // Find the player making the move
        const player = game.players.find(p => p.id === socket.id);
        if (!player) {
            console.log('Player not found for socket:', socket.id);
            return;
        }

        console.log(`Move attempt: ${player.name} (${player.color}) trying to move from [${fromRow},${fromCol}] to [${toRow},${toCol}]`);
        console.log(`Current player should be: ${game.currentPlayer}`);

        if (player.color !== game.currentPlayer) {
            console.log(`Turn violation: ${player.color} tried to move when it's ${game.currentPlayer}'s turn`);
            return;
        }

        // Validate and make the move
        if (isValidMove(game.board, fromRow, fromCol, toRow, toCol, game.currentPlayer)) {
            const move = {
                from: [fromRow, fromCol],
                to: [toRow, toCol],
                piece: game.board[fromRow][fromCol],
                captured: game.board[toRow][toCol],
                player: player.color
            };

            // Execute move
            game.board[toRow][toCol] = game.board[fromRow][fromCol];
            game.board[fromRow][fromCol] = null;

            // Check if a king was captured
            if (move.captured && move.captured.type === 'king') {
                game.gameOver = true;
                const winner = move.piece.color.charAt(0).toUpperCase() + move.piece.color.slice(1);
                const endReason = `${winner} wins! King captured!`;
                addSystemMessage(game, endReason);
                
                // Save game to database
                await saveGameToDatabase(game, endReason);
                
                io.to(teamCode).emit('moveMade', {
                    move,
                    board: game.board,
                    currentPlayer: game.currentPlayer,
                    gameOver: true,
                    gameEnd: endReason,
                    moveHistory: game.moveHistory
                });
                return;
            }

            // Pawn promotion
            if (move.piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
                game.board[toRow][toCol] = { type: 'queen', color: move.piece.color };
            }

            game.moveHistory.push(move);

            // Check for game end conditions BEFORE switching currentPlayer
            const gameEnd = checkGameEnd(game.board, game.currentPlayer === 'white' ? 'black' : 'white');
            // Check for insufficient material (only kings left)
            if (isInsufficientMaterial(game.board)) {
                game.gameOver = true;
                const endReason = 'Draw by insufficient material (only kings left)';
                addSystemMessage(game, endReason);
                
                // Save game to database
                await saveGameToDatabase(game, endReason);
                
                io.to(teamCode).emit('moveMade', {
                    move,
                    board: game.board,
                    currentPlayer: game.currentPlayer,
                    gameOver: true,
                    gameEnd: endReason,
                    moveHistory: game.moveHistory
                });
                return;
            }
            if (gameEnd) {
                game.gameOver = true;
                addSystemMessage(game, gameEnd);
                
                // Save game to database
                await saveGameToDatabase(game, gameEnd);
            }

            // Now switch currentPlayer
            game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';

            // Broadcast move to all players in the game
            io.to(teamCode).emit('moveMade', {
                move,
                board: game.board,
                currentPlayer: game.currentPlayer,
                gameOver: game.gameOver,
                gameEnd,
                moveHistory: game.moveHistory
            });

            // Add debug logging after every move
            console.log('[moveMade] Board after move:');
            for (let r = 0; r < 8; r++) {
                let rowStr = '';
                for (let c = 0; c < 8; c++) {
                    const p = game.board[r][c];
                    rowStr += p ? (p.color[0].toUpperCase() + p.type[0].toUpperCase()) : '__';
                    rowStr += ' ';
                }
                console.log(rowStr);
            }
            console.log('[moveMade] Move history:', game.moveHistory.map(m => m.notation || `${m.piece.type} ${m.from}->${m.to}`));

            console.log(`Move made: ${player.name} moved from [${fromRow},${fromCol}] to [${toRow},${toCol}]`);
        } else {
            console.log(`Invalid move: ${player.name} tried invalid move from [${fromRow},${fromCol}] to [${toRow},${toCol}]`);
        }
    });

    // Handle chat messages
    socket.on('sendMessage', (message) => {
        const teamCode = playerSockets.get(socket.id);
        if (!teamCode) {
            console.log('No team code found for socket:', socket.id);
            return;
        }

        const game = activeGames.get(teamCode);
        if (!game) {
            console.log('Game not found for team code:', teamCode);
            return;
        }

        // Find the player sending the message
        const player = game.players.find(p => p.id === socket.id);
        if (!player) {
            console.log('Player not found for socket:', socket.id);
            return;
        }

        // Create chat message object
        const chatMessage = {
            id: Date.now() + Math.random(),
            sender: player.name,
            senderColor: player.color,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            type: 'user'
        };

        // Add to game's chat history
        game.chatMessages.push(chatMessage);

        // Broadcast to all players in the game
        io.to(teamCode).emit('newMessage', chatMessage);
        
        console.log(`Chat message from ${player.name}: ${message}`);
    });

    // Helper function to add system messages
    function addSystemMessage(game, message) {
        // Initialize chatMessages if it doesn't exist
        if (!game.chatMessages) {
            game.chatMessages = [];
        }
        
        const systemMessage = {
            id: Date.now() + Math.random(),
            sender: 'System',
            message: message,
            timestamp: new Date().toISOString(),
            type: 'system'
        };
        
        // Ensure chatMessages is an array before pushing
        if (Array.isArray(game.chatMessages)) {
            game.chatMessages.push(systemMessage);
            io.to(game.teamCode).emit('newMessage', systemMessage);
        } else {
            console.error('chatMessages is not an array for game:', game.teamCode);
            game.chatMessages = [systemMessage];
            io.to(game.teamCode).emit('newMessage', systemMessage);
        }
    }

    // Handle disconnection
    socket.on('disconnect', () => {
        const teamCode = playerSockets.get(socket.id);
        if (teamCode) {
            const game = activeGames.get(teamCode);
            if (game) {
                // Find the player who disconnected
                const disconnectedPlayer = game.players.find(p => p.id === socket.id);
                
                // Remove player from game
                game.players = game.players.filter(p => p.id !== socket.id);
                
                if (game.players.length === 0) {
                    // No players left, remove game
                    activeGames.delete(teamCode);
                    console.log(`Game ${teamCode} removed (no players)`);
                } else {
                    // Add system message about player leaving
                    if (disconnectedPlayer) {
                        addSystemMessage(game, `${disconnectedPlayer.name} disconnected from the game`);
                    }
                    
                    // Notify remaining player
                    io.to(teamCode).emit('playerLeft', {
                        message: 'Opponent has left the game'
                    });
                }
            }
            playerSockets.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });

    // Leave game
    socket.on('leaveGame', () => {
        const teamCode = playerSockets.get(socket.id);
        if (teamCode) {
            const game = activeGames.get(teamCode);
            if (game) {
                // Find the player who is leaving
                const leavingPlayer = game.players.find(p => p.id === socket.id);
                
                socket.leave(teamCode);
                playerSockets.delete(socket.id);
                
                game.players = game.players.filter(p => p.id !== socket.id);
                
                // Add system message about player leaving
                if (leavingPlayer) {
                    addSystemMessage(game, `${leavingPlayer.name} left the game`);
                }
                
                // End the game for all remaining players
                io.to(teamCode).emit('gameEnded', {
                    message: `${leavingPlayer ? leavingPlayer.name : 'A player'} left the game. Game ended.`
                });
                
                // Remove the game from active games
                activeGames.delete(teamCode);
                
                console.log(`Game ${teamCode} ended because ${leavingPlayer ? leavingPlayer.name : 'a player'} left`);
            }
        }
    });

    // Random matchmaking events
    socket.on('startRandomMatch', async ({ preferences }) => {
        try {
            // Get user data from the session or token
            const userId = socket.userId; // This should be set during authentication
            if (!userId) {
                socket.emit('randomMatchError', 'User not authenticated');
                return;
            }

            const user = await User.findById(userId);
            if (!user) {
                socket.emit('randomMatchError', 'User not found');
                return;
            }

            // Add user to matchmaking
            addToMatchmaking(userId, user, preferences, socket.id);
            
            socket.emit('randomMatchStarted', {
                message: 'Searching for opponent...',
                preferences
            });
            
            console.log(`User ${user.username} started random match with preferences:`, preferences);
        } catch (error) {
            console.error('Error starting random match:', error);
            socket.emit('randomMatchError', 'Failed to start matchmaking');
        }
    });

    socket.on('cancelRandomMatch', async () => {
        try {
            const userId = socket.userId;
            if (userId) {
                removeFromMatchmaking(userId);
                socket.emit('randomMatchCancelled', {
                    message: 'Matchmaking cancelled'
                });
                console.log(`User ${userId} cancelled random match`);
            }
        } catch (error) {
            console.error('Error cancelling random match:', error);
        }
    });

    // Decline random match
    socket.on('declineRandomMatch', async ({ teamCode }) => {
        try {
            const game = activeGames.get(teamCode);
            if (!game || !game.isRandomMatch) {
                socket.emit('randomMatchError', 'Random match not found');
                return;
            }

            const userId = socket.userId;
            if (!userId) {
                socket.emit('randomMatchError', 'User not authenticated');
                return;
            }

            // Find the player who declined
            const decliningPlayer = game.players.find(p => p.userId === userId);
            if (!decliningPlayer) {
                socket.emit('randomMatchError', 'You are not part of this match');
                return;
            }

            // Notify the other player
            const otherPlayer = game.players.find(p => p.userId !== userId);
            if (otherPlayer && otherPlayer.id) {
                io.to(otherPlayer.id).emit('opponentDeclined', {
                    message: `${decliningPlayer.username} declined the match`
                });
            }

            // Remove the game
            activeGames.delete(teamCode);
            
            // Add the declining player back to matchmaking if they want to search again
            const user = await User.findById(userId);
            if (user) {
                // They can start a new search if they want
                socket.emit('randomMatchDeclined', {
                    message: 'Match declined successfully'
                });
            }

            console.log(`User ${decliningPlayer.username} declined random match ${teamCode}`);
        } catch (error) {
            console.error('Error declining random match:', error);
            socket.emit('randomMatchError', 'Failed to decline match');
        }
    });

    // Request matchmaking stats
    socket.on('requestMatchmakingStats', () => {
        const stats = getMatchmakingStats();
        socket.emit('matchmakingStats', stats);
    });

    // Handle joining random match
    socket.on('joinRandomMatch', async ({ teamCode }) => {
        try {
            const game = activeGames.get(teamCode);
            if (!game || !game.isRandomMatch) {
                socket.emit('joinError', 'Random match not found');
                return;
            }

            const userId = socket.userId;
            const user = await User.findById(userId);
            if (!user) {
                socket.emit('joinError', 'User not found');
                return;
            }

            // Find the player slot for this user
            const playerSlot = game.players.find(p => p.userId === userId);
            if (!playerSlot) {
                socket.emit('joinError', 'You are not part of this match');
                return;
            }

            // Mark this player as ready to connect (this replaces the old connection request system)
            playerSlot.readyToConnect = true;
            playerSlot.socketId = socket.id;
            playerSockets.set(socket.id, teamCode);
            socket.join(teamCode);

            console.log(`[SERVER] Player ${user.username} marked as ready to connect for teamCode ${teamCode}`);

            // Check if both players are ready to connect
            const bothReady = game.players.every(p => p.readyToConnect);
            
            console.log(`[SERVER] Player ${user.username} ready status:`, {
                teamCode,
                playerReady: playerSlot.readyToConnect,
                allPlayers: game.players.map(p => ({ username: p.username, ready: p.readyToConnect, socketId: p.socketId })),
                bothReady
            });
            
            if (bothReady) {
                // Both players are ready, send approval request to the other player
                const otherPlayer = game.players.find(p => p.userId !== userId);
                console.log(`[SERVER] Both players ready, other player:`, otherPlayer);
                console.log(`[SERVER] Current user ID: ${userId}, Other player user ID: ${otherPlayer?.userId}`);
                console.log(`[SERVER] Current user socket: ${socket.id}, Other player socket: ${otherPlayer?.socketId}`);
                
                if (otherPlayer && otherPlayer.socketId) {
                    console.log(`[SERVER] Sending approvalRequest to ${otherPlayer.socketId} for teamCode ${teamCode}`);
                    // Send approval request to the other player
                    io.to(otherPlayer.socketId).emit('approvalRequest', {
                        teamCode: teamCode,
                        requestingPlayer: {
                            username: user.username,
                            rating: user.rating,
                            gender: user.gender,
                            avatar: user.avatar
                        }
                    });
                    
                    // Notify the requesting player that approval request was sent
                    socket.emit('approvalRequestSent', {
                        message: 'Approval request sent to opponent. Waiting for response...'
                    });
                } else {
                    console.log(`[SERVER] Other player not found or no socketId:`, otherPlayer);
                }
            } else {
                // Wait for the other player to be ready
                socket.emit('waitingForOpponent', {
                    message: 'Waiting for opponent to be ready...'
                });
            }
        } catch (error) {
            console.error('Error joining random match:', error);
            socket.emit('joinError', 'Failed to join random match');
        }
    });

    // Handle connection request response
    socket.on('respondToConnectionRequest', async ({ teamCode, accepted }) => {
        try {
            const game = activeGames.get(teamCode);
            if (!game || !game.isRandomMatch) {
                socket.emit('randomMatchError', 'Random match not found');
                return;
            }

            const userId = socket.userId;
            const respondingPlayer = game.players.find(p => p.userId === userId);
            const requestingPlayer = game.players.find(p => p.userId !== userId);

            if (!respondingPlayer || !requestingPlayer) {
                socket.emit('randomMatchError', 'Player not found in match');
                return;
            }

            if (accepted) {
                // Player accepted the connection request
                console.log(`${respondingPlayer.username} accepted connection request from ${requestingPlayer.username}`);
                
                // Start the game
                addSystemMessage(game, 'Both players joined! Game starting...');
                for (const player of game.players) {
                    io.to(player.id).emit('gameReady', {
                        players: game.players,
                        board: game.gameState.board,
                        currentPlayer: game.gameState.currentPlayer,
                        playerColor: player.color,
                        chatMessages: game.chatMessages || [],
                        isRandomMatch: true
                    });
                }
                addSystemMessage(game, 'Game started! White moves first.');
                console.log(`Random match ${teamCode} started with both players`);
            } else {
                // Player declined the connection request
                console.log(`${respondingPlayer.username} declined connection request from ${requestingPlayer.username}`);
                
                // Notify the requesting player
                if (requestingPlayer.id) {
                    io.to(requestingPlayer.id).emit('connectionRequestDeclined', {
                        message: `${respondingPlayer.username} declined the connection request`
                    });
                }
                
                // Remove the game
                activeGames.delete(teamCode);
                
                // Remove both players from their socket rooms
                for (const player of game.players) {
                    if (player.id) {
                        const playerSocket = io.sockets.sockets.get(player.id);
                        if (playerSocket) {
                            playerSocket.leave(teamCode);
                            playerSockets.delete(player.id);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error responding to connection request:', error);
            socket.emit('randomMatchError', 'Failed to respond to connection request');
        }
    });

    // Handle connecting to random match
    socket.on('connectToRandomMatch', async ({ teamCode }) => {
        try {
            const game = activeGames.get(teamCode);
            if (!game || !game.isRandomMatch) {
                socket.emit('connectError', 'Random match not found');
                return;
            }

            const userId = socket.userId;
            const user = await User.findById(userId);
            if (!user) {
                socket.emit('connectError', 'User not found');
                return;
            }

            // Find the player slot for this user
            const playerSlot = game.players.find(p => p.userId === userId);
            if (!playerSlot) {
                socket.emit('connectError', 'You are not part of this match');
                return;
            }

            // Mark this player as ready to connect
            playerSlot.readyToConnect = true;
            playerSlot.socketId = socket.id;

            // Check if both players are ready to connect
            const bothReady = game.players.every(p => p.readyToConnect);
            
            if (bothReady) {
                // Both players are ready, send approval request to the other player
                const otherPlayer = game.players.find(p => p.userId !== userId);
                console.log(`[SERVER] Both players ready, other player:`, otherPlayer);
                console.log(`[SERVER] Current user ID: ${userId}, Other player user ID: ${otherPlayer?.userId}`);
                console.log(`[SERVER] Current user socket: ${socket.id}, Other player socket: ${otherPlayer?.socketId}`);
                
                if (otherPlayer && otherPlayer.socketId) {
                    console.log(`[SERVER] Sending approvalRequest to ${otherPlayer.socketId} for teamCode ${teamCode}`);
                    // Send approval request to the other player
                    io.to(otherPlayer.socketId).emit('approvalRequest', {
                        teamCode: teamCode,
                        requestingPlayer: {
                            username: user.username,
                            rating: user.rating,
                            gender: user.gender,
                            avatar: user.avatar
                        }
                    });
                    
                    // Notify the requesting player that approval request was sent
                    socket.emit('approvalRequestSent', {
                        message: 'Approval request sent to opponent. Waiting for response...'
                    });
                } else {
                    console.log(`[SERVER] Other player not found or no socketId:`, otherPlayer);
                }
            } else {
                // Wait for the other player to be ready
                socket.emit('waitingForOpponent', {
                    message: 'Waiting for opponent to be ready...'
                });
            }

        } catch (error) {
            console.error('Error connecting to random match:', error);
            socket.emit('connectError', 'Failed to connect to match');
        }
    });

    // Handle responding to approval request
    socket.on('respondToApprovalRequest', async ({ teamCode, accepted }) => {
        try {
            const game = activeGames.get(teamCode);
            if (!game || !game.isRandomMatch) {
                socket.emit('approvalError', 'Random match not found');
                return;
            }

            const userId = socket.userId;
            const user = await User.findById(userId);
            if (!user) {
                socket.emit('approvalError', 'User not found');
                return;
            }

            if (accepted) {
                // Both players approved, start the game
                console.log(`Random match ${teamCode} approved by both players`);
                
                // Initialize game state
                game.board = initializeChessBoard();
                game.currentPlayer = 'white';
                game.chatMessages = [];
                game.isActive = true;
                
                // Add system message
                addSystemMessage(game, 'Game started! Good luck to both players!');
                
                // Notify both players that game is starting
                game.players.forEach(player => {
                    if (player.socketId) {
                        io.to(player.socketId).emit('gameStarting', {
                            teamCode: teamCode,
                            board: game.board,
                            currentPlayer: game.currentPlayer,
                            playerColor: player.color,
                            chatMessages: game.chatMessages
                        });
                    }
                });
                
                // Remove from random match queue
                randomMatchQueue = randomMatchQueue.filter(match => match.teamCode !== teamCode);
                updateRandomMatchCount();
                
            } else {
                // Player declined, notify the other player
                const otherPlayer = game.players.find(p => p.userId !== userId);
                if (otherPlayer && otherPlayer.socketId) {
                    io.to(otherPlayer.socketId).emit('approvalDeclined', {
                        teamCode: teamCode,
                        message: `${user.username} declined to start the game.`
                    });
                }
                
                // Remove the game
                activeGames.delete(teamCode);
                randomMatchQueue = randomMatchQueue.filter(match => match.teamCode !== teamCode);
                updateRandomMatchCount();
            }

        } catch (error) {
            console.error('Error responding to approval request:', error);
            socket.emit('approvalError', 'Failed to respond to approval request');
        }
    });
});

// Chess game logic functions
function initializeChessBoard() {
    const board = [];
    for (let row = 0; row < 8; row++) {
        board[row] = [];
        for (let col = 0; col < 8; col++) {
            board[row][col] = null;
        }
    }

    // Set up pawns
    for (let col = 0; col < 8; col++) {
        board[1][col] = { type: 'pawn', color: 'black' };
        board[6][col] = { type: 'pawn', color: 'white' };
    }

    // Set up other pieces
    const pieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let col = 0; col < 8; col++) {
        board[0][col] = { type: pieces[col], color: 'black' };
        board[7][col] = { type: pieces[col], color: 'white' };
    }

    return board;
}

function isValidMove(board, fromRow, fromCol, toRow, toCol, currentPlayer) {
    const piece = board[fromRow][fromCol];
    if (!piece || piece.color !== currentPlayer) return false;

    // Check if destination has own piece
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;

    // Basic chess move validation
    switch (piece.type) {
        case 'pawn':
            return isValidPawnMove(board, fromRow, fromCol, toRow, toCol, currentPlayer);
        case 'rook':
            return isValidRookMove(board, fromRow, fromCol, toRow, toCol);
        case 'knight':
            return isValidKnightMove(fromRow, fromCol, toRow, toCol);
        case 'bishop':
            return isValidBishopMove(board, fromRow, fromCol, toRow, toCol);
        case 'queen':
            return isValidQueenMove(board, fromRow, fromCol, toRow, toCol);
        case 'king':
            return isValidKingMove(fromRow, fromCol, toRow, toCol);
        default:
            return false;
    }
}

function isValidPawnMove(board, fromRow, fromCol, toRow, toCol, currentPlayer) {
    const direction = currentPlayer === 'white' ? -1 : 1;
    const startRow = currentPlayer === 'white' ? 6 : 1;
    
    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);

    // Forward move
    if (colDiff === 0) {
        if (rowDiff === direction && !board[toRow][toCol]) {
            return true;
        }
        if (rowDiff === 2 * direction && fromRow === startRow && 
            !board[fromRow + direction][fromCol] && !board[toRow][toCol]) {
            return true;
        }
    }
    
    // Capture move
    if (colDiff === 1 && rowDiff === direction) {
        return board[toRow][toCol] !== null;
    }

    return false;
}

function isValidRookMove(board, fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return isPathClear(board, fromRow, fromCol, toRow, toCol);
}

function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

function isValidBishopMove(board, fromRow, fromCol, toRow, toCol) {
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
    return isPathClear(board, fromRow, fromCol, toRow, toCol);
}

function isValidQueenMove(board, fromRow, fromCol, toRow, toCol) {
    return isValidRookMove(board, fromRow, fromCol, toRow, toCol) || 
           isValidBishopMove(board, fromRow, fromCol, toRow, toCol);
}

function isValidKingMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return rowDiff <= 1 && colDiff <= 1;
}

function isPathClear(board, fromRow, fromCol, toRow, toCol) {
    const rowStep = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
    const colStep = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol] !== null) return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    
    return true;
}

function isKingInCheck(board, color) {
    // Find king position
    let kingRow = -1, kingCol = -1;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'king' && piece.color === color) {
                kingRow = row;
                kingCol = col;
                break;
            }
        }
    }
    if (kingRow === -1) {
        console.log(`[isKingInCheck] No king found for ${color}`);
        return false;
    }
    // Check if any opponent piece can attack the king
    const opponentColor = color === 'white' ? 'black' : 'white';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === opponentColor) {
                if (isValidMove(board, row, col, kingRow, kingCol, opponentColor)) {
                    console.log(`[isKingInCheck] ${opponentColor} can attack ${color} king at [${kingRow},${kingCol}] from [${row},${col}]`);
                    return true;
                }
            }
        }
    }
    return false;
}

function hasAnyLegalMove(board, color) {
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = board[fromRow][fromCol];
            if (piece && piece.color === color) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (fromRow === toRow && fromCol === toCol) continue;
                        if (isValidMove(board, fromRow, fromCol, toRow, toCol, color)) {
                            // Simulate the move
                            const tempBoard = board.map(row => row.map(p => p ? { ...p } : null));
                            tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
                            tempBoard[fromRow][fromCol] = null;
                            if (!isKingInCheck(tempBoard, color)) {
                                console.log(`[hasAnyLegalMove] ${color} can move ${piece.type} from [${fromRow},${fromCol}] to [${toRow},${toCol}]`);
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }
    console.log(`[hasAnyLegalMove] No legal moves for ${color}`);
    return false;
}

function checkGameEnd(board, currentPlayer) {
    // Check if the current player (whose turn it is) is in check and has no legal moves
    const inCheck = isKingInCheck(board, currentPlayer);
    const hasMove = hasAnyLegalMove(board, currentPlayer);
    console.log(`[checkGameEnd] Current player: ${currentPlayer}, inCheck: ${inCheck}, hasMove: ${hasMove}`);
    
    if (inCheck) {
        if (!hasMove) {
            console.log(`[checkGameEnd] ${currentPlayer} is checkmated!`);
            const winner = currentPlayer === 'white' ? 'Black' : 'White';
            return `${winner} wins by checkmate!`;
        }
    } else {
        if (!hasMove) {
            console.log(`[checkGameEnd] ${currentPlayer} is stalemated!`);
            return 'Draw by stalemate!';
        }
    }
    return false;
}

// Clean up old games (older than 24 hours)
setInterval(() => {
    const now = Date.now();
    for (const [teamCode, game] of activeGames.entries()) {
        if (now - game.createdAt > 24 * 60 * 60 * 1000) {
            activeGames.delete(teamCode);
            console.log(`Cleaned up old game: ${teamCode}`);
        }
    }
}, 60 * 60 * 1000); // Check every hour

// Add this function at the end of the file
function isInsufficientMaterial(board) {
    // Count pieces
    let pieces = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) pieces.push(piece);
        }
    }
    // Only two kings left
    if (pieces.length === 2 && pieces.every(p => p.type === 'king')) {
        return true;
    }
    return false;
}

// Function to save game to database
async function saveGameToDatabase(game, endReason = null) {
    try {
        // Serialize board to proper format for database
        const serializedBoard = game.board.map(row => 
            row.map(piece => {
                if (piece === null) return null;
                return {
                    type: piece.type,
                    color: piece.color
                };
            })
        );

        // Find or create game in database
        let dbGame = await Game.findOne({ teamCode: game.teamCode });
        
        if (!dbGame) {
            // Create new game record
            dbGame = new Game({
                teamCode: game.teamCode,
                players: game.players.map(p => ({
                    userId: p.userId || null,
                    username: p.name,
                    color: p.color,
                    rating: 1200 // Default rating
                })),
                moves: game.moveHistory.map(move => ({
                    from: { row: move.from[0], col: move.from[1] },
                    to: { row: move.to[0], col: move.to[1] },
                    piece: move.piece.type,
                    captured: move.captured ? move.captured.type : null,
                    notation: move.notation || `${move.piece.type} ${move.from}->${move.to}`
                })),
                chatMessages: game.chatMessages.map(msg => ({
                    userId: msg.userId || null,
                    username: msg.sender,
                    message: msg.message
                })),
                gameState: {
                    board: serializedBoard,
                    currentPlayer: game.currentPlayer,
                    gameOver: game.gameOver,
                    result: endReason ? getGameResult(endReason) : null,
                    endReason: endReason
                },
                startTime: new Date(game.createdAt),
                endTime: new Date(),
                duration: Math.floor((Date.now() - game.createdAt) / 1000)
            });
        } else {
            // Update existing game
            dbGame.moves = game.moveHistory.map(move => ({
                from: { row: move.from[0], col: move.from[1] },
                to: { row: move.to[0], col: move.to[1] },
                piece: move.piece.type,
                captured: move.captured ? move.captured.type : null,
                notation: move.notation || `${move.piece.type} ${move.from}->${move.to}`
            }));
            dbGame.chatMessages = game.chatMessages.map(msg => ({
                userId: msg.userId || null,
                username: msg.sender,
                message: msg.message
            }));
            dbGame.gameState = {
                board: serializedBoard,
                currentPlayer: game.currentPlayer,
                gameOver: game.gameOver,
                result: endReason ? getGameResult(endReason) : null,
                endReason: endReason
            };
            dbGame.endTime = new Date();
            dbGame.duration = Math.floor((Date.now() - game.createdAt) / 1000);
        }
        
        await dbGame.save();
        console.log(`Game ${game.teamCode} saved to database`);
        
        // Update user stats if game is over
        if (game.gameOver && endReason) {
            await updateUserStats(game, endReason);
        }
        
    } catch (error) {
        console.error('Error saving game to database:', error);
    }
}

// Helper function to determine game result
function getGameResult(endReason) {
    if (endReason.includes('White wins') || endReason.includes('white_win')) {
        return 'white_win';
    } else if (endReason.includes('Black wins') || endReason.includes('black_win')) {
        return 'black_win';
    } else if (endReason.includes('Draw') || endReason.includes('draw')) {
        return 'draw';
    } else {
        return 'abandoned';
    }
}

// Function to update user stats
async function updateUserStats(game, endReason) {
    try {
        for (const player of game.players) {
            if (player.userId) {
                const user = await User.findById(player.userId);
                if (user) {
                    let result = 'draw';
                    if (endReason.includes('White wins') && player.color === 'white') {
                        result = 'win';
                    } else if (endReason.includes('Black wins') && player.color === 'black') {
                        result = 'win';
                    } else if (endReason.includes('White wins') && player.color === 'black') {
                        result = 'loss';
                    } else if (endReason.includes('Black wins') && player.color === 'white') {
                        result = 'loss';
                    }
                    
                    user.updateGameStats(result);
                    await user.save();
                    console.log(`Updated stats for user ${user.username}: ${result}`);
                }
            }
        }
    } catch (error) {
        console.error('Error updating user stats:', error);
    }
}

// Random matchmaking system
function addToMatchmaking(userId, user, preferences, socketId) {
    matchmakingUsers.set(userId, {
        user,
        preferences,
        socketId,
        timestamp: Date.now()
    });
    
    // Try to find a match immediately
    findMatch(userId);
}

function removeFromMatchmaking(userId) {
    matchmakingUsers.delete(userId);
}

function findMatch(userId) {
    const currentUser = matchmakingUsers.get(userId);
    if (!currentUser) return;
    
    const { user: currentUserData, preferences } = currentUser;
    const currentGender = currentUserData.gender;
    const currentRating = currentUserData.gameStats.rating;
    
    let bestMatch = null;
    let bestScore = -1;
    
    for (const [otherUserId, otherUser] of matchmakingUsers) {
        if (otherUserId === userId) continue;
        
        const { user: otherUserData } = otherUser;
        const otherGender = otherUserData.gender;
        const otherRating = otherUserData.gameStats.rating;
        
        // Calculate match score based on preferences
        let score = 0;
        
        // Gender preference scoring
        if (preferences.genderPreference === 'opposite') {
            if (currentGender !== otherGender) {
                score += 100; // High priority for opposite gender
            } else {
                score -= 50; // Penalty for same gender
            }
        } else if (preferences.genderPreference === 'same') {
            if (currentGender === otherGender) {
                score += 80; // High priority for same gender
            } else {
                score -= 30; // Penalty for opposite gender
            }
        } else {
            // Any gender - no penalty
            score += 50;
        }
        
        // Skill level matching
        const ratingDiff = Math.abs(currentRating - otherRating);
        if (preferences.skillRange === 'beginner' && ratingDiff <= 200) {
            score += 30;
        } else if (preferences.skillRange === 'intermediate' && ratingDiff <= 300) {
            score += 30;
        } else if (preferences.skillRange === 'advanced' && ratingDiff <= 400) {
            score += 30;
        } else if (preferences.skillRange === 'any') {
            score += 20;
        }
        
        // Prefer closer ratings
        score -= ratingDiff / 10;
        
        // Prefer users who have been waiting longer
        const waitTime = Date.now() - otherUser.timestamp;
        score += waitTime / 1000; // 1 point per second of waiting
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = { userId: otherUserId, user: otherUserData, score };
        }
    }
    
    // If we found a good match (score > 50), create the match
    if (bestMatch && bestScore > 50) {
        createRandomMatch(userId, bestMatch.userId);
    }
}

function createRandomMatch(user1Id, user2Id) {
    const user1 = matchmakingUsers.get(user1Id);
    const user2 = matchmakingUsers.get(user2Id);
    
    if (!user1 || !user2) return;
    
    // Remove both users from matchmaking
    removeFromMatchmaking(user1Id);
    removeFromMatchmaking(user2Id);
    
    // Generate team code
    const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create game
    const game = {
        teamCode,
        players: [
            { userId: user1Id, username: user1.user.username, color: 'white' },
            { userId: user2Id, username: user2.user.username, color: 'black' }
        ],
        gameState: {
            board: initializeChessBoard(),
            currentPlayer: 'white',
            gameOver: false
        },
        chatMessages: [], // Initialize chat messages
        moveHistory: [], // Initialize move history
        isRandomMatch: true,
        createdAt: new Date()
    };
    
    // Store game
    activeGames.set(teamCode, game);
    
    // Notify both users
    const user1Socket = io.sockets.sockets.get(user1.socketId);
    const user2Socket = io.sockets.sockets.get(user2.socketId);
    
    if (user1Socket) {
        user1Socket.emit('randomMatchFound', {
            teamCode,
            opponent: {
                username: user2.user.username,
                rating: user2.user.gameStats.rating,
                gender: user2.user.gender,
                avatar: user2.user.avatar
            },
            playerColor: 'white'
        });
    }
    
    if (user2Socket) {
        user2Socket.emit('randomMatchFound', {
            teamCode,
            opponent: {
                username: user1.user.username,
                rating: user1.user.gameStats.rating,
                gender: user1.user.gender,
                avatar: user1.user.avatar
            },
            playerColor: 'black'
        });
    }
    
    console.log(`Random match created: ${user1.user.username} vs ${user2.user.username} (${teamCode})`);
}

// Clean up stale matchmaking users every 5 minutes
setInterval(() => {
    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes
    
    for (const [userId, userData] of matchmakingUsers) {
        if (now - userData.timestamp > staleThreshold) {
            console.log(`Removing stale matchmaking user: ${userData.user.username}`);
            removeFromMatchmaking(userId);
            
            // Notify the user if they're still connected
            const socket = io.sockets.sockets.get(userData.socketId);
            if (socket) {
                socket.emit('randomMatchError', 'Matchmaking timeout. Please try again.');
            }
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes

function getMatchmakingStats() {
    const total = matchmakingUsers.size;
    const byGender = {
        male: 0,
        female: 0,
        other: 0,
        'prefer-not-to-say': 0
    };
    
    for (const userData of matchmakingUsers.values()) {
        byGender[userData.user.gender]++;
    }
    
    return { total, byGender };
}

// Emit matchmaking stats every 30 seconds
setInterval(() => {
    const stats = getMatchmakingStats();
    io.emit('matchmakingStats', stats);
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chess server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play`);
}); 