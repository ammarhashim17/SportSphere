import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

async function encrypt(key: string, value: string): Promise<string> {
  const k = Crypto.getRandomBytes(32);
  const cipher = new aesjs.ModeOfOperation.ctr(k, new aesjs.Counter(1));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(k));
  return aesjs.utils.hex.fromBytes(encrypted);
}

async function decrypt(key: string, value: string): Promise<string | null> {
  const keyHex = await SecureStore.getItemAsync(key);
  if (!keyHex) return null;
  const cipher = new aesjs.ModeOfOperation.ctr(
    aesjs.utils.hex.toBytes(keyHex),
    new aesjs.Counter(1),
  );
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
}

/** Supabase auth storage adapter. Session JSON is larger than SecureStore's limit, so only the key lives in SecureStore. */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const v = await AsyncStorage.getItem(key);
    return v ? decrypt(key, v) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, await encrypt(key, value));
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};
