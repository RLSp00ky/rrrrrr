// ---------- APPLY CACHED THEME IMMEDIATELY ----------
const cachedTheme = localStorage.getItem("user-theme");
if (cachedTheme) {
  document.documentElement.setAttribute("data-theme", cachedTheme);
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔐 Waiting for authentication...");
  await authManager.waitForAuth();

  if (!authManager.isAuthenticated()) {
    console.log("❌ User not authenticated, redirecting...");
    return;
  }

  console.log("✅ User authenticated, applying theme, updating navbar, and fetching friends...");

  await applySavedTheme();
  updateThemeAssets();

  const observer = new MutationObserver(updateThemeAssets);
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });

  // ---------- NAVBAR ----------
  const currentUserProfile = authManager.getCurrentUserProfile();
  const navbarTitle = document.querySelector(".navbar h1");

  if (currentUserProfile && navbarTitle) {
    navbarTitle.textContent = "";

    const userWrapper = document.createElement("span");
    userWrapper.style.display = "inline-flex";
    userWrapper.style.alignItems = "center";
    userWrapper.style.backgroundColor = "transparent";

    const usernameSpan = document.createElement("span");
    usernameSpan.textContent = `SoundLink - ${currentUserProfile.username}`;
    usernameSpan.style.backgroundColor = "transparent";
    usernameSpan.style.lineHeight = "1";
    userWrapper.appendChild(usernameSpan);

    const badgesContainer = document.createElement("span");
    badgesContainer.style.display = "flex";
    badgesContainer.style.alignItems = "center";
    badgesContainer.style.marginLeft = "8px";
    badgesContainer.style.backgroundColor = "transparent";

    if (currentUserProfile.verified) {
      const verifiedBadge = document.createElement("img");
      verifiedBadge.src = "verified.png";
      verifiedBadge.alt = "Verified";
      verifiedBadge.style.width = "20px";
      verifiedBadge.style.height = "20px";
      verifiedBadge.style.marginLeft = "4px";
      verifiedBadge.style.borderRadius = "50%";
      verifiedBadge.style.border = "solid 3px white";
      verifiedBadge.style.backgroundColor = "white";
      badgesContainer.appendChild(verifiedBadge);
    }

    if (currentUserProfile.premium) {
      const premiumBadge = document.createElement("img");
      premiumBadge.src = "premium.png";
      premiumBadge.alt = "Premium";
      premiumBadge.style.width = "20px";
      premiumBadge.style.height = "20px";
      premiumBadge.style.marginLeft = "4px";
      premiumBadge.style.borderRadius = "50%";
      premiumBadge.style.border = "solid 3px white";
      premiumBadge.style.backgroundColor = "white";
      badgesContainer.appendChild(premiumBadge);
    }

    if (currentUserProfile.tester) {
      const testerBadge = document.createElement("img");
      testerBadge.src = "tester.png";
      testerBadge.alt = "Tester";
      testerBadge.style.width = "20px";
      testerBadge.style.height = "20px";
      testerBadge.style.marginLeft = "4px";
      testerBadge.style.borderRadius = "50%";
      testerBadge.style.border = "solid 3px white";
      testerBadge.style.backgroundColor = "white";
      badgesContainer.appendChild(testerBadge);
    }

    userWrapper.appendChild(badgesContainer);
    navbarTitle.appendChild(userWrapper);
    console.log("👤 Navbar username and badges set:", currentUserProfile.username);
  }

  // ---------- FRIENDS PANEL ----------
  const friendsSpan = document.createElement("span");
  friendsSpan.id = "friends-span";
  friendsSpan.style.marginLeft = "20px";
  navbarTitle?.after(friendsSpan);

  await renderFriendsPanel();

  // Hide loading overlay
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) loadingOverlay.style.display = "none";

  const chatContainer = document.getElementById("chat-container");
  if (chatContainer) chatContainer.style.display = "none";

  // ---------- THEME FUNCTIONS ----------
  async function applySavedTheme() {
    const cachedTheme = localStorage.getItem("user-theme");
    if (cachedTheme) {
      document.body.setAttribute("data-theme", cachedTheme);
      console.log("🎨 Applied cached theme:", cachedTheme);
    }

    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return;

    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("themes")
      .eq("id", currentUser.id)
      .single();

    if (!error && profile?.themes) {
      document.body.setAttribute("data-theme", profile.themes);

      if (profile.themes !== cachedTheme) {
        localStorage.setItem("user-theme", profile.themes);
        console.log("💾 Theme cached:", profile.themes);
      }
      console.log("🎨 Theme applied from DB:", profile.themes);
    }
  }

  function updateThemeAssets() {
    const theme = document.body.getAttribute("data-theme");
    const logo = document.getElementById("logo-img");
    if (logo) {
      logo.src = (["dark", "onyx", "red", "blue", "green", "purple", "pink"].includes(theme))
        ? "icons/logo.png"
        : "icons/logo-light.png";
    }
  }

  // ---------- FRIENDS PANEL FUNCTION ----------
  async function renderFriendsPanel() {
    const currentUser = authManager.getCurrentUser();
    const friendsContainer = document.getElementById("friends-list");
    if (!currentUser || !friendsContainer) return;

    try {
      const { data: friendsData, error } = await supabaseClient
        .from("friends")
        .select("requester_id, receiver_id")
        .or(`requester_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq("status", "accepted");

      if (error) throw error;

      const friendIds = friendsData.map(f => f.requester_id === currentUser.id ? f.receiver_id : f.requester_id);
      if (friendIds.length === 0) {
        friendsContainer.innerHTML = "<p>No friends yet</p>";
        return;
      }

      const { data: profiles, error: profileError } = await supabaseClient
        .from("profiles")
        .select("id, username, profile_picture, verified, premium, tester")
        .in("id", friendIds);

      if (profileError) throw profileError;

      friendsContainer.innerHTML = "";

      profiles.forEach(profile => {
        const div = document.createElement("div");
        div.className = "friend-item";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.cursor = "pointer";
        div.style.padding = "6px";
        div.style.borderRadius = "30px";
        div.style.transition = "background-color 0.2s ease";
        div.dataset.friendId = profile.id;

        const img = document.createElement("img");
        img.src = profile.profile_picture || "icons/default-avatar.png";
        img.alt = `${profile.username}'s avatar`;
        img.style.width = "60px";
        img.style.height = "60px";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        img.style.border = "3px solid var(--card-border)";
        img.style.marginRight = "12px";

        const usernameWrapper = document.createElement("div");
        usernameWrapper.style.display = "flex";
        usernameWrapper.style.alignItems = "center";

        const usernameH1 = document.createElement("h1");
        usernameH1.style.fontSize = "20px";
        usernameH1.style.margin = "0";
        usernameH1.style.lineHeight = "1";
        usernameH1.textContent = profile.username;

        usernameWrapper.appendChild(usernameH1);

        const badgesContainer = document.createElement("span");
        badgesContainer.style.display = "flex";
        badgesContainer.style.alignItems = "center";
        badgesContainer.style.marginLeft = "6px";

        if (profile.verified) {
          const verifiedBadge = document.createElement("img");
          verifiedBadge.src = "verified.png";
          verifiedBadge.alt = "Verified";
          verifiedBadge.style.width = "16px";
          verifiedBadge.style.height = "16px";
          verifiedBadge.style.borderRadius = "50%";
          verifiedBadge.style.border = "solid 2px var(--text-color)";
          verifiedBadge.style.backgroundColor = "white";
          verifiedBadge.style.marginLeft = "4px";
          badgesContainer.appendChild(verifiedBadge);
        }

        if (profile.premium) {
          const premiumBadge = document.createElement("img");
          premiumBadge.src = "premium.png";
          premiumBadge.alt = "Premium";
          premiumBadge.style.width = "16px";
          premiumBadge.style.height = "16px";
          premiumBadge.style.borderRadius = "50%";
          premiumBadge.style.border = "solid 2px var(--text-color)";
          premiumBadge.style.backgroundColor = "white";
          premiumBadge.style.marginLeft = "4px";
          badgesContainer.appendChild(premiumBadge);
        }

        if (profile.tester) {
          const testerBadge = document.createElement("img");
          testerBadge.src = "tester.png";
          testerBadge.alt = "Tester";
          testerBadge.style.width = "16px";
          testerBadge.style.height = "16px";
          testerBadge.style.borderRadius = "50%";
          testerBadge.style.border = "solid 2px var(--text-color)";
          testerBadge.style.backgroundColor = "white";
          testerBadge.style.marginLeft = "4px";
          badgesContainer.appendChild(testerBadge);
        }

        usernameWrapper.appendChild(badgesContainer);
        div.appendChild(img);
        div.appendChild(usernameWrapper);
        friendsContainer.appendChild(div);

        div.addEventListener("click", async () => {
          document.querySelectorAll(".friend-item").forEach(item => {
            item.classList.remove("selected");
            item.style.backgroundColor = "";
          });
          div.classList.add("selected");
          div.style.backgroundColor = "var(--navbar-bg)";

          if (chatContainer) chatContainer.style.display = "flex";

          const chatHeaderImg = document.getElementById("chat-header-img");
          const chatHeaderUsername = document.getElementById("chat-header-username");
          if (chatHeaderImg) chatHeaderImg.src = profile.profile_picture || "icons/default-avatar.png";
          if (chatHeaderUsername) chatHeaderUsername.textContent = profile.username;

          await loadChat(profile.id);
        });
      });

    } catch (err) {
      console.error("Error fetching friends:", err);
      friendsContainer.innerHTML = "<p>Error loading friends</p>";
    }
  }

  // ---------- CHAT ----------
  const chatMessagesEl = document.getElementById("chat-messages");
  const chatInputEl = document.getElementById("chat-message-input");
  const chatSendBtn = document.getElementById("chat-send-btn");
  const fileInputEl = document.getElementById("file-upload");
  const uploadBtnEl = document.getElementById("upload-btn");
  const scrollBtn = document.getElementById("scroll-to-bottom"); // <-- scroll button
  let currentFriendId = null;
  let chatChannel = null;
  let lastDateRef = { value: null };

  // Helper: check same day
  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function formatDateLabel(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function appendMessage(msg, lastDateRefParam) {
    if (!chatMessagesEl) return;

    const msgDate = msg.created_at ? new Date(msg.created_at) : new Date();
    const dateLabel = formatDateLabel(msgDate);

    const lastRef = lastDateRefParam || lastDateRef;

    if (lastRef.value !== dateLabel) {
      const dateSeparator = document.createElement("div");
      dateSeparator.textContent = `——————————— ${dateLabel} ———————————`;
      dateSeparator.style.textAlign = "center";
      dateSeparator.style.margin = "15px 0";
      dateSeparator.style.color = "var(--card-border)";
      dateSeparator.style.fontSize = "20px";
      dateSeparator.style.fontWeight = "bold";
      chatMessagesEl.appendChild(dateSeparator);
      lastRef.value = dateLabel;
    }

    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "flex-start";
    div.style.marginBottom = "10px";
    div.style.justifyContent = "flex-start";

    const img = document.createElement("img");
    img.src = msg.sender?.profile_picture || "icons/default-avatar.png";
    img.alt = "Profile";
    img.style.width = "50px";
    img.style.height = "50px";
    img.style.borderRadius = "50%";
    img.style.objectFit = "cover";
    img.style.marginRight = "8px";
    img.style.border = "var(--card-border) solid 3px";

    const content = document.createElement("div");
    content.style.backgroundColor = "transparent";
    content.style.color = "var(--text-color)";
    content.style.padding = "8px 12px";
    content.style.borderRadius = "15px";
    content.style.maxWidth = "70%";
    content.style.fontSize = "15px";
    content.style.wordWrap = "break-word";

    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";
    headerRow.style.marginBottom = "4px";

    const usernameSpan = document.createElement("span");
    usernameSpan.textContent = msg.sender?.username || "Unknown";
    usernameSpan.style.fontSize = "17px";
    usernameSpan.style.fontWeight = "bold";

    const timeSpan = document.createElement("span");
    timeSpan.textContent = msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    timeSpan.style.fontSize = "11px";
    timeSpan.style.color = "var(--text-color)";
    timeSpan.style.fontWeight = "bold";
    timeSpan.style.backgroundColor = "var(--card-border)";
    timeSpan.style.padding = "2px 6px";
    timeSpan.style.borderRadius = "10px";
    timeSpan.style.marginLeft = "10px";

    headerRow.appendChild(usernameSpan);
    headerRow.appendChild(timeSpan);
    content.appendChild(headerRow);

    if (msg.file_url) {
      const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(msg.file_url);
      const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(msg.file_url);

      if (isImage) {
        const imgEl = document.createElement("img");
        imgEl.src = msg.file_url;
        imgEl.alt = "Image";
        imgEl.style.maxWidth = "200px";
        imgEl.style.borderRadius = "12px";
        imgEl.style.marginTop = "4px";
        content.appendChild(imgEl);
      } else if (isAudio) {
        const audioWrapper = document.createElement("div");
        audioWrapper.style.backgroundColor = "var(--nav-bg)";
        audioWrapper.style.padding = "6px";
        audioWrapper.style.borderRadius = "12px";
        audioWrapper.style.display = "inline-block";
        audioWrapper.style.marginTop = "4px";

        const filenameLabel = document.createElement("div");
        filenameLabel.textContent = msg.message || "Audio";
        filenameLabel.style.fontSize = "17px";
        filenameLabel.style.color = "var(--text-color)";
        filenameLabel.style.marginBottom = "10px";
        filenameLabel.style.overflow = "hidden";
        filenameLabel.style.textOverflow = "ellipsis";
        filenameLabel.style.whiteSpace = "nowrap";
        audioWrapper.appendChild(filenameLabel);

        const audioEl = document.createElement("audio");
        audioEl.src = msg.file_url;
        audioEl.controls = true;
        audioEl.style.width = "400px";
        audioEl.style.borderRadius = "8px";
        audioWrapper.appendChild(audioEl);

        content.appendChild(audioWrapper);
      } else {
        const fileLink = document.createElement("a");
        fileLink.href = msg.file_url;
        fileLink.textContent = msg.message || "File";
        fileLink.target = "_blank";
        fileLink.style.color = "#1d4ed8";
        fileLink.style.textDecoration = "underline";
        content.appendChild(fileLink);
      }
    } else if (msg.message) {
      const messageText = document.createElement("div");
      messageText.textContent = msg.message;
      content.appendChild(messageText);
    }

    div.appendChild(img);
    div.appendChild(content);
    chatMessagesEl.appendChild(div);

    // Auto-scroll if user is near bottom
    if (chatMessagesEl.scrollHeight - chatMessagesEl.scrollTop <= chatMessagesEl.clientHeight + 50) {
      chatMessagesEl.scrollTo({ top: chatMessagesEl.scrollHeight, behavior: "smooth" });
    }
  }

  // ---------- SCROLL-TO-BOTTOM BUTTON ----------
  if (chatMessagesEl && scrollBtn) {
    // Show/hide button based on scroll
    chatMessagesEl.addEventListener("scroll", () => {
      const isAtBottom = chatMessagesEl.scrollHeight - chatMessagesEl.scrollTop <= chatMessagesEl.clientHeight + 50;
      scrollBtn.style.display = isAtBottom ? "none" : "block";
    });

    // Animated scroll function
    function animateScrollToBottom(duration = 500) {
      const start = chatMessagesEl.scrollTop;
      const end = chatMessagesEl.scrollHeight - chatMessagesEl.clientHeight;
      const distance = end - start;
      const startTime = performance.now();

      function easeInOutQuad(t) {
        return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // smooth easing
      }

      function animate(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        chatMessagesEl.scrollTop = start + distance * easeInOutQuad(progress);

        if (progress < 1) requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    }

    scrollBtn.addEventListener("click", () => animateScrollToBottom(500));
  }

  // ---------- LOAD CHAT ----------
  // Helper: smooth scroll to bottom
  function animateScrollToBottom(duration = 300) {
    if (!chatMessagesEl) return;
    const start = chatMessagesEl.scrollTop;
    const end = chatMessagesEl.scrollHeight - chatMessagesEl.clientHeight;
    const change = end - start;
    const startTime = performance.now();

    function animate(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      chatMessagesEl.scrollTop = start + change * progress;
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  async function loadChat(friendId) {
    currentFriendId = friendId;
    const currentUserProfile = authManager.getCurrentUserProfile(); // FIXED: Use profile
    if (!currentUserProfile) return console.error("No current user profile");

    const { data: messages, error } = await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserProfile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserProfile.id}))`
      )
      .order("created_at", { ascending: true });

    if (error) return console.error("Error loading messages:", error);

    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("id, username, profile_picture")
      .in("id", senderIds);

    const messagesWithProfiles = messages.map(msg => ({
      ...msg,
      sender: profiles.find(p => p.id === msg.sender_id) || {
        username: "Unknown",
        profile_picture: "icons/default-avatar.png"
      }
    }));

    if (chatMessagesEl) chatMessagesEl.innerHTML = "";
    lastDateRef.value = null;

    messagesWithProfiles.forEach(msg => appendMessage(msg, lastDateRef));

    // Scroll to bottom smoothly after messages are appended
    if (chatMessagesEl) animateScrollToBottom(400);

    if (chatChannel) {
      try { chatChannel.unsubscribe(); } catch (e) {}
    }

    const channelName = `chat-${[currentUserProfile.id, friendId].sort().join("-")}`;
    console.log('Setting up real-time subscription for channel:', channelName);
    
    chatChannel = supabaseClient.channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserProfile.id}`
        },
        async payload => {
          const msg = payload.new;

          if (msg.sender_id === currentUserProfile.id) {
            msg.sender = {
              username: currentUserProfile.username, // FIXED: Use profile
              profile_picture: currentUserProfile.profile_picture || "icons/default-avatar.png"
            };
          } else {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("username, profile_picture")
              .eq("id", msg.sender_id)
              .single();
            msg.sender = profile || { username: "Unknown", profile_picture: "icons/default-avatar.png" };
          }

          console.log('Real-time message received:', msg);
          
          // Re-query DOM elements to ensure fresh references
          const chatMessagesEl = document.getElementById("chat-messages");
          const chatContainer = document.getElementById("chat-container");
          
          // Ensure the chat container is visible before appending message
          if (chatContainer && chatContainer.style.display === "none") {
            chatContainer.style.display = "flex";
          }

          // Append the message to the UI if we have a valid element
          if (chatMessagesEl) {
            console.log('🔥 About to append message to UI...');
            appendMessage(msg, lastDateRef);
            animateScrollToBottom(200); // scroll down when new message arrives
            console.log('🔥 Real-time message added to UI successfully!');
          } else {
            console.error("Chat messages element not found when trying to append real-time message");
          }
        }
      )
      .subscribe((status, err) => {
        console.log('🔔 SUBSCRIPTION STATUS:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time chat subscription established');
          console.log('🔔 Now listening for messages on channel:', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time chat subscription error:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Real-time chat subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('❌ Real-time chat subscription closed');
        }
      });
  }


  // ---------- SEND MESSAGE ----------
  if (chatSendBtn) {
    chatSendBtn.addEventListener("click", async () => {
      if (!chatInputEl) return;
      const message = chatInputEl.value.trim();
      if (!message || !currentFriendId) return;

      const currentUserProfile = authManager.getCurrentUserProfile(); // FIXED: Use profile
      if (!currentUserProfile) return console.error("No current user profile");

      try {
        const { data: messageData, error } = await supabaseClient
          .from("messages")
          .insert([{ sender_id: currentUserProfile.id, receiver_id: currentFriendId, message }])
          .select();

        if (error) return console.error("Error sending message:", error);

        if (messageData && messageData.length > 0) {
          messageData[0].sender = {
            username: currentUserProfile.username, // FIXED: Use profile
            profile_picture: currentUserProfile.profile_picture || "icons/default-avatar.png"
          };
          appendMessage(messageData[0], lastDateRef);
          chatInputEl.value = "";
        }
      } catch (err) {
        console.error("Error sending message:", err);
      }
    });
  }

  if (chatInputEl) {
    chatInputEl.addEventListener("keypress", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (chatSendBtn) chatSendBtn.click();
      }
    });
  }

  // ---------- FILE UPLOAD ----------
  if (uploadBtnEl && fileInputEl) uploadBtnEl.addEventListener("click", () => fileInputEl.click());

  if (fileInputEl) {
    fileInputEl.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file || !currentFriendId) return;

      const currentUserProfile = authManager.getCurrentUserProfile(); // FIXED: Use profile
      if (!currentUserProfile) return console.error("No current user profile");

      try {
        const filePath = `${currentUserProfile.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from("chat-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient
          .storage
          .from("chat-files")
          .getPublicUrl(filePath);

        const fileUrl = publicUrlData.publicUrl;

        const { data: messageData, error: messageError } = await supabaseClient
          .from("messages")
          .insert([{
            sender_id: currentUser.id,
            receiver_id: currentFriendId,
            message: file.name,
            file_url: fileUrl
          }])
          .select();

        if (messageError) throw messageError;

        if (messageData && messageData.length > 0) {
          messageData[0].sender = {
            username: currentUserProfile.username, // FIXED: Use profile
            profile_picture: currentUserProfile.profile_picture || "icons/default-avatar.png"
          };
          appendMessage(messageData[0], lastDateRef);
        }

        fileInputEl.value = "";
      } catch (err) {
        console.error("Error uploading file:", err);
      }
    });
  }
});
