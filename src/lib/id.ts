const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz';

/** Kurze, gut teilbare Id. Kein Zufalls-Bias, keine verwechselbaren Zeichen. */
export function randomId(length = 12): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Id fuer einen geteilten Datenraum ("der Link"). */
export function newSpaceId(): string {
  return randomId(16);
}

const SPACE_RE = /^[a-z0-9-]{4,64}$/;

export function isValidSpaceId(value: string): boolean {
  return SPACE_RE.test(value);
}
