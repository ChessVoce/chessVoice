# ChessVoice Deployment Guide

## Overview
This guide will help you deploy ChessVoice to work with GitHub Pages (frontend) and a backend hosting service.

## Backend Deployment

### Option 1: Render (Recommended - Free)

1. **Sign up for Render**
   - Go to [render.com](https://render.com)
   - Create a free account

2. **Deploy from GitHub**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository
   - Configure the service:
     - **Name**: `chessvoice-backend`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

3. **Set Environment Variables**
   - Go to your service dashboard
   - Click "Environment" tab
   - Add these variables:
     ```
     MONGODB_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret
     EMAIL_USER=your_gmail_address
     EMAIL_PASS=your_gmail_app_password
     TWILIO_ACCOUNT_SID=your_twilio_sid
     TWILIO_AUTH_TOKEN=your_twilio_token
     TWILIO_PHONE_NUMBER=your_twilio_phone
     NODE_ENV=production
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Copy your service URL (e.g., `https://chessvoice-backend.onrender.com`)

### Option 2: Railway (Alternative - Free)

1. **Sign up for Railway**
   - Go to [railway.app](https://railway.app)
   - Create a free account

2. **Deploy from GitHub**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect it's a Node.js app

3. **Set Environment Variables**
   - Go to your project dashboard
   - Click "Variables" tab
   - Add the same environment variables as above

4. **Deploy**
   - Railway will automatically deploy
   - Copy your service URL

## Frontend Configuration

After deploying your backend, update the frontend:

1. **Update Backend URL**
   - Open `chess.js`
   - Find the `getApiBaseUrl()` method
   - Replace `'https://your-backend-url-here.com'` with your actual backend URL

   Example:
   ```javascript
   const deployedBackendUrl = 'https://chessvoice-backend.onrender.com';
   ```

2. **Test the Connection**
   - Open your GitHub Pages URL
   - Check the browser console for any errors
   - Try to sign in/up

## GitHub Pages Setup

1. **Enable GitHub Pages**
   - Go to your repository settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose `main` branch and `/ (root)` folder
   - Click "Save"

2. **Your site will be available at:**
   ```
   https://your-username.github.io/chessVoice
   ```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Make sure your backend URL is correct
   - Check that the backend is running

2. **Environment Variables Not Set**
   - Verify all environment variables are set in your hosting service
   - Check the backend logs for errors

3. **MongoDB Connection Issues**
   - Ensure your MongoDB URI is correct
   - Check if your MongoDB Atlas IP whitelist includes your hosting service

4. **Email/SMS Not Working**
   - Verify email and SMS credentials are set correctly
   - Check the backend logs for sending errors

### Testing Locally

1. **Start the backend:**
   ```bash
   npm start
   ```

2. **Open the frontend:**
   - Open `index.html` in your browser
   - Or serve it with a local server

3. **Test all features:**
   - Sign up/Sign in
   - Password reset
   - Multiplayer games

## Security Notes

- Never commit your `.env` file to GitHub
- Use strong JWT secrets in production
- Enable HTTPS for production deployments
- Regularly update dependencies

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check your backend logs
3. Verify all environment variables are set
4. Test the backend API endpoints directly 