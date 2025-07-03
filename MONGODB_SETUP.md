# MongoDB Setup Guide for ChessVoice

## Quick Setup Options

### Option 1: MongoDB Atlas (Recommended - Cloud Database)

**Easiest method - no local installation required**

1. **Go to MongoDB Atlas**: https://www.mongodb.com/atlas
2. **Create a free account**
3. **Create a new cluster** (choose the free tier)
4. **Set up database access**:
   - Create a database user with username and password
   - Remember these credentials
5. **Set up network access**:
   - Add your IP address or use `0.0.0.0/0` for all IPs
6. **Get your connection string**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
7. **Update your .env file**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chessvoice
   ```
   Replace `username`, `password`, and `cluster` with your actual values

### Option 2: Local MongoDB Installation

#### Windows Installation

1. **Download MongoDB Community Server**:
   - Go to: https://www.mongodb.com/try/download/community
   - Choose "Windows" and download the MSI installer

2. **Install MongoDB**:
   - Run the downloaded MSI file
   - Choose "Complete" installation
   - Install MongoDB Compass (optional but recommended)

3. **Start MongoDB Service**:
   ```cmd
   # Open Command Prompt as Administrator
   net start MongoDB
   ```

4. **Verify Installation**:
   ```cmd
   mongod --version
   ```

5. **Your .env file should contain**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/chessvoice
   ```

#### macOS Installation

1. **Using Homebrew**:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

2. **Start MongoDB**:
   ```bash
   brew services start mongodb/brew/mongodb-community
   ```

3. **Your .env file should contain**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/chessvoice
   ```

#### Linux Installation

1. **Ubuntu/Debian**:
   ```bash
   sudo apt update
   sudo apt install mongodb
   sudo systemctl start mongodb
   sudo systemctl enable mongodb
   ```

2. **CentOS/RHEL**:
   ```bash
   sudo yum install mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

3. **Your .env file should contain**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/chessvoice
   ```

## Testing the Connection

After setting up MongoDB, restart your ChessVoice application:

```bash
npm start
```

You should see:
```
✅ Database connection established
Connected to MongoDB
```

## Troubleshooting

### Common Issues

1. **"ECONNREFUSED" Error**:
   - MongoDB is not running
   - Start MongoDB service
   - Check if port 27017 is available

2. **"Authentication Failed" Error**:
   - Check username/password in connection string
   - Ensure database user has proper permissions

3. **"Network Timeout" Error**:
   - Check firewall settings
   - Verify IP whitelist in MongoDB Atlas
   - Check internet connection

### Verification Commands

**Check if MongoDB is running**:
```bash
# Windows
netstat -an | findstr 27017

# macOS/Linux
netstat -an | grep 27017
```

**Connect to MongoDB manually**:
```bash
# Local MongoDB
mongo

# MongoDB Atlas
mongo "mongodb+srv://username:password@cluster.mongodb.net/chessvoice"
```

## Alternative: Use SQLite (No Setup Required)

If you want to avoid MongoDB setup entirely, you can modify the application to use SQLite:

1. **Install SQLite dependencies**:
   ```bash
   npm install sqlite3 sequelize
   ```

2. **Update the database configuration** (requires code changes)

## Support

- **MongoDB Documentation**: https://docs.mongodb.com/
- **MongoDB Atlas Help**: https://docs.atlas.mongodb.com/
- **Community Support**: https://community.mongodb.com/

---

**Note**: The ChessVoice application requires a database to store user accounts and game history. Without a database, authentication features will not work. 