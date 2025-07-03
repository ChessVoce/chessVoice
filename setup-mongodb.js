#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔧 ChessVoice MongoDB Setup Helper');
console.log('=====================================\n');

console.log('This script will help you set up MongoDB for ChessVoice.\n');

console.log('📋 Prerequisites:');
console.log('1. A MongoDB Atlas account (free)');
console.log('2. A cluster created in MongoDB Atlas');
console.log('3. Database user credentials');
console.log('4. Connection string from MongoDB Atlas\n');

console.log('🌐 Get MongoDB Atlas: https://www.mongodb.com/atlas');
console.log('📖 Setup Guide: https://docs.atlas.mongodb.com/getting-started/\n');

rl.question('Do you have a MongoDB Atlas connection string? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        rl.question('Enter your MongoDB Atlas connection string: ', (connectionString) => {
            if (connectionString && connectionString.trim()) {
                updateEnvFile(connectionString.trim());
            } else {
                console.log('❌ Invalid connection string provided.');
                rl.close();
            }
        });
    } else {
        console.log('\n📝 To get a MongoDB Atlas connection string:');
        console.log('1. Go to https://www.mongodb.com/atlas');
        console.log('2. Create a free account');
        console.log('3. Create a new cluster (free tier)');
        console.log('4. Click "Connect" on your cluster');
        console.log('5. Choose "Connect your application"');
        console.log('6. Copy the connection string');
        console.log('7. Replace <password> with your database password');
        console.log('8. Add /chessvoice at the end of the URI\n');
        
        console.log('Example connection string:');
        console.log('mongodb+srv://username:password@cluster.mongodb.net/chessvoice\n');
        
        rl.question('Enter your MongoDB Atlas connection string: ', (connectionString) => {
            if (connectionString && connectionString.trim()) {
                updateEnvFile(connectionString.trim());
            } else {
                console.log('❌ Invalid connection string provided.');
                rl.close();
            }
        });
    }
});

function updateEnvFile(connectionString) {
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add MONGODB_URI
    if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(/MONGODB_URI=.*/g, `MONGODB_URI=${connectionString}`);
    } else {
        envContent += `\n# Database Configuration\nMONGODB_URI=${connectionString}\n`;
    }
    
    // Ensure JWT_SECRET exists
    if (!envContent.includes('JWT_SECRET=')) {
        envContent += `\n# JWT Secret\nJWT_SECRET=your-super-secret-jwt-key-change-this-in-production\n`;
    }
    
    // Ensure PORT exists
    if (!envContent.includes('PORT=')) {
        envContent += `\n# Server Configuration\nPORT=3000\nNODE_ENV=development\n`;
    }
    
    try {
        fs.writeFileSync(envPath, envContent);
        console.log('\n✅ .env file updated successfully!');
        console.log('🔗 MongoDB URI configured:', connectionString);
        console.log('\n🔄 Please restart your server:');
        console.log('   npm start');
        console.log('\n🎉 Your ChessVoice app should now work with authentication!');
    } catch (error) {
        console.log('❌ Error updating .env file:', error.message);
    }
    
    rl.close();
}

rl.on('close', () => {
    console.log('\n👋 Setup complete!');
    process.exit(0);
}); 