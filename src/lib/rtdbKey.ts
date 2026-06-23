/**
 * Realtime Database path keys can't contain `. # $ [ ]`. Our player uid is the
 * user's email, so a raw email blows up RTDB paths. We base64url-encode it to a
 * safe, reversible key.
 */
export function rtdbKey(uid: string): string {
  // base64url is URL/path-safe (no +, /, =) and never contains the banned chars.
  if (typeof btoa === "undefined") {
    // Node/SSR fallback.
    return Buffer.from(uid, "utf-8").toString("base64url");
  }
  // btoa needs a binary string; handle unicode via encodeURIComponent dance.
  const b64 = btoa(unescape(encodeURIComponent(uid)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Reverse of rtdbKey (for any client that needs the original email back). */
export function fromRtdbKey(key: string): string {
  const b64 = key.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }
  return decodeURIComponent(escape(atob(b64)));
}
