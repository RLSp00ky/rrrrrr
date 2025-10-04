// Test to check if shamanic user has friends in the database
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tevtrhkabycoddnwssar.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRyaGthYnljb2Rkbndzc2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTg3NTMsImV4cCI6MjA3MjM3NDc1M30.icqgrtyNhBKoHXk5RP4EzElG_4EMUKI3YihdUblr4w4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testShamanicFriends() {
  console.log('🔍 Testing shamanic user friends...')
  
  try {
    // First get shamanic's user ID
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', 'shamanic')
      .single()
    
    if (userError) {
      console.error('❌ Error getting shamanic user:', userError)
      return
    }
    
    console.log('✅ Found shamanic user:', userData)
    
    // Check the profiles table for friends count
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('friends')
      .eq('id', userData.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error getting profile friends count:', profileError)
    } else {
      console.log('👥 Profile friends count:', profileData)
    }
    
    // First check what columns exist in friends table
    const { data: friendsSample, error: sampleError } = await supabase
      .from('friends')
      .select('*')
    
    if (sampleError) {
      console.error('❌ Error sampling friends table:', sampleError)
      return
    }
    
    console.log('📋 Friends table sample:', friendsSample)
    
    // Check friends table for shamanic's friends
    const { data: friendships, error: friendshipError } = await supabase
      .from('friends')
      .select('*')
    
    if (friendshipError) {
      console.error('❌ Error getting friendships:', friendshipError)
      return
    }
    
    console.log('📋 Raw friendships data:', friendships)
    
    // Filter friendships where shamanic is involved
    const shamanicFriendships = friendships.filter(f => 
      f.requester_id === userData.id || f.receiver_id === userData.id
    )
    
    console.log('🎯 Shamanic friendships:', shamanicFriendships)
    
    if (!shamanicFriendships || shamanicFriendships.length === 0) {
      console.log('❌ No friendships found for shamanic')
      console.log('🔍 Shamanic ID:', userData.id)
      console.log('🔍 Looking in requester_id and receiver_id fields...')
      return
    }
    
    // Get friend details
    const friendIds = shamanicFriendships.map(f => 
      f.requester_id === userData.id ? f.receiver_id : f.requester_id
    )
    
    console.log('👥 Friend IDs:', friendIds)
    
    const { data: friendProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, profile_picture, tag')
      .in('id', friendIds)
    
    if (profilesError) {
      console.error('❌ Error getting friend profiles:', profilesError)
      return
    }
    
    console.log('👤 Friend profiles:', friendProfiles)
    
    // Test the getFriends function directly
    console.log('\n🧪 Testing getFriends function...')
    
    // Mock the auth manager state
    window.authManager = {
      currentUser: {
        id: userData.id
      }
    }
    
    // Import and test getFriends
    const { getFriends } = await import('./friends.js')
    const friends = await getFriends()
    
    console.log('📱 getFriends result:', friends)
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testShamanicFriends()