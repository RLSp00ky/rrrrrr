// ---------- APPLY CACHED THEME IMMEDIATELY ----------
const cachedTheme = localStorage.getItem("user-theme");
if (cachedTheme) {
  document.documentElement.setAttribute("data-theme", cachedTheme);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Wait for Supabase client to be initialized by env-config.js
  let attempts = 0;
  while (!window.supabaseClient && attempts < 40) {
    await new Promise(resolve => setTimeout(resolve, 50));
    attempts++;
  }

  if (!window.supabaseClient) {
    console.error("❌ Supabase client not initialized after waiting");
    return;
  }

  console.log("✅ Supabase client ready");

  console.log("🔐 Waiting for authentication...");
  await authManager.waitForAuth();

  if (!authManager.isAuthenticated()) {
    console.log("❌ User not authenticated, redirecting...");
    return;
  }

  console.log("✅ User authenticated");

  // ---------- CURRENT USER ----------
  const currentUser = authManager.getCurrentUser();
  const currentUserProfile = authManager.getCurrentUserProfile();

  await applySavedTheme();
  updateThemeAssets();
  const observer = new MutationObserver(updateThemeAssets);
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });

  // ---------- NAVBAR ----------
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

    if (currentUserProfile.verified) badgesContainer.appendChild(createBadge("verified.png"));
    if (currentUserProfile.premium) badgesContainer.appendChild(createBadge("premium.png"));
    if (currentUserProfile.tester) badgesContainer.appendChild(createBadge("tester.png"));

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

  const requestsBtn = document.getElementById("friend-requests-btn");
  const requestsPopup = document.getElementById("friend-requests-popup");
  const requestsList = document.getElementById("friend-requests-list");
  const closeRequestsBtn = document.getElementById("close-requests-popup");

  // ---------- ADD FRIEND POPUP LOGIC ----------
  const addFriendBtn = document.getElementById("add-friend-btn");
  const addFriendPopup = document.getElementById("add-friend-popup");
  const closeAddFriendBtn = document.getElementById("close-add-friend-popup");
  const sendFriendRequestBtn = document.getElementById("send-friend-request-btn");
  const friendUsernameInput = document.getElementById("friend-username-input");
  const addFriendError = document.getElementById("add-friend-error");

  // Open popup
  addFriendBtn?.addEventListener("click", () => {
    addFriendPopup.style.display = "block";
    friendUsernameInput.value = "";
    addFriendError.textContent = "";
  });

  // Close popup
  closeAddFriendBtn?.addEventListener("click", () => {
    addFriendPopup.style.display = "none";
  });

  // Send friend request
  // Send friend request
  sendFriendRequestBtn?.addEventListener("click", async () => {
    const username = friendUsernameInput.value.trim().toLowerCase(); // <-- convert input to lowercase
    if (!username) {
      addFriendError.textContent = "Please enter a username";
      return;
    }

    const currentUser = authManager.getCurrentUser();
    if (!currentUser) {
      addFriendError.textContent = "User not authenticated";
      return;
    }

    try {
      // Find user by username (case-insensitive)
      const { data: targetUser, error: fetchError } = await supabaseClient
        .from("profiles")
        .select("id, username")
        .ilike("username", username) // <-- case-insensitive search
        .maybeSingle(); // allows 0 rows without throwing

      if (fetchError) throw fetchError;

      if (!targetUser) {
        addFriendError.textContent = "User not found";
        return;
      }

      if (targetUser.id === currentUser.id) {
        addFriendError.textContent = "You cannot add yourself";
        return;
      }

      // Check if a friend request or friendship already exists
      const { data: existing, error: existingError } = await supabaseClient
        .from("friends")
        .select("*")
        .or(
          `and(requester_id.eq.${currentUser.id},receiver_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},receiver_id.eq.${currentUser.id})`
        )
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        addFriendError.textContent = "Friend request already sent or you are already friends";
        return;
      }

      // Insert friend request
      const { error: insertError } = await supabaseClient
        .from("friends")
        .insert([{ requester_id: currentUser.id, receiver_id: targetUser.id, status: "pending" }]);

      if (insertError) throw insertError;

      addFriendPopup.style.display = "none";
      alert(`Friend request sent to ${targetUser.username}!`);
    } catch (err) {
      console.error("Error sending friend request:", err);
      addFriendError.textContent = "Error sending friend request";
    }
  });

  
  // ---------- FRIEND REQUESTS BADGE ----------
  requestsBtn.style.position = "relative";

  // Create the badge
  const requestBadge = document.createElement("span");
  requestBadge.id = "friend-request-badge";
  requestBadge.style.position = "absolute";
  requestBadge.style.top = "0px";
  requestBadge.style.right = "0px";
  requestBadge.style.width = "18px";
  requestBadge.style.height = "18px";
  requestBadge.style.backgroundColor = "red";
  requestBadge.style.color = "white";
  requestBadge.style.border = "2px solid white";
  requestBadge.style.borderRadius = "50%";
  requestBadge.style.display = "flex";
  requestBadge.style.alignItems = "center";
  requestBadge.style.justifyContent = "center";
  requestBadge.style.fontSize = "12px";
  requestBadge.style.fontWeight = "bold";
  requestBadge.style.pointerEvents = "none"; // don't block clicks
  requestBadge.textContent = "0";

  requestsBtn.appendChild(requestBadge);

  function updateFriendRequestBadge(count) {
    requestBadge.textContent = count;
    requestBadge.style.display = count > 0 ? "flex" : "none";
  }

  // Helper: attach decrement to accept/reject buttons
  function attachBadgeDecrement(item) {
    const buttons = item.querySelectorAll("button");
    buttons.forEach(btn => {
      if (btn.textContent === "Accept" || btn.textContent === "Reject") {
        btn.addEventListener("click", () => {
          const currentCount = parseInt(requestBadge.textContent || "0", 10);
          updateFriendRequestBadge(Math.max(currentCount - 1, 0));
        });
      }
    });
  }

  // ---------- FETCH FRIEND REQUESTS ----------
  async function fetchFriendRequests() {
    if (!currentUser) return;

    try {
      const { data: requests, error } = await supabaseClient
        .from("friends")
        .select("requester_id")
        .eq("receiver_id", currentUser.id)
        .eq("status", "pending");

      if (error) throw error;

      // Update badge immediately
      updateFriendRequestBadge(requests?.length || 0);

      if (!requests || requests.length === 0) {
        requestsList.innerHTML = "<p>No pending friend requests</p>";
        return;
      }

      const requesterIds = requests.map(r => r.requester_id);
      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("id, username, profile_picture")
        .in("id", requesterIds);

      requestsList.innerHTML = "";
      profiles.forEach(profile => {
        const item = createFriendRequestItem(profile, currentUser.id);
        attachBadgeDecrement(item);
        requestsList.appendChild(item);
      });
    } catch (err) {
      console.error("Error fetching friend requests:", err);
      requestsList.innerHTML = "<p>Error loading friend requests</p>";
    }
  }

  // ---------- POPUP OPEN/CLOSE ----------
  requestsBtn?.addEventListener("click", async () => {
    requestsPopup.style.display = "block";
    requestsList.innerHTML = "<p>Loading...</p>";
    await fetchFriendRequests();
  });

  closeRequestsBtn?.addEventListener("click", () => {
    requestsPopup.style.display = "none";
  });

  // ---------- REALTIME FRIEND REQUESTS ----------
  if (currentUser) {
    supabaseClient
      .channel("realtime-friend-requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friends",
          filter: `and(receiver_id.eq.${currentUser.id},status.eq.pending)` // ⚠️ use `and(...)`
        },
        async (payload) => {
          const profileId = payload.new.requester_id;

          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("id, username, profile_picture")
            .eq("id", profileId)
            .single();

          if (profile) {
            const item = createFriendRequestItem(profile, currentUser.id);
            attachBadgeDecrement(item);
            requestsList.prepend(item);

            // Increment badge count
            const currentCount = parseInt(requestBadge.textContent || "0", 10);
            updateFriendRequestBadge(currentCount + 1);
          }
        }
      )
      .subscribe();
  }

  // ---------- INITIAL FETCH ON PAGE LOAD ----------
  fetchFriendRequests(); // ensures badge shows count immediately

  // ---------- FRIENDS PANEL REALTIME ----------
  supabaseClient
    .channel("realtime-friends")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "friends",
        filter: `status=eq.accepted`
      },
      async (payload) => {
        if (!currentUser) return;
        const { requester_id, receiver_id } = payload.new;
        if (requester_id === currentUser.id || receiver_id === currentUser.id) {
          await renderFriendsPanel(); // refresh friends list
        }
      }
    )
    .subscribe();
  // REMOVE FRIEND BUTTON
  document.getElementById("remove-friend-btn").addEventListener("click", async () => {
    const friendUsername = document.getElementById("chat-header-username").textContent.trim();
    if (!friendUsername) return;

    // Get friend’s profile
    const { data: friendProfile, error: profileErr } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("username", friendUsername)
      .single();

    if (profileErr || !friendProfile) {
      alert("Could not find this user.");
      return;
    }

    // Delete friendship (works both directions)
    const { error: deleteErr } = await supabaseClient
      .from("friends")
      .delete()
      .or(
        `and(requester_id.eq.${currentUser.id},receiver_id.eq.${friendProfile.id}),` +
        `and(requester_id.eq.${friendProfile.id},receiver_id.eq.${currentUser.id})`
      );

    if (deleteErr) {
      console.error("Error removing friend:", deleteErr);
      alert("Could not remove friend.");
      return;
    }

    // Refresh UI
    await renderFriendsPanel();
    document.getElementById("chat-container").style.display = "none";
    alert(`You removed ${friendUsername} from your friends list.`);
  });

  // ---------- LOADING OVERLAY ----------
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
    loadingOverlay.classList.add("fade-out");
    loadingOverlay.addEventListener(
      "animationend",
      (e) => {
        if (e.animationName === "overlayFadeOut") loadingOverlay.remove();
      },
      { once: true }
    );
  }

  const chatContainer = document.getElementById("chat-container");
  if (chatContainer) chatContainer.style.display = "none";


  
  const uploadBtn = document.getElementById("upload-btn");
  const fileInput = document.getElementById("file-upload");

  // When you click the Upload button, trigger the hidden file input
  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  // When the user selects a file, upload it
  fileInput.addEventListener("change", async () => {
    if (!fileInput.files.length || !currentFriendId) return;

    const file = fileInput.files[0];
    const fileName = `${Date.now()}_${file.name}`;

    try {
      const { data, error } = await supabaseClient.storage
        .from("chat-files")
        .upload(fileName, file);

      if (error) throw error;

      const fileUrl = supabaseClient.storage
        .from("chat-files")
        .getPublicUrl(fileName).data.publicUrl;

      const currentUserProfile = authManager.getCurrentUserProfile();
      if (!currentUserProfile) return;

      const { data: messageData, error: msgError } = await supabaseClient
        .from("messages")
        .insert([{ sender_id: currentUserProfile.id, receiver_id: currentFriendId, file_url: fileUrl, message: file.name }])
        .select();

      if (msgError) throw msgError;

      if (messageData?.length > 0) {
        messageData[0].sender = currentUserProfile;
        appendMessage(messageData[0], lastDateRef);
      }

      fileInput.value = ""; // Reset file input
    } catch (err) {
      console.error("Error uploading file:", err);
    }
  });

  
  // ---------- THEME FUNCTIONS ----------
  async function applySavedTheme() {
    const cachedTheme = localStorage.getItem("user-theme");
    if (cachedTheme) document.body.setAttribute("data-theme", cachedTheme);

    if (!currentUser) return;

    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("themes")
      .eq("id", currentUser.id)
      .single();

    if (!error && profile?.themes) {
      document.body.setAttribute("data-theme", profile.themes);
      if (profile.themes !== cachedTheme)
        localStorage.setItem("user-theme", profile.themes);
    }
  }

  function updateThemeAssets() {
    const theme = document.body.getAttribute("data-theme");
    const logo = document.getElementById("logo-img");
    if (!logo) return;
    logo.src = ["dark", "onyx", "red", "blue", "green", "purple", "pink"].includes(theme)
      ? "icons/logo.png"
      : "icons/logo-light.png";
  }

  // ---------- FRIENDS PANEL FUNCTION ----------
  async function renderFriendsPanel() {
    if (!currentUser) return;
    const friendsContainer = document.getElementById("friends-list");
    if (!friendsContainer) return;

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

      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("id, username, profile_picture, verified, premium, tester")
        .in("id", friendIds);

      friendsContainer.innerHTML = "";
      profiles.forEach(profile => {
        const friendItem = createFriendItem(profile);
        friendsContainer.appendChild(friendItem);
      });
    } catch (err) {
      console.error("Error fetching friends:", err);
      friendsContainer.innerHTML = "<p>Error loading friends</p>";
    }
  }

  function createBadge(src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Badge";
    img.style.width = "18px";
    img.style.height = "18px";
    img.style.borderRadius = "50%";
    img.style.border = "solid 2px var(--text-color)";
    img.style.backgroundColor = "white";
    img.style.marginLeft = "5px";
    return img;
  }

  function createFriendItem(profile) {
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
    img.alt = profile.username;
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
    usernameH1.style.backgroundColor = "transparent";
    usernameH1.style.color = "var(--text-color)";
    usernameH1.textContent = profile.username;

    const badgesContainer = document.createElement("span");
    badgesContainer.style.display = "flex";
    badgesContainer.style.alignItems = "center";
    badgesContainer.style.marginLeft = "15px";
    if (profile.verified) badgesContainer.appendChild(createBadge("verified.png"));
    if (profile.premium) badgesContainer.appendChild(createBadge("premium.png"));
    if (profile.tester) badgesContainer.appendChild(createBadge("tester.png"));

    usernameWrapper.appendChild(usernameH1);
    usernameWrapper.appendChild(badgesContainer);
    div.appendChild(img);
    div.appendChild(usernameWrapper);

    div.addEventListener("click", async () => {
      document.querySelectorAll(".friend-item").forEach(item => {
        item.classList.remove("selected");
        item.style.backgroundColor = "";
      });
      div.classList.add("selected");
      const chatContainer = document.getElementById("chat-container");
      if (chatContainer) chatContainer.style.display = "flex";
      const headerAvatar = document.getElementById("chat-header-img");
      const headerUsername = document.getElementById("chat-header-username");
      if (headerAvatar) headerAvatar.src = profile.profile_picture || "icons/default-avatar.png";
      if (headerUsername) headerUsername.textContent = profile.username;
      await loadChat(profile.id);
    });

    return div;
  }

  function createFriendRequestItem(profile, currentUserId) {
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.justifyContent = "space-between";
    item.style.padding = "8px 0";
    item.style.borderBottom = "1px solid var(--card-border)";

    const info = document.createElement("div");
    info.style.display = "flex";
    info.style.alignItems = "center";

    const img = document.createElement("img");
    img.src = profile.profile_picture || "icons/default-avatar.png";
    img.alt = profile.username;
    img.style.width = "50px";
    img.style.height = "50px";
    img.style.borderRadius = "50%";
    img.style.objectFit = "cover";
    img.style.border = "3px solid var(--card-border)"
    img.style.marginRight = "12px";

    const username = document.createElement("span");
    username.textContent = profile.username;
    username.style.fontWeight = "bold";

    info.appendChild(img);
    info.appendChild(username);

    const buttons = document.createElement("div");
    buttons.style.display = "flex";
    buttons.style.gap = "8px";

    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "✓";
    acceptBtn.style.backgroundColor = "green";
    acceptBtn.style.color = "#fff";
    acceptBtn.style.border = "none";
    acceptBtn.style.borderRadius = "6px";
    acceptBtn.style.padding = "4px 8px";
    acceptBtn.style.cursor = "pointer";

    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "✖";
    rejectBtn.style.backgroundColor = "red";
    rejectBtn.style.color = "#fff";
    rejectBtn.style.border = "none";
    rejectBtn.style.borderRadius = "6px";
    rejectBtn.style.padding = "4px 8px";
    rejectBtn.style.cursor = "pointer";

    acceptBtn.addEventListener("click", async () => {
      try {
        await supabaseClient.from("friends")
          .update({ status: "accepted" })
          .eq("receiver_id", currentUserId)
          .eq("requester_id", profile.id);
        item.remove();
      } catch (err) {
        console.error("Error accepting friend request:", err);
      }
    });

    rejectBtn.addEventListener("click", async () => {
      try {
        await supabaseClient.from("friends")
          .delete()
          .eq("receiver_id", currentUserId)
          .eq("requester_id", profile.id);
        item.remove();
      } catch (err) {
        console.error("Error rejecting friend request:", err);
      }
    });

    buttons.appendChild(acceptBtn);
    buttons.appendChild(rejectBtn);

    item.appendChild(info);
    item.appendChild(buttons);
    return item;
  }
  function createSpotifyEmbed(url) {
    // Match Spotify track/album/playlist URLs
    const match = url.match(/https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (!match) return null;

    const type = match[1];
    const id = match[2];
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;

    const iframe = document.createElement("iframe");
    iframe.src = embedUrl;
    iframe.width = "100%";
    iframe.height = "152"; // standard Spotify height
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.loading = "lazy";
    iframe.style.border = "none";
    iframe.style.borderRadius = "12px";
    iframe.style.marginTop = "6px";

    return iframe;
  }

  // ---------- CHAT ----------
const chatMessagesEl = document.getElementById("chat-messages");
const chatInputEl = document.getElementById("chat-message-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const scrollBtn = document.getElementById("scroll-to-bottom");

let currentFriendId = null;
let chatChannel = null;
let lastDateRef = { value: null };

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  div.style.paddingTop = "4px";
  div.style.paddingLeft = "4px";
  div.style.borderRadius = "15px";
  div.style.border = "solid 3px var(--card-border)";
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
  headerRow.style.alignItems = "center";
  headerRow.style.marginBottom = "4px";

  const usernameSpan = document.createElement("span");
  usernameSpan.textContent = msg.sender?.username || "Unknown";
  usernameSpan.style.fontSize = "17px";
  usernameSpan.style.color = "var(--text-color)";
  usernameSpan.style.fontWeight = "bold";

  const badgesContainer = document.createElement("span");
  badgesContainer.style.display = "flex";
  badgesContainer.style.alignItems = "center";
  badgesContainer.style.marginLeft = "6px";

  if (msg.sender?.verified) badgesContainer.appendChild(createBadge("verified.png"));
  if (msg.sender?.premium) badgesContainer.appendChild(createBadge("premium.png"));
  if (msg.sender?.tester) badgesContainer.appendChild(createBadge("tester.png"));

  headerRow.appendChild(usernameSpan);
  headerRow.appendChild(badgesContainer);

  const timeSpan = document.createElement("span");
  timeSpan.textContent = msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  timeSpan.style.fontSize = "11px";
  timeSpan.style.color = "var(--text-color)";
  timeSpan.style.fontWeight = "bold";
  timeSpan.style.backgroundColor = "var(--card-border)";
  timeSpan.style.padding = "2px 6px";
  timeSpan.style.borderRadius = "10px";
  timeSpan.style.marginLeft = "10px";
  headerRow.appendChild(timeSpan);

  content.appendChild(headerRow);

  if (msg.file_url) {
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(msg.file_url);

    const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(msg.file_url);
    const isVideo = /\.(mp4|webm|ogg|mov|mkv)$/i.test(msg.file_url);

    if (isImage) {
      const imgEl = document.createElement("img");
      imgEl.src = msg.file_url;
      imgEl.alt = "Image";
      imgEl.style.maxWidth = "200px";
      imgEl.style.borderRadius = "12px";
      imgEl.style.border = "3px solid var(--card-border)";
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

    } else if (isVideo) {
      const videoWrapper = document.createElement("div");
      videoWrapper.style.backgroundColor = "var(--nav-bg)";
      videoWrapper.style.padding = "6px";
      videoWrapper.style.borderRadius = "30px";
      videoWrapper.style.border = "3px solid var(--card-border)";
      videoWrapper.style.display = "inline-block";
      videoWrapper.style.marginTop = "4px";

      const filenameLabel = document.createElement("div");
      filenameLabel.textContent = msg.message || "Video";
      filenameLabel.style.fontSize = "17px";
      filenameLabel.style.color = "var(--text-color)";
      filenameLabel.style.marginBottom = "10px";
      filenameLabel.style.overflow = "hidden";
      filenameLabel.style.textOverflow = "ellipsis";
      filenameLabel.style.whiteSpace = "nowrap";
      videoWrapper.appendChild(filenameLabel);

      const videoEl = document.createElement("video");
      videoEl.src = msg.file_url;
      videoEl.controls = true;
      videoEl.style.maxWidth = "400px";
      videoEl.style.borderRadius = "8px";
      videoWrapper.appendChild(videoEl);

      content.appendChild(videoWrapper);

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

    const text = msg.message;

    // --- Spotify ---
    const spotifyMatch = text.match(/https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|artist)\/([a-zA-Z0-9]+)/);
    if (spotifyMatch) {
      const [_, type, id] = spotifyMatch;
      const iframe = document.createElement("iframe");
      iframe.src = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
      iframe.width = "100%";
      iframe.height = type === "artist" ? "352" : "152";
      iframe.style.border = "none";
      iframe.style.borderRadius = "12px";
      iframe.style.marginTop = "6px";
      iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      iframe.loading = "lazy";
      content.appendChild(iframe);
    }

    // --- YouTube video ---
    const ytVideoMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytVideoMatch) {
      const videoId = ytVideoMatch[1];
      const ytEmbed = document.createElement("iframe");
      ytEmbed.src = `https://www.youtube.com/embed/${videoId}`;
      ytEmbed.width = "100%";
      ytEmbed.height = "315";
      ytEmbed.style.border = "none";
      ytEmbed.style.borderRadius = "12px";
      ytEmbed.style.marginTop = "6px";
      ytEmbed.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      ytEmbed.allowFullscreen = true;
      content.appendChild(ytEmbed);
    }

    // --- YouTube channel ---
    const ytChannelMatch = text.match(/https?:\/\/(?:www\.)?youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (ytChannelMatch) {
      const channelId = ytChannelMatch[1];
      const ytChannelEmbed = document.createElement("iframe");
      ytChannelEmbed.src = `https://www.youtube.com/embed?listType=user_uploads&list=${channelId}`;
      ytChannelEmbed.width = "100%";
      ytChannelEmbed.height = "315";
      ytChannelEmbed.style.border = "none";
      ytChannelEmbed.style.borderRadius = "12px";
      ytChannelEmbed.style.marginTop = "6px";
      ytChannelEmbed.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      ytChannelEmbed.allowFullscreen = true;
      content.appendChild(ytChannelEmbed);
    }

    // --- Discord Invite (simple preview card) ---
    const discordMatch = text.match(/https?:\/\/discord\.gg\/([a-zA-Z0-9]+)/);
    if (discordMatch) {
      const inviteCode = discordMatch[1];

      // Create placeholder card first
      const card = document.createElement("div");
      card.innerHTML = `
        <div style="
          margin-top: 6px;
          padding: 20px;
          border: 1px solid #5865F2;
          border-radius: 12px;
          background: #2b2d31;
          color: white;
          min-height: 120px;
          display: flex;
          align-items: center;
          gap: 15px;
        ">
          <div class="server-icon" style="width: 64px; height: 64px; background-color: #23272A; border-radius: 12px;"></div>
          <div class="server-info">
            <strong style="font-size: 18px;">Loading server...</strong><br>
            <span style="color:#aaa;">Please wait</span>
          </div>
        </div>`;
      content.appendChild(card);

      // Fetch real info from Discord
      fetch(`https://discord.com/api/v9/invites/${inviteCode}?with_counts=true&with_expiration=true`)
        .then(res => res.json())
        .then(data => {
          if (data.guild) {
            const guild = data.guild;
            const iconUrl = guild.icon
              ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
              : "icons/default-discord.png"; // fallback

            card.innerHTML = `
              <div style="
                margin-top: 6px;
                padding: 20px;
                border: 3px solid #5865F2;
                border-radius: 12px;
                background: #2C2F33;
                color: white;
                min-height: 120px;
                display: flex;
                align-items: center;
                gap: 15px;
              ">
                <img src="${iconUrl}" width="64" height="64" style="border-radius: 12px; object-fit: cover; border: 3px solid #5865F2" />
                <div style="background-color: #2b2d31;">
                  <strong style="font-size: 18px; background-color: #2b2d31">${guild.name}</strong><br>
                  <span style="color:#aaa; background-color: #2b2d31">
                    ${data.approximate_member_count ?? 0} members · 
                    ${data.approximate_presence_count ?? 0} online
                  </span><br>
                  <a href="https://discord.gg/${inviteCode}" target="_blank" style="
                    display: inline-block;
                    margin-top: 10px;
                    background-color: #5865F2;
                    color: white;
                    padding: 6px 14px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: bold;
                  ">Join Server</a>
                </div>
              </div>
            `;
          } else {
            card.innerHTML = `
              <div style="margin-top:6px;padding:20px;border:1px solid #5865F2;border-radius:12px;background:#2C2F33;color:white;">
                <strong>Invalid or expired invite</strong>
              </div>`;
          }
        })
        .catch(() => {
          card.innerHTML = `
            <div style="margin-top:6px;padding:20px;border:1px solid #5865F2;border-radius:12px;background:#2C2F33;color:white;">
              <strong>Failed to load invite preview</strong>
            </div>`;
        });
    }



    // --- TikTok video ---
    const tiktokVideo = text.match(/https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
    if (tiktokVideo) {
      const url = tiktokVideo[0];
      const blockquote = document.createElement("blockquote");
      blockquote.className = "tiktok-embed";
      blockquote.setAttribute("cite", url);
      blockquote.setAttribute("data-video-id", tiktokVideo[2]);
      blockquote.innerHTML = `<a href="${url}"></a>`;
      content.appendChild(blockquote);
      // Load TikTok embed script once
      if (!document.getElementById("tiktok-embed-script")) {
        const script = document.createElement("script");
        script.src = "https://www.tiktok.com/embed.js";
        script.id = "tiktok-embed-script";
        document.body.appendChild(script);
      }
    }

    // --- Twitter/X post ---
    const tweetMatch = text.match(/https?:\/\/(twitter|x)\.com\/[^/]+\/status\/\d+/);
    if (tweetMatch) {
      const tweetUrl = tweetMatch[0];
      const blockquote = document.createElement("blockquote");
      blockquote.className = "twitter-tweet";
      blockquote.innerHTML = `<a href="${tweetUrl}"></a>`;
      content.appendChild(blockquote);
      if (!document.getElementById("twitter-embed-script")) {
        const script = document.createElement("script");
        script.src = "https://platform.twitter.com/widgets.js";
        script.id = "twitter-embed-script";
        document.body.appendChild(script);
      }
    }

    // --- Instagram post/reel/profile ---
    const instaMatch = text.match(/https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|[A-Za-z0-9_.]+)/);
    if (instaMatch) {
      const instaUrl = instaMatch[0];
      const blockquote = document.createElement("blockquote");
      blockquote.className = "instagram-media";
      blockquote.setAttribute("data-instgrm-permalink", instaUrl);
      blockquote.style.marginTop = "6px";
      content.appendChild(blockquote);
      if (!document.getElementById("insta-embed-script")) {
        const script = document.createElement("script");
        script.src = "https://www.instagram.com/embed.js";
        script.id = "insta-embed-script";
        document.body.appendChild(script);
      }
    }
  }



  div.appendChild(img);
  div.appendChild(content);

  const isAtBottom = chatMessagesEl.scrollHeight - chatMessagesEl.scrollTop <= chatMessagesEl.clientHeight + 50;
  chatMessagesEl.appendChild(div);

  if (isAtBottom)
    chatMessagesEl.scrollTo({ top: chatMessagesEl.scrollHeight, behavior: "smooth" });
}

// ---------- SCROLL-TO-BOTTOM BUTTON ----------
if (chatMessagesEl && scrollBtn) {
  chatMessagesEl.addEventListener("scroll", () => {
    const isAtBottom = chatMessagesEl.scrollHeight - chatMessagesEl.scrollTop <= chatMessagesEl.clientHeight + 50;
    scrollBtn.style.display = isAtBottom ? "none" : "block";
  });

  scrollBtn.addEventListener("click", () => {
    chatMessagesEl.scrollTo({ top: chatMessagesEl.scrollHeight, behavior: "smooth" });
  });
}

// ---------- LOAD CHAT ----------
async function loadChat(friendId) {
  currentFriendId = friendId;
  const currentUserProfile = authManager.getCurrentUserProfile();
  if (!currentUserProfile) return console.error("No current user profile");

  const { data: messages, error } = await supabaseClient
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUserProfile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserProfile.id}))`,
    )
    .order("created_at", { ascending: true });

  if (error) return console.error("Error loading messages:", error);

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profiles } = await supabaseClient
    .from("profiles")
    .select("id, username, profile_picture, verified, premium, tester")
    .in("id", senderIds);

  const messagesWithProfiles = messages.map((msg) => ({
    ...msg,
    sender: profiles.find((p) => p.id === msg.sender_id) || {
      username: "Unknown",
      profile_picture: "icons/default-avatar.png",
      verified: false,
      premium: false,
      tester: false,
    },
  }));

  if (chatMessagesEl) chatMessagesEl.innerHTML = "";
  lastDateRef.value = null;

  messagesWithProfiles.forEach((msg) => appendMessage(msg, lastDateRef));

  if (chatMessagesEl) {
    chatMessagesEl.scrollTo({ top: chatMessagesEl.scrollHeight, behavior: "auto" });
  }

  if (chatChannel) chatChannel.unsubscribe();

  const channelName = `chat-${[currentUserProfile.id, friendId].sort().join("-")}`;

  chatChannel = supabaseClient
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${currentUserProfile.id}` },
      async (payload) => {
        const msg = payload.new;
        if (msg.sender_id === currentUserProfile.id) return;

        if (msg.sender_id === currentUserProfile.id) {
          msg.sender = {
            username: currentUserProfile.username,
            profile_picture: currentUserProfile.profile_picture || "icons/default-avatar.png"
          };
        } else {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("username, profile_picture, verified, premium, tester")
            .eq("id", msg.sender_id)
            .single();
          msg.sender = profile || {
            username: "Unknown",
            profile_picture: "icons/default-avatar.png",
            verified: false,
            premium: false,
            tester: false,
          };
        }

        appendMessage(msg, lastDateRef);

        const isChatHidden = !chatContainer || chatContainer.style.display === "none";
        const isTabHidden = document.hidden;

        if (isChatHidden || isTabHidden) {
          const audio = new Audio("sounds/notification.wav");
          audio.play().catch(err => console.error("Error playing notification sound:", err));
        }
      },
    )
    .subscribe();
}

