import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { getRandomBytes } from "expo-crypto";
import { decryptJson, encryptJson, type EncryptedBlob } from "@app/shared";
import type { FlagEvent, Paper } from "./types";

/**
 * What survives an app restart. The paper and the answers are encrypted at rest; the key lives
 * in the platform secure store. This protects data on the device, not against a determined
 * candidate who controls it (the key ships with the paper).
 */
export interface Session {
  code: string;
  rulesVersion: string;
  paper: EncryptedBlob;
  answers?: EncryptedBlob;
  flagged: string[];
  index: number;
  /** Time used when this was saved. Restored so a restart cannot reset the clock. */
  elapsedMs: number;
  /** Wall clock (epoch ms) at save time: lets a restart count the time the app was closed. */
  savedAtWall: number;
  started: boolean;
  /** Submitted or timed out: only the upload is left. */
  finished: boolean;
  events: FlagEvent[];
}

const SESSION = "round1.session.v2";
const KEY = "round1.paperKey.v2";

export const storage = {
  async save(s: Session, key?: string) {
    await AsyncStorage.setItem(SESSION, JSON.stringify(s));
    if (key) await SecureStore.setItemAsync(KEY, key);
  },
  async load(): Promise<{ session: Session; key: string } | null> {
    try {
      const [raw, key] = await Promise.all([AsyncStorage.getItem(SESSION), SecureStore.getItemAsync(KEY)]);
      if (!raw || !key) return null;
      return { session: JSON.parse(raw) as Session, key };
    } catch {
      return null; // a corrupt session is treated as none: the candidate starts over online
    }
  },
  async clear() {
    await AsyncStorage.removeItem(SESSION);
    await SecureStore.deleteItemAsync(KEY);
  },
  openPaper: (key: string, blob: EncryptedBlob) => decryptJson<Paper>(key, blob),
  sealAnswers: (key: string, answers: Record<string, number>) => encryptJson(key, answers, getRandomBytes(12)),
  openAnswers: (key: string, blob: EncryptedBlob) => decryptJson<Record<string, number>>(key, blob),
};
