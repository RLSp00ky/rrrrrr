// Test User Setup Script for Node.js
// This script creates test users in Supabase Auth and their corresponding profiles

// Import required modules
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration - using the same credentials as the main application
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Create Supabase client with anonymous key
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Load test configuration
function loadTestConfig() {
  try {
    const configPath = path.join(__dirname, 'test-config.json');
    const configContent = fs.readFileSync(configPath, { encoding: 'utf8' });
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Error loading test config:', error);
    throw error;
  }
}

// Create a test user in Supabase Auth and profiles table
async function createTestUser(userData) {
  console.log(`Creating test user: ${userData.username} (${userData.email})`);
  
  try {
    // First, sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          username: userData.username,
          tag: userData.tag
        }
      }
    });

    if (authError) {
      // If user already exists, try to sign in to get the user data
      if (authError.message.includes('already registered')) {
        console.log(`User ${userData.email} already exists, trying to sign in...`);
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: userData.email,
          password: userData.password
        });
        
        if (signInError) {
          throw signInError;
        }
        
        authData.user = signInData.user;
        authData.session = signInData.session;
      } else {
        throw authError;
      }
    }

    const userId = authData.user.id;
    console.log(`User created/fetched with ID: ${userId}`);

    // Default assets
    const pfpUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/default/defaultpfp.png`;
    const bannerUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/default/defaultbanner.png`;
    const defaultBio = "Test user for automated testing";

    // Create or update the user's profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert([{
        id: userId,
        username: userData.username,
        tag: userData.tag,
        profile_picture: pfpUrl,
        banner: bannerUrl,
        themes: "dark",
        description: defaultBio,
        verified: userData.verified || false,
        premium: userData.premium || false,
        tester: userData.tester || false
      }], {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error creating/updating profile:', profileError);
      throw profileError;
    }

    console.log(`Profile created/updated for user: ${userData.username}`);
    
    // Sign out the user to clean up
    await supabaseClient.auth.signOut();
    
    return { id: userId, ...userData };

  } catch (error) {
    console.error(`Error creating test user ${userData.username}:`, error);
    throw error;
  }
}

// Create friend relationship between two users
async function createFriendRelationship(user1, user2) {
  console.log(`Creating friend relationship between ${user1.username} and ${user2.username}`);
  
  try {
    // Sign in as user1 to create the friendship
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: user1.email,
      password: user1.password
    });
    
    if (signInError) {
      throw signInError;
    }

    // Check if friendship already exists
    const { data: existingFriendship } = await supabaseClient
      .from('friends')
      .select('*')
      .or(`and(requester_id.eq.${user1.id},receiver_id.eq.${user2.id}),and(requester_id.eq.${user2.id},receiver_id.eq.${user1.id})`)
      .single();

    if (existingFriendship) {
      console.log('Friendship already exists');
      await supabaseClient.auth.signOut();
      return existingFriendship;
    }

    // Create friend request
    const { data: friendshipData, error: friendshipError } = await supabaseClient
      .from('friends')
      .insert([{
        requester_id: user1.id,
        receiver_id: user2.id,
        status: 'accepted'
      }])
      .select()
      .single();

    if (friendshipError) {
      console.error('Error creating friendship:', friendshipError);
      throw friendshipError;
    }

    console.log(`Friendship created between ${user1.username} and ${user2.username}`);
    
    // Sign out
    await supabaseClient.auth.signOut();
    
    return friendshipData;

  } catch (error) {
    console.error(`Error creating friend relationship:`, error);
    throw error;
  }
}

// Create all test users
async function createAllTestUsers() {
  console.log('Starting test user creation...');
  
  const config = loadTestConfig();
  const createdUsers = [];

  try {
    // Create each test user
    for (const userData of config.testUsers) {
      const user = await createTestUser(userData);
      createdUsers.push(user);
    }

    // Create friend relationships
    for (const friendRelation of config.testFriends) {
      const user1 = createdUsers.find(u => u.username === friendRelation.usernames[0]);
      const user2 = createdUsers.find(u => u.username === friendRelation.usernames[1]);
      
      if (user1 && user2) {
        await createFriendRelationship(user1, user2);
      } else {
        console.error('Could not find users for friend relationship:', friendRelation);
      }
    }

    console.log('Test user creation completed successfully!');
    console.log('Created users:', createdUsers.map(u => ({ username: u.username, email: u.email, id: u.id })));
    
    return createdUsers;

  } catch (error) {
    console.error('Error in test user creation:', error);
    throw error;
  }
}

// Verify test users exist
async function verifyTestUsersExist() {
  console.log('Verifying test users exist...');
  
  const config = loadTestConfig();
  const verificationResults = [];

  for (const userData of config.testUsers) {
    try {
      // Try to sign in to check if user exists
      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });
      
      if (signInError) {
        verificationResults.push({ username: userData.username, exists: false, reason: signInError.message });
        continue;
      }

      const authUser = signInData.user;
      
      // Check if profile exists
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) {
        verificationResults.push({ username: userData.username, exists: false, reason: 'Profile not found' });
        await supabaseClient.auth.signOut();
        continue;
      }

      verificationResults.push({
        username: userData.username,
        exists: true,
        id: authUser.id,
        profile: profile
      });

      // Sign out
      await supabaseClient.auth.signOut();

    } catch (error) {
      verificationResults.push({ username: userData.username, exists: false, reason: error.message });
    }
  }

  console.log('Verification results:', JSON.stringify(verificationResults, null, 2));
  return verificationResults;
}

// Clean up all test data
async function cleanupAllTestData() {
  console.log('Cleanup function not available with anonymous key - requires admin privileges');
  console.log('To clean up test users, you would need to use the Supabase dashboard or service role key');
  return [];
}

// Main execution
const command = process.argv[2];

async function main() {
  switch (command) {
    case 'create':
      await createAllTestUsers();
      break;
    case 'verify':
      await verifyTestUsersExist();
      break;
    default:
      console.log('Usage: node create-test-users.js [create|verify]');
      console.log('  create   - Create all test users and their relationships');
      console.log('  verify   - Verify that test users exist');
  }
}

main().catch(console.error);

// Export functions for use in other modules
module.exports = {
  createTestUser,
  createFriendRelationship,
  createAllTestUsers,
  verifyTestUsersExist,
  cleanupAllTestData,
  loadTestConfig
};