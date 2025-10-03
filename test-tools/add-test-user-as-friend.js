// Script to add TestUser1 as a friend to Shamanic
// This creates a friendship between the actual user and the test user

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

// Test user ID
const TEST_USER_ID = '730b07a9-308c-475a-babb-9c1500986775';

// Function to get Shamanic's user ID
async function getShamanicUserId() {
  try {
    // Sign in as Shamanic to get user ID
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    
    if (signInError) {
      console.error('Error signing in as shamanic:', signInError.message);
      return null;
    }
    
    const shamanicUserId = signInData.user.id;
    console.log('shamanic user ID:', shamanicUserId);
    
    // Sign out
    await supabaseClient.auth.signOut();
    
    return shamanicUserId;
  } catch (error) {
    console.error('Error getting Shamanic user ID:', error);
    return null;
  }
}

// Function to create friendship
async function createFriendship(user1Id, user2Id) {
  try {
    // Check if friendship already exists
    const { data: existingFriendship } = await supabaseClient
      .from('friends')
      .select('*')
      .or(`and(requester_id.eq.${user1Id},receiver_id.eq.${user2Id}),and(requester_id.eq.${user2Id},receiver_id.eq.${user1Id})`)
      .single();
    
    if (existingFriendship) {
      console.log('Friendship already exists between users');
      return existingFriendship;
    }
    
    // Create friend request
    const { data: friendshipData, error: friendshipError } = await supabaseClient
      .from('friends')
      .insert([{
        requester_id: user1Id,
        receiver_id: user2Id,
        status: 'accepted'
      }])
      .select()
      .single();
    
    if (friendshipError) {
      console.error('Error creating friendship:', friendshipError);
      return null;
    }
    
    console.log('Friendship created successfully!');
    return friendshipData;
  } catch (error) {
    console.error('Error creating friendship:', error);
    return null;
  }
}

// Main execution
async function main() {
  console.log('Adding TestUser1 as a friend to shamanic...');
  
  // Get shamanic's user ID
  const shamanicUserId = await getShamanicUserId();
  
  if (!shamanicUserId) {
    console.error('Could not get shamanic user ID');
    return;
  }
  
  // Create friendship between shamanic and TestUser1
  const friendship = await createFriendship(shamanicUserId, TEST_USER_ID);
  
  if (friendship) {
    console.log('✅ TestUser1 is now friends with shamanic!');
    console.log('You can now send messages to TestUser1 in the chat interface.');
  } else {
    console.log('❌ Failed to create friendship');
  }
}

main().catch(console.error);