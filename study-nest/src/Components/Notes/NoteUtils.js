
export function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

export function parseTags(s) {
  return s.split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}
