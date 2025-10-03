// Jest Setup File
// This file is executed before each test file

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

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