const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: function() { return !this.phoneNumber; },
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phoneNumber: {
        type: String,
        required: function() { return !this.email; },
        unique: true,
        sparse: true,
        trim: true,
        match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer-not-to-say'],
        default: 'prefer-not-to-say'
    },
    avatar: {
        type: String,
        default: '👤',
        validate: {
            validator: function(v) {
                // Validate that avatar is a valid emoji
                return /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(v);
            },
            message: 'Avatar must be a valid emoji'
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    phoneVerificationCode: String,
    phoneVerificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    profilePicture: {
        type: String,
        default: null
    },
    gameStats: {
        gamesPlayed: { type: Number, default: 0 },
        gamesWon: { type: Number, default: 0 },
        gamesLost: { type: Number, default: 0 },
        gamesDrawn: { type: Number, default: 0 },
        rating: { type: Number, default: 1200 },
        bestRating: { type: Number, default: 1200 },
        winStreak: { type: Number, default: 0 },
        currentStreak: { type: Number, default: 0 }
    },
    preferences: {
        theme: { type: String, default: 'default' },
        soundEnabled: { type: Boolean, default: true },
        notificationsEnabled: { type: Boolean, default: true }
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    bio: {
        type: String,
        default: ''
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1, phoneNumber: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'gameStats.rating': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update game stats method
userSchema.methods.updateGameStats = function(result) {
    this.gameStats.gamesPlayed += 1;
    
    if (result === 'win') {
        this.gameStats.gamesWon += 1;
        this.gameStats.currentStreak += 1;
        this.gameStats.winStreak = Math.max(this.gameStats.winStreak, this.gameStats.currentStreak);
        this.gameStats.rating += 20;
    } else if (result === 'loss') {
        this.gameStats.gamesLost += 1;
        this.gameStats.currentStreak = 0;
        this.gameStats.rating = Math.max(800, this.gameStats.rating - 15);
    } else if (result === 'draw') {
        this.gameStats.gamesDrawn += 1;
        this.gameStats.currentStreak = 0;
        this.gameStats.rating += 2;
    }
    
    this.gameStats.bestRating = Math.max(this.gameStats.bestRating, this.gameStats.rating);
    this.gameStats.rating = Math.max(800, this.gameStats.rating);
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
    return {
        id: this._id,
        username: this.username,
        gender: this.gender,
        avatar: this.avatar,
        profilePicture: this.profilePicture,
        gameStats: this.gameStats,
        isOnline: this.isOnline,
        lastActive: this.lastActive
    };
};

module.exports = mongoose.model('User', userSchema); 