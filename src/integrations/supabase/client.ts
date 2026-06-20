// This file has been updated with your exact matching API URL path suffix to resolve the Invalid API Key error.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const LOCAL_AUTH_STORAGE_KEY = 'realg-local-auth-session';
const LOCAL_COMMUNITIES_STORAGE_KEY = 'realg-local-communities';
const LOCAL_MEMBERSHIP_STORAGE_KEY = 'realg-local-memberships';
const LOCAL_MESSAGES_STORAGE_KEY = 'realg-local-community-messages';
const GOOGLE_NONCE_STORAGE_KEY = 'realg-google-nonce';

// FIXED: Using your exact working live project API URL endpoint path
// Change this line to have NO trailing slashes or subpaths:
const SUPABASE_URL = "https://engcuqirutnhirgslbcu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZ2N1cWlydXRuaGlyZ3NsYmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjAzMTksImV4cCI6MjA5NjYzNjMxOX0.njO1robijrcy5Wj9d0pbwQBO1AYVejDa9UL5TUoE5l8";

// FORCE GLOBAL BINDING: This guarantees the background Nitro/SSR worker can see the keys even if its 'env' object is empty.
if (typeof globalThis !== 'undefined') {
  (globalThis as any).process = (globalThis as any).process || {};
  (globalThis as any).process.env = (globalThis as any).process.env || {};
  (globalThis as any).process.env.SUPABASE_URL = SUPABASE_URL;
  (globalThis as any).process.env.SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;
  (globalThis as any).process.env.VITE_SUPABASE_URL = SUPABASE_URL;
  (globalThis as any).process.env.VITE_SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;
}

type LocalCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  is_default: boolean;
  created_at: string;
};

type LocalMembership = {
  community_id: string;
  user_id: string;
};

type LocalMessage = {
  id: string;
  community_id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
};

const defaultCommunities: LocalCommunity[] = [
  {
    id: 'health-circle',
    slug: 'health',
    name: 'Health',
    description: 'Daily habits, recovery, and wellbeing routines.',
    category: 'wellness',
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'wealth-circle',
    slug: 'wealth',
    name: 'Wealth',
    description: 'Budgeting, growth, and long-term money conversations.',
    category: 'finance',
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'relationships-circle',
    slug: 'relationships',
    name: 'Relationships',
    description: 'Support, communication, and connection with your people.',
    category: 'social',
    is_default: true,
    created_at: new Date().toISOString(),
  },
];

function createSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}

function getStoredLocalSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStoredLocalSession(session: any) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredLocalSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
}

function readLocalStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalStorageJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// Fallback user id if no active auth session
function getDemoUserId() {
  return getStoredLocalSession()?.user?.id ?? 'local-demo-user';
}

function ensureDemoCommunities() {
  const stored = readLocalStorageJson<LocalCommunity[]>(LOCAL_COMMUNITIES_STORAGE_KEY, []);
  if (stored.length > 0) return stored;
  writeLocalStorageJson(LOCAL_COMMUNITIES_STORAGE_KEY, defaultCommunities);
  return defaultCommunities;
}

export function isLocalDemoSession() {
  const session = getStoredLocalSession();
  return Boolean(session?.user?.app_metadata?.provider === 'local' || session?.user?.app_metadata?.provider === 'google');
}

export function getLocalCommunities(userId?: string | null) {
  const communities = ensureDemoCommunities();
  const memberships = readLocalStorageJson<LocalMembership[]>(LOCAL_MEMBERSHIP_STORAGE_KEY, []);
  const activeUserId = userId ?? getDemoUserId();
  const mine = new Set(memberships.filter((m) => m.user_id === activeUserId).map((m) => m.community_id));

  return communities.map((community) => ({
    ...community,
    members: memberships.filter((member) => member.community_id === community.id).length,
    joined: mine.has(community.id),
  }));
}

export function joinLocalCommunity(communityId: string, userId?: string | null) {
  const memberships = readLocalStorageJson<LocalMembership[]>(LOCAL_MEMBERSHIP_STORAGE_KEY, []);
  const activeUserId = userId ?? getDemoUserId();
  const alreadyJoined = memberships.some((membership) => membership.community_id === communityId && membership.user_id === activeUserId);
  if (alreadyJoined) return;

  memberships.push({ community_id: communityId, user_id: activeUserId });
  writeLocalStorageJson(LOCAL_MEMBERSHIP_STORAGE_KEY, memberships);
}

export function createLocalCommunity(input: { name: string; description?: string; category?: string; slug: string; createdBy?: string | null }) {
  const communities = ensureDemoCommunities();
  const created: LocalCommunity = {
    id: `${input.slug}-${Date.now()}`,
    slug: input.slug,
    name: input.name,
    description: input.description ?? null,
    category: input.category ?? 'other',
    is_default: false,
    created_at: new Date().toISOString(),
  };
  communities.unshift(created);
  writeLocalStorageJson(LOCAL_COMMUNITIES_STORAGE_KEY, communities);
  joinLocalCommunity(created.id, input.createdBy ?? getDemoUserId());
  return created;
}

