import apiClient, { toBackendUrl } from "../../apiConfig";

export function safeDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "fragment-error";
  }
}

export function loadLocal(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function loadUser() {
  try {
    const raw = JSON.parse(localStorage.getItem("studynest.user"));
    if (raw && typeof raw === "object" && raw.name) {
      // Migrate old profile_picture key if exists
      if (raw.profile_picture && !raw.profile_picture_url) {
        raw.profile_picture_url = raw.profile_picture;
      }
      return raw;
    }
  } catch { }

  try {
    const auth = JSON.parse(localStorage.getItem("studynest.auth"));
    const profile = JSON.parse(localStorage.getItem("studynest.profile"));

    if (profile || auth) {
      const p = profile || auth;
      const seed = {
        name: p.name || p.username || "Student",
        email: p.email || "",
        bio: p.bio || "",
        profile_picture_url: p.profile_picture_url || p.profile_picture || "",
        prefs: p.prefs || { defaultAnonymous: false, darkMode: false, courseFocus: "" },
      };
      localStorage.setItem("studynest.user", JSON.stringify(seed));
      return seed;
    }
  } catch (e) {
    console.error("Error loading user:", e);
  }
  return { name: "Guest", email: "", bio: "", profile_picture_url: "", prefs: {} };
}
