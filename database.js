// Environment variables will be loaded by env-config.js
let SUPABASE_URL, SUPABASE_ANON_KEY;

// Function to initialize Supabase client with environment values
window.initSupabaseFromEnv = (config) => {
  SUPABASE_URL = config.SUPABASE_URL;
  SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
  
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,      
      autoRefreshToken: true,    
      detectSessionInUrl: true,  
    },
  });
  
  window.supabaseClient = supabaseClient;
};