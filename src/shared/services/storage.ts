import { createMMKV, MMKV } from 'react-native-mmkv';

// Global memory map for dev/hot reload persistence
declare global {
  var __ENDHALLA_STORAGE__: Map<string, string> | undefined;
}

/**
 * Pure Synchronous Storage Engine.
 * Uses native C++ MMKV on compiled builds, and clean in-memory Map fallback in JS/dev.
 * Preserves data across Fast Refresh reloads via global store.
 */
let mmkvInstance: MMKV;

try {
  mmkvInstance = createMMKV();
} catch (e) {
  if (!globalThis.__ENDHALLA_STORAGE__) {
    globalThis.__ENDHALLA_STORAGE__ = new Map<string, string>();
  }
  const memoryStore = globalThis.__ENDHALLA_STORAGE__;

  mmkvInstance = {
    set: (key: string, value: any) => {
      memoryStore.set(key, String(value));
    },
    getString: (key: string) => memoryStore.get(key),
    remove: (key: string) => {
      memoryStore.delete(key);
    },
    contains: (key: string) => memoryStore.has(key),
    getAllKeys: () => Array.from(memoryStore.keys()),
    clearAll: () => {
      memoryStore.clear();
    },
  } as unknown as MMKV;
}

const KEYS = {
  AUTH_SESSION: '@endhalla_auth_session',
  REGISTERED_USERS: '@endhalla_registered_users',
  BOOKINGS: '@endhalla_booked_sessions',
  SETTINGS: '@endhalla_user_settings',
};

export interface UserSession {
  token: string;
  user: {
    id?: string;
    name?: string;
    phone?: string;
    gender?: string;
    userType?: 'client' | 'counsellor';
  };
}

export interface BookingRecord {
  id: string;
  counsellorName: string;
  sessionType: string;
  dateText: string;
  timeText: string;
  price: string;
  status?: string;
  createdAt: string;
}

export const StorageService = {
  /**
   * Synchronously get string value
   */
  getString(key: string): string | null {
    return mmkvInstance.getString(key) ?? null;
  },

  /**
   * Synchronously set string value
   */
  setString(key: string, value: string): void {
    mmkvInstance.set(key, value);
  },

  /**
   * Get parsed JSON object
   */
  getObject<T>(key: string): T | null {
    try {
      const raw = this.getString(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(`Failed to parse storage key: ${key}`, e);
    }
    return null;
  },

  /**
   * Set JSON object
   */
  setObject<T>(key: string, value: T): void {
    try {
      const json = JSON.stringify(value);
      this.setString(key, json);
    } catch (e) {
      console.error(`Failed to stringify storage key: ${key}`, e);
    }
  },

  /**
   * Delete item
   */
  remove(key: string): void {
    // react-native-mmkv v4 API is `remove`; older versions exposed `delete`.
    const store = mmkvInstance as any;
    if (typeof store.remove === 'function') store.remove(key);
    else if (typeof store.delete === 'function') store.delete(key);
  },

  // --- Registered Users Registry ---
  saveUserRecord(user: UserSession['user']): void {
    if (!user || !user.phone) return;
    const usersMap = this.getObject<Record<string, UserSession['user']>>(KEYS.REGISTERED_USERS) || {};
    usersMap[user.phone] = user;
    this.setObject(KEYS.REGISTERED_USERS, usersMap);
  },

  getUserByPhone(phone: string): UserSession['user'] | null {
    if (!phone) return null;
    const usersMap = this.getObject<Record<string, UserSession['user']>>(KEYS.REGISTERED_USERS) || {};
    return usersMap[phone] || null;
  },

  // --- Auth Session ---
  saveSession(session: UserSession): void {
    this.setObject(KEYS.AUTH_SESSION, session);
    if (session.user && session.user.phone) {
      this.saveUserRecord(session.user);
    }
  },

  getSession(): UserSession | null {
    return this.getObject<UserSession>(KEYS.AUTH_SESSION);
  },

  clearSession(): void {
    this.remove(KEYS.AUTH_SESSION);
  },

  // --- Bookings ---
  saveBookings(bookings: BookingRecord[]): void {
    this.setObject(KEYS.BOOKINGS, bookings);
  },

  getBookings(): BookingRecord[] {
    return this.getObject<BookingRecord[]>(KEYS.BOOKINGS) || [];
  },

  addBooking(booking: BookingRecord): BookingRecord[] {
    const existing = this.getBookings();
    const updated = [booking, ...existing];
    this.saveBookings(updated);
    return updated;
  },
};
