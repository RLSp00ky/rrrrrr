const cachedTheme = localStorage.getItem("user-theme");
if (cachedTheme) {
  document.body.setAttribute("data-theme", cachedTheme);
}

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const user = session.user;

  async function loadThemeAndProfile() {
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("themes, is_premium")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Profile fetch error:", error.message);
      return;
    }

    if (profile.themes) {
      document.querySelectorAll(".theme-card").forEach(card =>
        card.classList.remove("selected")
      );

      const selectedCard = document.querySelector(`.theme-card[data-theme="${profile.themes}"]`);
      if (selectedCard) selectedCard.classList.add("selected");

      document.body.setAttribute("data-theme", profile.themes);
      localStorage.setItem("user-theme", profile.themes);
    }

    document.querySelectorAll(".theme-card.red-mode, .theme-card.blue-mode").forEach(card => {
      if (!profile.is_premium) {
        card.classList.add("locked");
        card.style.pointerEvents = "none";
      } else {
        card.classList.remove("locked");
        card.style.pointerEvents = "auto";
      }
    });
  }

  await loadThemeAndProfile();

  document.querySelectorAll(".theme-card").forEach(card => {
    card.addEventListener("click", () => {
      if (card.classList.contains("locked")) return; 

      document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");

      const newTheme = card.getAttribute("data-theme");
      document.body.setAttribute("data-theme", newTheme);
      localStorage.setItem("user-theme", newTheme);
    });
  });

  document.querySelector(".save-btn").addEventListener("click", async () => {
    const selectedCard = document.querySelector(".theme-card.selected");
    if (!selectedCard) {
      alert("Please select a theme!");
      return;
    }

    if (selectedCard.classList.contains("locked")) {
      alert("You need to upgrade to premium to select this theme!");
      return;
    }

    const themes = selectedCard.getAttribute("data-theme");

    const { error } = await supabaseClient
      .from("profiles")
      .update({ themes })
      .eq("id", user.id);

    if (error) {
      console.error("Error saving theme:", error.message);
      alert("Failed to save theme.");
    } else {
      localStorage.setItem("user-theme", themes);
      alert("Theme saved!");
    }
  });
});