// ---------- SEND MESSAGE ----------
if (chatSendBtn) {
  chatSendBtn.addEventListener("click", async () => {
    if (!chatInputEl) return;
    const message = chatInputEl.value.trim();
    if (!message || !currentFriendId) return;

    const currentUserProfile = authManager.getCurrentUserProfile();
    if (!currentUserProfile) return console.error("No current user profile");

    try {
      const { data: messageData, error } = await supabaseClient
        .from("messages")
        .insert([{ sender_id: currentUserProfile.id, receiver_id: currentFriendId, message }])
        .select();

      if (error) return console.error("Error sending message:", error);

      if (messageData?.length > 0) {
        messageData[0].sender = currentUserProfile;
        appendMessage(messageData[0], lastDateRef);
        chatInputEl.value = "";
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });
}

if (chatInputEl) {
  chatInputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      chatSendBtn?.click();
    }
  });
}

  // GIF Picker Logic
  const gifBtnEl = document.getElementById("gif-btn");
  const gifPickerEl = document.getElementById("gif-picker");
  const searchInput = document.getElementById("gif-search");
  const gifResultsEl = document.getElementById("gif-results");

  const closeBtn = document.getElementById("close-gif-picker");

  if (gifBtnEl && gifPickerEl && searchInput && gifResultsEl && closeBtn) {
    // Fetch GIFs from GIPHY
    async function fetchGifs(query = "trending", limit = 12) {
      try {
        const apiKey = window.envConfig.get("GIF_API");// your GIPHY API key
        let endpoint = query === "trending"
          ? `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=g`
          : `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`;

        const res = await fetch(endpoint);
        const data = await res.json();
        return data.data.map(gif => gif.images.fixed_height.url); // fixed_height GIF URLs
      } catch (err) {
        console.error("Error fetching GIFs:", err);
        return [];
      }
    }

    // Render GIFs in the results container
    async function renderGifs(query) {
      gifResultsEl.innerHTML = ""; // Clear previous GIFs
      const gifs = await fetchGifs(query);

      gifs.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.dataset.gifUrl = url;
        img.style.width = "100px";
        img.style.height = "100px";
        img.style.cursor = "pointer";
        img.style.margin = "4px";
        img.style.borderRadius = "12px";

        // Click to send GIF
        img.addEventListener("click", async () => {
          if (!currentFriendId) return;
          const currentUserProfile = authManager.getCurrentUserProfile();
          if (!currentUserProfile) return console.error("No current user profile");

          try {
            const { data: messageData, error } = await supabaseClient
              .from("messages")
              .insert([{ sender_id: currentUserProfile.id, receiver_id: currentFriendId, file_url: url }])
              .select();

            if (error) throw error;

            if (messageData?.length > 0) {
              messageData[0].sender = currentUserProfile;
              appendMessage(messageData[0], lastDateRef);
            }

            gifPickerEl.style.display = "none"; // Close picker after sending
          } catch (err) {
            console.error("Error sending GIF:", err);
          }
        });

        gifResultsEl.appendChild(img);
      });
    }

    // Show/hide picker and load trending GIFs
    gifBtnEl.addEventListener("click", async () => {
      gifPickerEl.style.display = gifPickerEl.style.display === "block" ? "none" : "block";
      if (gifPickerEl.style.display === "block") {
        await renderGifs("trending");
      }
    });

    // Search GIFs when user presses Enter
    searchInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        const query = searchInput.value.trim() || "trending";
        await renderGifs(query);
      }
    });

    // Close picker button
    closeBtn.addEventListener("click", () => {
      gifPickerEl.style.display = "none";
    });
  }


  // ---------- PROFILE CARD POPUP ----------
  const profileCardPopup = document.getElementById("profile-card-popup");
  const closeProfileBtn = document.getElementById("close-profile-card");
  const pfpImageEl = document.getElementById("pfp-image");
  const usernameDisplayEl = document.getElementById("username-display");
  const badgesContainerEl = document.getElementById("profile-badges");
  const friendCountEl = document.getElementById("friend-count");
  const bannerImageEl = document.getElementById("banner-image");
  const profileDescriptionEl = document.getElementById("profile-description");
  const profileTagEl = document.getElementById("profile-tag");
  const profilePlatformsEl = document.getElementById("profile-platforms");
  const addFriendBtnEl = document.getElementById("addFriendButton");
  
  document.addEventListener("click", (event) => {
    if (!profileCardPopup) return;

    // Check if the click was outside the popup
    if (!profileCardPopup.contains(event.target)) {
      profileCardPopup.style.display = "none";
    }
  });
  // Close popup
  closeProfileBtn.addEventListener("click", () => {
    profileCardPopup.style.display = "none";
  });

  // ---------- HELPER: RENDER BADGES ----------
  function renderBadges(profile) {
    badgesContainerEl.innerHTML = "";
    if (profile.verified) badgesContainerEl.appendChild(createBadge("verified.png"));
    if (profile.premium) badgesContainerEl.appendChild(createBadge("premium.png"));
    if (profile.tester) badgesContainerEl.appendChild(createBadge("tester.png"));
  }

  // ---------- SHOW PROFILE CARD ----------
  async function showProfileCard(userId) {
    try {
      const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !profile) throw error || new Error("Profile not found");

      // Set profile data
      pfpImageEl.src = profile.profile_picture || "icons/default-avatar.png";
      usernameDisplayEl.textContent = profile.username;
      renderBadges(profile);
      friendCountEl.textContent = `Friends: ${profile.friends_count || 0}`;
      bannerImageEl.src = profile.banner || "defbanner.png";
      profileDescriptionEl.textContent = profile.description || "error loading bio";
      profileTagEl.textContent = profile.tag || "ARTIST";

      // Platforms
      profilePlatformsEl.innerHTML = "";
      const platforms = ["spotify", "youtube", "tiktok", "instagram"];
      platforms.forEach(pf => {
        if (profile[pf]) {
          profilePlatformsEl.innerHTML += `<a href="${profile[pf]}" target="_blank"><img src="platforms/${pf}.png" /></a>`;
        }
      });

      // Add/Remove friend logic
      const currentUser = authManager.getCurrentUser();
      if (currentUser?.id === profile.id) {
        addFriendBtnEl.style.display = "none"; // hide if it's self
      } else {
        addFriendBtnEl.style.display = "inline-block";
        const { data: existingFriend } = await supabaseClient
          .from("friends")
          .select("*")
          .or(
            `and(requester_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),` +
            `and(requester_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`
          )
          .maybeSingle();

        addFriendBtnEl.textContent = existingFriend
          ? existingFriend.status === "accepted" ? "Remove Friend" : "Friend Request Sent"
          : "Add Friend";

        addFriendBtnEl.disabled = existingFriend && existingFriend.status !== "accepted";

        addFriendBtnEl.onclick = async () => {
          if (!existingFriend) {
            // Send friend request
            await supabaseClient.from("friends").insert([{ requester_id: currentUser.id, receiver_id: profile.id, status: "pending" }]);
            addFriendBtnEl.textContent = "Friend Request Sent";
            addFriendBtnEl.disabled = true;
          } else if (existingFriend.status === "accepted") {
            // Remove friend
            await supabaseClient
              .from("friends")
              .delete()
              .or(
                `and(requester_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),` +
                `and(requester_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`
              );
            addFriendBtnEl.textContent = "Add Friend";
            addFriendBtnEl.disabled = false;
            await renderFriendsPanel(); // refresh friends list
          }
        };
      }

      profileCardPopup.style.display = "block";
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }

  // ---------- HEADER AVATAR CLICK ----------
  const headerAvatar = document.getElementById("chat-header-img");
  headerAvatar?.addEventListener("click", () => {
    const friendUsername = document.getElementById("chat-header-username").textContent;
    if (!friendUsername) return;
    supabaseClient.from("profiles").select("id").eq("username", friendUsername).single()
      .then(({ data }) => {
        if (data?.id) showProfileCard(data.id);
      })
      .catch(console.error);
  });

  // Optional: Navbar avatar for your profile
  const navbarAvatar = document.getElementById("navbar-avatar");
  navbarAvatar?.addEventListener("click", () => {
    const currentUser = authManager.getCurrentUser();
    if (currentUser?.id) showProfileCard(currentUser.id);
  });

  // ---------- CHAT MESSAGE AVATAR CLICK ----------
  function attachMessageProfileClicks() {
    document.querySelectorAll("#chat-messages img").forEach(img => {
      img.style.cursor = "pointer";
      img.onclick = async (e) => {
        const usernameSpan = e.target.closest("div")?.querySelector("span");
        const senderUsername = usernameSpan?.textContent;
        if (!senderUsername) return;

        const { data } = await supabaseClient.from("profiles").select("id").eq("username", senderUsername).single();
        if (data?.id) showProfileCard(data.id);
      };
    });
  }

  // Call this every time a new message is appended
  const originalAppendMessage = appendMessage;
  appendMessage = function(msg, lastDateRefParam) {
    originalAppendMessage(msg, lastDateRefParam);
    attachMessageProfileClicks(); // attach after message renders
  };

});