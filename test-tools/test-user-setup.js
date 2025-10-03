// Test User Setup Script
// This script creates test users in Supabase Auth and their corresponding profiles

// Import required modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { readFileSync } from 'https://deno.land/std@0.177.0/fs/mod.ts';

// Import required modules
require('dotenv').config({ path: '../.env' });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_ANON_KEY; // Using anon key for now, add service key to .env if needed

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Load test configuration
function loadTestConfig() {
  try {
    const configContent = readFileSync('./test-config.json', { encoding: 'utf8' });
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
    // First, create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm email for test users
      user_metadata: {
        username: userData.username,
        tag: userData.tag
      }
    });

    if (authError) {
      // If user already exists, try to get the existing user
      if (authError.message.includes('already registered')) {
        console.log(`User ${userData.email} already exists, fetching existing user...`);
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === userData.email);
        
        if (existingUser) {
          authData.user = existingUser;
        } else {
          throw authError;
        }
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
    const { error: profileError } = await supabaseAdmin
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
    // Check if friendship already exists
    const { data: existingFriendship } = await supabaseAdmin
      .from('friends')
      .select('*')
      .or(`and(requester_id.eq.${user1.id},receiver_id.eq.${user2.id}),and(requester_id.eq.${user2.id},receiver_id.eq.${user1.id})`)
      .single();

    if (existingFriendship) {
      console.log('Friendship already exists');
      return existingFriendship;
    }

    // Create friend request
    const { data: friendshipData, error: friendshipError } = await supabaseAdmin
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
      // Check if user exists in auth
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = existingUsers.users.find(u => u.email === userData.email);
      
      if (!authUser) {
        verificationResults.push({ username: userData.username, exists: false, reason: 'Not found in auth' });
        continue;
      }

      // Check if profile exists
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) {
        verificationResults.push({ username: userData.username, exists: false, reason: 'Profile not found' });
        continue;
      }

      verificationResults.push({ 
        username: userData.username, 
        exists: true, 
        id: authUser.id,
        profile: profile
      });

    } catch (error) {
      verificationResults.push({ username: userData.username, exists: false, reason: error.message });
    }
  }

  console.log('Verification results:', verificationResults);
  return verificationResults;
}

// Clean up all test data
async function cleanupAllTestData() {
  console.log('Cleaning up test data...');
  
  const config = loadTestConfig();
  const deletedUsers = [];

  try {
    // Get all test users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    for (const userData of config.testUsers) {
      const authUser = existingUsers.users.find(u => u.email === userData.email);
      
      if (authUser) {
        // Delete user's profile first
        const { error: profileDeleteError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', authUser.id);

        if (profileDeleteError) {
          console.error(`Error deleting profile for ${userData.username}:`, profileDeleteError);
        }

        // Delete user's messages
        const { error: messagesDeleteError } = await supabaseAdmin
          .from('messages')
          .delete()
          .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`);

        if (messagesDeleteError) {
          console.error(`Error deleting messages for ${userData.username}:`, messagesDeleteError);
        }

        // Delete user's friendships
        const { error: friendsDeleteError } = await supabaseAdmin
          .from('friends')
          .delete()
          .or(`requester_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`);

        if (friendsDeleteError) {
          console.error(`Error deleting friendships for ${userData.username}:`, friendsDeleteError);
        }

        // Delete the auth user
        const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);

        if (userDeleteError) {
          console.error(`Error deleting user ${userData.username}:`, userDeleteError);
        } else {
          console.log(`Deleted user: ${userData.username}`);
          deletedUsers.push(userData.username);
        }
      }
    }

    console.log('Test data cleanup completed!');
    console.log('Deleted users:', deletedUsers);
    return deletedUsers;

  } catch (error) {
    console.error('Error in test data cleanup:', error);
    throw error;
  }
}

// Main execution
if (import.meta.main) {
  const command = Deno.args[0];
  
  switch (command) {
    case 'create':
      await createAllTestUsers();
      break;
    case 'verify':
      await verifyTestUsersExist();
      break;
    case 'cleanup':
      await cleanupAllTestData();
      break;
    default:
      console.log('Usage: deno run --allow-net --allow-read test-user-setup.js [create|verify|cleanup]');
      console.log('  create   - Create all test users and their relationships');
      console.log('  verify   - Verify that test users exist');
      console.log('  cleanup  - Delete all test users and their data');
  }
}

// Export functions for use in other modules
export {
  createTestUser,
  createFriendRelationship,
  createAllTestUsers,
  verifyTestUsersExist,
  cleanupAllTestData,
  loadTestConfig
};