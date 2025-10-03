require('dotenv').config();

console.log('🔍 Testing Environment Variables Loading');
console.log('=====================================');

// Test Supabase variables
console.log('Supabase URL:', process.env.SUPABASE_URL ? '✅ Loaded' : '❌ Missing');
console.log('Supabase Anon Key:', process.env.SUPABASE_ANON_KEY ? '✅ Loaded' : '❌ Missing');

// Test WebRTC variables
console.log('TURN Username:', process.env.TURN_USERNAME ? '✅ Loaded' : '❌ Missing');
console.log('TURN Credential:', process.env.TURN_CREDENTIAL ? '✅ Loaded' : '❌ Missing');

// Test User Credentials
console.log('Test User 1 Email:', process.env.TEST_USER_1_EMAIL ? '✅ Loaded' : '❌ Missing');
console.log('Test User 1 Password:', process.env.TEST_USER_1_PASSWORD ? '✅ Loaded' : '❌ Missing');
console.log('Test User 2 Email:', process.env.TEST_USER_2_EMAIL ? '✅ Loaded' : '❌ Missing');
console.log('Test User 2 Password:', process.env.TEST_USER_2_PASSWORD ? '✅ Loaded' : '❌ Missing');

// Test Admin Credentials
console.log('Admin Email:', process.env.ADMIN_EMAIL ? '✅ Loaded' : '❌ Missing');
console.log('Admin Password:', process.env.ADMIN_PASSWORD ? '✅ Loaded' : '❌ Missing');

console.log('\n🎯 Environment Variables Test Complete');