// Client-side environment configuration loader for Vite
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL 
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY 

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

window.supabase = { createClient }

class EnvConfig {
  constructor() {
    this.config = {
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      TURN_USERNAME: import.meta.env.VITE_TURN_USERNAME,
      TURN_CREDENTIAL: import.meta.env.VITE_TURN_CREDENTIAL
    };
  }

  async load() {
    return this.config;
  }

  get(key) {
    return this.config[key];
  }

  async getConfig() {
    return this.config;
  }
}

// Export a singleton instance
const envConfig = new EnvConfig();
window.envConfig = envConfig;