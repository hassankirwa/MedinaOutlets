import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_TOKEN_KEY = "kobo_expo_push_token";

export const pushTokenStorage = {
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(PUSH_TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  },
};
