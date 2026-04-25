export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";
export const MINIMIZE_KEY = "studynest.minimizeRoom";
export const HOST_ROOMS_KEY = "studynest.hostRooms";

export function readHostRooms() {
  try {
    const arr = JSON.parse(localStorage.getItem(HOST_ROOMS_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function rememberHostRoom(roomId) {
  if (!roomId) return;
  try {
    const arr = readHostRooms();
    if (!arr.includes(roomId)) {
      arr.push(roomId);
      localStorage.setItem(HOST_ROOMS_KEY, JSON.stringify(arr.slice(-80)));
    }
  } catch {
    // Ignore storage failures in private browsing or locked-down environments.
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  const u = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
  ];
  let n = d,
    l = "s";
  for (const [k, t] of u) {
    if (n < k) {
      l = t;
      break;
    }
    n = Math.floor(n / k);
    l = t;
  }
  return `${Math.max(1, Math.floor(n))}${l} ago`;
}
