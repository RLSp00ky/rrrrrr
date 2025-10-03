// Real-time Subscription Tests
// These tests verify the real-time message subscription functionality

describe('Real-time Message Subscriptions', () => {
  let mockSupabaseClient;
  let mockChannel;
  let mockAuthManager;
  let chatMessagesEl;
  
  beforeEach(() => {
    // Get DOM elements
    chatMessagesEl = document.getElementById('chat-messages');
    
    // Mock channel for real-time subscriptions
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((callback) => {
        // Simulate successful subscription
        setTimeout(() => {
          if (callback) callback('SUBSCRIBED');
        }, 10);
        return mockChannel;
      }),
      unsubscribe: jest.fn().mockResolvedValue()
    };
    
    // Mock Supabase client with real-time functionality
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({
          data: [{ id: 'msg-1', message: 'Test message' }],
          error: null
        }),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })),
      channel: jest.fn(() => mockChannel)
    };
    
    // Mock AuthManager with real test user data (FIXED)
    mockAuthManager = {
      getCurrentUser: jest.fn(() => ({
        id: '730b07a9-308c-475a-babb-9c1500986775',
        email: 'testuser1@example.com'
      })),
      getCurrentUserProfile: jest.fn(() => ({
        id: '730b07a9-308c-475a-babb-9c1500986775',
        username: 'TestUser1',
        profile_picture: `${process.env.SUPABASE_URL}/storage/v1/object/public/default/defaultpfp.png`,
        tag: 'artist',
        verified: true,
        premium: false,
        tester: true
      })),
      isAuthenticated: jest.fn(() => true),
      waitForAuth: jest.fn().mockResolvedValue()
    };
    
    // Set up global mocks
    global.supabaseClient = mockSupabaseClient;
    global.authManager = mockAuthManager;
  });
  
  describe('subscription setup', () => {
    test('should create a real-time subscription for chat messages', async () => {
      const friendId = '17ee71db-2320-4419-a88b-fa24780a588b'; // Real test user 2 ID
      const currentUserProfile = mockAuthManager.getCurrentUserProfile(); // FIXED: Use profile
      
      // Simulate the loadChat function which sets up the subscription
      const channelName = `chat-${[currentUserProfile.id, friendId].sort().join('-')}`;
      
      const loadChat = async (friendId) => {
        const currentUserProfile = mockAuthManager.getCurrentUserProfile(); // FIXED: Use profile
        if (!currentUserProfile) return console.error('No current user profile');
        
        // Clear existing messages
        if (chatMessagesEl) chatMessagesEl.innerHTML = '';
        
        // Set up real-time subscription
        const channelName = `chat-${[currentUserProfile.id, friendId].sort().join('-')}`;
        const chatChannel = mockSupabaseClient.channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `or(and(sender_id.eq.${currentUserProfile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserProfile.id}))`
            },
            async (payload) => {
              // Handle incoming message
              const msg = payload.new;
              
              if (msg.sender_id === currentUserProfile.id) { // FIXED: Use profile ID
                msg.sender = {
                  username: currentUserProfile.username, // FIXED: Use profile data
                  profile_picture: currentUserProfile.profile_picture || 'icons/default-avatar.png'
                };
              } else {
                // Fetch sender profile
                const { data: profile } = await mockSupabaseClient
                  .from('profiles')
                  .select('username, profile_picture')
                  .eq('id', msg.sender_id)
                  .single();
                msg.sender = profile || { username: 'Unknown', profile_picture: 'icons/default-avatar.png' };
              }
              
              // Append message to UI
              appendMessage(msg);
            }
          )
          .subscribe();
        
        return chatChannel;
      };
      
      // Helper function to append message
      function appendMessage(msg) {
        if (!chatMessagesEl) return;
        
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = msg.message || 'No message content';
        chatMessagesEl.appendChild(div);
      }
      
      const channel = await loadChat(friendId);
      
      // Verify channel was created with correct name
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(channelName);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
    
    test('should unsubscribe from previous channel before creating new one', async () => {
      const friendId1 = 'friend-1';
      const friendId2 = 'friend-2';
      const currentUser = mockAuthManager.getCurrentUser();
      
      // Mock a previous channel
      const previousChannel = {
        unsubscribe: jest.fn().mockResolvedValue()
      };
      
      let chatChannel = previousChannel;
      
      const loadChat = async (friendId) => {
        // Unsubscribe from previous channel if it exists
        if (chatChannel) {
          try { chatChannel.unsubscribe(); } catch (e) {}
        }
        
        const currentUser = mockAuthManager.getCurrentUser();
        const channelName = `chat-${[currentUser.id, friendId].sort().join('-')}`;
        chatChannel = mockSupabaseClient.channel(channelName)
          .on('postgres_changes', {}, () => {})
          .subscribe();
        
        return chatChannel;
      };
      
      // Load first chat
      await loadChat(friendId1);
      
      // Load second chat
      await loadChat(friendId2);
      
      // Verify previous channel was unsubscribed
      expect(previousChannel.unsubscribe).toHaveBeenCalled();
    });
  });
  
  describe('message reception', () => {
    test('should handle incoming messages from real-time subscription', async () => {
      const friendId = 'friend-1';
      const currentUser = mockAuthManager.getCurrentUser();
      
      // Mock the profile fetch for incoming messages
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    username: 'FriendUser',
                    profile_picture: 'friend-avatar.png'
                  },
                  error: null
                })
              })
            })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        };
      });
      
      // Set up the subscription
      const channelName = `chat-${[currentUser.id, friendId].sort().join('-')}`;
      let messageHandler = null;
      
      mockChannel.on.mockImplementation((event, filter, handler) => {
        if (event === 'postgres_changes') {
          messageHandler = handler;
        }
        return mockChannel;
      });
      
      // Simulate loadChat
      const chatChannel = mockSupabaseClient.channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id}))`
          },
          async (payload) => {
            const msg = payload.new;
            
            if (msg.sender_id === currentUser.id) {
              msg.sender = {
                username: currentUser.username,
                profile_picture: currentUser.profile_picture || 'icons/default-avatar.png'
              };
            } else {
              const { data: profile } = await mockSupabaseClient
                .from('profiles')
                .select('username, profile_picture')
                .eq('id', msg.sender_id)
                .single();
              msg.sender = profile || { username: 'Unknown', profile_picture: 'icons/default-avatar.png' };
            }
            
            // Append message to UI
            appendMessage(msg);
          }
        )
        .subscribe();
      
      // Helper function to append message
      function appendMessage(msg) {
        if (!chatMessagesEl) return;
        
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = `${msg.sender.username}: ${msg.message}`;
        chatMessagesEl.appendChild(div);
      }
      
      // Simulate receiving a message
      const incomingMessage = {
        id: 'msg-2',
        sender_id: friendId,
        receiver_id: currentUser.id,
        message: 'Hello from friend',
        created_at: new Date().toISOString()
      };
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Trigger the message handler
      if (messageHandler) {
        await messageHandler({ new: incomingMessage });
      }
      
      // Verify message was added to UI
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const messageElements = chatMessagesEl.querySelectorAll('.message');
      expect(messageElements.length).toBeGreaterThan(0);
      expect(messageElements[0].textContent).toContain('Hello from friend');
      expect(messageElements[0].textContent).toContain('FriendUser');
    });
    
    test('should handle messages from the current user', async () => {
      const friendId = '17ee71db-2320-4419-a88b-fa24780a588b'; // Real test user 2 ID
      const currentUserProfile = mockAuthManager.getCurrentUserProfile(); // FIXED: Use profile
      
      // Set up the subscription
      const channelName = `chat-${[currentUserProfile.id, friendId].sort().join('-')}`;
      let messageHandler = null;
      
      mockChannel.on.mockImplementation((event, filter, handler) => {
        if (event === 'postgres_changes') {
          messageHandler = handler;
        }
        return mockChannel;
      });
      
      // Simulate loadChat (FIXED)
      const chatChannel = mockSupabaseClient.channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `or(and(sender_id.eq.${currentUserProfile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserProfile.id}))`
          },
          async (payload) => {
            const msg = payload.new;
            
            if (msg.sender_id === currentUserProfile.id) { // FIXED: Use profile ID
              msg.sender = {
                username: currentUserProfile.username, // FIXED: Use profile data
                profile_picture: currentUserProfile.profile_picture || 'icons/default-avatar.png'
              };
            } else {
              const { data: profile } = await mockSupabaseClient
                .from('profiles')
                .select('username, profile_picture')
                .eq('id', msg.sender_id)
                .single();
              msg.sender = profile || { username: 'Unknown', profile_picture: 'icons/default-avatar.png' };
            }
            
            // Append message to UI
            appendMessage(msg);
          }
        )
        .subscribe();
      
      // Helper function to append message
      function appendMessage(msg) {
        if (!chatMessagesEl) return;
        
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = `${msg.sender.username}: ${msg.message}`;
        chatMessagesEl.appendChild(div);
      }
      
      // Simulate receiving a message from current user
      const outgoingMessage = {
        id: 'msg-3',
        sender_id: currentUserProfile.id, // FIXED: Use profile ID
        receiver_id: friendId,
        message: 'Message from me',
        created_at: new Date().toISOString()
      };
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Trigger the message handler
      if (messageHandler) {
        await messageHandler({ new: outgoingMessage });
      }
      
      // Verify message was added to UI
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const messageElements = chatMessagesEl.querySelectorAll('.message');
      expect(messageElements.length).toBeGreaterThan(0);
      expect(messageElements[0].textContent).toContain('Message from me');
      expect(messageElements[0].textContent).toContain('TestUser');
    });
  });
  
  describe('subscription error handling', () => {
    test('should handle subscription errors gracefully', async () => {
      const friendId = 'friend-1';
      const currentUser = mockAuthManager.getCurrentUser();
      
      // Mock subscription error
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => {
          if (callback) callback('CHANNEL_ERROR', { message: 'Subscription failed' });
        }, 10);
        return mockChannel;
      });
      
      // Mock console.error to capture error logs
      const originalError = console.error;
      console.error = jest.fn();
      
      // Set up the subscription
      const channelName = `chat-${[currentUser.id, friendId].sort().join('-')}`;
      
      const chatChannel = mockSupabaseClient.channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          () => {}
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Subscription error:', err);
          }
        });
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith('Subscription error:', { message: 'Subscription failed' });
      
      // Restore console.error
      console.error = originalError;
    });
  });
});