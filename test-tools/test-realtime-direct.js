// Direct test of real-time messaging
// This script will send a test message from TestUser1 to shamanic
// You can watch the browser console to see if it's received

// Import required modules
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://tevtrhkabycoddnwssar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRyaGthYnljb2Rkbndzc2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTg3NTMsImV4cCI6MjA3MjM3NDc1M30.icqgrtyNhBKoHXk5RP4EzElG_4EMUKI3YihdUblr4w4';

// Create Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Test user credentials
const TEST_USER_EMAIL = 'testuser1@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_USER_ID = '730b07a9-308c-475a-babb-9c1500986775';
const SHAMANIC_USER_ID = 'c0632ccd-0bc9-408c-9fd7-26ae81fcbd1b';

async function sendTestMessage() {
  console.log('🧪 Sending test message from TestUser1 to shamanic...');
  
  try {
    // Sign in as TestUser1
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    
    if (signInError) {
      console.error('❌ Error signing in as TestUser1:', signInError.message);
      return;
    }
    
    console.log('✅ Signed in as TestUser1');
    
    // Send a test message
    const testMessage = `🤖 Test message at ${new Date().toLocaleTimeString()}`;
    console.log(`📤 Sending message: "${testMessage}"`);
    
    const { data: messageData, error: messageError } = await supabaseClient
      .from('messages')
      .insert([{
        sender_id: TEST_USER_ID,
        receiver_id: SHAMANIC_USER_ID,
        message: testMessage
      }])
      .select();
    
    if (messageError) {
      console.error('❌ Error sending message:', messageError.message);
      return;
    }
    
    console.log('✅ Message sent successfully!');
    console.log(`   Message ID: ${messageData[0].id}`);
    console.log(`   From: TestUser1 (${TEST_USER_ID})`);
    console.log(`   To: shamanic (${SHAMANIC_USER_ID})`);
    console.log(`   Text: "${testMessage}"`);
    
    // Sign out
    await supabaseClient.auth.signOut();
    
    console.log('\n🔍 Check your browser console to see if this message was received in real-time!');
    console.log('   If you see the message appear immediately, real-time is working.');
    console.log('   If you only see it after refreshing, real-time is not working.');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Send a test message every 10 seconds
async function startPeriodicTest() {
  console.log('🚀 Starting periodic real-time test...');
  console.log('   A test message will be sent every 10 seconds');
  console.log('   Press Ctrl+C to stop\n');
  
  // Send first message immediately
  await sendTestMessage();
  
  // Then send every 10 seconds
  const interval = setInterval(async () => {
    await sendTestMessage();
  }, 10000);
  
  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping periodic test...');
    clearInterval(interval);
    process.exit(0);
  });
}

// Check command line arguments
const command = process.argv[2];

if (command === 'periodic') {
  startPeriodicTest();
} else {
  sendTestMessage();
}