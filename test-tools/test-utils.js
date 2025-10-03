// Test Utilities for Chat Testing
// This module provides utilities for working with test users during testing

// Import required modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { readFileSync } from 'https://deno.land/std@0.177.0/fs/mod.ts';

// Supabase configuration
const supabaseUrl = 'https://tevtrhkabycoddnwssar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRyaGthYnljb2Rkbndzc2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTg3NTMsImV4cCI6MjA3MjM3NDc1M30.icqgrtyNhBKoHXk5RP4EzElG_4EMUKI3YihdUblr4w4';

// Global test state
let testConfig = null;
let currentTestUser = null;
let testSupabaseClient = null;

// Load test configuration
export function loadTestConfig() {
  if (testConfig) {
    return testConfig;
  }
  
  try {
    const configContent = readFileSync('./test-config.json', { encoding: 'utf8' });
    testConfig = JSON.parse(configContent);
    return testConfig;
  } catch (error) {
    console.error('Error loading test config:', error);
    throw error;
  }
}

// Check if test mode is enabled
export function isTestMode() {
  // Check environment variable first
  if (Deno.env.get('TEST_MODE') === 'true') {
    return true;
  }
  
  // Then check config file
  const config = loadTestConfig();
  return config.testMode === true;
}

// Get active test user ID from environment
export function getActiveTestUserId() {
  return Deno.env.get('TEST_USER_ID') || null;
}

// Get test user by username or email
export function getTestUser(identifier) {
  const config = loadTestConfig();
  return config.testUsers.find(user => 
    user.username === identifier || user.email === identifier
  );
}

// Get all test users
export function getAllTestUsers() {
  const config = loadTestConfig();
  return config.testUsers;
}

// Create a Supabase client for testing
export function createTestSupabaseClient() {
  if (testSupabaseClient) {
    return testSupabaseClient;
  }
  
  testSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
  
  return testSupabaseClient;
}

// Authenticate as a test user
export async function authenticateTestUser(userIdentifier) {
  const user = getTestUser(userIdentifier);
  if (!user) {
    throw new Error(`Test user not found: ${userIdentifier}`);
  }
  
  console.log(`Authenticating as test user: ${user.username}`);
  
  const client = createTestSupabaseClient();
  
  try {
    // Sign out first to ensure clean state
    await client.auth.signOut();
    
    // Sign in as the test user
    const { data, error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });
    
    if (error) {
      throw error;
    }
    
    currentTestUser = {
      ...user,
      id: data.user.id,
      session: data.session
    };
    
    console.log(`Successfully authenticated as: ${user.username}`);
    return currentTestUser;
    
  } catch (error) {
    console.error(`Error authenticating test user ${user.username}:`, error);
    throw error;
  }
}

// Get the currently authenticated test user
export function getCurrentTestUser() {
  return currentTestUser;
}

// Switch to a different test user
export async function switchTestUser(userIdentifier) {
  console.log(`Switching to test user: ${userIdentifier}`);
  return await authenticateTestUser(userIdentifier);
}

// Sign out the current test user
export async function signOutTestUser() {
  const client = createTestSupabaseClient();
  await client.auth.signOut();
  currentTestUser = null;
  console.log('Test user signed out');
}

// Send a test message from current user to another user
export async function sendTestMessage(receiverIdentifier, message) {
  const sender = getCurrentTestUser();
  if (!sender) {
    throw new Error('No test user is currently authenticated');
  }
  
  const receiver = getTestUser(receiverIdentifier);
  if (!receiver) {
    throw new Error(`Receiver not found: ${receiverIdentifier}`);
  }
  
  const client = createTestSupabaseClient();
  
  try {
    const { data, error } = await client
      .from('messages')
      .insert([{
        sender_id: sender.id,
        receiver_id: receiver.id,
        message: message
      }])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`Message sent from ${sender.username} to ${receiver.username}: "${message}"`);
    return data;
    
  } catch (error) {
    console.error('Error sending test message:', error);
    throw error;
  }
}

// Get messages between current test user and another user
export async function getTestMessages(otherUserIdentifier) {
  const currentUser = getCurrentTestUser();
  if (!currentUser) {
    throw new Error('No test user is currently authenticated');
  }
  
  const otherUser = getTestUser(otherUserIdentifier);
  if (!otherUser) {
    throw new Error(`User not found: ${otherUserIdentifier}`);
  }
  
  const client = createTestSupabaseClient();
  
  try {
    const { data, error } = await client
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},receiver_id.eq.${currentUser.id})`
      )
      .order('created_at', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return data;
    
  } catch (error) {
    console.error('Error getting test messages:', error);
    throw error;
  }
}

// Set up real-time subscription for messages
export function setupTestRealtimeSubscription(otherUserId, onMessageReceived) {
  const currentUser = getCurrentTestUser();
  if (!currentUser) {
    throw new Error('No test user is currently authenticated');
  }
  
  const client = createTestSupabaseClient();
  
  const channelName = `test-chat-${[currentUser.id, otherUserId].sort().join("-")}`;
  
  const channel = client.channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id}))`
      },
      async (payload) => {
        console.log('Real-time message received:', payload.new);
        onMessageReceived(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('Real-time subscription status:', status);
    });
  
  return channel;
}

// Create a test environment for testing
export async function createTestEnvironment() {
  console.log('Setting up test environment...');
  
  // Check if test mode is enabled
  if (!isTestMode()) {
    console.log('Test mode is not enabled');
    return null;
  }
  
  // Get the active test user ID from environment
  const activeUserId = getActiveTestUserId();
  if (activeUserId) {
    await authenticateTestUser(activeUserId);
  } else {
    // Default to first test user
    const config = loadTestConfig();
    if (config.testUsers.length > 0) {
      await authenticateTestUser(config.testUsers[0].username);
    }
  }
  
  console.log('Test environment setup complete');
  return getCurrentTestUser();
}

// Clean up test environment
export async function cleanupTestEnvironment() {
  console.log('Cleaning up test environment...');
  await signOutTestUser();
  currentTestUser = null;
  testSupabaseClient = null;
  console.log('Test environment cleaned up');
}

// Wait for a real-time message to be received
export function waitForTestMessage(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for message after ${timeoutMs}ms`));
    }, timeoutMs);
    
    // This function should be called when a message is received
    const messageHandler = (message) => {
      clearTimeout(timeout);
      resolve(message);
    };
    
    // Return the handler function to be used by the subscription
    return messageHandler;
  });
}

// Helper function to create a delay
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export the Supabase client for direct use in tests if needed
export { createTestSupabaseClient as getTestSupabaseClient };