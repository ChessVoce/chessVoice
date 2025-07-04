// Test script to verify backend deployment
// Run this after deploying your backend to test if it's working

const testBackend = async (backendUrl) => {
    console.log(`🧪 Testing backend at: ${backendUrl}`);
    
    try {
        // Test 1: Basic connectivity
        console.log('\n1️⃣ Testing basic connectivity...');
        const response = await fetch(`${backendUrl}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            console.log('✅ Backend is responding (401 expected for unauthenticated request)');
        } else {
            console.log(`⚠️ Unexpected status: ${response.status}`);
        }
        
        // Test 2: CORS headers
        console.log('\n2️⃣ Testing CORS headers...');
        const corsResponse = await fetch(`${backendUrl}/api/auth/me`, {
            method: 'OPTIONS'
        });
        
        const corsHeaders = corsResponse.headers;
        if (corsHeaders.get('access-control-allow-origin')) {
            console.log('✅ CORS is properly configured');
        } else {
            console.log('⚠️ CORS headers not found');
        }
        
        console.log('\n🎉 Backend deployment test completed!');
        console.log('📝 If you see ✅ marks, your backend is working correctly.');
        console.log('🔗 You can now update the frontend with this backend URL.');
        
    } catch (error) {
        console.error('❌ Backend test failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Make sure your backend is deployed and running');
        console.log('2. Check if the URL is correct');
        console.log('3. Verify environment variables are set');
        console.log('4. Check your hosting service logs');
    }
};

// Usage instructions
console.log('🚀 ChessVoice Backend Deployment Test');
console.log('=====================================');
console.log('\n📋 Instructions:');
console.log('1. Deploy your backend to Render/Railway/Heroku');
console.log('2. Replace the URL below with your actual backend URL');
console.log('3. Run this script: node test-deployment.js');
console.log('\n🔗 Example URLs:');
console.log('- Render: https://chessvoice-backend.onrender.com');
console.log('- Railway: https://chessvoice-backend.railway.app');
console.log('- Heroku: https://your-app-name.herokuapp.com');

// Replace this with your actual backend URL
const BACKEND_URL = 'https://your-backend-url-here.com';

if (BACKEND_URL === 'https://your-backend-url-here.com') {
    console.log('\n❌ Please update the BACKEND_URL variable with your actual backend URL');
    console.log('📝 Example: const BACKEND_URL = "https://chessvoice-backend.onrender.com";');
} else {
    testBackend(BACKEND_URL);
} 