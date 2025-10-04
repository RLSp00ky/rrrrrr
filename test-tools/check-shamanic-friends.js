// Test to check if shamanic user has friends in the database
// Using proper test environment setup

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env file
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkShamanicFriends() {
  console.log('🔍 Checking shamanic user friends...');
  
  try {
    // Get shamanic's user ID
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, username, friendcount')
      .eq('username', 'shamanic')
      .single();
    
    if (userError) {
      console.error('❌ Error getting shamanic user:', userError);
      return;
    }
    
    console.log('✅ Found shamanic user:', userData);
    
    // Get ALL friends records
    const { data: allFriends, error: friendsError } = await supabase
      .from('friends')
      .select('*');
    
    if (friendsError) {
      console.error('❌ Error getting friends:', friendsError);
      return;
    }
    
    console.log(`📋 Total friends records: ${allFriends.length}`);
    
    // Filter for shamanic's friendships
    const shamanicFriends = allFriends.filter(f => 
      f.requester_id === userData.id || f.receiver_id === userData.id
    );
    
    console.log('🎯 Shamanic friendships:', shamanicFriends);
    
    if (shamanicFriends.length === 0) {
      console.log('❌ No friendship records found for shamanic');
      console.log('🤔 But friendcount shows:', userData.friendcount);
      console.log('⚠️  friendcount and friends table are out of sync');
    } else {
      console.log('✅ Found friendship records for shamanic');
      
      // Get friend details
      const friendIds = shamanicFriends.map(f => 
        f.requester_id === userData.id ? f.receiver_id : f.requester_id
      );
      
      const { data: friendProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, profile_picture')
        .in('id', friendIds);
      
      if (profilesError) {
        console.error('❌ Error getting friend profiles:', profilesError);
      } else {
        console.log('👤 Friend profiles:', friendProfiles);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

checkShamanicFriends();