
export function isPdfLike(url = "", mime = "") {
  if (!url && !mime) return false;
  if (mime?.toLowerCase().includes("pdf")) return true;
  return /\.pdf($|[?#])/i.test(url);
}

export function isImageUrl(url = "", mime = "") {
  if (mime?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp)(?:$|[?#])/i.test(url || "");
}

export function isCloudinary(url = "") {
  return /(^https?:)?\/\/res\.cloudinary\.com\//i.test(url || "");
}

/** Force “download” (content-disposition attachment) and keep filename if present */
export function cloudinaryDownload(url = "") {
  if (!isCloudinary(url)) return url;
  return url.replace(/\/upload\/(?!fl_)/, "/upload/fl_attachment/");
}

export function safeDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "—";
  }
}

export function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}
