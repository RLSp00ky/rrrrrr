require('dotenv').config({ path: '../.env' });

console.log('🔍 Testing Database Configuration with Environment Variables');
console.log('===========================================================');

try {
  // Test if environment variables are loaded
  console.log('Checking environment variables...');
  
  if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not defined in environment variables');
  }
  
  if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is not defined in environment variables');
  }
  
  console.log('✅ Environment variables loaded successfully');
  
  // Test database.js by importing and checking if it can create a client
  console.log('\nTesting database.js configuration...');
  
  // We need to mock the supabase import for testing
  global.supabase = {
    createClient: (url, key, options) => {
      console.log('✅ Supabase client creation attempted');
      console.log(`   URL: ${url.substring(0, 30)}...`);
      console.log(`   Key: ${key.substring(0, 20)}...`);
      console.log(`   Options: ${JSON.stringify(options, null, 2)}`);
      
      return {
        auth: {
          persistSession: options?.auth?.persistSession,
          autoRefreshToken: options?.auth?.autoRefreshToken,
          detectSessionInUrl: options?.auth?.detectSessionInUrl
        }
      };
    }
  };
  
  // Now try to load database-config.js (server-side version)
  const database = require('../database-config.js');
  
  console.log('✅ Database.js loaded successfully with environment variables');
  console.log('\n🎯 Database Environment Variable Test Complete');
  
} catch (error) {
  console.error('❌ Error testing database configuration:', error.message);
  process.exit(1);
}