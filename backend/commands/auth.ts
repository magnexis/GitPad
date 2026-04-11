import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AuthSession, UserProfile } from '../../src/shared/types.js';

interface StoredUser extends UserProfile {
  passwordHash: string;
  passwordSalt: string;
}

interface AuthStore {
  users: StoredUser[];
  sessionToken?: string;
  sessionUserId?: string;
  sessionLoginAt?: string;
}

export class AuthService {
  private readonly storePath: string;

  constructor(private readonly appDataPath: string) {
    this.storePath = path.join(appDataPath, 'auth-store.json');
  }

  async register(username: string, email: string, password: string): Promise<AuthSession> {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanUsername) throw new Error('Username is required.');
    if (!cleanEmail.includes('@')) throw new Error('Valid email is required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    const store = await this.loadStore();
    if (store.users.some((user) => user.username.toLowerCase() === cleanUsername.toLowerCase())) throw new Error('Username already exists.');
    if (store.users.some((user) => user.email.toLowerCase() === cleanEmail)) throw new Error('Email already exists.');
    const { salt, hash } = hashPassword(password);
    const user: StoredUser = {
      id: crypto.randomUUID(),
      username: cleanUsername,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
      avatar: '',
      passwordSalt: salt,
      passwordHash: hash
    };
    store.users.unshift(user);
    const session = createSessionForUser(user);
    store.sessionToken = session.token;
    store.sessionUserId = user.id;
    store.sessionLoginAt = session.loginAt;
    await this.saveStore(store);
    return session;
  }

  async login(identifier: string, password: string): Promise<AuthSession> {
    const needle = identifier.trim().toLowerCase();
    if (!needle || !password) throw new Error('Credentials are required.');
    const store = await this.loadStore();
    const user = store.users.find((item) => item.email.toLowerCase() === needle || item.username.toLowerCase() === needle);
    if (!user) throw new Error('Invalid credentials.');
    const incoming = deriveHash(password, user.passwordSalt);
    const valid = safeEqual(incoming, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials.');
    const session = createSessionForUser(user);
    store.sessionToken = session.token;
    store.sessionUserId = user.id;
    store.sessionLoginAt = session.loginAt;
    await this.saveStore(store);
    return session;
  }

  async logout() {
    const store = await this.loadStore();
    delete store.sessionToken;
    delete store.sessionUserId;
    delete store.sessionLoginAt;
    await this.saveStore(store);
  }

  async session(): Promise<AuthSession | null> {
    const store = await this.loadStore();
    if (!store.sessionToken || !store.sessionUserId || !store.sessionLoginAt) return null;
    const user = store.users.find((item) => item.id === store.sessionUserId);
    if (!user) return null;
    return {
      user: sanitizeUser(user),
      token: store.sessionToken,
      loginAt: store.sessionLoginAt
    };
  }

  async users(): Promise<UserProfile[]> {
    const store = await this.loadStore();
    return store.users.map(sanitizeUser);
  }

  private async loadStore(): Promise<AuthStore> {
    await fs.mkdir(this.appDataPath, { recursive: true });
    try {
      const raw = await fs.readFile(this.storePath, 'utf8');
      const parsed = JSON.parse(raw) as AuthStore;
      return {
        users: parsed.users ?? [],
        sessionToken: parsed.sessionToken,
        sessionUserId: parsed.sessionUserId,
        sessionLoginAt: parsed.sessionLoginAt
      };
    } catch {
      const store: AuthStore = { users: [] };
      await this.saveStore(store);
      return store;
    }
  }

  private async saveStore(store: AuthStore) {
    await fs.mkdir(this.appDataPath, { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(store, null, 2), 'utf8');
  }
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = deriveHash(password, salt);
  return { salt, hash };
}

function deriveHash(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sanitizeUser(user: StoredUser): UserProfile {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt
  };
}

function createSessionForUser(user: StoredUser): AuthSession {
  return {
    user: sanitizeUser(user),
    token: crypto.randomBytes(24).toString('hex'),
    loginAt: new Date().toISOString()
  };
}
