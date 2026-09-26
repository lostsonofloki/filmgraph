import { getSupabase } from '../supabaseClient';

const DB_NAME = 'filmgraph-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'pendingMovieLogs';

// An entry the server keeps rejecting (a duplicate UPC, or a payload whose user_id no longer
// passes RLS) can never succeed, so it is quarantined instead of retried on every flush forever.
const MAX_ATTEMPTS = 5;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// Private and storage-blocked contexts expose no usable indexedDB, and touching it can throw
// outright; the surrounding code expects a soft failure.
const getIndexedDb = () => {
  try {
    return typeof window !== 'undefined' ? window.indexedDB || null : null;
  } catch {
    return null;
  }
};

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const indexedDb = getIndexedDb();
    if (!indexedDb) {
      reject(new Error('Offline storage is unavailable in this browser.'));
      return;
    }

    let request;
    try {
      request = indexedDb.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async (mode, handler) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    handler(store, resolve, reject);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const enqueueMovieLog = async (payload) =>
  withStore('readwrite', (store, resolve, reject) => {
    const request = store.add({
      payload,
      userId: payload?.user_id || null,
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const getQueuedMovieLogs = async () =>
  withStore('readonly', (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

const removeQueuedMovieLog = async (id) =>
  withStore('readwrite', (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });

const saveQueuedMovieLog = async (record) =>
  withStore('readwrite', (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });

const isExpired = (createdAt) => {
  const createdMs = new Date(createdAt || 0).getTime();
  if (!Number.isFinite(createdMs) || createdMs === 0) return false;
  return Date.now() - createdMs > MAX_AGE_MS;
};

// Losing the connection again must not count against an entry that is otherwise fine.
const isTransportFailure = (message) => {
  const text = String(message || '').toLowerCase();
  return text.includes('failed to fetch') || text.includes('network') || text.includes('timeout');
};

export const flushQueuedMovieLogs = async () => {
  const summary = { flushed: 0, skipped: 0, dropped: 0, deferred: false };

  if (typeof navigator !== 'undefined' && !navigator.onLine) return summary;
  if (!getIndexedDb()) return summary;

  const supabase = getSupabase();

  // Without a restored session every insert is rejected by RLS, which would burn attempts on
  // perfectly good entries. Leave them queued for the next flush instead.
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id || null;
  if (!currentUserId) {
    summary.deferred = true;
    return summary;
  }

  const queued = await getQueuedMovieLogs();

  for (const item of queued) {
    const ownerId = item.userId || item.payload?.user_id || null;

    // Queued under a different account, so RLS will reject it for as long as it stays there.
    if (ownerId && ownerId !== currentUserId) {
      await removeQueuedMovieLog(item.id);
      summary.dropped += 1;
      continue;
    }

    if (isExpired(item.createdAt)) {
      console.warn(`Discarding a queued log older than ${MAX_AGE_MS / 86400000} days.`);
      await removeQueuedMovieLog(item.id);
      summary.dropped += 1;
      continue;
    }

    try {
      const { error } = await supabase.from('movie_logs').insert(item.payload).select().single();

      if (error) {
        if (isTransportFailure(error.message)) {
          summary.skipped += 1;
          continue;
        }

        const attempts = (item.attempts || 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
          console.warn(
            `Discarding a queued log after ${attempts} rejected attempts: ${error.message}`,
          );
          await removeQueuedMovieLog(item.id);
          summary.dropped += 1;
          continue;
        }

        await saveQueuedMovieLog({ ...item, attempts, lastError: error.message });
        summary.skipped += 1;
        continue;
      }

      await removeQueuedMovieLog(item.id);
      summary.flushed += 1;
    } catch (error) {
      // A thrown request never reached the server, so the entry keeps its attempt budget.
      console.warn('Offline queue flush failed:', error?.message);
      summary.skipped += 1;
    }
  }

  return summary;
};
