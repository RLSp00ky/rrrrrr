import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tevtrhkabycoddnwssar.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRyaGthYnljb2Rkbndzc2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTg3NTMsImV4cCI6MjA3MjM3NDc1M30.icqgrtyNhBKoHXk5RP4EzElG_4EMUKI3YihdUblr4w4'

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Make it available globally for legacy scripts
window.supabaseClient = supabaseClient
window.supabase = { createClient }

// Environment config for legacy scripts
window.envConfig = {
  load: async () => ({
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    TURN_USERNAME: import.meta.env.VITE_TURN_USERNAME,
    TURN_CREDENTIAL: import.meta.env.VITE_TURN_CREDENTIAL
  }),
  get: (key) => import.meta.env[`VITE_${key}`]
}

console.log("✅ Supabase client initialized with Vite")

// Load legacy scripts after modules are ready
function loadLegacyScript(src, isModule = false) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    if (isModule) {
      script.type = 'module'
    }
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// Load legacy scripts in order
async function loadLegacyScripts() {
  try {
    await loadLegacyScript('./database.js')
    await loadLegacyScript('./auth-manager.js')
    
    // Load page-specific scripts based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html'
    
    if (currentPage === 'index.html' || currentPage === '') {
      await loadLegacyScript('./script.js', true)
    } else if (currentPage === 'settings.html') {
      await loadLegacyScript('./settings.js')
      await loadLegacyScript('./themes.js')
      await loadLegacyScript('./settings-db.js')
    } else if (currentPage === 'social.html') {
      await loadLegacyScript('./social.js')
    } else if (currentPage === 'login.html') {
      await loadLegacyScript('./login-db.js')
      await loadLegacyScript('./login.js')
    }
    
    console.log("✅ All legacy scripts loaded")
    
    // Hide loading overlay
    const loadingOverlay = document.getElementById("loading-overlay")
    if (loadingOverlay) {
      loadingOverlay.style.display = "none"
    }
  } catch (error) {
    console.error("❌ Error loading legacy scripts:", error)
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadLegacyScripts)
} else {
  loadLegacyScripts()
}