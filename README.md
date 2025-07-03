# ChessVoice - High-Graphic Edition

**New Features:**
- Animated piece moves for a smooth, modern experience
- Custom SVG chess pieces (Staunton style, open-source)
- Sound effects for moves, captures, check, checkmate, and game events

All assets are open-source and included in the new `assets/` directory.

# ChessVoice - Multiplayer Chess with Authentication

A modern multiplayer chess game with user authentication, real-time chat, voice communication, and comprehensive game statistics.

## Features

### 🎮 Game Features
- **Real-time multiplayer chess** with team code system
- **Complete chess rules** with move validation
- **Checkmate and stalemate detection**
- **Move history tracking**
- **3D animated intro screen**

### 👤 Authentication System
- **User registration** with email or phone number
- **Secure login** with JWT tokens
- **Password reset** functionality
- **User profiles** with game statistics
- **Session management**

### 💬 Communication
- **Real-time text chat** with emoji support
- **Voice chat** capabilities
- **System messages** for game events

### 📊 Statistics & Data
- **Game history** stored in database
- **User ratings** and win/loss records
- **Performance tracking**
- **Persistent game data**

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Optional: Gmail account for email verification
- Optional: Twilio account for SMS verification

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ChessVoice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/chessvoice
   
   # JWT Secret (change this in production!)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # Email Configuration (Gmail)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Twilio Configuration (SMS)
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-phone-number
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Set up MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # Start MongoDB (Windows)
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in .env file
   ```

5. **Configure Email (Optional)**
   
   For email verification:
   - Enable 2-factor authentication on your Gmail account
   - Generate an app password
   - Update `EMAIL_USER` and `EMAIL_PASS` in `.env`

6. **Configure SMS (Optional)**
   
   For SMS verification:
   - Sign up for a Twilio account
   - Get your Account SID and Auth Token
   - Get a phone number
   - Update Twilio credentials in `.env`

## Running the Application

1. **Start the server**
   ```bash
   npm start
   ```

2. **Open in browser**
   ```
   http://localhost:3000
   ```

3. **Development mode**
   ```bash
   npm run dev
   ```

## Usage

### Authentication

1. **Sign Up**
   - Click "Don't have an account? Sign up"
   - Enter username, password, and either email or phone
   - Verify your account (if email/SMS configured)

2. **Sign In**
   - Use email, phone, or username
   - Enter password
   - Access your profile and game statistics

3. **Password Reset**
   - Click "Forgot Password?"
   - Enter your email, phone, or username
   - Follow reset instructions

### Playing Chess

1. **Create a Game**
   - Click "Create Online Game"
   - Share the 6-digit code with your friend

2. **Join a Game**
   - Click "Join Game"
   - Enter the 6-digit code from your friend

3. **Game Features**
   - Real-time move synchronization
   - Chat with emoji support
   - Voice chat (if enabled)
   - Automatic game saving

## Database Schema

### User Model
```javascript
{
  username: String,
  email: String,
  phoneNumber: String,
  password: String (hashed),
  gameStats: {
    gamesPlayed: Number,
    gamesWon: Number,
    gamesLost: Number,
    gamesDrawn: Number,
    rating: Number,
    bestRating: Number,
    winStreak: Number,
    currentStreak: Number
  },
  preferences: Object,
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean
}
```

### Game Model
```javascript
{
  teamCode: String,
  players: [{
    userId: ObjectId,
    username: String,
    color: String,
    rating: Number
  }],
  moves: [{
    from: { row: Number, col: Number },
    to: { row: Number, col: Number },
    piece: String,
    captured: String,
    notation: String
  }],
  chatMessages: [{
    userId: ObjectId,
    username: String,
    message: String
  }],
  gameState: {
    board: Array,
    currentPlayer: String,
    gameOver: Boolean,
    result: String,
    endReason: String
  },
  startTime: Date,
  endTime: Date,
  duration: Number
}
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### WebSocket Events
- `createGame` - Create new game
- `joinGame` - Join existing game
- `makeMove` - Make chess move
- `sendMessage` - Send chat message
- `leaveGame` - Leave current game

## Security Features

- **Password hashing** with bcrypt
- **JWT token authentication**
- **Rate limiting** on auth endpoints
- **Input validation** and sanitization
- **CORS protection**
- **Environment variable configuration**

## Deployment

### Production Setup

1. **Update environment variables**
   - Use strong JWT secret
   - Configure production MongoDB
   - Set up email/SMS services

2. **Security considerations**
   - Enable HTTPS
   - Set up proper CORS
   - Configure rate limiting
   - Use environment-specific settings

3. **Database optimization**
   - Set up indexes
   - Configure connection pooling
   - Enable database monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

---

**ChessVoice** - Bringing chess to the modern web with authentication, real-time multiplayer, and comprehensive statistics tracking. 

## Assets Directory

The `assets/` directory contains:
- SVG images for all chess pieces (white and black, Staunton style)
- Sound effects for move, capture, check, checkmate, and game start/end

These are used for the new high-graphic features. 