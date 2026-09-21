export function formatPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  return 'R' + Number(v).toFixed(2).replace(/\.00$/, '');
}

/** Branded placeholder bottle by gender when a product has no image of its own. */
export function placeholderFor(gender?: string): string {
  const g = (gender || '').toLowerCase();
  return g.startsWith('w') || g.includes('lad') || g.includes('her') ? 'placeholder-women.jpg' : 'placeholder-men.jpg';
}

/** The image to show for a product: its own, else the branded gender placeholder. */
export function productImage(p: { imageUrl?: string; gender?: string }): string {
  return p.imageUrl || placeholderFor(p.gender);
}
