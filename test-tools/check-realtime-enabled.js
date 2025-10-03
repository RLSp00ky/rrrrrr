// Check if Realtime is enabled in Supabase

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

async function checkRealtimeEnabled() {
  console.log('🔍 Checking if Realtime is enabled in Supabase...');
  
  // Test channel subscription
  const testChannel = supabaseClient.channel('test-realtime')
    .on('postgres_changes', { event: '*', schema: '*' }, (payload) => {
      console.log('✅ Realtime event received:', payload);
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime is ENABLED and working!');
        console.log('   Channel subscription successful');
      } else if (status === 'CHANNEL_ERROR') {
        console.log('❌ Realtime subscription ERROR:', err);
        console.log('   This might mean Realtime is not enabled in your Supabase project');
      } else if (status === 'TIMED_OUT') {
        console.log('❌ Realtime subscription TIMED OUT');
        console.log('   This might indicate Realtime configuration issues');
      } else {
        console.log(`ℹ️  Realtime status: ${status}`);
      }
    });
  
  // Wait a moment to see the status
  setTimeout(async () => {
    console.log('\n📊 Checking messages table for Realtime support...');
    
    // Try to query the messages table
    const { data, error } = await supabaseClient
      .from('messages')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Error accessing messages table:', error.message);
    } else {
      console.log('✅ Messages table is accessible');
    }
    
    // Check if RLS (Row Level Security) is enabled on messages
    const { data: rlsData, error: rlsError } = await supabaseClient
      .rpc('get_table_info', { table_name: 'messages' });
    
    if (rlsError) {
      console.log('ℹ️  Could not check RLS status (this is normal)');
    } else {
      console.log('✅ Table info accessible');
    }
    
    console.log('\n🔧 If Realtime is not working, check:');
    console.log('   1. Realtime is enabled in Supabase Dashboard > Project > Settings > API');
    console.log('   2. Replication is enabled for the messages table');
    console.log('   3. RLS policies allow Realtime subscriptions');
    
    // Unsubscribe and exit
    await testChannel.unsubscribe();
    process.exit(0);
  }, 3000);
}

checkRealtimeEnabled().catch(console.error);