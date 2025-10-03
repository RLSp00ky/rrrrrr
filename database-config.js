require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      
    autoRefreshToken: true,    
    detectSessionInUrl: true,  
  },
});

module.exports = { supabaseClient, supabaseUrl, supabaseAnonKey };