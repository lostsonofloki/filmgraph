import { getSupabase } from '../supabaseClient';

const DAILY_LOCAL_LIMIT = 25;
const LOCAL_PREFIX = 'filmgraph.oracle.usage';

const todayKey = () => new Date().toISOString().slice(0, 10);

const localStorageKey = (userId) => `${LOCAL_PREFIX}.${userId}.${todayKey()}`;

const readLocalCount = (userId) => {
  try {
    const raw = window.localStorage.getItem(localStorageKey(userId));
    const parsed = Number.parseInt(raw || '0', 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch (_error) {
    return 0;
  }
};

const writeLocalCount = (userId, count) => {
  try {
    window.localStorage.setItem(localStorageKey(userId), String(Math.max(0, count)));
  } catch (_error) {
    // Ignore storage failures; request should still continue.
  }
};

const callBudgetRpc = async (rpcName, userId) => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(rpcName, { p_user_id: userId });
  if (error) throw error;
  return data;
};

export const canUseOracle = async (userId) => {
  if (!userId) {
    return {
      allowed: true,
      source: 'guest',
      remaining: DAILY_LOCAL_LIMIT,
      limit: DAILY_LOCAL_LIMIT,
      used: 0,
    };
  }

  try {
    const data = await callBudgetRpc('oracle_can_consume', userId);
    return {
      allowed: Boolean(data?.allowed),
      source: 'supabase',
      remaining: Number(data?.remaining ?? 0),
      limit: Number(data?.daily_limit ?? 0),
      used: Number(data?.used_count ?? 0),
    };
  } catch (_rpcError) {
    const used = readLocalCount(userId);
    return {
      allowed: used < DAILY_LOCAL_LIMIT,
      source: 'local',
      remaining: Math.max(DAILY_LOCAL_LIMIT - used, 0),
      limit: DAILY_LOCAL_LIMIT,
      used,
    };
  }
};

export const recordOracleUse = async (userId) => {
  if (!userId) return { source: 'guest', used: 1 };

  try {
    const data = await callBudgetRpc('oracle_consume', userId);
    return {
      source: 'supabase',
      used: Number(data?.used_count ?? 0),
      remaining: Number(data?.remaining ?? 0),
      limit: Number(data?.daily_limit ?? 0),
    };
  } catch (_rpcError) {
    const current = readLocalCount(userId);
    const next = current + 1;
    writeLocalCount(userId, next);
    return {
      source: 'local',
      used: next,
      remaining: Math.max(DAILY_LOCAL_LIMIT - next, 0),
      limit: DAILY_LOCAL_LIMIT,
    };
  }
};
