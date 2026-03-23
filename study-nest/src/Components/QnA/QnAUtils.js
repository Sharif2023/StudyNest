
export function parseTags(s) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function timeAgo(ts) {
  if (!ts) return "some time ago";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  const units = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [100, "y"],
  ];
  let n = diff;
  let u = "s";
  for (let i = 0; i < units.length; i++) {
    const [step, label] = units[i];
    if (n < step) { u = label; break; }
    n /= step;
    u = label;
  }
  return `${Math.floor(n)}${u} ago`;
}

export function freshnessBoost(ts) {
  if (!ts) return 0;
  const hours = (Date.now() - new Date(ts).getTime()) / 36e5;
  return Math.max(0, Math.floor(24 - Math.min(24, hours))); // boost if <24h old
}

export function formatVotes(votes) {
  if (votes > 0) {
    return `+${votes}`;
  }
  return votes; // Automatically handles 0 and negative numbers
}
