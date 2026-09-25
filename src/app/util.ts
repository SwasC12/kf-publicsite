export function formatPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  return 'R' + Number(v).toFixed(2).replace(/\.00$/, '');
}

// Optional custom placeholders (data URLs) configured in the admin Image Manager.
// When set they override the bundled default bottles. Updated by SettingsService.
let customMen = '';
let customWomen = '';
export function setPlaceholderOverrides(men?: string, women?: string): void {
  customMen = men || '';
  customWomen = women || '';
}

/** Branded placeholder bottle by gender when a product has no image of its own. */
export function placeholderFor(gender?: string): string {
  const g = (gender || '').toLowerCase();
  const isWomen = g.startsWith('w') || g.includes('lad') || g.includes('her');
  if (isWomen) return customWomen || 'placeholder-women.jpg';
  return customMen || 'placeholder-men.jpg';
}

/** True for a usable custom image (not blank, not Rumi's generic cover). */
export function isCustomImage(url?: string): boolean {
  return !!url && !url.includes('rumifragrances.co.za');
}

/** The image to show for a product: its own, else the branded gender placeholder. */
export function productImage(p: { imageUrl?: string; gender?: string }): string {
  return isCustomImage(p.imageUrl) ? p.imageUrl! : placeholderFor(p.gender);
}
