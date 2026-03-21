export function fmtDim(mm, unit = 'mm') {
  if (unit === 'in') return (mm / 25.4).toFixed(3) + '"';
  return mm.toFixed(1) + ' mm';
}

export function fmtVolume(mm3) {
  const cm3 = mm3 / 1000;
  return cm3.toFixed(2) + ' cm³';
}

export function fmtMass(grams) {
  if (grams >= 1000) return (grams / 1000).toFixed(2) + ' kg';
  return grams.toFixed(1) + ' g';
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtRelative(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(ts);
}

export function fmtConfidence(n) {
  if (n >= 90) return 'High';
  if (n >= 70) return 'Medium';
  if (n >= 50) return 'Low';
  return 'Very Low';
}

export function confidenceColor(n) {
  if (n >= 80) return 'var(--color-success)';
  if (n >= 60) return 'var(--color-warning)';
  return 'var(--color-error)';
}

export function slug(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').slice(0, 48);
}

export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

export function truncate(str, n = 60) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}
