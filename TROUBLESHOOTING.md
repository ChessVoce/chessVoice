# ChessVoice Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. Port Already in Use Error
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
```

**Solution:**
```bash
# Kill all Node.js processes
taskkill /f /im node.exe

# Or use a different port
set PORT=3001 && npm start
```

### 2. MongoDB Connection Error
```
MongoDB connection error: MongooseServerSelectionError: connect ECONNREFUSED
```

**Solution:**
- **Option A**: Use MongoDB Atlas (Recommended)
  ```bash
  npm run setup
  ```
  Follow the interactive setup guide

- **Option B**: Install local MongoDB
  - Download from: https://www.mongodb.com/try/download/community
  - Install and start the service

### 3. Authentication Not Working
```
Database not available. Please install MongoDB or use MongoDB Atlas.
```

**Solution:**
1. Set up MongoDB using `npm run setup`
2. Restart the server: `npm start`
3. Try signing up again

## 🔧 Quick Fix Commands

### Reset Everything
```bash
# Stop all processes
taskkill /f /im node.exe

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Start fresh
npm start
```

### Check Server Status
```bash
# Check if port 3000 is in use
netstat -an | findstr 3000

# Check Node.js processes
tasklist | findstr node
```

## 📋 Setup Checklist

### Before Starting
- [ ] Node.js installed (v14+)
- [ ] All dependencies installed (`npm install`)
- [ ] MongoDB configured (local or Atlas)
- [ ] .env file created with proper settings

### After Setup
- [ ] Server starts without errors
- [ ] Database connection established
- [ ] Authentication forms load
- [ ] Can create/join games
- [ ] Chat functionality works

## 🎯 Quick Start for New Users

1. **Clone and install:**
   ```bash
   git clone <repository>
   cd ChessVoice
   npm install
   ```

2. **Set up database:**
   ```bash
   npm run setup
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## 📞 Support

If you're still having issues:

1. **Check the logs** for specific error messages
2. **Verify your setup** using the checklist above
3. **Try the quick fix commands**
4. **Create an issue** with detailed error information

---

**Remember**: Most issues are related to MongoDB setup. Using MongoDB Atlas is the easiest solution! 