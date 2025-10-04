// Wait for env-config to load environment variables
document.addEventListener("DOMContentLoaded", () => {
  // Wait a bit for env-config to set up the globals
  setTimeout(() => {
    if (window.envConfig && window.supabase) {
      const config = window.envConfig.config;
      const supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,      
          autoRefreshToken: true,    
          detectSessionInUrl: true,  
        },
      });
      
      window.supabaseClient = supabaseClient;
      console.log('✅ Supabase client created in database.js like working version');
    } else {
      console.error('❌ env-config or supabase not available');
    }
  }, 100);
});