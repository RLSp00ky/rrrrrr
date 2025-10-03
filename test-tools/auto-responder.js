// Auto-responder for TestUser1
// This script sets up a real-time listener that automatically responds to messages sent to TestUser1

// Import required modules
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Create Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Test user credentials
const TEST_USER_EMAIL = process.env.TEST_USER_1_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_1_PASSWORD;
const TEST_USER_ID = '730b07a9-308c-475a-babb-9c1500986775';

// Auto-responses
const AUTO_RESPONSES = [
  "Thanks for your message! I'm a test user, so this is an automated response.",
  "Hello! This is an auto-response from TestUser1. Your real-time messaging is working!",
  "Got it! This is an automated response to test the real-time messaging feature.",
  "This is TestUser1's auto-responder. If you see this message, real-time messaging is working correctly!",
  "Auto-response from TestUser1: Your message was received in real-time!",
  "TestUser1 here with an automated response. The chat system is working!",
  "This is an automated response from the test user. Your message appeared instantly!",
  "Hello from TestUser1's auto-responder! Real-time messaging is functional.",
  "TestUser1 auto-response: Message received and this reply sent automatically!",
  "This is an automated test response. Your real-time chat is working perfectly!"
];

// Function to sign in as TestUser1
async function signInAsTestUser() {
  try {
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    
    if (signInError) {
      console.error('Error signing in as TestUser1:', signInError.message);
      return null;
    }
    
    console.log('✅ Signed in as TestUser1');
    return signInData.user;
  } catch (error) {
    console.error('Error signing in as TestUser1:', error);
    return null;
  }
}

// Function to get TestUser1's profile
async function getTestUserProfile() {
  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', TEST_USER_ID)
      .single();
    
    if (error) {
      console.error('Error getting TestUser1 profile:', error.message);
      return null;
    }
    
    return profile;
  } catch (error) {
    console.error('Error getting TestUser1 profile:', error);
    return null;
  }
}

// Function to send an auto-response
async function sendAutoResponse(receiverId, originalMessage) {
  try {
    // Get a random auto-response
    const randomIndex = Math.floor(Math.random() * AUTO_RESPONSES.length);
    const responseText = AUTO_RESPONSES[randomIndex];
    
    // Add reference to original message
    const finalResponse = originalMessage 
      ? `${responseText} (Replying to: "${originalMessage.substring(0, 30)}${originalMessage.length > 30 ? '...' : ''}")`
      : responseText;
    
    // Send the response
    const { data: messageData, error } = await supabaseClient
      .from('messages')
      .insert([{
        sender_id: TEST_USER_ID,
        receiver_id: receiverId,
        message: finalResponse
      }])
      .select();
    
    if (error) {
      console.error('Error sending auto-response:', error.message);
      return false;
    }
    
    console.log(`✅ Auto-response sent to ${receiverId}: "${finalResponse}"`);
    
    // Also log to the terminal for visibility
    console.log(`====================================`);
    console.log(`🤖 TEST USER AUTO-RESPONSE`);
    console.log(`====================================`);
    console.log(`From: TestUser1 (${TEST_USER_ID})`);
    console.log(`To: ${receiverId}`);
    console.log(`Message: "${finalResponse}"`);
    console.log(`====================================`);
    
    return true;
  } catch (error) {
    console.error('Error sending auto-response:', error);
    return false;
  }
}

// Function to set up real-time listener
async function setupAutoResponder() {
  try {
    // Sign in as TestUser1
    const testUser = await signInAsTestUser();
    if (!testUser) {
      console.error('Could not sign in as TestUser1');
      return;
    }
    
    // Get TestUser1's profile
    const testUserProfile = await getTestUserProfile();
    if (!testUserProfile) {
      console.error('Could not get TestUser1 profile');
      return;
    }
    
    console.log('🤖 Setting up auto-responder for TestUser1...');
    console.log(`TestUser1 profile: ${testUserProfile.username} (${testUserProfile.tag})`);
    
    // Set up real-time subscription for all messages sent to TestUser1
    // Use the same channel name format as social.js
    const shamanicUserId = 'c0632ccd-0bc9-408c-9fd7-26ae81fcbd1b'; // Hardcoded for now
    const channelName = `chat-${[TEST_USER_ID, shamanicUserId].sort().join('-')}`;
    console.log(`Listening on channel: ${channelName}`);
    
    const autoResponderChannel = supabaseClient.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${TEST_USER_ID}` // FIXED: Use same filter as social.js
        },
        async (payload) => {
          const message = payload.new;
          console.log(`📨 Message received: "${message.message}" from ${message.sender_id} to ${message.receiver_id}`);
          
          // Don't respond to our own messages
          if (message.sender_id === TEST_USER_ID) {
            console.log('Ignoring own message');
            return;
          }
          
          // Only respond to messages from shamanic
          const shamanicUserId = 'c0632ccd-0bc9-408c-9fd7-26ae81fcbd1b';
          if (message.sender_id !== shamanicUserId) {
            console.log(`Ignoring message from non-shamanic user: ${message.sender_id}`);
            return;
          }
          
          console.log(`✅ Valid message from shamanic, preparing response...`);
          
          // Wait a moment to simulate typing
          setTimeout(async () => {
            await sendAutoResponse(message.sender_id, message.message);
          }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Auto-responder is active! TestUser1 will automatically respond to messages.');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Auto-responder subscription error:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Auto-responder subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔌 Auto-responder subscription closed');
        }
      });
    
    console.log('🚀 Auto-responder is running. Press Ctrl+C to stop.');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down auto-responder...');
      await autoResponderChannel.unsubscribe();
      await supabaseClient.auth.signOut();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error setting up auto-responder:', error);
  }
}

// Main execution
async function main() {
  console.log('🤖 TestUser1 Auto-Responder');
  console.log('==========================');
  console.log('This script will make TestUser1 automatically respond to messages.');
  console.log('');
  
  await setupAutoResponder();
}

main().catch(console.error);