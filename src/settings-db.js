document.addEventListener("DOMContentLoaded", async () => {

  // ---------- THEME LOGO UPDATE ----------
  function updateSettingsLogo() {
    const theme = document.body.getAttribute("data-theme");
    const logo = document.getElementById("logo-img");
    if (logo) {
      logo.src = ["dark", "onyx", "red", "blue", "purple", "green", "pink"].includes(theme)
        ? "icons/logo.png"
        : "icons/logo-light.png";
    }
  }

  updateSettingsLogo();
  const observer = new MutationObserver(updateSettingsLogo);
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });

  // ---------- WAIT FOR SUPABASE CLIENT ----------
  let attempts = 0;
  while (!window.supabaseClient && attempts < 40) { // up to 2 seconds
    await new Promise(resolve => setTimeout(resolve, 50));
    attempts++;
  }
  if (!window.supabaseClient) {
    console.error("❌ Supabase client not initialized");
    return;
  }

  // ---------- GET CURRENT USER SESSION ----------
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    console.error("No active session. User must log in.");
    window.location.href = "login.html"; // redirect if not logged in
    return;
  }
  const user = session.user;

  let newPfpFile = null;
  let newBannerFile = null;

  // ---------- LOAD PROFILE ----------
  async function loadProfile() {
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Profile fetch error:", error.message);
      return;
    }

    // Tags
    const tagDropdown = document.getElementById("tag-dropdown");
    tagDropdown.innerHTML = "";
    const tags = ["Artist", "Producer", "Engineer", "Manager", "Composer", "Recruiter"];
    tags.forEach(tag => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      if (profile.tag?.toLowerCase() === tag.toLowerCase()) option.selected = true;
      tagDropdown.appendChild(option);
    });

    // Profile info
    document.getElementById("navbar-username").textContent = `SoundLink - ${profile.username || "Unknown User"}`;
    document.getElementById("username-display").textContent = profile.username || "Unknown User";
    document.getElementById("pfp-image").src = profile.profile_picture || "pfp.png";
    document.getElementById("banner-image").src = profile.banner || "defbanner.png";
    document.querySelector(".tag").textContent = profile.tag || "ARTIST";
    document.getElementById("verify-badge").style.display = profile.verified ? "inline" : "none";
    document.getElementById("premium-badge").style.display = profile.premium ? "inline" : "none";
    document.getElementById("profile-description").innerHTML = profile.description || "No bio yet.";

    // Social links
    document.getElementById("spotify-link").href = profile.spotify || "#";
    document.getElementById("youtube-link").href = profile.youtube || "#";
    document.getElementById("tiktok-link").href = profile.tiktok || "#";
    document.getElementById("instagram-link").href = profile.instagram || "#";

    // Inputs
    const stripPrefix = (url, prefix) => url?.startsWith(prefix) ? url.slice(prefix.length) : url || "";
    document.getElementById("username-edit").value = profile.username || "";
    document.getElementById("bio-edit").value = profile.description || "";
    document.getElementById("tiktok-edit").value = stripPrefix(profile.tiktok, "https://www.tiktok.com/@");
    document.getElementById("spotify-edit").value = stripPrefix(profile.spotify, "https://open.spotify.com/user/");
    document.getElementById("youtube-edit").value = stripPrefix(profile.youtube, "https://youtube.com/@");
    document.getElementById("instagram-edit").value = stripPrefix(profile.instagram, "https://instagram.com/");

    // Previews
    document.getElementById("pfp-preview").src = profile.profile_picture || "pfp.png";
    document.getElementById("banner-preview").src = profile.banner || "defbanner.png";
  }

  await loadProfile();

  const loadingOverlay = document.getElementById("loading-overlay");

  if (loadingOverlay) {

      loadingOverlay.classList.add('fade-out');

      loadingOverlay.addEventListener('animationend', (e) => {

          if (e.animationName === 'overlayFadeOut') {
              loadingOverlay.remove(); 
          }
      }, { once: true });
  }

  // ---------- FILE UPLOAD HANDLERS ----------
  document.getElementById("pfp-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      if (img.width !== img.height) {
        alert("Profile picture must be square!");
        e.target.value = "";
        return;
      }
      newPfpFile = file;
      document.getElementById("pfp-preview").src = URL.createObjectURL(file);
    };
    img.src = URL.createObjectURL(file);
  });

  document.getElementById("banner-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const requiredRatio = 400 / 170;
      const actualRatio = img.width / img.height;
      if (Math.abs(actualRatio - requiredRatio) > 0.05) {
        alert("Banner must match the required aspect ratio (400x170).");
        e.target.value = "";
        return;
      }
      newBannerFile = file;
      document.getElementById("banner-preview").src = URL.createObjectURL(file);
    };
    img.src = URL.createObjectURL(file);
  });

  const usernameInput = (id, prefix) => {
    const val = document.getElementById(id).value.trim();
    return val ? `${prefix}${val}` : null;
  };

  // ---------- PROFILE FORM SUBMIT ----------
  document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const updates = {
      username: document.getElementById("username-edit").value.trim(),
      tag: document.getElementById("tag-dropdown").value.toLowerCase(),
      description: document.getElementById("bio-edit").value,
      tiktok: usernameInput("tiktok-edit", "https://www.tiktok.com/@"),
      spotify: usernameInput("spotify-edit", "https://open.spotify.com/user/"),
      youtube: usernameInput("youtube-edit", "https://youtube.com/@"),
      instagram: usernameInput("instagram-edit", "https://instagram.com/")
    };

    try {
      const uploadPromises = [];

      if (newPfpFile) {
        uploadPromises.push(
          supabaseClient.storage
            .from("userpfp")
            .upload(`${user.id}/${user.id}.png`, newPfpFile, { upsert: true })
            .then(({ error }) => {
              if (error) throw error;
              const { data: publicUrl } = supabaseClient.storage
                .from("userpfp")
                .getPublicUrl(`${user.id}/${user.id}.png`);
              updates.profile_picture = publicUrl.publicUrl + `?t=${Date.now()}`;
              document.getElementById("pfp-preview").src = updates.profile_picture;
              document.getElementById("pfp-image").src = updates.profile_picture;
            })
        );
      }

      if (newBannerFile) {
        uploadPromises.push(
          supabaseClient.storage
            .from("userbanner")
            .upload(`${user.id}/${user.id}.png`, newBannerFile, { upsert: true })
            .then(({ error }) => {
              if (error) throw error;
              const { data: publicUrl } = supabaseClient.storage
                .from("userbanner")
                .getPublicUrl(`${user.id}/${user.id}.png`);
              updates.banner = publicUrl.publicUrl + `?t=${Date.now()}`;
              document.getElementById("banner-preview").src = updates.banner;
              document.getElementById("banner-image").src = updates.banner;
            })
        );
      }

      await Promise.all(uploadPromises);

      const { error } = await supabaseClient
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        if (error.message.includes("duplicate key value")) {
          alert("Username already exists. Please choose another.");
        } else {
          alert("Error saving profile: " + error.message);
        }
        return;
      }

      newPfpFile = null;
      newBannerFile = null;

      document.getElementById("spotify-link").href = updates.spotify || "#";
      document.getElementById("youtube-link").href = updates.youtube || "#";
      document.getElementById("tiktok-link").href = updates.tiktok || "#";
      document.getElementById("instagram-link").href = updates.instagram || "#";
      document.querySelector(".tag").textContent = updates.tag.toUpperCase() || "ARTIST";
      document.getElementById("navbar-username").textContent = `SoundLink - ${updates.username || "Unknown User"}`;
      document.getElementById("username-display").textContent = updates.username || "Unknown User";
      document.getElementById("profile-description").innerHTML = updates.description || "No bio yet.";

      alert("Profile updated!");
    } catch (err) {
      alert("Error uploading files: " + err.message);
    }
  });

});
