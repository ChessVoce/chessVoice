const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    teamCode: {
        type: String,
        required: true,
        unique: true
    },
    players: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        username: {
            type: String,
            required: true
        },
        color: {
            type: String,
            enum: ['white', 'black'],
            required: true
        },
        rating: {
            type: Number,
            default: 1200
        }
    }],
    moves: [{
        from: {
            row: Number,
            col: Number
        },
        to: {
            row: Number,
            col: Number
        },
        piece: {
            type: String,
            required: true
        },
        captured: String,
        notation: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    chatMessages: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    gameState: {
        board: [[{
            type: String,
            color: String
        }]],
        currentPlayer: {
            type: String,
            enum: ['white', 'black'],
            default: 'white'
        },
        gameOver: {
            type: Boolean,
            default: false
        },
        result: {
            type: String,
            enum: ['white_win', 'black_win', 'draw', 'abandoned'],
            default: null
        },
        endReason: String
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    duration: Number, // in seconds
    isRanked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for better query performance
gameSchema.index({ teamCode: 1 });
gameSchema.index({ 'players.userId': 1 });
gameSchema.index({ startTime: -1 });
gameSchema.index({ 'gameState.gameOver': 1 });

// Calculate game duration
gameSchema.methods.calculateDuration = function() {
    if (this.endTime && this.startTime) {
        this.duration = Math.floor((this.endTime - this.startTime) / 1000);
    }
};

// Get game summary
gameSchema.methods.getGameSummary = function() {
    return {
        id: this._id,
        teamCode: this.teamCode,
        players: this.players.map(p => ({
            username: p.username,
            color: p.color,
            rating: p.rating
        })),
        gameState: {
            gameOver: this.gameState.gameOver,
            result: this.gameState.result,
            endReason: this.gameState.endReason
        },
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this.duration,
        moveCount: this.moves.length
    };
};

module.exports = mongoose.model('Game', gameSchema); 