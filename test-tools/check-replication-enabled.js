// Check if Replication is enabled for the messages table

// Import required modules
const { createClient } = require('@supabase/supabase-js');

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

async function checkReplicationEnabled() {
  console.log('🔍 Checking if Replication is enabled for messages table...');
  
  try {
    // Check if replication is enabled for the messages table
    const { data, error } = await supabaseAdmin
      .from('pg_publication_tables')
      .select('tablename, schemaname')
      .eq('tablename', 'messages')
      .eq('schemaname', 'public');
    
    if (error) {
      console.log('❌ Error checking replication:', error.message);
      console.log('   This might mean the service role key is invalid or replication is not set up');
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Replication is ENABLED for messages table');
      console.log('   Table: messages, Schema: public');
    } else {
      console.log('❌ Replication is NOT enabled for messages table');
      console.log('   This is likely why real-time messages are not working!');
      console.log('   You need to enable replication in the Supabase dashboard');
    }
    
    // Check all publications
    const { data: allPublications, error: pubError } = await supabaseAdmin
      .from('pg_publication_tables')
      .select('tablename, schemaname, publicationname');
    
    if (pubError) {
      console.log('ℹ️  Could not list all publications:', pubError.message);
    } else {
      console.log('\n📊 All publications:');
      if (allPublications && allPublications.length > 0) {
        allPublications.forEach(pub => {
          console.log(`   ${pub.publicationname}: ${pub.schemaname}.${pub.tablename}`);
        });
      } else {
        console.log('   No publications found');
      }
    }
    
    console.log('\n🔧 To enable replication:');
    console.log('   1. Go to Supabase Dashboard > Project > Database > Replication');
    console.log('   2. Click "Add a new publication"');
    console.log('   3. Select the messages table');
    console.log('   4. Save the publication');
    
  } catch (err) {
    console.log('❌ Error checking replication:', err.message);
  }
}

checkReplicationEnabled().catch(console.error);