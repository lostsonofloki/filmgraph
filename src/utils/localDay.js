// Local calendar day, never UTC. Two films logged the same evening in
// America/New_York straddle midnight UTC, so Profile "Days logged" and the
// watch-history calendar share this key and both key off `created_at`.
export const toLocalDayKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
