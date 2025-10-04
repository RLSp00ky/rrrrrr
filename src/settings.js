import './settings.css';
console.log('🔧 Settings.js loading...');

document.addEventListener("DOMContentLoaded", async () => {
  console.log('🔧 Settings DOMContentLoaded fired');

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

  console.log('🔧 Supabase client ready, hiding loading overlay');
  // Hide loading overlay
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
    loadingOverlay.style.display = "none";
    console.log('🔧 Loading overlay hidden');
  } else {
    console.log('🔧 Loading overlay not found');
  }

  const settingsButtons = document.querySelectorAll(
    ".settings-container button",
  );
  const settingsPages = document.querySelectorAll(".settings-page");

  function showTab(button, page) {
    settingsButtons.forEach((btn) => btn.classList.remove("active"));
    settingsPages.forEach((p) => p.classList.remove("active"));
    button.classList.add("active");
    page.classList.add("active");
  }

  const defaultButton = document.querySelector(
    '[data-target-id="account-content"]',
  );
  const defaultPage = document.getElementById("account-content");

  if (defaultButton && defaultPage) {
    showTab(defaultButton, defaultPage);
  }

  settingsButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.targetId;
      const targetPage = document.getElementById(targetId);
      if (targetPage) showTab(button, targetPage);
    });
  });

  const usernameInput = document.getElementById("username-edit");
  const maxUsernameLength = 18;

  if (usernameInput) {
    usernameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault();
    });

    const usernameWrapper = document.createElement("div");
    usernameWrapper.style.position = "relative";
    usernameInput.parentNode.insertBefore(usernameWrapper, usernameInput);
    usernameWrapper.appendChild(usernameInput);

    const usernameCounter = document.createElement("div");
    usernameCounter.id = "username-counter";
    usernameCounter.style.cssText = `
      position: absolute;
top: 13px;
left: 320px;
font-size: 12px;

pointer-events: none;
padding: 4px;
background-color: transparent;
    `;
    usernameWrapper.appendChild(usernameCounter);

    function updateUsernameCounter() {
      usernameInput.value = usernameInput.value.substring(0, maxUsernameLength);
      usernameCounter.textContent = `${usernameInput.value.length}/${maxUsernameLength}`;
    }

    updateUsernameCounter();
    usernameInput.addEventListener("input", updateUsernameCounter);
  }

  const bioInput = document.getElementById("bio-edit");
  const maxBioLength = 80;

  if (bioInput) {
    bioInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault();
    });

    const bioWrapper = document.createElement("div");
    bioWrapper.style.position = "relative";
    bioInput.parentNode.insertBefore(bioWrapper, bioInput);
    bioWrapper.appendChild(bioInput);

    const bioCounter = document.createElement("div");
    bioCounter.id = "bio-counter";
    bioCounter.style.cssText = `
      position: absolute;
      bottom: 6px;
      right: 12px;
      font-size: 12px;
      
      pointer-events: none;
      padding: 4px;
      background-color: transparent;
    `;
    bioWrapper.appendChild(bioCounter);

    function updateBioCounter() {
      bioInput.value = bioInput.value
        .replace(/\r?\n/g, "")
        .substring(0, maxBioLength);
      bioCounter.textContent = `${bioInput.value.length}/${maxBioLength}`;
    }

    updateBioCounter();
    bioInput.addEventListener("input", updateBioCounter);
  }
});