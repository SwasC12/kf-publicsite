export function formatPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  return 'R' + Number(v).toFixed(2).replace(/\.00$/, '');
}
