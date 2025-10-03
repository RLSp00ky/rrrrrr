// Client-side environment configuration loader
class EnvConfig {
  constructor() {
    this.config = null;
    this.loadPromise = null;
  }

  async load() {
    if (this.config) {
      return this.config;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = fetch('/env-config')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load environment config: ${response.status}`);
        }
        return response.json();
      })
      .then(config => {
        this.config = config;
        return config;
      })
      .catch(error => {
        console.error('Error loading environment configuration:', error);
        throw error;
      });

    return this.loadPromise;
  }

  get(key) {
    if (!this.config) {
      console.warn('Environment configuration not loaded yet. Call load() first.');
      return null;
    }
    return this.config[key];
  }

  async getConfig() {
    await this.load();
    return this.config;
  }
}

// Export a singleton instance
const envConfig = new EnvConfig();
window.envConfig = envConfig;

// Auto-load and initialize Supabase if the init function exists
envConfig.load().then(config => {
  if (window.initSupabaseFromEnv) {
    window.initSupabaseFromEnv(config);
  }
}).catch(error => {
  console.error('Failed to load environment config:', error);
});