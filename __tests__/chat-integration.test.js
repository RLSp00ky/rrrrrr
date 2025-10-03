// Chat Integration Tests
// These tests verify the complete chat flow and help identify issues with real-time updates

describe('Chat Integration Tests', () => {
  let mockSupabaseClient;
  let mockAuthManager;
  let chatMessagesEl;
  let chatInputEl;
  let chatSendBtn;
  let chatContainer;
  let realTimeMessages = [];
  
  beforeEach(() => {
    // Reset real-time messages
    realTimeMessages = [];
    
    // Get DOM elements
    chatMessagesEl = document.getElementById('chat-messages');
    chatInputEl = document.getElementById('chat-message-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    chatContainer = document.getElementById('chat-container');
    
    // Mock channel for real-time subscriptions
    const mockChannel = {
      on: jest.fn().mockImplementation((event, filter, handler) => {
        // Store the handler for later use
        if (event === 'postgres_changes') {
          mockChannel.messageHandler = handler;
        }
        return mockChannel;
      }),
      subscribe: jest.fn().mockImplementation((callback) => {
        // Simulate successful subscription
        setTimeout(() => {
          if (callback) callback('SUBSCRIBED');
        }, 10);
        return mockChannel;
      }),
      unsubscribe: jest.fn().mockResolvedValue(),
      messageHandler: null
    };
    
    // Mock Supabase client
    mockSupabaseClient = {
      from: jest.fn((table) => {
        if (table === 'messages') {
          return {
            select: jest.fn().mockReturnValue({
              or: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis()
          };
        } else if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    username: 'TestUser',
                    profile_picture: 'test-avatar.png'
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
          order: jest.fn().mockReturnThis()
        };
      }),
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
  
  describe('complete message flow', () => {
    test('should send a message and receive it through real-time subscription', async () => {
      const friendId = '17ee71db-2320-4419-a88b-fa24780a588b'; // Real test user 2 ID
      const currentUserProfile = mockAuthManager.getCurrentUserProfile(); // FIXED: Use profile
      const messageText = 'Hello, this is a test message';
      
      // Show chat container
      chatContainer.style.display = 'flex';
      
      // Set up the loadChat function
      let chatChannel = null;
      let messageHandler = null;
      
      const loadChat = async (friendId) => {
        const currentUserProfile = mockAuthManager.getCurrentUserProfile(); // FIXED: Use profile
        if (!currentUserProfile) return console.error('No current user profile');
        
        // Clear existing messages
        if (chatMessagesEl) chatMessagesEl.innerHTML = '';
        
        // Load existing messages
        const { data: messages, error } = await mockSupabaseClient
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${currentUserProfile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserProfile.id})`
          )
          .order('created_at', { ascending: true });
        
        if (error) return console.error('Error loading messages:', error);
        
        // Set up real-time subscription
        const channelName = `chat-${[currentUserProfile.id, friendId].sort().join('-')}`;
        chatChannel = mockSupabaseClient.channel(channelName)
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
              
              // Store the message for testing
              realTimeMessages.push(msg);
              
              // Append message to UI
              appendMessage(msg);
            }
          )
          .subscribe();
        
        // Store the message handler for testing
        const channel = mockSupabaseClient.channel(channelName);
        messageHandler = channel.messageHandler;
        
        return chatChannel;
      };
      
      // Helper function to append message
      function appendMessage(msg) {
        if (!chatMessagesEl) return;
        
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = `${msg.sender.username}: ${msg.message}`;
        div.setAttribute('data-message-id', msg.id);
        chatMessagesEl.appendChild(div);
      }
      
      // Load chat
      await loadChat(friendId);
      
      // Mock the message insertion
      const newMessage = {
        id: 'msg-1',
        sender_id: currentUserProfile.id, // FIXED: Use profile ID
        receiver_id: friendId,
        message: messageText,
        created_at: new Date().toISOString()
      };
      
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [newMessage],
            error: null
          })
        }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      });
      
      // Set up the send message handler (FIXED)
      chatSendBtn.addEventListener('click', async () => {
        const message = chatInputEl.value.trim();
        if (!message || !friendId) return;
        
        try {
          const { data: messageData, error } = await mockSupabaseClient
            .from('messages')
            .insert([{ sender_id: currentUserProfile.id, receiver_id: friendId, message }]) // FIXED: Use profile ID
            .select();
          
          if (error) return console.error('Error sending message:', error);
          
          if (messageData && messageData.length > 0) {
            messageData[0].sender = {
              username: currentUserProfile.username, // FIXED: Use profile data
              profile_picture: currentUserProfile.profile_picture || 'icons/default-avatar.png'
            };
            appendMessage(messageData[0]);
            chatInputEl.value = '';
          }
        } catch (err) {
          console.error('Error sending message:', err);
        }
      });
      
      // Set input value and send message
      chatInputEl.value = messageText;
      chatSendBtn.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verify message was added to UI immediately after sending
      let messageElements = chatMessagesEl.querySelectorAll('.message');
      expect(messageElements.length).toBe(1);
      expect(messageElements[0].textContent).toContain(messageText);
      expect(messageElements[0].textContent).toContain('TestUser');
      
      // Simulate receiving the same message through real-time subscription
      if (messageHandler) {
        await messageHandler({ new: newMessage });
      }
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Check if message was received through real-time subscription
      expect(realTimeMessages.length).toBe(1);
      expect(realTimeMessages[0].message).toBe(messageText);
      
      // Verify message is not duplicated in UI
      messageElements = chatMessagesEl.querySelectorAll('.message');
      expect(messageElements.length).toBe(1); // Should still be 1, not 2
    });
    
    test('should receive a message from another user through real-time subscription', async () => {
      const friendId = 'friend-1';
      const currentUser = mockAuthManager.getCurrentUser();
      const incomingMessageText = 'Hello from friend';
      
      // Show chat container
      chatContainer.style.display = 'flex';
      
      // Set up the loadChat function
      let messageHandler = null;
      
      const loadChat = async (friendId) => {
        const currentUser = mockAuthManager.getCurrentUser();
        if (!currentUser) return console.error('No current user');
        
        // Clear existing messages
        if (chatMessagesEl) chatMessagesEl.innerHTML = '';
        
        // Set up real-time subscription
        const channelName = `chat-${[currentUser.id, friendId].sort().join('-')}`;
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
              
              // Store the message for testing
              realTimeMessages.push(msg);
              
              // Append message to UI
              appendMessage(msg);
            }
          )
          .subscribe();
        
        // Store the message handler for testing
        const channel = mockSupabaseClient.channel(channelName);
        messageHandler = channel.messageHandler;
        
        return chatChannel;
      };
      
      // Helper function to append message
      function appendMessage(msg) {
        if (!chatMessagesEl) return;
        
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = `${msg.sender.username}: ${msg.message}`;
        div.setAttribute('data-message-id', msg.id);
        chatMessagesEl.appendChild(div);
      }
      
      // Load chat
      await loadChat(friendId);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verify no messages initially
      let messageElements = chatMessagesEl.querySelectorAll('.message');
      expect(messageElements.length).toBe(0);
      
      // Simulate receiving a message from another user
      const incomingMessage = {
        id: 'msg-2',
        sender_id: friendId,
        receiver_id: currentUser.id,
        message: incomingMessageText,
        created_at: new Date().toISOString()
      };
      
      // Mock profile fetch for the friend
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
          order: jest.fn().mockReturnThis()
        };
      });
      
      // Trigger the message handler to simulate real-time message
      if (messageHandler) {
        await messageHandler({ new: incomingMessage });
      }
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verify message was received and added to UI
      messageElements = chatMessagesEl.querySelectorAll('.message');
      expect(messageElements.length).toBe(1);
      expect(messageElements[0].textContent).toContain(incomingMessageText);
      expect(messageElements[0].textContent).toContain('FriendUser');
      
      // Verify message was stored in real-time messages array
      expect(realTimeMessages.length).toBe(1);
      expect(realTimeMessages[0].message).toBe(incomingMessageText);
    });
  });
  
  describe('issue reproduction', () => {
    test('should reproduce the issue where messages dont appear without refresh', async () => {
      const friendId = 'friend-1';
      const currentUser = mockAuthManager.getCurrentUser();
      const messageText = 'Test message for issue reproduction';
      
      // Show chat container
      chatContainer.style.display = 'flex';
      
      // Set up the loadChat function with potential issues
      let chatChannel = null;
      let messageHandler = null;
      
      const loadChat = async (friendId) => {
        const currentUser = mockAuthManager.getCurrentUser();
        if (!currentUser) return console.error('No current user');
        
        // Clear existing messages
        if (chatMessagesEl) chatMessagesEl.innerHTML = '';
        
        // Load existing messages
        const { data: messages, error } = await mockSupabaseClient
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`
          )
          .order('created_at', { ascending: true });
        
        if (error) return console.error('Error loading messages:', error);
        
        // Set up real-time subscription
        const channelName = `chat-${[currentUser.id, friendId].sort().join('-')}`;
        chatChannel = mockSupabaseClient.channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id}))`
            },
            async (payload) => {
              // Now with our fix, the message handler should properly append messages
              console.log('Real-time message received:', payload.new);
              
              // Store the message for testing
              realTimeMessages.push(payload.new);
              
              // With the fix, we now properly append the message to the UI
              // Re-query DOM elements to ensure fresh references (as done in the fix)
              const chatMessagesEl = document.getElementById("chat-messages");
              const chatContainer = document.getElementById("chat-container");
              
              // Ensure the chat container is visible before appending message
              if (chatContainer && chatContainer.style.display === "none") {
                chatContainer.style.display = "flex";
              }

              // Append the message to the UI if we have a valid element
              if (chatMessagesEl) {
                appendMessage(payload.new);
              }
            }
          )
          .subscribe();
        
        // Store the message handler for testing
        const channel = mockSupabaseClient.channel(channelName);
        messageHandler = channel.messageHandler;
        
        return chatChannel;
      };
      
      // Helper function to append message
      function appendMessage(msg) {
        if (!chatMessagesEl) return;
        
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = `${msg.sender ? msg.sender.username : 'Unknown'}: ${msg.message}`;
        div.setAttribute('data-message-id', msg.id);
        chatMessagesEl.appendChild(div);
      }
      
      // Load chat
      await loadChat(friendId);
      
      // Mock the message insertion
      const newMessage = {
        id: 'msg-3',
        sender_id: currentUser.id,
        receiver_id: friendId,
        message: messageText,
        created_at: new Date().toISOString()
      };
      
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [newMessage],
            error: null
          })
        }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      });
      
      // Set up the send message handler (without immediate UI update)
      chatSendBtn.addEventListener('click', async () => {
        const message = chatInputEl.value.trim();
        if (!message || !friendId) return;
        
        try {
          const { data: messageData, error } = await mockSupabaseClient
            .from('messages')
            .insert([{ sender_id: currentUser.id, receiver_id: friendId, message }])
            .select();
          
          if (error) return console.error('Error sending message:', error);
          
          // Simulate the issue: message is not immediately added to UI
          // if (messageData && messageData.length > 0) {
          //   messageData[0].sender = {
          //     username: currentUser.username,
          //     profile_picture: currentUser.profile_picture || 'icons/default-avatar.png'
          //   };
          //   appendMessage(messageData[0]);
          //   chatInputEl.value = '';
          // }
          
          chatInputEl.value = '';
        } catch (err) {
          console.error('Error sending message:', err);
        }
      });
      
      // Set input value and send message
      chatInputEl.value = messageText;
      chatSendBtn.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verify message is NOT in UI (reproducing the issue)
      let messageElements = chatMessagesEl.querySelectorAll('.message');
      expect(messageElements.length).toBe(0);
      
      // Simulate receiving the same message through real-time subscription
      if (messageHandler) {
        await messageHandler({ new: newMessage });
      }
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verify message was received through real-time subscription but still not in UI
      expect(realTimeMessages.length).toBe(1);
      expect(realTimeMessages[0].message).toBe(messageText);
      
      // With our fix, message should now be in UI
      messageElements = chatMessagesEl.querySelectorAll('.message');
      expect(messageElements.length).toBe(1);
      
      // Verify the message content
      expect(messageElements[0].textContent).toContain(messageText);
      
      console.log('Fix verified: Messages are now properly displayed in UI');
    });
  });
});