import { getSupabase } from '../supabaseClient';

const DB_NAME = 'filmgraph-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'pendingMovieLogs';

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
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

export const flushQueuedMovieLogs = async () => {
  if (!navigator.onLine) return { flushed: 0, skipped: 0 };

  const supabase = getSupabase();
  const queued = await getQueuedMovieLogs();
  let flushed = 0;
  let skipped = 0;

  for (const item of queued) {
    try {
      const { error } = await supabase.from('movie_logs').insert(item.payload).select().single();
      if (error) {
        skipped += 1;
        continue;
      }
      await removeQueuedMovieLog(item.id);
      flushed += 1;
    } catch (_error) {
      skipped += 1;
    }
  }

  return { flushed, skipped };
};
