class ChessGame {
    constructor() {
        // API Base URL configuration
        this.apiBaseUrl = this.getApiBaseUrl();
        
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameOver = false;
        
        // Authentication properties
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');
        
        // Multiplayer properties
        this.socket = null;
        this.isMultiplayer = false;
        this.teamCode = null;
        this.playerColor = null;
        this.opponentName = null;
        this.playerName = null;
        
        // Voice Chat Variables
        this.localStream = null;
        this.peerConnection = null;
        this.isVoiceChatActive = false;
        this.isMuted = false;
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                    urls: 'turn:relay1.expressturn.com:3478',
                    username: 'ef3b0c1a',
                    credential: 'YzRmZDQwZDE2YzA2'
                }
            ]
        };
        
        // Voice Chat UI Elements
        this.startVoiceBtn = document.getElementById('start-voice-btn');
        this.muteVoiceBtn = document.getElementById('mute-voice-btn');
        if (this.startVoiceBtn) {
            this.startVoiceBtn.addEventListener('click', () => this.startVoiceChat());
        }
        if (this.muteVoiceBtn) {
            this.muteVoiceBtn.addEventListener('click', () => {
                if (this.localStream) {
                    this.isMuted = !this.isMuted;
                    this.localStream.getAudioTracks().forEach(track => track.enabled = !this.isMuted);
                    this.muteVoiceBtn.textContent = this.isMuted ? 'Unmute' : 'Mute';
                }
            });
        }
        
        // Chat properties
        this.chatMessages = [];
        this.chatInput = null;
        this.sendMessageBtn = null;
        this.chatMessagesContainer = null;
        
        // Emoji properties
        this.emojiBtn = null;
        this.emojiPicker = null;
        this.isEmojiPickerOpen = false;
        
        // --- Video Chat Properties ---
        // this.videoPeerConnection = null;
        // this.localVideoStream = null;
        // this.remoteVideoStream = null;
        // this.isVideoChatActive = false;
        // Video UI elements
        // this.startVideoBtn = null;
        // this.hangupVideoBtn = null;
        // this.localVideo = null;
        // this.remoteVideo = null;
        // this.videoChatSection = null;
        
        // 1. Add properties to track captured pieces in the constructor
        this.capturedWhite = [];
        this.capturedBlack = [];
        
        this.initializeAuth();
        this.initializeGame();
        this.initializeMultiplayer();
        this.initializeChat();
        this.initializeEmoji();
        this.initializeIntro();
        this.initializeRandomMatch();
        this.setupUpdateInfoUI();
        this.setupChangePasswordUI();
        this.setupPasswordVisibilityToggles();
    }

    // Get API base URL based on current environment
    getApiBaseUrl() {
        // Check if we're running locally or on a deployed version
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Local development - use localhost backend
            return 'http://localhost:3000';
        } else {
            // Deployed version - replace with your actual backend URL after deployment
            // Examples:
            // - Render: 'https://chessvoice-backend.onrender.com'
            // - Railway: 'https://chessvoice-backend.railway.app'
            // - Heroku: 'https://your-app-name.herokuapp.com'
            
            // TODO: Replace this with your actual deployed backend URL
            const deployedBackendUrl = 'https://your-backend-url-here.com'; // Replace this!
            
            if (deployedBackendUrl === 'https://your-backend-url-here.com') {
                console.warn('🚨 NETWORK ERROR: Backend not deployed yet!');
                console.warn('📋 To fix this:');
                console.warn('1. Deploy your backend to Render: https://render.com');
                console.warn('2. Update the deployedBackendUrl in chess.js');
                console.warn('3. Follow the instructions in deploy-instructions.md');
                
                // Show user-friendly error message
                this.showAuthError('Backend not deployed yet. Please deploy your backend first. Check deploy-instructions.md for help.');
                return window.location.origin; // Use current origin as fallback
            }
            
            return deployedBackendUrl;
        }
    }

    async initializeAuth() {
        // Check if user is already authenticated
        if (this.authToken) {
            try {
                const response = await fetch('https://chessvoice-backend.onrender.com/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    // Do NOT disconnect socket globally; just re-initialize for this instance
                    this.initializeMultiplayer();
                    this.showGameInterface();
                    this.updateUserProfile();
                    this.showAuthSuccess('Login successful!');
                } else {
                    // Token is invalid, clear it
                    this.clearAuth();
                    this.showAuthInterface();
                }
            } catch (error) {
                console.error('Auth check error:', error);
                this.clearAuth();
                this.showAuthInterface();
            }
        } else {
            this.showAuthInterface();
        }
        
        this.setupAuthEventListeners();
    }

    setupAuthEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form-element');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Signup form
        const signupForm = document.getElementById('signup-form-element');
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Forgot password form
        const forgotPasswordForm = document.getElementById('forgot-password-form-element');
        forgotPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });

        // Reset password form
        const resetPasswordForm = document.getElementById('reset-password-form-element');
        resetPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleResetPassword();
        });

        // Navigation links
        document.getElementById('show-signup-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupForm();
        });

        document.getElementById('show-login-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        document.getElementById('forgot-password-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotPasswordForm();
        });

        document.getElementById('back-to-login-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        document.getElementById('back-to-forgot-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotPasswordForm();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Avatar selection
        const avatarOptions = document.querySelectorAll('.avatar-option');
        avatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                avatarOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                option.classList.add('selected');
                // Update hidden input value
                const avatarValue = option.getAttribute('data-avatar');
                document.getElementById('signup-avatar').value = avatarValue;
            });
        });

        // Set default avatar as selected
        const defaultAvatar = document.querySelector('.avatar-option[data-avatar="👤"]');
        if (defaultAvatar) {
            defaultAvatar.classList.add('selected');
        }

        // Guest login/signup buttons
        document.getElementById('guest-login-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.loginAsGuest();
        });
        document.getElementById('guest-signup-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.loginAsGuest();
        });
    }

    showAuthInterface() {
        document.getElementById('intro-screen').style.display = 'none';
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('game-container').style.display = 'none';
        // Hide back-to-auth button
        const backBtn = document.getElementById('back-to-auth-btn');
        if (backBtn) backBtn.style.display = 'none';
    }

    showGameInterface() {
        document.getElementById('intro-screen').style.display = 'none';
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        // Hide back-to-auth button by default
        const backBtn = document.getElementById('back-to-auth-btn');
        if (backBtn) backBtn.style.display = 'none';
    }

    showLoginForm() {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('forgot-password-form').style.display = 'none';
        document.getElementById('reset-password-form').style.display = 'none';
        this.setupPasswordVisibilityToggles();
    }

    showSignupForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
        document.getElementById('forgot-password-form').style.display = 'none';
        document.getElementById('reset-password-form').style.display = 'none';
        this.setupPasswordVisibilityToggles();
    }

    showForgotPasswordForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('forgot-password-form').style.display = 'block';
        document.getElementById('reset-password-form').style.display = 'none';
        this.setupPasswordVisibilityToggles();
    }

    showResetPasswordForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('forgot-password-form').style.display = 'none';
        document.getElementById('reset-password-form').style.display = 'block';
        this.setupPasswordVisibilityToggles();
    }

    async handleLogin() {
        const identifier = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = document.querySelector('#login-form-element .auth-btn');

        if (!identifier || !password) {
            this.showAuthError('Please fill in all fields');
            return;
        }

        this.setLoadingState(submitBtn, true);

        try {
            const response = await fetch('https://chessvoice-backend.onrender.com/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identifier, password })
            });

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Not JSON, read as text
                const text = await response.text();
                data = { error: text };
            }

            if (response.ok) {
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.authToken);
                // Do NOT disconnect socket globally; just re-initialize for this instance
                this.initializeMultiplayer();
                this.showGameInterface();
                this.updateUserProfile();
                this.showAuthSuccess('Login successful!');
            } else {
                this.showAuthError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthError('Network error. Please try again.');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async handleSignup() {
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const phoneNumber = document.getElementById('signup-phone').value;
        const gender = document.getElementById('signup-gender').value;
        const avatar = document.getElementById('signup-avatar').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const submitBtn = document.querySelector('#signup-form-element .auth-btn');

        if (!username || !password || !confirmPassword || !gender) {
            this.showAuthError('Please fill in all required fields');
            return;
        }

        if (!email && !phoneNumber) {
            this.showAuthError('Please provide either email or phone number');
            return;
        }

        if (password !== confirmPassword) {
            this.showAuthError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showAuthError('Password must be at least 6 characters long');
            return;
        }

        this.setLoadingState(submitBtn, true);

        try {
            const response = await fetch('https://chessvoice-backend.onrender.com/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, phoneNumber, gender, avatar, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.authToken);
                if (this.socket) this.socket.disconnect();
                this.initializeMultiplayer();
                this.showGameInterface();
                this.updateUserProfile();
                this.showAuthSuccess('Account created successfully!');
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showAuthError(errorMessages);
                } else {
                    this.showAuthError(data.error || 'Signup failed');
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showAuthError('Network error. Please try again.');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async handleForgotPassword() {
        const identifier = document.getElementById('reset-identifier').value;
        const method = document.getElementById('reset-method').value;
        const submitBtn = document.querySelector('#forgot-password-form-element .auth-btn');

        if (!identifier) {
            this.showAuthError('Please enter your email, phone, or username');
            return;
        }

        this.setLoadingState(submitBtn, true);

        try {
            const requestBody = { identifier };
            if (method) {
                requestBody.method = method;
            }

            const response = await fetch('https://chessvoice-backend.onrender.com/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (response.ok) {
                const methodText = data.method === 'sms' ? 'SMS' : 'email';
                this.showAuthSuccess(`Password reset code sent via ${methodText}! Check your ${methodText} and enter the code below.`);
                this.showResetPasswordForm();
                // Store identifier for reset password
                this.resetIdentifier = identifier;
            } else {
                this.showAuthError(data.error || 'Failed to send reset instructions');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showAuthError('Network error. Please try again.');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async handleResetPassword() {
        const resetCode = document.getElementById('reset-code').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;
        const submitBtn = document.querySelector('#reset-password-form-element .auth-btn');

        if (!resetCode || !newPassword || !confirmNewPassword) {
            this.showAuthError('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            this.showAuthError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            this.showAuthError('Password must be at least 6 characters long');
            return;
        }

        this.setLoadingState(submitBtn, true);

        try {
            const response = await fetch('https://chessvoice-backend.onrender.com/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    identifier: this.resetIdentifier,
                    resetToken: resetCode,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showAuthSuccess('Password reset successfully! You can now login with your new password.');
                this.showLoginForm();
                this.resetIdentifier = null;
            } else {
                this.showAuthError(data.error || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            this.showAuthError('Network error. Please try again.');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async handleLogout() {
        try {
            if (this.authToken) {
                await fetch('https://chessvoice-backend.onrender.com/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            this.showAuthInterface();
            // Only disconnect this instance's socket
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
        }
    }

    clearAuth() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
    }

    updateUserProfile() {
        const profileSection = document.getElementById('user-profile');
        if (this.currentUser && profileSection) {
            const avatarImg = profileSection.querySelector('img');
            const nameSpan = profileSection.querySelector('span');
            
            if (avatarImg) {
                if (this.currentUser.profilePicture) {
                    // Construct full URL for profile picture
                    const profilePicUrl = this.currentUser.profilePicture.startsWith('http') 
                        ? this.currentUser.profilePicture 
                        : this.apiBaseUrl + this.currentUser.profilePicture;
                    avatarImg.src = profilePicUrl;
                } else {
                    // Use a simple default avatar data URI
                    avatarImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPGNpcmNsZSBjeD0iMjQiIGN5PSIxOCIgcj0iNiIgZmlsbD0iIzk0QTNBRiIvPgo8cGF0aCBkPSJNMTIgMzJDMjAgMjggMjggMzIgMzYgMzJWMzZDMzYgMzguMjA5MSAzNC4yMDkxIDQwIDMyIDQwSDE2QzEzLjc5MDkgNDAgMTIgMzguMjA5MSAxMiAzNlYzMloiIGZpbGw9IiM5NEEzQUYiLz4KPC9zdmc+';
                }
            }
            
            if (nameSpan) {
                nameSpan.textContent = this.currentUser.username || 'User';
            }
        }
    }

    setLoadingState(button, loading) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showAuthError(message) {
        this.clearAuthMessages();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.querySelector('.auth-container').insertBefore(errorDiv, document.querySelector('.auth-form'));
    }

    showAuthSuccess(message) {
        this.clearAuthMessages();
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.querySelector('.auth-container').insertBefore(successDiv, document.querySelector('.auth-form'));
    }

    clearAuthMessages() {
        const messages = document.querySelectorAll('.error-message, .success-message');
        messages.forEach(msg => msg.remove());
    }

    initializeBoard() {
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

    initializeGame() {
        this.renderBoard();
        // Add event listeners for main game buttons
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) newGameBtn.addEventListener('click', () => this.newGame());
        const createGameBtn = document.getElementById('create-game-btn');
        if (createGameBtn) createGameBtn.addEventListener('click', () => this.createOnlineGame());
        const joinGameBtn = document.getElementById('join-game-btn');
        if (joinGameBtn) joinGameBtn.addEventListener('click', () => this.showJoinGameModal());
        const leaveGameBtn = document.getElementById('leave-game-btn');
        if (leaveGameBtn) leaveGameBtn.addEventListener('click', () => this.leaveGame());
        const copyCodeBtn = document.getElementById('copy-code-btn');
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => {
                const codeSpan = document.getElementById('team-code');
                if (codeSpan && codeSpan.textContent) {
                    navigator.clipboard.writeText(codeSpan.textContent).then(() => {
                        this.showNotification('Team code copied!', 'success');
                    }, () => {
                        this.showNotification('Failed to copy code.', 'error');
                    });
                }
            });
        }
        const playRobotBtn = document.getElementById('play-robot-btn');
        if (playRobotBtn) playRobotBtn.addEventListener('click', () => this.startRobotGame());
        this.updateGameInfo();
    }

    createOnlineGame() {
        if (this.socket) {
            this.socket.emit('createGame', this.currentUser ? this.currentUser.username : 'Player');
        }
    }

    showJoinGameModal() {
        const joinModal = document.getElementById('join-modal');
        if (joinModal) joinModal.style.display = 'block';
        // Add event listener for closing modal
        const closeBtn = joinModal.querySelector('.close');
        if (closeBtn) closeBtn.onclick = () => { joinModal.style.display = 'none'; };
        // Add event listener for form submit
        const joinForm = document.getElementById('join-form');
        if (joinForm) {
            joinForm.onsubmit = (e) => {
                e.preventDefault();
                const codeInput = document.getElementById('team-code-input');
                const teamCode = codeInput ? codeInput.value.trim() : '';
                if (teamCode && this.socket) {
                    this.socket.emit('joinGame', { teamCode, playerName: this.currentUser ? this.currentUser.username : 'Player' });
                }
                joinModal.style.display = 'none';
            };
        }
    }

    initializeMultiplayer() {
        // Initialize Socket.IO connection with authentication
        this.socket = io('https://chessvoice-backend.onrender.com', {
            auth: {
                token: this.authToken
            }
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.showNotification('Connected to server', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showNotification('Disconnected from server', 'error');
            this.setMultiplayerStatus(false);
        });

        // Multiplayer event handlers
        this.socket.on('gameCreated', (data) => {
            console.log('Game created:', data);
            this.teamCode = data.teamCode;
            this.playerColor = data.playerColor;
            this.isMultiplayer = true;
            this.setMultiplayerStatus(true);
            this.showTeamCode();
            this.showNotification('Game created! Share the code with your friend.', 'success');
        });

        this.socket.on('gameReady', (data) => {
            console.log('Game ready:', data);
            this.board = data.board;
            this.currentPlayer = data.currentPlayer;
            this.isMultiplayer = true;
            this.playerColor = data.playerColor;
            this.setMultiplayerStatus(true);
            
            // Show chat section now that the game is ready
            const chatSection = document.getElementById('chat-section');
            const emojiBtn = document.getElementById('emoji-btn');
            chatSection.style.display = 'flex';
            emojiBtn.style.display = 'block';
            
            // Load chat messages
            if (data.chatMessages) {
                this.chatMessages = data.chatMessages;
                this.renderChatMessages();
            }
            
            // Find opponent name
            const opponent = data.players.find(p => p.color !== this.playerColor);
            this.opponentName = opponent ? opponent.name : 'Opponent';
            
            console.log(`You are playing as ${this.playerColor}, opponent is ${this.opponentName}`);
            console.log(`Current player: ${this.currentPlayer}`);
            
            this.renderBoard();
            this.updateGameInfo();
            this.showNotification(`${this.opponentName} joined the game!`, 'success');
            
            // Voice Chat
            this.setVoiceChatUI(true);
        });

        this.socket.on('moveMade', (data) => this.handleMoveMade(data));

        this.socket.on('newMessage', (message) => {
            console.log('New chat message:', message);
            this.chatMessages.push(message);
            this.renderChatMessages();
        });

        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data);
            this.showNotification(data.message, 'error');
            
            // Reset multiplayer state and board
            this.isMultiplayer = false;
            this.teamCode = null;
            this.playerColor = null;
            this.opponentName = null;
            
            // Reset board to initial state
            this.board = this.initializeBoard();
            this.currentPlayer = 'white';
            this.selectedSquare = null;
            this.moveHistory = [];
            this.gameOver = false;
            this.chatMessages = [];
            
            // Clear highlights and update UI
            this.clearHighlights();
            this.renderBoard();
            this.updateGameInfo();
            this.updateMoveHistory();
            
            // Update multiplayer UI
            this.setMultiplayerStatus(false);
            
            // Clear chat
            if (this.chatMessagesContainer) {
                this.chatMessagesContainer.innerHTML = '';
            }
            
            // Voice Chat
            this.setVoiceChatUI(false);
        });

        // Game ended by server (when a player leaves)
        this.socket.on('gameEnded', (data) => {
            console.log('[DEBUG] gameEnded event received:', data);
            this.showNotification(data.message || 'Game ended - opponent left the game', 'warning');
            
            // Reset multiplayer state and board
            this.isMultiplayer = false;
            this.teamCode = null;
            this.playerColor = null;
            this.opponentName = null;
            
            // Reset board to initial state
            this.board = this.initializeBoard();
            this.currentPlayer = 'white';
            this.selectedSquare = null;
            this.moveHistory = [];
            this.gameOver = false;
            this.chatMessages = [];
            
            // Clear highlights and update UI
            this.clearHighlights();
            this.renderBoard();
            this.updateGameInfo();
            this.updateMoveHistory();
            
            // Update multiplayer UI
            this.setMultiplayerStatus(false);
            
            // Clear chat
            if (this.chatMessagesContainer) {
                this.chatMessagesContainer.innerHTML = '';
            }
            
            // Voice Chat
            this.setVoiceChatUI(false);
            
            // Redirect to home page if user is authenticated (not guest)
            if (this.currentUser && this.authToken) {
                console.log('[DEBUG] gameEnded: redirecting to home page');
                this.showAuthInterface();
                this.showNotification('Game ended. Returned to home page', 'info');
            } else {
                // For guest users, just show a notification that they're back to local play
                this.showNotification('Game ended. Back to local play mode', 'info');
            }
        });

        this.socket.on('joinError', (message) => {
            console.log('Join error:', message);
            this.showNotification(message, 'error');
            
            // Voice Chat
            this.setVoiceChatUI(false);
        });

        // Random matching event handlers
        this.socket.on('randomMatchStarted', (data) => {
            console.log('Random match started:', data);
            this.showNotification('Searching for opponent...', 'info');
            this.updateRandomMatchUI('searching');
        });

        this.socket.on('randomMatchFound', (data) => {
            console.log('Random match found:', data);
            this.teamCode = data.teamCode;
            this.playerColor = data.playerColor;
            this.opponentName = data.opponent.username;
            // Show opponent info
            this.updateRandomMatchUI('found', data.opponent);
            // Auto-join the match
            this.showNotification('Match found! Connecting you to your opponent...', 'info');
            this.connectToRandomMatch();
        });

        this.socket.on('randomMatchError', (message) => {
            console.log('Random match error:', message);
            this.showNotification(message, 'error');
            this.updateRandomMatchUI('error');
        });

        this.socket.on('randomMatchCancelled', (data) => {
            console.log('Random match cancelled:', data);
            this.showNotification(data.message, 'info');
            this.updateRandomMatchUI('cancelled');
        });

        // Opponent declined the match
        this.socket.on('opponentDeclined', (data) => {
            console.log('Opponent declined:', data);
            this.showNotification(data.message, 'warning');
            this.hideRandomMatchModal();
            this.teamCode = null;
        });

        // Connection request from another player
        this.socket.on('connectionRequest', (data) => {
            console.log('Connection request received:', data);
            this.teamCode = data.teamCode;
            this.showConnectionRequestModal(data.requestingPlayer);
        });

        // Connection request was declined by the other player
        this.socket.on('connectionRequestDeclined', (data) => {
            console.log('Connection request declined:', data);
            this.showNotification(data.message, 'warning');
            this.hideConnectionRequestModal();
            this.teamCode = null;
        });

        // Random match declined successfully
        this.socket.on('randomMatchDeclined', (data) => {
            console.log('Random match declined:', data);
            this.showNotification(data.message, 'success');
        });

        // Matchmaking statistics
        this.socket.on('matchmakingStats', (stats) => {
            this.updateMatchmakingStats(stats);
        });

        // Approval request from another player
        this.socket.on('approvalRequest', (data) => {
            console.log('[CLIENT] approvalRequest event received:', data);
            console.log('[CLIENT] showApprovalRequestModal called with:', data.requestingPlayer);
            this.teamCode = data.teamCode;
            this.showApprovalRequestModal(data.requestingPlayer);
        });

        // Approval request was sent successfully
        this.socket.on('approvalRequestSent', (data) => {
            console.log('Approval request sent:', data);
            this.showNotification(data.message, 'info');
        });

        // Waiting for opponent to be ready
        this.socket.on('waitingForOpponent', (data) => {
            console.log('Waiting for opponent:', data);
            this.showNotification(data.message, 'info');
        });

        // Game is starting after approval
        this.socket.on('gameStarting', (data) => {
            console.log('[DEBUG] gameStarting event received:', data);
            this.board = data.board;
            this.currentPlayer = data.currentPlayer;
            this.isMultiplayer = true;
            this.playerColor = data.playerColor;
            
            console.log('[DEBUG] gameStarting: board set');
            console.log('[DEBUG] gameStarting: currentPlayer set to:', this.currentPlayer);
            console.log('[DEBUG] gameStarting: playerColor set to:', this.playerColor);
            console.log('[DEBUG] gameStarting: isMultiplayer set to:', this.isMultiplayer);
            
            this.setMultiplayerStatus(true);
            
            // Show chat section now that the game is ready
            const chatSection = document.getElementById('chat-section');
            const emojiBtn = document.getElementById('emoji-btn');
            chatSection.style.display = 'flex';
            emojiBtn.style.display = 'block';
            
            // Load chat messages
            if (data.chatMessages) {
                this.chatMessages = data.chatMessages;
                this.renderChatMessages();
            }
            
            // Set opponent name for random matches
            if (data.players) {
                const opponent = data.players.find(p => p.color !== this.playerColor);
                this.opponentName = opponent ? opponent.name : 'Opponent';
            } else if (this.opponentName) {
                // Keep existing opponent name if already set
            } else {
                this.opponentName = 'Opponent';
            }
            
            console.log(`[DEBUG] gameStarting: You are playing as ${this.playerColor}, opponent is ${this.opponentName}`);
            console.log(`[DEBUG] gameStarting: Current player: ${this.currentPlayer}`);
            
            this.renderBoard();
            this.updateGameInfo();
            this.hideRandomMatchModal();
            this.hideApprovalRequestModal();
            this.showNotification('Game started!', 'success');
        });

        // Approval was declined
        this.socket.on('approvalDeclined', (data) => {
            console.log('Approval declined:', data);
            this.showNotification(data.message + ' Searching for a new opponent...', 'warning');
            this.hideApprovalRequestModal();
            this.teamCode = null;
            // Automatically start searching for a new random match
            if (this.lastRandomMatchPreferences) {
                this.socket.emit('startRandomMatch', { preferences: this.lastRandomMatchPreferences });
            } else {
                // Fallback: prompt user to start again
                this.showNotification('Please start a new random match.', 'info');
            }
        });

        // Add this in initializeMultiplayer or after socket is initialized
        if (this.socket) {
            this.socket.on('voice-signal', async (data) => {
                if (!this.peerConnection) {
                    this.peerConnection = new RTCPeerConnection(this.rtcConfig);
                    this.peerConnection.onicecandidate = event => {
                        if (event.candidate) {
                            this.socket.emit('voice-signal', { type: 'candidate', candidate: event.candidate, teamCode: this.teamCode });
                        }
                    };
                    this.peerConnection.ontrack = event => {
                        let remoteAudio = document.getElementById('remote-audio');
                        if (!remoteAudio) {
                            remoteAudio = document.createElement('audio');
                            remoteAudio.id = 'remote-audio';
                            remoteAudio.autoplay = true;
                            document.body.appendChild(remoteAudio);
                        }
                        remoteAudio.srcObject = event.streams[0];
                    };
                }
                if (data.type === 'offer') {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));
                    const answer = await this.peerConnection.createAnswer();
                    await this.peerConnection.setLocalDescription(answer);
                    this.socket.emit('voice-signal', { type: 'answer', answer, teamCode: this.teamCode });
                } else if (data.type === 'answer') {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                } else if (data.type === 'candidate') {
                    if (data.candidate) {
                        try {
                            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                        } catch (err) {
                            console.error('Error adding received ice candidate', err);
                        }
                    }
                }
            });
        }
    }

    initializeChat() {
        this.chatInput = document.getElementById('chat-input');
        this.sendMessageBtn = document.getElementById('send-message-btn');
        this.chatMessagesContainer = document.getElementById('chat-messages');
        
        // Chat event listeners
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    initializeEmoji() {
        this.emojiBtn = document.getElementById('emoji-btn');
        this.emojiPicker = document.getElementById('emoji-picker');
        
        // Emoji button event listener
        this.emojiBtn.addEventListener('click', () => {
            this.toggleEmojiPicker();
        });
        
        // Close emoji picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.emojiPicker.contains(e.target) && !this.emojiBtn.contains(e.target)) {
                this.closeEmojiPicker();
            }
        });
        
        // Initialize emoji grid
        this.createEmojiGrid();
    }

    setMultiplayerStatus(isMultiplayer) {
        console.log('[DEBUG] setMultiplayerStatus called with:', isMultiplayer);
        this.isMultiplayer = isMultiplayer;
        const multiplayerStatus = document.getElementById('multiplayer-status');
        const createBtn = document.getElementById('create-game-btn');
        const joinBtn = document.getElementById('join-game-btn');
        const randomMatchBtn = document.getElementById('random-match-btn');
        const leaveBtn = document.getElementById('leave-game-btn');
        const teamCodeSection = document.getElementById('team-code-section');
        const chatSection = document.getElementById('chat-section');
        const emojiBtn = document.getElementById('emoji-btn');
        
        console.log('[DEBUG] setMultiplayerStatus: chatSection found:', !!chatSection);
        console.log('[DEBUG] setMultiplayerStatus: emojiBtn found:', !!emojiBtn);
        
        if (isMultiplayer) {
            console.log('[DEBUG] setMultiplayerStatus: setting multiplayer UI');
            multiplayerStatus.style.display = 'block';
            createBtn.style.display = 'none';
            joinBtn.style.display = 'none';
            randomMatchBtn.style.display = 'none';
            leaveBtn.style.display = 'block';
            teamCodeSection.style.display = 'block';
            chatSection.style.display = 'flex';
            emojiBtn.style.display = 'block';
            
            console.log('[DEBUG] setMultiplayerStatus: chatSection display set to:', chatSection.style.display);
            console.log('[DEBUG] setMultiplayerStatus: emojiBtn display set to:', emojiBtn.style.display);
            
            document.getElementById('player-role').textContent = 
                `Playing as ${this.playerColor === 'white' ? 'White' : 'Black'}`;
        } else {
            console.log('[DEBUG] setMultiplayerStatus: setting local play UI');
            multiplayerStatus.style.display = 'none';
            createBtn.style.display = 'block';
            joinBtn.style.display = 'block';
            randomMatchBtn.style.display = 'block';
            leaveBtn.style.display = 'none';
            teamCodeSection.style.display = 'none';
            chatSection.style.display = 'none';
            emojiBtn.style.display = 'none';
        }
    }

    showTeamCode() {
        document.getElementById('team-code').textContent = this.teamCode;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    renderBoard() {
        const boardDiv = document.getElementById('chess-board');
        boardDiv.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = 'square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
                square.setAttribute('data-row', row);
                square.setAttribute('data-col', col);
                const piece = this.board[row][col];
                if (piece) {
                    const img = document.createElement('img');
                    img.src = this.getPieceImage(piece);
                    img.className = 'piece-img';
                    img.draggable = false;
                    img.alt = piece.type;
                    square.appendChild(img);
                }
                // Prevent clicking opponent's pieces in multiplayer
                if (this.isMultiplayer) {
                    const piece = this.board[row][col];
                    if (piece && piece.color !== this.playerColor) {
                        // Disable click for opponent's pieces
                        square.onclick = null;
                    } else {
                        square.onclick = () => this.handleSquareClick(row, col);
                    }
                } else {
                    square.onclick = () => this.handleSquareClick(row, col);
                }
                boardDiv.appendChild(square);
            }
        }
    }

    handleSquareClick(row, col) {
        if (this.gameOver) {
            console.log('[DEBUG] handleSquareClick: gameOver is true, ignoring click');
            return;
        }
        const piece = this.board[row][col];
        // Multiplayer: Only allow moving your own pieces and only on your turn
        if (this.isMultiplayer) {
            console.log('[DEBUG] handleSquareClick: multiplayer mode');
            console.log('[DEBUG] playerColor:', this.playerColor);
            console.log('[DEBUG] currentPlayer:', this.currentPlayer);
            console.log('[DEBUG] isMultiplayer:', this.isMultiplayer);
            
            if (!this.playerColor || this.playerColor !== this.currentPlayer) {
                console.log('[DEBUG] handleSquareClick: not your turn or playerColor not set');
                console.log('[DEBUG] playerColor:', this.playerColor, 'currentPlayer:', this.currentPlayer);
                return;
            }
            if (!this.selectedSquare) {
                if (piece && piece.color === this.playerColor) {
                    console.log('[DEBUG] handleSquareClick: selecting piece at', row, col);
                    this.selectedSquare = [row, col];
                    this.clearHighlights();
                    this.highlightSquare(row, col, 'selected');
                    this.highlightValidMoves(row, col);
                } else {
                    console.log('[DEBUG] handleSquareClick: cannot select piece - piece:', piece, 'playerColor:', this.playerColor);
                }
            } else {
                const [fromRow, fromCol] = this.selectedSquare;
                if (fromRow === row && fromCol === col) {
                    this.selectedSquare = null;
                    this.clearHighlights();
                    return;
                }
                // Only allow moving your own piece
                const fromPiece = this.board[fromRow][fromCol];
                if (!fromPiece || fromPiece.color !== this.playerColor) {
                    this.selectedSquare = null;
                    this.clearHighlights();
                    return;
                }
                if (this.isValidMove(fromRow, fromCol, row, col)) {
                    console.log('[DEBUG] handleSquareClick: making move from', fromRow, fromCol, 'to', row, col);
                    // Emit move to server, do not update board locally
                    if (this.socket) {
                        this.socket.emit('makeMove', { fromRow, fromCol, toRow: row, toCol: col });
                    }
                    this.selectedSquare = null;
                    this.clearHighlights();
                } else {
                    console.log('[DEBUG] handleSquareClick: invalid move');
                    // If clicked another of your own pieces, select it
                    if (piece && piece.color === this.playerColor) {
                        this.selectedSquare = [row, col];
                        this.clearHighlights();
                        this.highlightSquare(row, col, 'selected');
                        this.highlightValidMoves(row, col);
                    } else {
                        this.selectedSquare = null;
                        this.clearHighlights();
                    }
                }
            }
            return;
        }
        // Local play (not multiplayer)
        if (!this.selectedSquare) {
            if (piece && piece.color === this.currentPlayer) {
                this.selectedSquare = [row, col];
                this.clearHighlights();
                this.highlightSquare(row, col, 'selected');
                this.highlightValidMoves(row, col);
            }
        } else {
            const [fromRow, fromCol] = this.selectedSquare;
            if (fromRow === row && fromCol === col) {
                this.selectedSquare = null;
                this.clearHighlights();
                return;
            }
            if (this.isValidMove(fromRow, fromCol, row, col)) {
                this.makeMove(fromRow, fromCol, row, col);
                this.selectedSquare = null;
                this.clearHighlights();
            } else {
                if (piece && piece.color === this.currentPlayer) {
                    this.selectedSquare = [row, col];
                    this.clearHighlights();
                    this.highlightSquare(row, col, 'selected');
                    this.highlightValidMoves(row, col);
                } else {
                    this.selectedSquare = null;
                    this.clearHighlights();
                }
            }
        }
    }

    clearHighlights() {
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            square.classList.remove('selected', 'valid-move', 'check', 'last-move-from', 'last-move-to');
        });
    }

    highlightSquare(row, col, className) {
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.add(className);
        }
    }

    getPieceImage(piece) {
        if (!piece) return '';
        const color = piece.color[0]; // 'w' or 'b'
        const typeMap = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: 'P' };
        return `assets/pieces/${color}${typeMap[piece.type]}.svg`;
    }

    // Play sound by ID
    playSound(id) {
        const audio = document.getElementById(id);
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        }
    }

    async animatePieceMoveAbsolute(fromRow, fromCol, toRow, toCol) {
        const boardDiv = document.getElementById('chess-board');
        const fromSquare = document.querySelector(`[data-row="${fromRow}"][data-col="${fromCol}"]`);
        const toSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
        if (!fromSquare || !toSquare) return;
        const piece = this.board[fromRow][fromCol];
        if (!piece) return;
        // Get bounding rects
        const boardRect = boardDiv.getBoundingClientRect();
        const fromRect = fromSquare.getBoundingClientRect();
        const toRect = toSquare.getBoundingClientRect();
        // Create floating img
        const img = document.createElement('img');
        img.src = this.getPieceImage(piece);
        img.className = 'piece-img floating-piece';
        img.style.position = 'fixed';
        img.style.left = fromRect.left + 'px';
        img.style.top = fromRect.top + 'px';
        img.style.width = fromRect.width + 'px';
        img.style.height = fromRect.height + 'px';
        img.style.pointerEvents = 'none';
        img.style.zIndex = 1000;
        document.body.appendChild(img);
        // Animate
        await new Promise(resolve => requestAnimationFrame(resolve));
        img.style.transition = 'left 0.35s cubic-bezier(.4,2,.6,1), top 0.35s cubic-bezier(.4,2,.6,1)';
        img.style.left = toRect.left + 'px';
        img.style.top = toRect.top + 'px';
        await new Promise(resolve => setTimeout(resolve, 370));
        document.body.removeChild(img);
    }

    // Update makeMove to use the new animation
    async makeMove(fromRow, fromCol, toRow, toCol) {
        if (this.gameOver) return;
        
        const piece = this.board[fromRow][fromCol];
        if (!piece || piece.color !== this.currentPlayer) return;
        
        if (!this.isValidMove(fromRow, fromCol, toRow, toCol)) return;
        
        // Store piece info before moving for robot notation
        const originalPiece = { ...piece };
        const capturedPiece = this.board[toRow][toCol];
        
        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Update move history
        const moveNotation = this.getMoveNotation(fromRow, fromCol, toRow, toCol, originalPiece, capturedPiece);
        this.moveHistory.push({
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece.type,
            notation: moveNotation,
            player: this.currentPlayer
        });
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Clear selection
        this.selectedSquare = null;
        this.clearHighlights();
        
        // Animate the move
        await this.animatePieceMoveAbsolute(fromRow, fromCol, toRow, toCol);
        
        // Update UI
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();

        // If playing against robot, send move to backend and get robot move
        if (this.isRobotGame && this.robotGameId) {
            const robotMoveNotation = this.getMoveNotation(fromRow, fromCol, toRow, toCol, originalPiece, capturedPiece);
            const res = await fetch('https://chessvoice-backend.onrender.com/api/robot/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: this.robotGameId,
                    move: robotMoveNotation,
                    difficulty: this.robotDifficulty
                })
            });
            const data = await res.json();
            if (data.error) {
                this.showNotification('Robot error: ' + data.error, 'error');
                return;
            }
            // Update board with robot move
            if (data.robotMove) {
                // Parse robot move notation and update board directly (avoid recursive makeMove)
                const fromSquare = data.robotMove.slice(0, 2);
                const toSquare = data.robotMove.slice(2, 4);
                
                // Convert algebraic notation to coordinates
                const fromCoords = this.algebraicToCoords(fromSquare);
                const toCoords = this.algebraicToCoords(toSquare);
                
                if (fromCoords && toCoords) {
                    // Directly update board for robot move
                    const robotPiece = this.board[fromCoords[0]][fromCoords[1]];
                    if (robotPiece) {
                        this.board[toCoords[0]][toCoords[1]] = robotPiece;
                        this.board[fromCoords[0]][fromCoords[1]] = null;
                        
                        // Update move history
                        const robotMoveNotation = this.getMoveNotation(fromCoords[0], fromCoords[1], toCoords[0], toCoords[1], robotPiece, null);
                        this.moveHistory.push({
                            from: [fromCoords[0], fromCoords[1]],
                            to: [toCoords[0], toCoords[1]],
                            piece: robotPiece.type,
                            notation: robotMoveNotation,
                            player: this.currentPlayer
                        });
                        
                        // Switch players back
                        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
                        
                        // Update UI
                        this.renderBoard();
                        this.updateGameInfo();
                        this.updateMoveHistory();
                    }
                }
            }
            if (data.gameOver) {
                this.gameOver = true;
                this.showNotification('Game Over! ' + (data.result || ''), 'info');
            }
        }
    }

    notationToCoords(notation) {
        // Convert UCI notation (e.g., e2e4) to [row, col]
        // Stockfish returns moves in UCI format: fromSquare + toSquare (e.g., "e2e4")
        if (!notation || notation.length !== 4) return null;
        
        // Extract the from square (first 2 characters)
        const fromSquare = notation.slice(0, 2);
        
        const file = notation.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = 8 - parseInt(notation[1]);
        if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
        return [rank, file];
    }

    algebraicToCoords(square) {
        // Convert algebraic notation (e.g., "e2") to [row, col]
        if (!square || square.length !== 2) return null;
        
        const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = 8 - parseInt(square[1]);
        
        if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
        return [rank, file];
    }

    // Update handleMoveMade for online moves
    handleMoveMade(data) {
        // Always update board and state from server for robustness
        const { board, currentPlayer, gameOver, gameEnd, moveHistory, move } = data;
        this.board = board;
        this.currentPlayer = currentPlayer;
        this.gameOver = gameOver;
        this.moveHistory = moveHistory || this.moveHistory;
        if (move) {
            this.animatePieceMoveAbsolute(move.from[0], move.from[1], move.to[0], move.to[1]).then(() => {
                this.renderBoard();
                this.updateGameInfo();
                this.updateMoveHistory();
                if (gameOver && gameEnd && typeof gameEnd === 'string' && gameEnd.includes('checkmate')) {
                    let winner = 'Unknown';
                    if (gameEnd.includes('White wins')) {
                        winner = 'White';
                    } else if (gameEnd.includes('Black wins')) {
                        winner = 'Black';
                    }
                    this.showCheckmateModal(winner);
                }
            });
        } else {
            this.renderBoard();
            this.updateGameInfo();
            this.updateMoveHistory();
            if (gameOver && gameEnd && typeof gameEnd === 'string' && gameEnd.includes('checkmate')) {
                let winner = 'Unknown';
                if (gameEnd.includes('White wins')) {
                    winner = 'White';
                } else if (gameEnd.includes('Black wins')) {
                    winner = 'Black';
                }
                this.showCheckmateModal(winner);
            }
        }
    }

    getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
        // Add null checks
        if (!piece) {
            console.warn('getMoveNotation: piece is null or undefined');
            return '??';
        }
        
        const files = 'abcdefgh';
        const ranks = '87654321';
        
        let notation = '';
        
        if (piece.type !== 'pawn') {
            notation += piece.type.charAt(0).toUpperCase();
        }
        
        if (capturedPiece) {
            if (piece.type === 'pawn') {
                notation += files[fromCol];
            }
            notation += 'x';
        }
        
        notation += files[toCol] + ranks[toRow];
        
        return notation;
    }

    isKingInCheck(board, color) {
        // Find king position
        let kingRow, kingCol;
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
        
        // Check if any opponent piece can attack the king
        const opponentColor = color === 'white' ? 'black' : 'white';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.color === opponentColor) {
                    if (this.canPieceAttack(board, row, col, kingRow, kingCol)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    canPieceAttack(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        if (!piece) return false;
        
        // Create a clone of the board to avoid modifying the original
        const tempBoard = board.map(row => row.map(piece => piece ? { ...piece } : null));
        
        // Temporarily set the target square to null to check if the piece can move there
        tempBoard[toRow][toCol] = null;
        
        let canAttack = false;
        switch (piece.type) {
            case 'pawn':
                canAttack = this.canPawnAttack(tempBoard, fromRow, fromCol, toRow, toCol);
                break;
            case 'rook':
                canAttack = this.canRookAttack(tempBoard, fromRow, fromCol, toRow, toCol);
                break;
            case 'knight':
                canAttack = this.canKnightAttack(tempBoard, fromRow, fromCol, toRow, toCol);
                break;
            case 'bishop':
                canAttack = this.canBishopAttack(tempBoard, fromRow, fromCol, toRow, toCol);
                break;
            case 'queen':
                canAttack = this.canQueenAttack(tempBoard, fromRow, fromCol, toRow, toCol);
                break;
            case 'king':
                canAttack = this.canKingAttack(tempBoard, fromRow, fromCol, toRow, toCol);
                break;
        }
        
        return canAttack;
    }

    // Attack validation functions that work with a specific board
    canPawnAttack(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const direction = piece.color === 'white' ? -1 : 1;
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);
        
        // Pawns can only attack diagonally
        if (colDiff === 1 && rowDiff === direction) {
            return true; // Pawn can attack this square
        }
        
        return false;
    }

    canRookAttack(board, fromRow, fromCol, toRow, toCol) {
        if (fromRow !== toRow && fromCol !== toCol) return false;
        return this.isPathClearForAttack(board, fromRow, fromCol, toRow, toCol);
    }

    canKnightAttack(board, fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    canBishopAttack(board, fromRow, fromCol, toRow, toCol) {
        if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
        return this.isPathClearForAttack(board, fromRow, fromCol, toRow, toCol);
    }

    canQueenAttack(board, fromRow, fromCol, toRow, toCol) {
        return this.canRookAttack(board, fromRow, fromCol, toRow, toCol) || 
               this.canBishopAttack(board, fromRow, fromCol, toRow, toCol);
    }

    canKingAttack(board, fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return rowDiff <= 1 && colDiff <= 1;
    }

    isPathClearForAttack(board, fromRow, fromCol, toRow, toCol) {
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

    checkGameEnd() {
        const opponentColor = this.currentPlayer === 'white' ? 'black' : 'white';
        if (this.isKingInCheck(this.board, this.currentPlayer)) {
            // Check for checkmate
            if (this.isCheckmate(this.currentPlayer)) {
                this.gameOver = true;
                console.log('[DEBUG] gameOver set to true (checkmate)');
                document.getElementById('game-status').textContent = `${opponentColor.charAt(0).toUpperCase() + opponentColor.slice(1)} wins by checkmate!`;
                this.renderBoard();
                this.updateGameInfo();
                this.showCheckmateModal(opponentColor.charAt(0).toUpperCase() + opponentColor.slice(1));
                return;
            }
            // Check for stalemate
            if (this.isStalemate(this.currentPlayer)) {
                this.gameOver = true;
                console.log('[DEBUG] gameOver set to true (stalemate)');
                document.getElementById('game-status').textContent = 'Draw by stalemate!';
                this.renderBoard();
                this.updateGameInfo();
                return;
            }
        } else if (this.isStalemate(this.currentPlayer)) {
            this.gameOver = true;
            console.log('[DEBUG] gameOver set to true (stalemate)');
            document.getElementById('game-status').textContent = 'Draw by stalemate!';
            this.renderBoard();
            this.updateGameInfo();
            return;
        }
        // Highlight king in check
        this.highlightKingInCheck();
    }

    isCheckmate(color) {
        // Check if any legal move exists
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(row, col, toRow, toCol)) {
                                return false;
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    isStalemate(color) {
        if (this.isKingInCheck(this.board, color)) return false;
        
        // Check if any legal move exists
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(row, col, toRow, toCol)) {
                                return false;
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    highlightKingInCheck() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === this.currentPlayer) {
                    this.highlightSquare(row, col, 'check');
                    break;
                }
            }
        }
    }

    cloneBoard() {
        return this.board.map(row => row.map(piece => piece ? { ...piece } : null));
    }

    updateGameInfo() {
        document.getElementById('current-turn').textContent = 
            this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1);
        
        if (!this.gameOver) {
            document.getElementById('game-status').textContent = 'Game in progress';
        }
    }

    updateMoveHistory() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = '';

        // Create a table-like structure for move history
        const table = document.createElement('div');
        table.className = 'move-history-table';

        // Header row
        const header = document.createElement('div');
        header.className = 'move-history-header';
        header.innerHTML = '<span class="move-number">#</span><span class="move-white">White</span><span class="move-black">Black</span>';
        table.appendChild(header);

        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const row = document.createElement('div');
            row.className = 'move-history-row';

            const moveNumber = document.createElement('span');
            moveNumber.className = 'move-number';
            moveNumber.textContent = `${Math.floor(i / 2) + 1}.`;

            const whiteMove = document.createElement('span');
            whiteMove.className = 'move-white';
            whiteMove.textContent = this.moveHistory[i] ? this.moveHistory[i].notation : '';

            const blackMove = document.createElement('span');
            blackMove.className = 'move-black';
            blackMove.textContent = (i + 1 < this.moveHistory.length && this.moveHistory[i + 1]) ? this.moveHistory[i + 1].notation : '';

            row.appendChild(moveNumber);
            row.appendChild(whiteMove);
            row.appendChild(blackMove);
            table.appendChild(row);
        }

        moveList.appendChild(table);
        moveList.scrollTop = moveList.scrollHeight;
    }

    newGame() {
        // If in multiplayer mode, leave the current game first
        if (this.isMultiplayer) {
            this.leaveGame();
            return; // leaveGame() will call newGame() again after cleanup
        }
        
        // Reset game state
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameOver = false;
        this.isMultiplayer = false;
        this.teamCode = null;
        this.playerColor = null;
        this.opponentName = null;
        this.chatMessages = [];
        
        // Clear highlights and update UI
        this.clearHighlights();
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        
        // Reset multiplayer UI
        this.setMultiplayerStatus(false);
        
        // Clear chat
        if (this.chatMessagesContainer) {
            this.chatMessagesContainer.innerHTML = '';
        }
        
        // Hide checkmate modal if it's open
        const modal = document.getElementById('checkmate-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // 4. Reset captured pieces in newGame
        // this.capturedWhite = [];
        // this.capturedBlack = [];
        
        console.log('New game started');
        // this.renderCapturedPieces();
    }

    showCheckmateModal(winner) {
        console.log('[DEBUG] showCheckmateModal called with winner:', winner);
        const modal = document.getElementById('checkmate-modal');
        const title = document.getElementById('checkmate-title');
        const message = document.getElementById('checkmate-message');
        const viewFinalBtn = document.getElementById('view-final-position-btn');
        const newGameBtn = document.getElementById('new-game-after-checkmate');

        if (title) title.textContent = 'Checkmate!';
        if (message) message.textContent = `${winner} wins by checkmate!`;

        // Store winner information for final position view
        this.gameWinner = winner;
        this.gameEndReason = 'checkmate';

        if (modal) modal.style.display = 'block';

        // Remove previous listeners to avoid duplicates
        if (viewFinalBtn) {
            viewFinalBtn.onclick = () => {
                this.showFinalPosition();
            };
        }
        if (newGameBtn) {
            newGameBtn.onclick = () => {
                modal.style.display = 'none';
                this.newGame();
            };
        }
    }

    // Voice Chat Functions
    async startVoiceChat() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('Voice chat is not supported in this browser or context. Please use a modern browser and access the site via http://localhost:3000 or https://...');
                return;
            }
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.peerConnection = new RTCPeerConnection(this.rtcConfig);
            this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));
            this.peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    this.socket.emit('voice-signal', { type: 'candidate', candidate: event.candidate, teamCode: this.teamCode });
                }
            };
            this.peerConnection.ontrack = event => {
                // Play remote audio
                let remoteAudio = document.getElementById('remote-audio');
                if (!remoteAudio) {
                    remoteAudio = document.createElement('audio');
                    remoteAudio.id = 'remote-audio';
                    remoteAudio.autoplay = true;
                    document.body.appendChild(remoteAudio);
                }
                remoteAudio.srcObject = event.streams[0];
            };
            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.socket.emit('voice-signal', { type: 'offer', offer, teamCode: this.teamCode });
            this.isVoiceChatActive = true;
            if (this.startVoiceBtn) this.startVoiceBtn.style.display = 'none';
            if (this.muteVoiceBtn) this.muteVoiceBtn.style.display = '';
        } catch (err) {
            alert('Could not start voice chat: ' + err.message);
        }
    }

    // Voice Chat UI
    setVoiceChatUI(online) {
        if (this.startVoiceBtn && this.muteVoiceBtn) {
            this.startVoiceBtn.style.display = online ? '' : 'none';
            this.muteVoiceBtn.style.display = 'none';
        }
    }

    // Chat Functions
    sendMessage() {
        console.log('[DEBUG] sendMessage called');
        console.log('[DEBUG] isMultiplayer:', this.isMultiplayer);
        console.log('[DEBUG] chatInput:', this.chatInput);
        
        if (!this.isMultiplayer || !this.chatInput) {
            console.log('[DEBUG] sendMessage: cannot send - isMultiplayer:', this.isMultiplayer, 'chatInput exists:', !!this.chatInput);
            return;
        }
        
        const message = this.chatInput.value.trim();
        console.log('[DEBUG] sendMessage: message:', message);
        
        if (message.length === 0) {
            console.log('[DEBUG] sendMessage: empty message, not sending');
            return;
        }
        
        console.log('[DEBUG] sendMessage: sending message via socket');
        // Send message to server
        this.socket.emit('sendMessage', message);
        
        // Clear input
        this.chatInput.value = '';
    }

    renderChatMessages() {
        if (!this.chatMessagesContainer) return;
        
        this.chatMessagesContainer.innerHTML = '';
        
        this.chatMessages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = `chat-message ${msg.type}`;
            
            if (msg.type === 'system') {
                messageElement.textContent = msg.message;
            } else {
                // User message
                const senderElement = document.createElement('div');
                senderElement.className = 'sender';
                senderElement.textContent = msg.sender;
                
                const messageText = document.createElement('div');
                messageText.textContent = msg.message;
                
                const timestampElement = document.createElement('div');
                timestampElement.className = 'timestamp';
                timestampElement.textContent = new Date(msg.timestamp).toLocaleTimeString();
                
                messageElement.appendChild(senderElement);
                messageElement.appendChild(messageText);
                messageElement.appendChild(timestampElement);
                
                // Determine if message is sent or received
                if (msg.senderColor === this.playerColor) {
                    messageElement.classList.add('sent');
                } else {
                    messageElement.classList.add('received');
                }
            }
            
            this.chatMessagesContainer.appendChild(messageElement);
        });
        
        // Scroll to bottom
        this.chatMessagesContainer.scrollTop = this.chatMessagesContainer.scrollHeight;
    }

    // Emoji Functions
    toggleEmojiPicker() {
        if (this.isEmojiPickerOpen) {
            this.closeEmojiPicker();
        } else {
            this.openEmojiPicker();
        }
    }

    openEmojiPicker() {
        this.emojiPicker.style.display = 'block';
        this.isEmojiPickerOpen = true;
        this.emojiBtn.style.background = 'linear-gradient(135deg, #ee5a52, #d63031)';
    }

    closeEmojiPicker() {
        this.emojiPicker.style.display = 'none';
        this.isEmojiPickerOpen = false;
        this.emojiBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
    }

    createEmojiGrid() {
        const emojis = [
            '😊', '😂', '🤣', '❤️', '😍', '😎', '🤔', '😮',
            '😢', '😡', '🤯', '😴', '🤗', '🤫', '🤐', '😶',
            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👊',
            '🎉', '🎊', '🎈', '🎁', '🎂', '🎄', '🎃', '👻',
            '⚡', '🔥', '💧', '🌊', '🌍', '🌙', '⭐', '🌈',
            '🏆', '🥇', '🥈', '🥉', '🎯', '🎲', '♟️', '♔',
            '😄', '😅', '😆', '😉', '😋', '😘', '😗', '😙',
            '😚', '🙂', '🤗', '🤔', '🤨', '😐', '😑', '😶'
        ];

        const emojiGrid = document.createElement('div');
        emojiGrid.className = 'emoji-grid';

        emojis.forEach(emoji => {
            const emojiButton = document.createElement('button');
            emojiButton.className = 'emoji-item';
            emojiButton.textContent = emoji;
            emojiButton.addEventListener('click', () => {
                this.insertEmoji(emoji);
            });
            emojiGrid.appendChild(emojiButton);
        });

        this.emojiPicker.appendChild(emojiGrid);
    }

    insertEmoji(emoji) {
        if (!this.chatInput) return;
        
        const cursorPos = this.chatInput.selectionStart;
        const textBefore = this.chatInput.value.substring(0, cursorPos);
        const textAfter = this.chatInput.value.substring(cursorPos);
        
        this.chatInput.value = textBefore + emoji + textAfter;
        
        // Set cursor position after the emoji
        const newCursorPos = cursorPos + emoji.length;
        this.chatInput.setSelectionRange(newCursorPos, newCursorPos);
        
        // Focus back to input
        this.chatInput.focus();
        
        // Close emoji picker
        this.closeEmojiPicker();
    }

    initializeIntro() {
        const introScreen = document.getElementById('intro-screen');
        const loadingText = document.querySelector('.loading-text');
        
        // Enhanced loading process with more steps
        const loadingSteps = [
            'Initializing Chess Engine...',
            'Loading Game Components...',
            'Setting up Multiplayer System...',
            'Configuring Voice Chat...',
            'Preparing Chat Interface...',
            'Loading User Interface...',
            'Establishing Database Connection...',
            'ChessVoice Ready!'
        ];
        
        let currentStep = 0;
        
        const updateLoadingText = () => {
            if (currentStep < loadingSteps.length) {
                loadingText.textContent = loadingSteps[currentStep];
                currentStep++;
            }
        };
        
        // Update loading text every 800ms for longer duration
        const textInterval = setInterval(updateLoadingText, 800);
        
        // Show intro for 6.4 seconds (8 steps * 800ms) then fade out
        setTimeout(() => {
            clearInterval(textInterval);
            loadingText.textContent = 'Welcome to ChessVoice!';
            
            // Add fade-out animation
            introScreen.classList.add('fade-out');
            
            // Remove intro screen after animation
            setTimeout(() => {
                introScreen.style.display = 'none';
                // Enable scrolling on body
                document.body.style.overflow = 'auto';
            }, 1000);
        }, 6400); // Extended from 3000ms to 6400ms
        
        // Disable scrolling during intro
        document.body.style.overflow = 'hidden';
    }

    // Debug method to check all white moves
    debugWhiteMoves() {
        console.log('=== DEBUGGING WHITE MOVES ===');
        console.log('Current player:', this.currentPlayer);
        console.log('Board state:');
        for (let row = 0; row < 8; row++) {
            let rowStr = '';
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    rowStr += `${piece.color.charAt(0)}${piece.type.charAt(0)} `;
                } else {
                    rowStr += '-- ';
                }
            }
            console.log(`Row ${row}: ${rowStr}`);
        }
        
        console.log('\nChecking all white pieces for valid moves:');
        let whiteHasMoves = false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === 'white') {
                    console.log(`\nWhite ${piece.type} at [${row}, ${col}]:`);
                    let pieceHasMoves = false;
                    
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(row, col, toRow, toCol)) {
                                console.log(`  Can move to [${toRow}, ${toCol}]`);
                                pieceHasMoves = true;
                                whiteHasMoves = true;
                            }
                        }
                    }
                    
                    if (!pieceHasMoves) {
                        console.log(`  No valid moves available`);
                    }
                }
            }
        }
        
        console.log(`\nWhite has moves: ${whiteHasMoves}`);
        console.log('=== END DEBUG ===');
    }

    showFinalPosition() {
        // Hide the checkmate modal
        const checkmateModal = document.getElementById('checkmate-modal');
        checkmateModal.style.display = 'none';
        
        // Show the game interface if it's not already visible
        this.showGameInterface();
        
        // Render the final board state
        this.renderBoard();
        
        // Highlight the last move if there are moves in history
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            this.highlightSquare(lastMove.from[0], lastMove.from[1], 'last-move-from');
            this.highlightSquare(lastMove.to[0], lastMove.to[1], 'last-move-to');
            
            // Show detailed information about the last move
            const lastMoveInfo = `Last move: ${lastMove.piece.type} from ${this.getSquareNotation(lastMove.from[0], lastMove.from[1])} to ${this.getSquareNotation(lastMove.to[0], lastMove.to[1])}`;
            this.showNotification(lastMoveInfo, 'info');
        }
        
        // Update game info to show final state
        this.updateGameInfo();
        this.updateMoveHistory();
        
        // Show game result information
        if (this.gameWinner && this.gameEndReason) {
            const resultInfo = `Game Result: ${this.gameWinner} wins by ${this.gameEndReason}!`;
            document.getElementById('game-status').textContent = resultInfo;
        }
        
        // Show a notification about the final position
        this.showNotification('Viewing final position. Click "New Game" to start a new game.', 'info');
        
        // Disable board interactions while viewing final position
        this.gameOver = true;
        
        console.log('Showing final position with last move highlighted');
    }
    
    // Helper function to convert board coordinates to chess notation
    getSquareNotation(row, col) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        return files[col] + ranks[row];
    }

    initializeRandomMatch() {
        // Random match button
        const randomMatchBtn = document.getElementById('random-match-btn');
        randomMatchBtn.addEventListener('click', () => {
            this.showRandomMatchModal();
        });

        // Random match modal elements
        const randomMatchModal = document.getElementById('random-match-modal');
        const startRandomMatchBtn = document.getElementById('start-random-match');
        const cancelRandomMatchBtn = document.getElementById('cancel-random-match');
        const closeRandomMatchBtn = randomMatchModal.querySelector('.close');

        // Start random match
        startRandomMatchBtn.addEventListener('click', () => {
            this.startRandomMatch();
        });

        // Cancel random match
        cancelRandomMatchBtn.addEventListener('click', () => {
            this.cancelRandomMatch();
        });

        // Close modal
        closeRandomMatchBtn.addEventListener('click', () => {
            this.hideRandomMatchModal();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === randomMatchModal) {
                this.hideRandomMatchModal();
            }
        });

        // Connect to opponent button
        const connectBtn = document.getElementById('connect-to-opponent');
        connectBtn.addEventListener('click', () => {
            this.connectToRandomMatch();
        });

        // Decline match button
        const declineBtn = document.getElementById('decline-match');
        declineBtn.addEventListener('click', () => {
            this.declineRandomMatch();
        });
    }

    // Random Matching Methods
    showRandomMatchModal() {
        const modal = document.getElementById('random-match-modal');
        modal.style.display = 'block';
        this.resetRandomMatchUI();
        
        // Request current matchmaking stats
        if (this.socket) {
            this.socket.emit('requestMatchmakingStats');
        }
    }

    hideRandomMatchModal() {
        const modal = document.getElementById('random-match-modal');
        modal.style.display = 'none';
        this.resetRandomMatchUI();
    }

    resetRandomMatchUI() {
        const matchStatus = document.getElementById('match-status');
        const startBtn = document.getElementById('start-random-match');
        const cancelBtn = document.getElementById('cancel-random-match');
        const matchInfo = document.getElementById('match-info');
        const connectOptions = matchInfo.querySelector('.connect-options');

        matchStatus.style.display = 'none';
        startBtn.style.display = 'block';
        cancelBtn.style.display = 'none';
        matchInfo.style.display = 'none';
        if (connectOptions) {
            connectOptions.style.display = 'none';
        }
    }

    updateRandomMatchUI(status, opponentData = null) {
        const matchStatus = document.getElementById('match-status');
        const startBtn = document.getElementById('start-random-match');
        const cancelBtn = document.getElementById('cancel-random-match');
        const matchInfo = document.getElementById('match-info');
        const searchingAnimation = matchStatus.querySelector('.searching-animation');

        matchStatus.style.display = 'block';
        startBtn.style.display = 'none';
        cancelBtn.style.display = 'block';

        switch (status) {
            case 'searching':
                searchingAnimation.style.display = 'flex';
                matchInfo.style.display = 'none';
                break;
            case 'found':
                searchingAnimation.style.display = 'none';
                matchInfo.style.display = 'block';
                
                if (opponentData) {
                    document.getElementById('opponent-name').textContent = opponentData.username;
                    document.getElementById('opponent-rating').textContent = opponentData.rating;
                    document.getElementById('opponent-gender').textContent = this.formatGender(opponentData.gender);
                }
                
                // Show connect options
                const connectOptions = matchInfo.querySelector('.connect-options');
                if (connectOptions) {
                    connectOptions.style.display = 'flex';
                }
                break;
            case 'error':
            case 'cancelled':
                this.hideRandomMatchModal();
                break;
        }
    }

    formatGender(gender) {
        const genderMap = {
            'male': 'Male',
            'female': 'Female',
            'other': 'Other',
            'prefer-not-to-say': 'Prefer not to say'
        };
        return genderMap[gender] || gender;
    }

    startRandomMatch() {
        if (!this.currentUser) {
            this.showNotification('Please log in to use random matching', 'error');
            return;
        }

        // Get user preferences
        const genderPreference = document.querySelector('input[name="gender-preference"]:checked').value;
        const skillRange = document.getElementById('skill-range').value;

        const preferences = {
            genderPreference,
            skillRange
        };

        // Save preferences for auto-retry
        this.lastRandomMatchPreferences = preferences;

        // Send preferences to server
        this.socket.emit('startRandomMatch', { preferences });
    }

    cancelRandomMatch() {
        this.socket.emit('cancelRandomMatch');
        this.hideRandomMatchModal();
    }

    connectToRandomMatch() {
        if (this.teamCode) {
            this.socket.emit('joinRandomMatch', { teamCode: this.teamCode });
            this.hideRandomMatchModal();
            this.showNotification('Sending approval request to opponent...', 'info');
        }
    }

    declineRandomMatch() {
        if (this.teamCode) {
            this.socket.emit('declineRandomMatch', { teamCode: this.teamCode });
            this.teamCode = null;
        }
        this.hideRandomMatchModal();
    }

    // Matchmaking statistics
    updateMatchmakingStats(stats) {
        // Always update the main UI count
        const countElem = document.getElementById('random-search-count');
        if (countElem) {
            countElem.textContent = stats.total;
        }
        // Update the random match modal with current statistics
        const modal = document.getElementById('random-match-modal');
        if (modal.style.display === 'block') {
            const statsElement = document.getElementById('matchmaking-stats');
            if (statsElement) {
                statsElement.style.display = 'block';
                document.getElementById('searching-count').textContent = stats.total;
                document.getElementById('male-count').textContent = stats.byGender.male;
                document.getElementById('female-count').textContent = stats.byGender.female;
                document.getElementById('other-count').textContent = stats.byGender.other + stats.byGender['prefer-not-to-say'];
            }
        }
    }

    showConnectionRequestModal(requestingPlayer) {
        const modal = document.getElementById('connection-request-modal');
        const playerName = document.getElementById('requesting-player-name');
        const playerRating = document.getElementById('requesting-player-rating');
        const playerGender = document.getElementById('requesting-player-gender');

        playerName.textContent = requestingPlayer.username;
        playerRating.textContent = requestingPlayer.rating;
        playerGender.textContent = this.formatGender(requestingPlayer.gender);

        modal.style.display = 'block';

        // Add event listeners for accept/decline buttons
        const acceptBtn = document.getElementById('accept-connection');
        const rejectBtn = document.getElementById('reject-connection');

        // Remove existing listeners to prevent duplicates
        acceptBtn.replaceWith(acceptBtn.cloneNode(true));
        rejectBtn.replaceWith(rejectBtn.cloneNode(true));

        // Get the new button references
        const newAcceptBtn = document.getElementById('accept-connection');
        const newRejectBtn = document.getElementById('reject-connection');

        newAcceptBtn.addEventListener('click', () => {
            this.acceptConnectionRequest();
        });

        newRejectBtn.addEventListener('click', () => {
            this.rejectConnectionRequest();
        });
    }

    hideConnectionRequestModal() {
        const modal = document.getElementById('connection-request-modal');
        modal.style.display = 'none';
    }

    acceptConnectionRequest() {
        if (this.teamCode) {
            this.socket.emit('respondToConnectionRequest', { 
                teamCode: this.teamCode, 
                accepted: true 
            });
            this.hideConnectionRequestModal();
            this.showNotification('Connection accepted! Starting game...', 'success');
        }
    }

    rejectConnectionRequest() {
        if (this.teamCode) {
            this.socket.emit('respondToConnectionRequest', { 
                teamCode: this.teamCode, 
                accepted: false 
            });
            this.hideConnectionRequestModal();
            this.teamCode = null;
            this.showNotification('Connection rejected', 'info');
        }
    }

    showApprovalRequestModal(requestingPlayer) {
        console.log('[CLIENT] showApprovalRequestModal called with:', requestingPlayer);
        const modal = document.getElementById('approval-request-modal');
        const playerName = document.getElementById('approval-player-name');
        const playerRating = document.getElementById('approval-player-rating');
        const playerGender = document.getElementById('approval-player-gender');

        playerName.textContent = requestingPlayer.username;
        playerRating.textContent = requestingPlayer.rating;
        playerGender.textContent = this.formatGender(requestingPlayer.gender);

        modal.style.display = 'block';
        console.log('[CLIENT] Approval modal should now be visible');

        // Add event listeners for approval buttons
        const approveBtn = document.getElementById('approve-game');
        const declineBtn = document.getElementById('decline-game');

        const handleApprove = () => {
            this.socket.emit('respondToApprovalRequest', { 
                teamCode: this.teamCode, 
                accepted: true 
            });
            this.hideApprovalRequestModal();
            approveBtn.removeEventListener('click', handleApprove);
            declineBtn.removeEventListener('click', handleDecline);
        };

        const handleDecline = () => {
            this.socket.emit('respondToApprovalRequest', { 
                teamCode: this.teamCode, 
                accepted: false 
            });
            this.hideApprovalRequestModal();
            approveBtn.removeEventListener('click', handleApprove);
            declineBtn.removeEventListener('click', handleDecline);
        };

        approveBtn.addEventListener('click', handleApprove);
        declineBtn.addEventListener('click', handleDecline);
    }

    hideApprovalRequestModal() {
        const modal = document.getElementById('approval-request-modal');
        modal.style.display = 'none';
    }

    setupUpdateInfoUI() {
        // Add button to open modal
        const userProfile = document.getElementById('user-profile');
        if (userProfile) {
            const updateBtn = document.createElement('button');
            updateBtn.textContent = 'Edit Account Info';
            updateBtn.className = 'edit-info-btn';
            updateBtn.addEventListener('click', () => {
                // Pre-fill form fields with current user data
                document.getElementById('update-username').value = this.currentUser?.username || '';
                document.getElementById('update-email').value = this.currentUser?.email || '';
                document.getElementById('update-phone').value = this.currentUser?.phoneNumber || '';
                document.getElementById('update-info-modal').style.display = 'block';
            });
            userProfile.appendChild(updateBtn);
        }
        // Close modal
        document.getElementById('close-update-info-modal').addEventListener('click', () => {
            document.getElementById('update-info-modal').style.display = 'none';
            document.getElementById('update-info-message').textContent = '';
        });
        // Submit form
        document.getElementById('update-info-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('update-username').value.trim();
            const email = document.getElementById('update-email').value.trim();
            const phoneNumber = document.getElementById('update-phone').value.trim();
            const profilePicInput = document.getElementById('update-profile-picture');
            const file = profilePicInput.files[0];
            const messageDiv = document.getElementById('update-info-message');
            messageDiv.textContent = 'Updating...';
            try {
                let user = null;
                // If a file is selected, upload it first
                if (file) {
                    const formData = new FormData();
                    formData.append('profilePicture', file);
                    const res = await fetch('https://chessvoice-backend.onrender.com/api/auth/upload-profile-picture', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${this.authToken}` },
                        body: formData
                    });
                    const data = await res.json();
                    if (res.ok && data.user) {
                        user = data.user;
                        this.currentUser = data.user;
                        // Update UI with new profile picture
                        this.updateProfilePictureUI(data.user.profilePicture);
                    } else {
                        messageDiv.textContent = data.error || 'Profile picture upload failed.';
                        return;
                    }
                }
                // Update other info
                const body = {};
                if (username) body.username = username;
                if (email) body.email = email;
                if (phoneNumber) body.phoneNumber = phoneNumber;
                if (Object.keys(body).length > 0) {
                    const res = await fetch('https://chessvoice-backend.onrender.com/api/auth/update-info', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.authToken}`
                        },
                        body: JSON.stringify(body)
                    });
                    const data = await res.json();
                    if (res.ok && data.user) {
                        user = data.user;
                        this.currentUser = data.user;
                        document.getElementById('user-username').textContent = data.user.username;
                    } else {
                        messageDiv.textContent = data.error || 'Update failed.';
                        return;
                    }
                }
                if (user) {
                    messageDiv.textContent = 'Account info updated!';
                } else {
                    messageDiv.textContent = 'No changes made.';
                }
            } catch (err) {
                messageDiv.textContent = 'Network error.';
            }
        });
    }

    updateProfilePictureUI(profilePicture) {
        const avatarImg = document.getElementById('user-avatar');
        if (avatarImg) {
            if (profilePicture) {
                // Construct full URL for profile picture
                const profilePicUrl = profilePicture.startsWith('http') 
                    ? profilePicture 
                    : this.apiBaseUrl + profilePicture;
                avatarImg.src = profilePicUrl;
            } else {
                // Use a simple default avatar data URI
                avatarImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPGNpcmNsZSBjeD0iMjQiIGN5PSIxOCIgcj0iNiIgZmlsbD0iIzk0QTNBRiIvPgo8cGF0aCBkPSJNMTIgMzJDMjAgMjggMjggMzIgMzYgMzJWMzZDMzYgMzguMjA5MSAzNC4yMDkxIDQwIDMyIDQwSDE2QzEzLjc5MDkgNDAgMTIgMzguMjA5MSAxMiAzNlYzMloiIGZpbGw9IiM5NEEzQUYiLz4KPC9zdmc+';
            }
        }
    }

    setupChangePasswordUI() {
        // Add button to open modal
        const userProfile = document.getElementById('user-profile');
        if (userProfile) {
            const changePwBtn = document.createElement('button');
            changePwBtn.textContent = 'Change Password';
            changePwBtn.className = 'change-password-btn';
            changePwBtn.addEventListener('click', () => {
                document.getElementById('change-password-modal').style.display = 'block';
            });
            userProfile.appendChild(changePwBtn);
        }
        // Close modal
        document.getElementById('close-change-password-modal').addEventListener('click', () => {
            document.getElementById('change-password-modal').style.display = 'none';
            document.getElementById('change-password-message').textContent = '';
            document.getElementById('change-password-form').reset();
        });
        // Submit form
        document.getElementById('change-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;
            const messageDiv = document.getElementById('change-password-message');
            messageDiv.textContent = '';
            if (!currentPassword || !newPassword || !confirmNewPassword) {
                messageDiv.textContent = 'Please fill in all fields.';
                return;
            }
            if (newPassword !== confirmNewPassword) {
                messageDiv.textContent = 'New passwords do not match.';
                return;
            }
            if (newPassword.length < 6) {
                messageDiv.textContent = 'New password must be at least 6 characters.';
                return;
            }
            messageDiv.textContent = 'Changing password...';
            try {
                const res = await fetch('https://chessvoice-backend.onrender.com/api/auth/change-password', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const data = await res.json();
                if (res.ok) {
                    messageDiv.textContent = 'Password changed successfully!';
                    document.getElementById('change-password-form').reset();
                } else {
                    messageDiv.textContent = data.error || 'Change failed.';
                }
            } catch (err) {
                messageDiv.textContent = 'Network error.';
            }
        });
    }

    setupPasswordVisibilityToggles() {
        // Login form
        const loginToggle = document.getElementById('toggle-login-password');
        if (loginToggle) {
            loginToggle.addEventListener('click', () => {
                const input = document.getElementById('login-password');
                if (input.type === 'password') {
                    input.type = 'text';
                    loginToggle.textContent = '🙈';
                } else {
                    input.type = 'password';
                    loginToggle.textContent = '👁️';
                }
            });
        }
        // Change password modal
        const toggles = document.querySelectorAll('.toggle-password');
        toggles.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.textContent = '🙈';
                } else {
                    input.type = 'password';
                    btn.textContent = '👁️';
                }
            });
        });
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        if (this.gameOver) {
            console.log('[DEBUG] isValidMove: gameOver is true, move not allowed');
            return false;
        }
        const piece = this.board[fromRow][fromCol];
        if (!piece || piece.color !== this.currentPlayer) return false;
        // Prevent moving to the same square
        if (fromRow === toRow && fromCol === toCol) return false;
        const targetPiece = this.board[toRow][toCol];
        if (targetPiece && targetPiece.color === piece.color) return false;
        // Check if the move is valid for the piece type
        let valid = false;
        switch (piece.type) {
            case 'pawn':
                valid = this.isValidPawnMove(fromRow, fromCol, toRow, toCol, piece.color);
                break;
            case 'rook':
                valid = this.isValidRookMove(fromRow, fromCol, toRow, toCol);
                break;
            case 'knight':
                valid = this.isValidKnightMove(fromRow, fromCol, toRow, toCol);
                break;
            case 'bishop':
                valid = this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
                break;
            case 'queen':
                valid = this.isValidQueenMove(fromRow, fromCol, toRow, toCol);
                break;
            case 'king':
                valid = this.isValidKingMove(fromRow, fromCol, toRow, toCol);
                break;
            default:
                valid = false;
        }
        if (!valid) return false;
        // Simulate the move and check king safety
        const originalFrom = this.board[fromRow][fromCol];
        const originalTo = this.board[toRow][toCol];
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;
        // Find the color to check (for isCheckmate, this may not be currentPlayer)
        const color = piece.color;
        const kingSafe = !this.isKingInCheck(this.board, color);
        // Revert the move
        this.board[fromRow][fromCol] = originalFrom;
        this.board[toRow][toCol] = originalTo;
        if (!kingSafe) {
            //console.log('[DEBUG] isValidMove: move would leave king in check');
            return false;
        }
        return true;
    }

    isValidPawnMove(fromRow, fromCol, toRow, toCol, color) {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);
        // Forward move
        if (colDiff === 0) {
            if (rowDiff === direction && !this.board[toRow][toCol]) {
                return true;
            }
            if (rowDiff === 2 * direction && fromRow === startRow &&
                !this.board[fromRow + direction][fromCol] && !this.board[toRow][toCol]) {
                return true;
            }
        }
        // Capture move
        if (colDiff === 1 && rowDiff === direction) {
            return this.board[toRow][toCol] !== null;
        }
        return false;
    }

    isValidRookMove(fromRow, fromCol, toRow, toCol) {
        if (fromRow !== toRow && fromCol !== toCol) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    isValidKnightMove(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    isValidBishopMove(fromRow, fromCol, toRow, toCol) {
        if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    isValidQueenMove(fromRow, fromCol, toRow, toCol) {
        return this.isValidRookMove(fromRow, fromCol, toRow, toCol) ||
               this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
    }

    isValidKingMove(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return rowDiff <= 1 && colDiff <= 1;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
        const colStep = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol] !== null) return false;
            currentRow += rowStep;
            currentCol += colStep;
        }
        return true;
    }

    highlightValidMoves(fromRow, fromCol) {
        for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
                if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                    // Don't highlight the selected square itself
                    if (!(fromRow === toRow && fromCol === toCol)) {
                        this.highlightSquare(toRow, toCol, 'valid-move');
                    }
                }
            }
        }
    }

    leaveGame() {
        console.log('[DEBUG] leaveGame called');
        
        // If in multiplayer mode, notify server and other players
        if (this.isMultiplayer && this.socket && this.teamCode) {
            console.log('[DEBUG] leaveGame: notifying server of game leave');
            this.socket.emit('leaveGame', { teamCode: this.teamCode });
        }
        
        // Reset multiplayer state and call newGame again
        this.isMultiplayer = false;
        this.teamCode = null;
        this.playerColor = null;
        this.opponentName = null;
        this.setMultiplayerStatus(false);
        this.newGame();
        
        // Redirect to home page if user is authenticated (not guest)
        if (this.currentUser && this.authToken) {
            console.log('[DEBUG] leaveGame: redirecting to home page');
            this.showAuthInterface();
            this.showNotification('Returned to home page', 'info');
        } else {
            // For guest users, just show a notification that they're back to local play
            this.showNotification('Back to local play mode', 'info');
        }
    }

    loginAsGuest() {
        this.currentUser = { username: 'Guest', isGuest: true };
        this.authToken = null;
        localStorage.removeItem('authToken');
        this.showGameInterface();
        this.disableGuestFeatures();
        this.showAuthSuccess('Playing as Guest!');
        // Show back to auth button
        const backBtn = document.getElementById('back-to-auth-btn');
        if (backBtn) {
            backBtn.style.display = 'block';
            backBtn.onclick = () => {
                this.currentUser = null;
                this.showAuthInterface();
                // Restore multiplayer/chat/profile controls
                this.restoreFullFeatures();
                backBtn.style.display = 'none';
            };
        }
    }

    disableGuestFeatures() {
        // Hide multiplayer controls, chat, and profile
        const multiplayerControls = document.querySelector('.multiplayer-controls');
        if (multiplayerControls) multiplayerControls.style.display = 'none';
        const chatSection = document.getElementById('chat-section');
        if (chatSection) chatSection.style.display = 'none';
        const userProfile = document.getElementById('user-profile');
        if (userProfile) userProfile.style.display = 'none';
        // Optionally show a guest badge or message
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) gameStatus.textContent = 'Guest Mode: Local Play Only';
    }

    restoreFullFeatures() {
        const multiplayerControls = document.querySelector('.multiplayer-controls');
        if (multiplayerControls) multiplayerControls.style.display = '';
        const chatSection = document.getElementById('chat-section');
        if (chatSection) chatSection.style.display = '';
        const userProfile = document.getElementById('user-profile');
        if (userProfile) userProfile.style.display = '';
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) gameStatus.textContent = 'Game in progress';
    }

    async startRobotGame() {
        // Ask for difficulty
        const difficulty = prompt('Choose robot difficulty: easy, medium, hard', 'medium') || 'medium';
        // Start new game with robot
        const response = await fetch('https://chessvoice-backend.onrender.com/api/robot/new-game', { method: 'POST' });
        const data = await response.json();
        this.robotGameId = data.gameId;
        this.isRobotGame = true;
        this.robotDifficulty = difficulty;
        this.board = this.initializeBoard(); // Reset board UI
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameOver = false;
        this.renderBoard();
        this.updateGameInfo();
        this.showNotification('Playing against Robot (' + difficulty + ')', 'info');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure intro screen is visible first
    setTimeout(() => {
        new ChessGame();
    }, 100);
});

// Modal HTML
if (!document.getElementById('checkmate-modal')) {
    const modal = document.createElement('div');
    modal.id = 'checkmate-modal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:40px 60px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2);text-align:center;">
            <h2 id="checkmate-title">Checkmate!</h2>
            <p id="checkmate-message"></p>
            <button id="close-checkmate-modal" style="margin-top:20px;padding:10px 30px;font-size:16px;border-radius:8px;background:#667eea;color:white;border:none;">OK</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('close-checkmate-modal').onclick = function() {
        modal.style.display = 'none';
    };
} 