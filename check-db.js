require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://akashch347:test123456@cluster0.iweijkn.mongodb.net/chessvoice?retryWrites=true&w=majority&appName=Cluster0';

async function checkDatabase() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB Atlas');
        
        // Get the database
        const db = mongoose.connection.db;
        const dbName = db.databaseName;
        
        console.log(`\n📊 Database: ${dbName}`);
        console.log('=' .repeat(50));
        
        // List all collections
        const collections = await db.listCollections().toArray();
        
        console.log('\n📁 Collections found:');
        if (collections.length === 0) {
            console.log('No collections found in the database.');
        } else {
            collections.forEach((collection, index) => {
                console.log(`${index + 1}. ${collection.name}`);
            });
        }
        
        // Check users collection specifically
        if (collections.some(c => c.name === 'users')) {
            console.log('\n👥 Users Collection Details:');
            const usersCollection = db.collection('users');
            const userCount = await usersCollection.countDocuments();
            console.log(`   Total documents: ${userCount}`);
            
            if (userCount > 0) {
                const sampleUsers = await usersCollection.find({}).limit(3).toArray();
                console.log('\n   Sample users:');
                sampleUsers.forEach((user, index) => {
                    console.log(`   ${index + 1}. ${user.username || 'No username'} (${user.email || 'No email'})`);
                });
            }
        }
        
        // Check games collection if it exists
        if (collections.some(c => c.name === 'games')) {
            console.log('\n🎮 Games Collection Details:');
            const gamesCollection = db.collection('games');
            const gameCount = await gamesCollection.countDocuments();
            console.log(`   Total documents: ${gameCount}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

checkDatabase(); 