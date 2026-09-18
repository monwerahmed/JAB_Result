export const getErrMsg = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong.';

export const fmt2 = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return Math.round(n).toString();
};

export const pct = (obtained, total) =>
  total > 0 ? ((obtained / total) * 100).toFixed(1) : '0.0';

export const statusBadgeClass = (status) => {
  switch (status) {
    case 'PASS': return 'badge badge-pass';
    case 'FAIL': return 'badge badge-fail';
    case 'PASS_WITH_COMPENSATION': return 'badge badge-compensation';
    default: return 'badge badge-neutral';
  }
};

export const statusLabel = (status) => {
  switch (status) {
    case 'PASS': return 'Pass';
    case 'FAIL': return 'Fail';
    case 'PASS_WITH_COMPENSATION': return 'Compensation';
    case 'GK_SEPARATE': return 'GK (Separate)';
    default: return status || '—';
  }
};

export const scoreBarColor = (score) => {
  if (score >= 70) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
};

export const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
