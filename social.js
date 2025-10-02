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

    const friendsSpan = document.createElement("span");
    friendsSpan.id = "friends-span";
    friendsSpan.style.marginLeft = "20px";
    navbarTitle?.after(friendsSpan);

    await renderFriendsPanel();

    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) loadingOverlay.style.display = "none";

    const chatContainer = document.getElementById("chat-container");
    if (chatContainer) chatContainer.style.display = "none";

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
            logo.src = (["dark","onyx","red","blue","green","purple","pink"].includes(theme)) 
                ? "icons/logo.png" 
                : "icons/logo-light.png";
        }

        const buttonMappings = [
            { id: "shareScreenButton", icons: { dark: "icons/sharescreen.png", onyx: "icons/sharescreen.png", red: "icons/sharescreen.png", blue: "icons/sharescreen.png", green: "icons/sharescreen.png", purple: "icons/sharescreen.png", pink: "icons/sharescreenblack.png", light: "icons/sharescreenblack.png" } },
            { id: "skipButton", icons: { dark: "icons/skip.png", onyx: "icons/skip.png", red: "icons/skip.png", blue: "icons/skip.png", green: "icons/skip.png", purple: "icons/skip.png", pink: "icons/skipblack.png", light: "icons/skipblack.png" } },
            { id: "premiumButton", icons: { dark: "icons/premium.png", onyx: "icons/premium.png", red: "icons/premium.png", blue: "icons/premium.png", green: "icons/premium.png", purple: "icons/premium.png", light: "icons/premiumblack.png" } },
            { id: "reportButton", icons: { dark: "icons/report.png", onyx: "icons/report.png", red: "icons/report.png", blue: "icons/report.png", green: "icons/report.png", purple: "icons/report.png", pink: "icons/reportblack.png", light: "icons/reportblack.png" } }
        ];

        buttonMappings.forEach(btn => {
            const el = document.getElementById(btn.id);
            if (el && el.querySelector("img")) el.querySelector("img").src = btn.icons[theme] || btn.icons.light;
        });
    }

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
                img.style.backgroundColor = "transparent";

                const usernameWrapper = document.createElement("div");
                usernameWrapper.style.display = "flex";
                usernameWrapper.style.alignItems = "center";
                usernameWrapper.style.backgroundColor = "transparent";

                const usernameH1 = document.createElement("h1");
                usernameH1.style.fontSize = "20px";
                usernameH1.style.margin = "0";
                usernameH1.style.lineHeight = "1";
                usernameH1.style.backgroundColor = "transparent";
                usernameH1.textContent = profile.username;

                const badgesSpan = document.createElement("span");
                badgesSpan.style.display = "flex";
                badgesSpan.style.alignItems = "center";
                badgesSpan.style.marginLeft = "6px";
                badgesSpan.style.backgroundColor = "transparent";

                if (profile.verified) {
                    const verifiedBadge = document.createElement("img");
                    verifiedBadge.src = "verified.png";
                    verifiedBadge.alt = "Verified";
                    verifiedBadge.style.width = "19px";
                    verifiedBadge.style.height = "19px";
                    verifiedBadge.style.marginLeft = "4px";
                    verifiedBadge.style.borderRadius = "50%";
                    verifiedBadge.style.border = "2px solid white";
                    verifiedBadge.style.backgroundColor = "white";
                    badgesSpan.appendChild(verifiedBadge);
                }
                if (profile.premium) {
                    const premiumBadge = document.createElement("img");
                    premiumBadge.src = "premium.png";
                    premiumBadge.alt = "Premium";
                    premiumBadge.style.width = "19px";
                    premiumBadge.style.height = "19px";
                    premiumBadge.style.marginLeft = "4px";
                    premiumBadge.style.borderRadius = "50%";
                    premiumBadge.style.border = "2px solid white";
                    premiumBadge.style.backgroundColor = "white";
                    badgesSpan.appendChild(premiumBadge);
                }
                if (profile.tester) {
                    const testerBadge = document.createElement("img");
                    testerBadge.src = "tester.png";
                    testerBadge.alt = "Tester";
                    testerBadge.style.width = "19px";
                    testerBadge.style.height = "19px";
                    testerBadge.style.marginLeft = "4px";
                    testerBadge.style.borderRadius = "50%";
                    testerBadge.style.border = "2px solid white";
                    testerBadge.style.backgroundColor = "white";
                    badgesSpan.appendChild(testerBadge);
                }

                usernameWrapper.appendChild(usernameH1);
                usernameWrapper.appendChild(badgesSpan);
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

    const chatMessagesEl = document.getElementById("chat-messages");
    const chatInputEl = document.getElementById("chat-message-input");
    const chatSendBtn = document.getElementById("chat-send-btn");
    let currentFriendId = null;
    let chatChannel = null;

    function appendMessage(msg) {
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

        const usernameSpan = document.createElement("div");
        usernameSpan.textContent = msg.sender?.username || "Unknown";
        usernameSpan.style.fontSize = "17px";
        usernameSpan.style.fontWeight = "bold";
        usernameSpan.style.marginBottom = "4px";
        content.appendChild(usernameSpan);

        const messageText = document.createElement("div");
        messageText.textContent = msg.message;
        content.appendChild(messageText);

        div.appendChild(img);
        div.appendChild(content);

        chatMessagesEl.appendChild(div);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    async function loadChat(friendId) {
        currentFriendId = friendId;
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return console.error("No current user");

        const { data: messages, error } = await supabaseClient
            .from("messages")
            .select("*")
            .or(
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`
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
            sender: profiles.find(p => p.id === msg.sender_id)
        }));

        chatMessagesEl.innerHTML = "";
        messagesWithProfiles.forEach(msg => appendMessage(msg));

        if (chatChannel) chatChannel.unsubscribe();

        const channelName = `chat-${[currentUser.id, friendId].sort().join("-")}`;
        chatChannel = supabaseClient.channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id}))`
                },
                async payload => {
                    const msg = payload.new;

                    const { data: profile } = await supabaseClient
                        .from("profiles")
                        .select("username, profile_picture")
                        .eq("id", msg.sender_id)
                        .single();

                    if (!profile) return;
                    msg.sender = profile;

                    appendMessage(msg);
                }
            )
            .subscribe();
    }

    chatSendBtn.addEventListener("click", async () => {
        const message = chatInputEl.value.trim();
        if (!message || !currentFriendId) return;

        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return console.error("No current user");

        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("username, profile_picture")
            .eq("id", currentUser.id)
            .single();

        const { data, error } = await supabaseClient
            .from("messages")
            .insert([{ sender_id: currentUser.id, receiver_id: currentFriendId, message }])
            .select();

        if (error) return console.error("Error sending message:", error);

        if (data && data.length > 0) {
            data[0].sender = { username: profile.username, profile_picture: profile.profile_picture };
            appendMessage(data[0]);
            chatInputEl.value = "";
        }
    });

    chatInputEl.addEventListener("keypress", e => {
        if (e.key === "Enter") chatSendBtn.click();
    });

});