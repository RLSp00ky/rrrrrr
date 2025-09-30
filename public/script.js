import { sendFriendRequest, getFriends, respondToRequest, getDetailedFriendStatus, deleteFriendship } from "./friends.js";




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

    console.log("✅ User authenticated, initializing app...");

    const input = document.querySelector(".chat-input input");
    const sendBtn = document.querySelector(".send-btn");
    const chatBox = document.querySelector(".chat-box");
    const skipButton = document.getElementById("skipButton");
    const shareScreenButton = document.getElementById("shareScreenButton");

    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");

    const usernameDisplay = document.getElementById("username-display");
    const pfpImage = document.getElementById("pfp-image");
    const bannerImage = document.getElementById("banner-image");
    const verifyBadge = document.getElementById("verify-badge");
    const premiumBadge = document.getElementById("premium-badge");
    const audioUploadInput = document.getElementById("audioUpload");
    const imageUploadInput = document.getElementById("imageUpload");

    await applySavedTheme();
    initializeCurrentUserProfile();

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
            console.log("🎨 Theme applied from DB:", profile.themes);

            if (profile.themes !== cachedTheme) {
                localStorage.setItem("user-theme", profile.themes);
                console.log("💾 Theme cached locally:", profile.themes);
            }
        }
    }
    function updateThemeAssets() {
        const theme = document.body.getAttribute("data-theme");

        // Update logo based on theme
        const logo = document.getElementById("logo-img");
        if (logo) {
            logo.src = (theme === "dark" || theme === "onyx" || theme === "red" || theme === "blue" || theme === "green" || theme === "purple" || theme === "pink" ) 
                ? "icons/logo.png"       
                : "icons/logo-light.png"; 
        }

        // Define all buttons and their theme-specific icons
        const buttonMappings = [
            {
                id: "shareScreenButton",
                icons: {
                    dark: "icons/sharescreen.png",
                    onyx: "icons/sharescreen.png",
                    red: "icons/sharescreen.png",
                    blue: "icons/sharescreen.png",
                    green: "icons/sharescreen.png",
                    purple: "icons/sharescreen.png",
                    pink: "icons/sharescreenblack.png",
                    light: "icons/sharescreenblack.png",

                }
            },
            {
                id: "skipButton",
                icons: {
                    dark: "icons/skip.png",
                    onyx: "icons/skip.png",
                    red: "icons/skip.png",
                    blue: "icons/skip.png",
                    green: "icons/skip.png",
                    purple: "icons/skip.png",
                    pink: "icons/skipblack.png",
                    light: "icons/skipblack.png",
                }
            },
            {
                id: "premiumButton",
                icons: {
                    dark: "icons/premium.png",
                    onyx: "icons/premium.png",
                    red: "icons/premium.png",
                    blue: "icons/premium.png",
                    green: "icons/premium.png",

                    purple: "icons/premium.png",
                    light: "icons/premiumblack.png",
                }
            },
            {
                id: "reportButton",
                icons: {
                    dark: "icons/report.png",
                    onyx: "icons/report.png",
                    red: "icons/report.png",
                    blue: "icons/report.png",
                    green: "icons/report.png",
                    purple: "icons/report.png",
                    pink: "icons/reportblack.png",
                    light: "icons/reportblack.png",

                }
            }
        ];

        // Loop through buttons and update their images based on the current theme
        buttonMappings.forEach(btn => {
            const el = document.getElementById(btn.id);
            if (el && el.querySelector("img")) {
                // Use the icon for the current theme, fallback to 'light' if not defined
                el.querySelector("img").src = btn.icons[theme] || btn.icons.light;
            }
        });
    }


    updateThemeAssets();

    const observer = new MutationObserver(() => updateThemeAssets());
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });

    let localStream;
    let peerConnection;
    let dataChannel;
    let isSearching = false;
    let searchTimeout;
    let mediaInitialized = false;

    let remoteUserProfile = {};

    function initializeCurrentUserProfile() {
        const currentUserProfile = authManager.getCurrentUserProfile();

        if (!currentUserProfile) {
            console.warn("⚠️ No current user profile available");
            return;
        }

        console.log("👤 Setting up current user profile display:", currentUserProfile);

        const currentUsernameElement = document.querySelector('.navbar h1');
        if (currentUsernameElement) {
            currentUsernameElement.textContent = `SoundLink - ${currentUserProfile.username}`;
        }

        displayUserProfile(currentUserProfile, true);

        const logoutLink = document.querySelector('a[href="login.html"]');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log("🚪 Logout clicked");
                await authManager.signOut();
            });
        }

        console.log("✅ Current user profile initialized");
    }

    async function updateFriendButton(peerId) {
        const addFriendButton = document.getElementById("addFriendButton");
        if (!addFriendButton || !peerId) return;

        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;

        try {
            const friendStatus = await getDetailedFriendStatus(currentUser.id, peerId, supabaseClient);
            
            addFriendButton.textContent = friendStatus.buttonText;
            addFriendButton.disabled = (friendStatus.action === 'none'); // Disable buttons with no action (like "Sent")
            
            // Store the action and request ID on the button for the click handler
            addFriendButton.setAttribute('data-action', friendStatus.action);
            if (friendStatus.requestId) {
                addFriendButton.setAttribute('data-request-id', friendStatus.requestId);
            } else {
                addFriendButton.removeAttribute('data-request-id');
            }
            
            console.log(`🔄 Friend button updated: ${friendStatus.buttonText} (action: ${friendStatus.action})`);
        } catch (error) {
            console.error("❌ Error updating friend button:", error);
            addFriendButton.textContent = "Add Friend";
            addFriendButton.disabled = false;
        }
    }

    function displayUserProfile(profile, isCurrentUser = false) {
        console.log("👤 Displaying profile:", profile, "Current user:", isCurrentUser);

        if (usernameDisplay && profile.username) {
            usernameDisplay.textContent = profile.username;
        }

        if (pfpImage && profile.profile_picture) {
            pfpImage.src = profile.profile_picture;
            pfpImage.onerror = () => {
                console.warn("⚠️ Failed to load profile picture, using fallback");
                pfpImage.src = "pfp.png";
            };
        }

        if (bannerImage && profile.banner) {
            bannerImage.src = profile.banner;
            bannerImage.onerror = () => {
                console.warn("⚠️ Failed to load banner image, using fallback");
                bannerImage.src = "defbanner.png";
            };
        }

        if (verifyBadge) {
            if (profile.verified) {
                verifyBadge.style.display = "inline-block"; 
            } else {
                verifyBadge.style.display = "none";
            }
        }

        if (premiumBadge) {
            if (profile.premium) {
                premiumBadge.style.display = "inline-block"; 
            } else {
                premiumBadge.style.display = "none"; 
            }
        }

        const tagElement = document.querySelector('.tag');
        if (tagElement && profile.tag) {
            tagElement.textContent = profile.tag.toUpperCase();
        }

        const bioElement = document.getElementById("profile-description");
        if (bioElement) {
            bioElement.textContent = profile.description || "";
            bioElement.style.display = profile.description ? "block" : "none";
        }

        const socials = {
            spotify: "spotify-link",
            youtube: "youtube-link",
            tiktok: "tiktok-link",
            instagram: "instagram-link",
        };

        Object.entries(socials).forEach(([field, elementId]) => {
            const el = document.getElementById(elementId);
            if (el) {
                if (profile[field]) {
                    el.href = profile[field];
                    el.style.display = "inline-block";
                } else {
                    el.removeAttribute("href");
                    el.style.display = "none";
                }
            }
        });

        const profileContainer = document.querySelector('.profile');
        if (profileContainer) {
            profileContainer.classList.toggle('current-user', isCurrentUser);
            profileContainer.classList.toggle('peer-user', !isCurrentUser);
        }

        // Update friend button for remote users
        if (!isCurrentUser && profile.uuid) {
            updateFriendButton(profile.uuid);
        }

        console.log(`✅ Profile display updated for ${isCurrentUser ? 'current user' : 'peer'}`);
    }
    

    const configuration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" }, 
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
        ],
    };

    let socket;

    function getCurrentUserForSocket() {
        const currentUser = authManager.getCurrentUser();
        const currentUserProfile = authManager.getCurrentUserProfile();

        if (!currentUser) {
            console.error("❌ No authenticated user available for socket communication");
            return null;
        }

        return {
            userId: currentUser.id,
            userProfile: {
                username: currentUserProfile?.username || currentUser.email?.split('@')[0] || 'Unknown',
                profile_picture: currentUserProfile?.profile_picture || 'pfp.png',
                banner: currentUserProfile?.banner || 'defbanner.png',
                tag: currentUserProfile?.tag || 'User',
                description: currentUserProfile?.description || "",
                spotify: currentUserProfile?.spotify || "",
                youtube: currentUserProfile?.youtube || "",
                tiktok: currentUserProfile?.tiktok || "",
                instagram: currentUserProfile?.instagram || ""
            }
        };
    }

    function initializeSocket() {

        if (!authManager.isAuthenticated()) {
            console.error("❌ Cannot initialize socket - user not authenticated");

            return;
        }

        let wsUrl = location.origin.replace(/^http/, "ws");
        if (location.protocol === "https:") {
            wsUrl = wsUrl.replace("ws://", "wss://");
        }
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            const currentUser = authManager.getCurrentUser();
            console.log("🔌 Connected to signaling server as user:", currentUser?.id);

            startSearch();
        };

        socket.onclose = () => {
            console.log("🔌 Disconnected from signaling server");

        };

        socket.onerror = (err) => {
            console.error("⚠️ WebSocket error:", err);

            if (!authManager.isAuthenticated()) {
                console.error("❌ Socket error may be due to authentication failure");

            }
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("📩 Signaling message:", data);

                if (!authManager.isAuthenticated()) {
                    console.error("❌ Received socket message but user is not authenticated");

                    return;
                }

            if (data.type === "peerFound") {
                isSearching = false;
                clearTimeout(searchTimeout);
                console.log("🤝 Peer found with details:", {
                    peerId: data.peerId,
                    peerProfile: data.peerProfile,
                    isCaller: data.isCaller
                });

                if (data.peerProfile) {
                    console.log("✅ Received peer profile data directly from server");
                    // Ensure uuid exists
                    remoteUserProfile = {
                        ...data.peerProfile,
                        uuid: data.peerProfile.id || data.peerProfile.uuid, 
                    };
                    displayUserProfile(remoteUserProfile, false);
                } else if (data.peerId) {
                    console.log("🔍 Looking up peer profile by UUID:", data.peerId);
                    await loadPeerProfileByUUID(data.peerId);

                    } else {
                    console.warn("⚠️ No peer profile data or UUID provided");

                    remoteUserProfile = {
                        username: "Unknown Peer",
                        profile_picture: "pfp.png",
                        banner: "defbanner.png",
                        tag: "User"
                    };
                    displayUserProfile(remoteUserProfile, false);
                }

                if (data.isCaller) {

                    createOffer();
                } else {

                }
            } else if (data.type === "offer") {
                console.log("📡 Received offer");
                if (peerConnection) {
                    peerConnection.close();
                }
                console.log("🔗 Peer connection starting");
                peerConnection = new RTCPeerConnection(configuration);
                console.log("🔗 Peer connection created");
                setupPeerConnection();
                await peerConnection.setRemoteDescription(data.offer);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.send(
                    JSON.stringify({
                        type: "answer",
                        answer: peerConnection.localDescription,
                    }),
                );
            } else if (data.type === "answer") {
                console.log("📡 Received answer");
                if (peerConnection) {
                    await peerConnection.setRemoteDescription(data.answer);
                }
            } else if (data.type === "candidate") {
                console.log("📡 Received ICE candidate");
                if (peerConnection) {
                    try {
                        await peerConnection.addIceCandidate(data.candidate);
                    } catch (err) {
                        console.error("❌ Error adding ICE candidate", err);
                    }
                }
            } else if (data.type === "skipToNext") {
                console.log(
                    "👉 Other user skipped. Automatically searching for next peer...",
                );

                resetConnection();
                chatBox.innerHTML = "";
                startSearch();
            }
        } catch (error) {
            console.error("❌ Error processing socket message:", error);

        }
        };
    }

    async function loadPeerProfileByUUID(userUUID) {
        if (!supabaseClient) {
            console.error("🚨 Supabase client not initialized.");
            return;
        }

        const isUUID =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userUUID);
        if (!isUUID) {
            console.warn(`⚠️ Invalid UUID format received: ${userUUID}`);
            appendSystemMessage("⚠️ Invalid user ID format. Could not load peer profile.");
            remoteUserProfile = { 
                username: "Unknown User", 
                profile_picture: "pfp.png", 
                banner: "defbanner.png",
                tag: "User",
                description: "",
                spotify: "",
                youtube: "",
                tiktok: "",
                instagram: ""
            };
            displayUserProfile(remoteUserProfile, false);
            return;
        }

        console.log(`🔍 Loading peer profile for UUID: ${userUUID}`);
        const { data: profile, error } = await supabaseClient
            .from("profiles")
            .select(`
                id,
                username,
                profile_picture,
                banner,
                tag,
                description,
                verified,
                premium,
                spotify,
                youtube,
                tiktok,
                instagram,
                themes
            `)
            .eq("id", userUUID)
            .single();

        if (error) {
            console.error("❌ Error fetching peer profile:", error.message);
            remoteUserProfile = { 
                username: "Unknown User", 
                profile_picture: "pfp.png", 
                banner: "defbanner.png",
                tag: "User",
                description: "",
                spotify: "",
                youtube: "",
                tiktok: "",
                instagram: ""
            };
            displayUserProfile(remoteUserProfile, false);
            return;
        }

         if (!profile) {
                // fallback
                remoteUserProfile = { 
                    username: "Unknown User", 
                    profile_picture: "pfp.png", 
                    banner: "defbanner.png",
                    tag: "User",
                    description: "",
                    spotify: "",
                    youtube: "",
                    tiktok: "",
                    instagram: ""
                };
                displayUserProfile(remoteUserProfile, false);
                return;
            }

            remoteUserProfile = {
                ...profile,
                uuid: profile.id  // ⚡ ensure uuid exists
            };
            console.log("✅ Loaded remote user profile:", remoteUserProfile);

            displayUserProfile(remoteUserProfile, false);
        }

    async function initMedia() {

        if (mediaInitialized) {
            console.log("🎤 Media initialization already completed");
            return;
        }

        console.log("🎤 Initializing media...");

        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            console.log("🎤 Local stream successfully initialized", localStream);
            localVideo.srcObject = localStream;

            await new Promise(
                (resolve) => (localVideo.onloadedmetadata = resolve),
            );
            console.log("✅ Camera and microphone ready for peer connections");

        } catch (err) {
            console.error("❌ Error accessing camera/mic:", err);

            console.warn("⚠️ Proceeding without media access - text chat only");
            localStream = null; 
        }

        mediaInitialized = true;
        console.log("🔌 Media initialization complete, starting socket connection...");
        initializeSocket();
    }

    await initMedia();

    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
        loadingOverlay.style.display = "none";
    }

    function setupPeerConnection() {
        console.log("🔗 Setting up peer connection. Local stream:", localStream);

        if (localStream && localStream.getTracks().length > 0) {
            localStream
                .getTracks()
                .forEach((track) => peerConnection.addTrack(track, localStream));
            console.log("🎤 Added local media tracks to peer connection");
        } else {
            console.warn("⚠️ No local stream available - proceeding with text/data only");
        }

        peerConnection.ontrack = (event) => {
            console.log("🎥 Remote stream received");
            remoteVideo.srcObject = event.streams[0];
        };
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(
                    JSON.stringify({
                        type: "candidate",
                        candidate: event.candidate,
                    }),
                );
            }
        };
        peerConnection.ondatachannel = (event) => {
            console.log("💬 Data channel received from remote peer.");
            dataChannel = event.channel;
            setupDataChannelListeners();
        };
    }

    async function createOffer() {
        console.log("🔗 Creating offer");
        if (peerConnection) {
            peerConnection.close();
        }
        console.log("🔗 Preparing to create RTC peer connection");
        peerConnection = new RTCPeerConnection(configuration);
        console.log("🔗 Peer connection via RTCPeerConnection created", peerConnection);
        setupPeerConnection();
        console.log("🔗 Data channel created");
        dataChannel = peerConnection.createDataChannel("chat");
        setupDataChannelListeners();

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: "offer", offer }));
        console.log("📡 Sent offer");
    }

    function startSearch() {
        isSearching = true;

        const userInfo = getCurrentUserForSocket();
        if (!userInfo) {

            return;
        }

        const searchMessage = {
            type: "search",
            ...userInfo
        };

        console.log("🔍 Sending search message with user ID:", userInfo.userId);
        socket.send(JSON.stringify(searchMessage));

        searchTimeout = setTimeout(() => {
            if (isSearching) {

                const retryUserInfo = getCurrentUserForSocket();
                if (retryUserInfo) {
                    socket.send(JSON.stringify({ type: "search", ...retryUserInfo }));
                    startSearch();
                } else {
                    console.error("❌ Authentication lost during search retry");
                    isSearching = false;

                }
            }
        }, 5000);
    }

    function stopSearch() {
        isSearching = false;
        clearTimeout(searchTimeout);

        const userInfo = getCurrentUserForSocket();
        const stopMessage = {
            type: "stopSearch",
            userId: userInfo?.userId || null
        };

        socket.send(JSON.stringify(stopMessage));
    }

    function resetConnection() {
        if (peerConnection) {
            peerConnection.close();
        }
        peerConnection = null;
        remoteVideo.srcObject = null;
        dataChannel = null;
        chatBox.innerHTML = "";

        remoteUserProfile = {};

        const currentUserProfile = authManager.getCurrentUserProfile();
        if (currentUserProfile) {
            displayUserProfile(currentUserProfile, true);
        } else {

            usernameDisplay.textContent = "Username";
            pfpImage.src = "pfp.png";
            bannerImage.src = "defbanner.png";
        }
    }

    let skipCooldown = false; 

    skipButton.addEventListener("click", () => {
        const userInfo = getCurrentUserForSocket();
        if (!userInfo) return;

        console.log("⏭️ User clicked skip, requesting new peer...");

        socket.send(JSON.stringify({
            type: "skipToNext",
            userId: userInfo.userId
        }));

        if (peerConnection) {
            console.log("🔄 Resetting current call while searching for new peer...");
            resetConnection();
        }

        startSearch();
    });

    skipButton.addEventListener("dblclick", () => {
        stopSearch();
        resetConnection();
    });

    function handleSkipRequest(userId) {
        const user = users[userId];
        if (!user) return;

        console.log(`User ${userId} requested skip`);

        user.searching = true;

        if (user.peerId) {
            const oldPeer = users[user.peerId];
            if (oldPeer) {
                oldPeer.peerId = null;
                oldPeer.inCall = false;
                oldPeer.searching = true; 
                oldPeer.ws.send(JSON.stringify({ type: "peerSkipped" }));
            }
            user.peerId = null;
            user.inCall = false;
        }

        const availablePeers = Object.values(users).filter(u =>
            u.userId !== userId && !u.inCall && u.searching
        );

        if (availablePeers.length === 0) {
            console.log("No available peers to match with right now");
            return;
        }

        const newPeer = availablePeers[Math.floor(Math.random() * availablePeers.length)];

        user.peerId = newPeer.userId;
        newPeer.peerId = userId;

        user.inCall = true;
        newPeer.inCall = true;

        user.searching = false;
        newPeer.searching = false;

        user.ws.send(JSON.stringify({ 
            type: "peerFound", 
            peerId: newPeer.userId, 
            peerProfile: newPeer.profileData,
            isCaller: true
        }));

        newPeer.ws.send(JSON.stringify({ 
            type: "peerFound", 
            peerId: userId, 
            peerProfile: user.profileData,
            isCaller: false
        }));
    }

    shareScreenButton.addEventListener("click", async () => {
        if (!peerConnection) {

            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            const systemAudioTrack = screenStream.getAudioTracks()[0];

            const videoSender = peerConnection
                .getSenders()
                .find((s) => s.track && s.track.kind === "video");
            if (videoSender) {
                videoSender.replaceTrack(screenTrack);
            }

            if (systemAudioTrack) {
                console.log(
                    "🎶 Adding system audio track from screen share...",
                );
                peerConnection.addTrack(systemAudioTrack, screenStream);
            }

            localVideo.srcObject = screenStream;

            screenTrack.onended = async () => {

                try {
                    const camStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true,
                    });
                    localStream = camStream;

                    const camTrack = camStream.getVideoTracks()[0];
                    if (videoSender && camTrack) {
                        videoSender.replaceTrack(camTrack);
                    }

                    localVideo.srcObject = camStream;

                } catch (err) {
                    console.error("❌ Failed to restore camera after screen share:", err);

                    localStream = null;
                    localVideo.srcObject = null;

                    if (videoSender) {
                        videoSender.replaceTrack(null);
                    }
                }
            };
        } catch (err) {
            console.error("❌ Error sharing screen:", err);

        }
    });

    function getSenderName() {
        return remoteUserProfile.username || "Friend";
    }

    function appendMessage(text, sender = "You", senderPfp = "pfp.png") {
        const msg = document.createElement("div");
        msg.classList.add("message");

        if (sender === "You") {
            msg.classList.add("current-user");
        } else {
            msg.classList.add("peer-user");
        }

        const pfp = document.createElement("img");
        pfp.classList.add("pfp");
        pfp.src = senderPfp;
        pfp.onerror = () => (pfp.src = "pfp.png");

        const content = document.createElement("div");
        content.classList.add("user-txt"); 
        content.innerHTML = `<span class="user self-css">${sender}:</span> ${text}`;

        msg.appendChild(pfp);
        msg.appendChild(content);
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function appendAudioMessage(audioData, fileName, sender = "You") {
        const msg = document.createElement("div");
        msg.classList.add("message", "audio-message");

        const userSpan = document.createElement("span");
        userSpan.classList.add("user", sender === "You" ? "blue" : "cyan");
        userSpan.textContent = `${sender}:`;

        const audioPlayerContainer = document.createElement("div");
        audioPlayerContainer.classList.add("audio-player");

        audioPlayerContainer.innerHTML = `
          <div class="audio-controls">
            <button class="play-pause-btn">▶️</button>
            <div class="audio-time">
                <span class="current-time">0:00</span> / <span class="total-time">0:00</span>
            </div>
            <input type="range" class="audio-slider" value="0" step="0.01">
          </div>
          <a href="${audioData}" download="${fileName}" class="download-btn">⬇️</a>
      `;
        const audioElement = new Audio(audioData);
        const playPauseBtn =
            audioPlayerContainer.querySelector(".play-pause-btn");
        const timeSlider = audioPlayerContainer.querySelector(".audio-slider");
        const currentTimeSpan =
            audioPlayerContainer.querySelector(".current-time");
        const totalTimeSpan = audioPlayerContainer.querySelector(".total-time");

        playPauseBtn.addEventListener("click", () => {
            if (audioElement.paused) {
                audioElement.play();
                playPauseBtn.textContent = "⏸️";
            } else {
                audioElement.pause();
                playPauseBtn.textContent = "▶️";
            }
        });

        audioElement.addEventListener("timeupdate", () => {
            const progress =
                (audioElement.currentTime / audioElement.duration) * 100;
            timeSlider.value = progress;

            const currentMinutes = Math.floor(audioElement.currentTime / 60);
            const currentSeconds = Math.floor(audioElement.currentTime % 60);
            currentTimeSpan.textContent = `${currentMinutes}:${currentSeconds < 10 ? "0" : ""}${currentSeconds}`;
        });

        audioElement.addEventListener("loadedmetadata", () => {
            const totalMinutes = Math.floor(audioElement.duration / 60);
            const totalSeconds = Math.floor(audioElement.duration % 60);
            totalTimeSpan.textContent = `${totalMinutes}:${totalSeconds < 10 ? "0" : ""}${totalSeconds}`;
        });

        timeSlider.addEventListener("input", () => {
            const newTime = (timeSlider.value / 100) * audioElement.duration;
            audioElement.currentTime = newTime;
        });

        msg.appendChild(userSpan);
        msg.appendChild(audioPlayerContainer);
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function appendImageMessage(imageData, sender = "You") {
        const msg = document.createElement("div");
        msg.classList.add("message", "image-message");

        const userSpan = document.createElement("span");
        userSpan.classList.add("user", sender === "You" ? "blue" : "cyan");
        userSpan.textContent = `${sender}:`;

        const imageContainer = document.createElement("div");
        imageContainer.classList.add("image-container");

        const imageElement = document.createElement("img");
        imageElement.src = imageData;

        imageContainer.appendChild(imageElement);

        msg.appendChild(userSpan);
        msg.appendChild(imageContainer);
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function appendSystemMessage(text) {
        const msg = document.createElement("div");
        msg.classList.add("message", "system");
        msg.innerHTML = `<span class="user system-css" style="font-size: 25px"></span> ${text}`;
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function sendMessage() {
        const text = input.value.trim();
        const msg = document.createElement("div");
        msg.classList.add("message", "user-txt");
        if (text !== "" && dataChannel && dataChannel.readyState === "open") {
            const currentUserProfile = authManager.getCurrentUserProfile();
            const pfp = currentUserProfile?.profile_picture || "pfp.png";

            const message = JSON.stringify({
                type: "textMessage",
                content: text,
                profile_picture: pfp 
            });

            dataChannel.send(message);
            appendMessage(text, "You", pfp);

            input.value = "";
        } else {
            appendSystemMessage(
                "🚨 Cannot send message. Chat channel is not connected."
            );
        }
    }

    function setupDataChannelListeners() {
        if (!dataChannel) return;
        dataChannel.onopen = () => {
            console.log("💬 Data channel open");
            appendSystemMessage("💬 Chat channel connected");
        };
        dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                const senderName = getSenderName(); 
                const senderPfp = message.profile_picture || "pfp.png"; 

                if (message.type === "friendshipRemoved") {
                    console.log("👋 Peer removed friendship, updating button state");
                    const currentPeerId = remoteUserProfile?.uuid;
                    if (currentPeerId) {
                        updateFriendButton(currentPeerId);
                    }
                    return;
                } else if (message.type === "friendshipAccepted") {
                    console.log("🤝 Peer accepted friendship, updating button state");
                    const currentPeerId = remoteUserProfile?.uuid;
                    if (currentPeerId) {
                        updateFriendButton(currentPeerId);
                    }
                    return;
                } else if (message.type === "friendRequestSent") {
                    console.log("📨 Peer sent friend request, updating button state");
                    const currentPeerId = remoteUserProfile?.uuid;
                    if (currentPeerId) {
                        updateFriendButton(currentPeerId);
                    }
                    return;
                } else if (message.type === "audioMessage") {
                    appendAudioMessage(
                        message.audioData,
                        message.fileName,
                        senderName,
                        senderPfp
                    );
                } else if (message.type === "imageMessage") {
                    appendImageMessage(message.imageData, senderName, senderPfp);
                } else if (message.type === "textMessage") {
                    appendMessage(message.content, senderName, senderPfp);
                }
            } catch (e) {
                console.error("Failed to parse message:", e);
                const senderPfp = remoteUserProfile.profile_picture || "pfp.png";
                appendMessage(event.data, getSenderName(), senderPfp);
            }
        };

        dataChannel.onclose = () => {
            console.log("💬 Data channel closed");
            appendSystemMessage("❌ Chat channel closed.");
        };
        dataChannel.onerror = (error) => {
            console.error("❌ Data channel error:", error);
            appendSystemMessage("⚠️ Chat channel error.");
        };
    }

    audioUploadInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            if (dataChannel && dataChannel.readyState === "open") {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const audioData = e.target.result;
                    const message = JSON.stringify({
                        type: "audioMessage",
                        fileName: file.name,
                        audioData: audioData,
                    });
                    dataChannel.send(message);
                    appendAudioMessage(audioData, file.name, "You");
                };
                reader.readAsDataURL(file);
            } else {
                appendSystemMessage(
                    "🚨 Cannot send audio. Chat channel is not connected.",
                );
            }
        }
    });

    imageUploadInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            if (dataChannel && dataChannel.readyState === "open") {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageData = e.target.result;
                    const message = JSON.stringify({
                        type: "imageMessage",
                        imageData: imageData,
                    });
                    dataChannel.send(message);
                    appendImageMessage(imageData, "You");
                };
                reader.readAsDataURL(file);
            } else {
                appendSystemMessage(
                    "🚨 Cannot send image. Chat channel is not connected.",
                );
            }
        }
    });

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();


    });
    const addFriendButton = document.getElementById("addFriendButton");

    if (addFriendButton) {
        addFriendButton.addEventListener("click", async () => {
            const peerId = remoteUserProfile?.uuid;
            const action = addFriendButton.getAttribute('data-action');
            const requestId = addFriendButton.getAttribute('data-request-id');

            if (!peerId) {
                console.error("❌ No peer ID available for friend action");
                return;
            }

            const originalText = addFriendButton.textContent;
            addFriendButton.disabled = true;
            addFriendButton.textContent = "Processing...";

            try {
                if (action === 'send') {
                    console.log(`➕ Sending friend request to ${peerId}...`);
                    const result = await sendFriendRequest(peerId, authManager, supabaseClient);

                    if (result) {
                        console.log("✅ Friend request sent:", result);

                        // Update sender button immediately
                        addFriendButton.textContent = "Request Sent";
                        addFriendButton.setAttribute('data-action', 'remove');
                        addFriendButton.setAttribute('data-request-id', result.id);

                        // Notify receiver via data channel
                        if (dataChannel && dataChannel.readyState === 'open') {
                            try {
                                dataChannel.send(JSON.stringify({
                                    type: 'friendRequestSent',
                                    fromUserId: authManager.getCurrentUser().id,
                                    requestId: result.id
                                }));
                                console.log("📨 Sent friendRequestSent notification to peer");
                            } catch (e) {
                                console.warn("⚠️ Could not notify peer via data channel:", e);
                            }
                        }
                    } else {
                        addFriendButton.textContent = originalText;
                    }

                } else if (action === 'accept' && requestId) {
                    console.log(`✅ Accepting friend request ${requestId}...`);
                    const result = await respondToRequest(requestId, true, supabaseClient);

                    if (result) {
                        console.log("✅ Friend request accepted:", result);

                        // Update button immediately
                        addFriendButton.textContent = "Friends";
                        addFriendButton.setAttribute('data-action', 'remove');

                        if (dataChannel && dataChannel.readyState === 'open') {
                            try {
                                dataChannel.send(JSON.stringify({
                                    type: 'friendshipAccepted',
                                    fromUserId: authManager.getCurrentUser().id
                                }));
                                console.log("📨 Sent friendshipAccepted notification to peer");
                            } catch (e) {
                                console.warn("⚠️ Could not notify peer via data channel:", e);
                            }
                        }
                    } else {
                        addFriendButton.textContent = originalText;
                    }

                } else if (action === 'remove' && requestId) {
                    const confirmRemove = confirm("Are you sure you want to remove this friend?");
                    if (!confirmRemove) {
                        addFriendButton.textContent = originalText;
                        return;
                    }

                    console.log(`❌ Removing friendship ${requestId}...`);
                    const result = await deleteFriendship(requestId, supabaseClient);

                    if (result && result.length > 0) {
                        console.log("✅ Friendship removed:", result);

                        // Update button immediately
                        addFriendButton.textContent = "Add Friend";
                        addFriendButton.setAttribute('data-action', 'send');
                        addFriendButton.removeAttribute('data-request-id');

                        if (dataChannel && dataChannel.readyState === 'open') {
                            try {
                                dataChannel.send(JSON.stringify({
                                    type: 'friendshipRemoved',
                                    fromUserId: authManager.getCurrentUser().id
                                }));
                                console.log("📨 Sent friendshipRemoved notification to peer");
                            } catch (e) {
                                console.warn("⚠️ Could not notify peer via data channel:", e);
                            }
                        }
                    } else {
                        console.error("❌ Failed to remove friendship - no rows deleted");
                        addFriendButton.textContent = originalText;
                    }

                } else {
                    console.warn("⚠️ Unknown action or missing request ID:", action, requestId);
                    addFriendButton.textContent = originalText;
                }

            } catch (error) {
                console.error("❌ Error processing friend request:", error);
                addFriendButton.textContent = originalText;
            } finally {
                addFriendButton.disabled = false;
            }
        });
    }

    // Listen for incoming data channel messages to update buttons live
    if (dataChannel) {
        dataChannel.addEventListener('message', (event) => {
            try {
                const msg = JSON.parse(event.data);

                switch (msg.type) {
                    case 'friendRequestSent':
                        if (remoteUserProfile?.uuid === msg.fromUserId) {
                            const button = document.getElementById("addFriendButton");
                            if (button) {
                                button.textContent = "Accept Request";
                                button.setAttribute('data-action', 'accept');
                                button.setAttribute('data-request-id', msg.requestId);
                            }
                        }
                        break;

                    case 'friendshipAccepted':
                        if (remoteUserProfile?.uuid === msg.fromUserId) {
                            const button = document.getElementById("addFriendButton");
                            if (button) {
                                button.textContent = "Friends";
                                button.setAttribute('data-action', 'remove');
                            }
                        }
                        break;

                    case 'friendshipRemoved':
                        if (remoteUserProfile?.uuid === msg.fromUserId) {
                            const button = document.getElementById("addFriendButton");
                            if (button) {
                                button.textContent = "Add Friend";
                                button.setAttribute('data-action', 'send');
                                button.removeAttribute('data-request-id');
                            }
                        }
                        break;
                }
            } catch (e) {
                console.warn("⚠️ Failed to parse data channel message:", e);
            }
        });
    }

});

