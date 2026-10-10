import { gcm } from "@noble/ciphers/aes.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

/**
 * Pure-JS crypto shared by the server (verification) and the mobile app (Hermes has
 * no node:crypto). Note: the key travels with the paper, so this protects the paper
 * and saved answers at rest on the device. It is not a defence against a determined
 * candidate who controls the device.
 */

const b64 = {
  decode: (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
  encode: (b: Uint8Array): string => {
    // chunked: spreading a large array into fromCharCode can overflow the call stack
    let bin = "";
    for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return btoa(bin);
  },
};

/** UTF-8 decode without TextDecoder (not guaranteed on every Hermes build). */
function utf8Decode(b: Uint8Array): string {
  let out = "";
  for (let i = 0; i < b.length; ) {
    const c = b[i++];
    let cp: number;
    if (c < 0x80) cp = c;
    else if (c < 0xe0) cp = ((c & 0x1f) << 6) | (b[i++] & 0x3f);
    else if (c < 0xf0) cp = ((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
    else cp = ((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
    out += String.fromCodePoint(cp);
  }
  return out;
}

export interface EncryptedBlob {
  iv: string; // base64, 12 bytes
  data: string; // base64, ciphertext || 16-byte tag
}

export function decryptJson<T>(key: string, blob: EncryptedBlob): T {
  const plain = gcm(b64.decode(key), b64.decode(blob.iv)).decrypt(b64.decode(blob.data));
  return JSON.parse(utf8Decode(plain)) as T;
}

export function encryptJson(key: string, value: unknown, iv: Uint8Array): EncryptedBlob {
  const data = gcm(b64.decode(key), iv).encrypt(utf8ToBytes(JSON.stringify(value)));
  return { iv: b64.encode(iv), data: b64.encode(data) };
}

/** Canonical form so client and server sign the exact same bytes. */
export function signAnswers(secret: string, answers: Record<string, number>, elapsedMs: number): string {
  const canonical = JSON.stringify({
    answers: Object.keys(answers)
      .sort()
      .map((k) => [k, answers[k]]),
    elapsedMs,
  });
  return bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(canonical)));
}