export function getLocalCommunityBySlug(slug: string, userId?: string | null) {
  const communities = getLocalCommunities(userId);
  const community = communities.find((item) => item.slug === slug);
  return community ?? null;
}

export function getLocalMessages(communityId: string) {
  const messages = readLocalStorageJson<LocalMessage[]>(LOCAL_MESSAGES_STORAGE_KEY, []);
  return messages.filter((message) => message.community_id === communityId).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function addLocalMessage(communityId: string, message: Omit<LocalMessage, 'id' | 'created_at' | 'community_id'> & { id?: string; created_at?: string }) {
  const messages = readLocalStorageJson<LocalMessage[]>(LOCAL_MESSAGES_STORAGE_KEY, []);
  const nextMessage: LocalMessage = {
    id: message.id ?? `${communityId}-${Date.now()}`,
    community_id: communityId,
    user_id: message.user_id,
    content: message.content ?? null,
    media_url: message.media_url ?? null,
    created_at: message.created_at ?? new Date().toISOString(),
  };
  messages.push(nextMessage);
  writeLocalStorageJson(LOCAL_MESSAGES_STORAGE_KEY, messages);
  return nextMessage;
}

function decodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return {};
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof window !== 'undefined' ? window.atob(normalized) : Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function persistLocalAuthSession(email: string, name?: string) {
  const session = {
    access_token: `local-${Date.now()}`,
    refresh_token: `local-${Math.random().toString(36).slice(2)}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    token_type: 'bearer',
    user: {
      id: `local-${Date.now()}`,
      email,
      app_metadata: { provider: 'local' },
      user_metadata: { full_name: name ?? email },
    },
  };

  writeStoredLocalSession(session);
  return session;
}

export function persistGoogleAuthSession(idToken: string) {
  const payload = decodeJwtPayload(idToken) as Record<string, unknown>;
  const email = typeof payload.email === 'string' ? payload.email : `${payload.sub ?? 'google'}@google.local`;
  const name = typeof payload.name === 'string' ? payload.name : typeof payload.given_name === 'string' ? payload.given_name : 'Google user';

  const session = {
    access_token: idToken,
    refresh_token: `google-${Date.now()}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    token_type: 'bearer',
    user: {
      id: typeof payload.sub === 'string' ? payload.sub : `google-${Date.now()}`,
      email,
      app_metadata: { provider: 'google' },
      user_metadata: { full_name: name, picture: payload.picture },
    },
  };

  writeStoredLocalSession(session);
  return session;
}

export function storeGoogleNonce(nonce: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(GOOGLE_NONCE_STORAGE_KEY, nonce);
}

export function consumeGoogleNonce() {
  if (typeof window === 'undefined') return null;
  const nonce = window.sessionStorage.getItem(GOOGLE_NONCE_STORAGE_KEY);
  window.sessionStorage.removeItem(GOOGLE_NONCE_STORAGE_KEY);
  return nonce;
}

function createFallbackAuth() {
  return {
    getSession: async () => {
      const session = getStoredLocalSession();
      return { data: { session }, error: null };
    },
    getUser: async () => {
      const session = getStoredLocalSession();
      return { data: { user: session?.user ?? null }, error: null };
    },
    signOut: async () => {
      clearStoredLocalSession();
      return { error: null };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      const session = getStoredLocalSession();
      if (session) callback('SIGNED_IN', session);
      return { data: { subscription: { unsubscribe: () => undefined } } };
    },
  };
}

function createAuthWrapper(baseAuth: any) {
  return new Proxy(baseAuth, {
    get(target, prop, receiver) {
      if (prop === 'getSession') {
        return async () => {
          const localSession = getStoredLocalSession();
          if (localSession) return { data: { session: localSession }, error: null };
          return Reflect.get(target, prop, receiver).call(target);
        };
      }

      if (prop === 'getUser') {
        return async () => {
          const localSession = getStoredLocalSession();
          if (localSession) return { data: { user: localSession.user }, error: null };
          return Reflect.get(target, prop, receiver).call(target);
        };
      }

      if (prop === 'signOut') {
        return async () => {
          clearStoredLocalSession();
          return Reflect.get(target, prop, receiver).call(target);
        };
      }

      if (prop === 'onAuthStateChange') {
        return (callback: (event: string, session: any) => void) => {
          const stored = getStoredLocalSession();
          if (stored) callback('SIGNED_IN', stored);
          return Reflect.get(target, prop, receiver).call(target, callback);
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}

const baseClient = createSupabaseClient();

export const supabase = new Proxy(baseClient ? baseClient : { auth: createFallbackAuth() }, {
  get(target, prop, receiver) {
    if (prop === 'auth') {
      return createAuthWrapper(target.auth);
    }
    
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  }
});