// The 'supabaseClient' object is already available globally after `database.js` has run.

document.addEventListener("DOMContentLoaded", async () => {
  // Wait for Supabase client to be initialized by env-config.js
  let attempts = 0;
  while (!window.supabaseClient && attempts < 40) { // Wait up to 2 seconds
    await new Promise(resolve => setTimeout(resolve, 50));
    attempts++;
  }
  
  if (!window.supabaseClient) {
    console.error('❌ Supabase client not initialized after waiting');
    return;
  }
  

  const container = document.getElementById('container');
  const signUpButton = document.getElementById('signUp');
  const signInButton = document.getElementById('signIn');

  const signInForm = document.querySelector('.sign-in-container form');
  const signUpForm = document.querySelector('.sign-up-container form');

  if (!signInForm || !signUpForm || !signUpButton || !signInButton) {
    console.error("One or more DOM elements are missing. Check your HTML.");
    return;
  }

  function createMessageBox(message, type = 'error') {
    let bgColor = '';
    if (type === 'success') {
      bgColor = 'bg-green-500';
    } else if (type === 'warning') {
      bgColor = 'bg-yellow-500';
    } else {
      bgColor = 'bg-red-500';
    }

    const messageBox = document.createElement('div');
    messageBox.className = `fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white font-semibold shadow-xl transition-transform transform-gpu duration-300 z-50 ${bgColor}`;
    messageBox.style.transform = 'translate(-50%, 100px)';
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    setTimeout(() => {
      messageBox.style.transform = 'translate(-50%, 0)';
    }, 10);

    setTimeout(() => {
      messageBox.style.transform = 'translate(-50%, 100px)';
      setTimeout(() => messageBox.remove(), 300);
    }, 3000);
  }

  // Panel transitions
  signUpButton.addEventListener('click', () => container.classList.add("right-panel-active"));
  signInButton.addEventListener('click', () => container.classList.remove("right-panel-active"));

  // ----- LOGIN -----
  signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value.trim();

    if (!email || !password) {
      createMessageBox("Please fill in all fields.", "warning");
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("Supabase login error:", error.message);
      createMessageBox(error.message.includes("Invalid") ? "Incorrect email or password." : "Login error: " + error.message);
      return;
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    createMessageBox(`Welcome back, ${profile?.username || data.user.email}!`, 'success');
    window.location.href = "index.html";
  });

  // ----- SIGNUP -----
  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const tag = document.getElementById('signup-tag').value;

    if (!username || !email || !password || tag === "Select a tag") {
      createMessageBox("Please fill in all fields and select a tag.", "warning");
      return;
    }

    // Ensure unique username
    const { data: usernameCheck } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (usernameCheck) {
      createMessageBox("Username is already taken. Please choose another.");
      return;
    }

    // Create user in Auth
    const { data, error: signUpError } = await supabaseClient.auth.signUp({ email, password });

    if (signUpError) {
      console.error("Supabase signup error:", signUpError.message);
      createMessageBox(signUpError.message.includes("registered") ? "Email is already taken. Please sign in." : "Signup error: " + signUpError.message);
      return;
    }

    const user = data.user;
    if (!user) {
      createMessageBox("A confirmation email has been sent. Please verify your email before signing in.", "success");
      return;
    }

    // Default assets - these will be replaced by environment config on client side
    const pfpUrl = "/default/defaultpfp.png";
    const bannerUrl = "/default/defaultbanner.png";
    const defaultBio = "This user has not edited their bio in settings yet";
    
    // Insert into profiles (UUID, username, tag, etc.)
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert([{
        id: user.id,            // UUID from Supabase Auth
        username: username,
        tag: tag,
        profile_picture: pfpUrl,
        banner: bannerUrl,
        themes: "dark",
        description: defaultBio,
      }]);

    if (profileError) {
      console.error("Profile creation error:", profileError.message);
      createMessageBox("Error creating profile. Please try again.");
      return;
    }

    createMessageBox("Signup successful! You can now sign in.", "success");
    container.classList.remove("right-panel-active");
  });
});
