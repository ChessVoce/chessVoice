require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://akashch347:test123456@cluster0.iweijkn.mongodb.net/chessvoice?retryWrites=true&w=majority&appName=Cluster0';

async function migrateUsers() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB Atlas');
        
        // Find users without gender field or with null/undefined gender
        const usersToUpdate = await User.find({
            $or: [
                { gender: { $exists: false } },
                { gender: null },
                { gender: undefined }
            ]
        });
        
        console.log(`Found ${usersToUpdate.length} users to migrate`);
        
        if (usersToUpdate.length > 0) {
            // Update all users to have default gender and avatar
            const updateResult = await User.updateMany(
                {
                    $or: [
                        { gender: { $exists: false } },
                        { gender: null },
                        { gender: undefined }
                    ]
                },
                {
                    $set: {
                        gender: 'prefer-not-to-say',
                        avatar: '👤'
                    }
                }
            );
            
            console.log(`✅ Successfully migrated ${updateResult.modifiedCount} users`);
        } else {
            console.log('✅ No users need migration');
        }
        
        // Also check for users without avatar field
        const usersWithoutAvatar = await User.find({
            $or: [
                { avatar: { $exists: false } },
                { avatar: null },
                { avatar: undefined }
            ]
        });
        
        if (usersWithoutAvatar.length > 0) {
            const avatarUpdateResult = await User.updateMany(
                {
                    $or: [
                        { avatar: { $exists: false } },
                        { avatar: null },
                        { avatar: undefined }
                    ]
                },
                {
                    $set: {
                        avatar: '👤'
                    }
                }
            );
            
            console.log(`✅ Successfully added avatar to ${avatarUpdateResult.modifiedCount} users`);
        }
        
        console.log('✅ Migration completed successfully');
        
    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the migration
migrateUsers(); 