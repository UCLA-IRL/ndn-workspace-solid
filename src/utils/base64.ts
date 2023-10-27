/** Parses base64 string into Uint8Array. Throws if failed. */
export function base64ToBytes(base64: string) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0) || 0);
}

/** Encodes Uint8Array into base64 string. Throws if failed. */
export function bytesToBase64(bytes: Uint8Array) {
  const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("");
  return btoa(binString);
}
