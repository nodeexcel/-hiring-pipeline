import "server-only";
import { createCipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { signAnswers } from "@app/shared";

/** AES-256-GCM encrypt a JSON payload; returns base64 parts for the mobile app. */
export function encryptPaper(payload: unknown) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    key: key.toString("base64"),
    iv: iv.toString("base64"),
    data: Buffer.concat([data, tag]).toString("base64"), // ciphertext || 16-byte tag
  };
}

/** Uses the same signer as the mobile app (@app/shared) so both sides always agree. */
export function verifySignature(secret: string, answers: Record<string, number>, elapsedMs: number, sig: string) {
  const expected = Buffer.from(signAnswers(secret, answers, elapsedMs), "hex");
  const given = Buffer.from(String(sig), "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
