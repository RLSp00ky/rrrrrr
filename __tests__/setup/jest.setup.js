// Jest Setup File
// This file is executed before each test file

// Import testing utilities
// import '@testing-library/jest-dom'; // Commented out for Node environment

// Mock Supabase client for testing
global.supabase = {
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
      getSession: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      or: jest.fn(),
      in: jest.fn(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      order: jest.fn()
    })),
    channel: jest.fn(() => ({
      on: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn()
      }))
    }
  }))
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock window.location will be done in beforeEach

// Mock console methods to reduce noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
global.testUtils = {
  // Create a mock DOM element
  createElement: (tag, attributes = {}, children = []) => {
    const element = document.createElement(tag);
    
    Object.keys(attributes).forEach(key => {
      if (key === 'className') {
        element.className = attributes[key];
      } else if (key === 'innerHTML') {
        element.innerHTML = attributes[key];
      } else if (key === 'textContent') {
        element.textContent = attributes[key];
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });
    
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
    
    return element;
  },
  
  // Wait for a condition to be true
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkCondition = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for condition: ${condition.toString()}`));
        } else {
          setTimeout(checkCondition, 50);
        }
      };
      
      checkCondition();
    });
  },
  
  // Create a mock event
  createEvent: (type, details = {}) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, details);
    return event;
  },
  
  // Mock fetch
  mockFetch: (response, options = {}) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
        ...options
      })
    );
  },
  
  // Reset all mocks
  resetMocks: () => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  }
};

// Setup and teardown for each test
beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset mocks
  testUtils.resetMocks();
  
  // Setup default DOM structure for social page
  document.body.innerHTML = `
    <nav class="navbar">
      <h1>SoundLink</h1>
    </nav>
    <main class="main-container">
      <aside id="friends-panel">
        <div class="friends-column-css">
          <h2>Friends</h2>
          <div id="friends-list" class="scrollable-friends"></div>
        </div>
      </aside>
      <section class="chat-section">
        <button id="scroll-to-bottom">Scroll to bottom</button>
        <div id="chat-container" style="display: none;">
          <div id="chat-header">
            <img id="chat-header-img" src="icons/default-avatar.png" alt="Profile">
            <h2 id="chat-header-username"></h2>
          </div>
          <div id="chat-messages"></div>
          <div id="chat-input">
            <input type="text" id="chat-message-input" placeholder="Type a message...">
            <input type="file" id="file-upload" style="display:none;" />
            <button id="upload-btn">upload</button>
            <button id="chat-send-btn">Send</button>
          </div>
        </div>
      </section>
    </main>
    <div id="loading-overlay" style="display: none;"></div>
  `;
});

// Global test configuration
global.TEST_CONFIG = {
  testMode: true,
  testUsers: [
    {
      id: 'test-user-1-id',
      email: 'testuser1@example.com',
      username: 'TestUser1',
      tag: 'Developer',
      verified: true,
      premium: false,
      tester: true
    },
    {
      id: 'test-user-2-id',
      email: 'testuser2@example.com',
      username: 'TestUser2',
      tag: 'Designer',
      verified: false,
      premium: true,
      tester: false
    }
  ]
};

// Mock environment variables
process.env.TEST_MODE = 'true';
process.env.TEST_USER_ID = 'TestUser1';