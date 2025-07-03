require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://akashch347:test123456@cluster0.iweijkn.mongodb.net/chessvoice?retryWrites=true&w=majority&appName=Cluster0';

async function showUsers() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB Atlas');
        
        const users = await User.find({}, 'username email phoneNumber gameStats createdAt isOnline lastActive');
        
        console.log('\n📋 Current Users in Database:');
        console.log('=' .repeat(80));
        
        if (users.length === 0) {
            console.log('No users found in the database.');
        } else {
            users.forEach((user, index) => {
                console.log(`\n${index + 1}. Username: ${user.username}`);
                console.log(`   Email: ${user.email || 'Not provided'}`);
                console.log(`   Phone: ${user.phoneNumber || 'Not provided'}`);
                console.log(`   Games Played: ${user.gameStats.gamesPlayed}`);
                console.log(`   Games Won: ${user.gameStats.gamesWon}`);
                console.log(`   Rating: ${user.gameStats.rating}`);
                console.log(`   Online: ${user.isOnline ? '🟢 Yes' : '🔴 No'}`);
                console.log(`   Last Active: ${user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}`);
                console.log(`   Registered: ${new Date(user.createdAt).toLocaleString()}`);
                console.log('   ' + '-'.repeat(60));
            });
            
            console.log(`\n📊 Summary:`);
            console.log(`   Total Users: ${users.length}`);
            console.log(`   Online Users: ${users.filter(u => u.isOnline).length}`);
            console.log(`   Offline Users: ${users.filter(u => !u.isOnline).length}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

showUsers(); 