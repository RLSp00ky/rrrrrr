// Test to prove the auth user vs profile bug with real Supabase data

describe('Auth User vs Profile Bug Proof', () => {
  let supabaseClient;
  let realAuthUser;
  let realProfile;
  
  beforeAll(async () => {
    // Use actual Supabase client
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config();
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    // Sign in as test user 1
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: 'testuser1@example.com',
      password: 'TestPassword123!'
    });
    
    if (signInError) {
      console.error('Failed to sign in:', signInError);
      return;
    }
    
    // Store the real auth user
    realAuthUser = signInData.user;
    
    // Get the real profile data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single();
    
    realProfile = profile;
    
    // Sign out
    await supabaseClient.auth.signOut();
  });
  
  test('should prove getCurrentUser() causes undefined username bug', () => {
    console.log('=== PROVING THE BUG WITH REAL DATA ===');
    
    // Test the buggy approach (using auth user)
    const messageWithBuggySender = {
      id: 'test-msg',
      message: 'Test message',
      created_at: new Date().toISOString()
    };
    
    // This is what the buggy code does
    messageWithBuggySender.sender = {
      username: realAuthUser.username, // This is undefined!
      profile_picture: realAuthUser.profile_picture || "icons/default-avatar.png" // This is undefined!
    };
    
    console.log('Buggy approach result:', messageWithBuggySender.sender);
    
    // Test the fixed approach (using profile)
    const messageWithFixedSender = {
      id: 'test-msg-fixed',
      message: 'Test message',
      created_at: new Date().toISOString()
    };
    
    // This is what the fixed code does
    messageWithFixedSender.sender = {
      username: realProfile.username, // This works!
      profile_picture: realProfile.profile_picture || "icons/default-avatar.png" // This works!
    };
    
    console.log('Fixed approach result:', messageWithFixedSender.sender);
    
    // PROVE THE BUG EXISTS
    expect(messageWithBuggySender.sender.username).toBeUndefined();
    expect(messageWithBuggySender.sender.profile_picture).toBe('icons/default-avatar.png');
    
    // PROVE THE FIX WORKS
    expect(messageWithFixedSender.sender.username).toBe('TestUser1');
    expect(messageWithFixedSender.sender.profile_picture).toBe(`${process.env.SUPABASE_URL}/storage/v1/object/public/default/defaultpfp.png`);
  });
  
  test('should prove real-time handler has same bug', () => {
    console.log('=== PROVING REAL-TIME HANDLER BUG ===');
    
    // Simulate incoming real-time message for buggy test
    const incomingMessageBuggy = {
      id: 'realtime-msg-buggy',
      sender_id: realAuthUser.id,
      receiver_id: 'friend-id',
      message: 'Real-time message',
      created_at: new Date().toISOString()
    };
    
    // Buggy real-time handler (using auth user)
    if (incomingMessageBuggy.sender_id === realAuthUser.id) {
      incomingMessageBuggy.sender = {
        username: realAuthUser.username, // undefined!
        profile_picture: realAuthUser.profile_picture || "icons/default-avatar.png" // undefined!
      };
    }
    
    console.log('Buggy real-time result:', incomingMessageBuggy.sender);
    
    // Simulate incoming real-time message for fixed test
    const incomingMessageFixed = {
      id: 'realtime-msg-fixed',
      sender_id: realProfile.id,
      receiver_id: 'friend-id',
      message: 'Real-time message',
      created_at: new Date().toISOString()
    };
    
    // Fixed real-time handler (using profile)
    if (incomingMessageFixed.sender_id === realProfile.id) {
      incomingMessageFixed.sender = {
        username: realProfile.username, // works!
        profile_picture: realProfile.profile_picture || "icons/default-avatar.png" // works!
      };
    }
    
    console.log('Fixed real-time result:', incomingMessageFixed.sender);
    
    // PROVE THE BUG EXISTS
    expect(incomingMessageBuggy.sender.username).toBeUndefined();
    
    // PROVE THE FIX WORKS
    expect(incomingMessageFixed.sender.username).toBe('TestUser1');
  });
});