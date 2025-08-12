// French formatting utilities and helpers used across the portal

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function formatCurrencyDollar(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' $';
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

export function formatPercentage(num: number, decimals: number = 1): string {
  return new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num / 100);
}

export function parseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function getISOWeek(date: Date = new Date()): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  const jan4 = new Date(target.getFullYear(), 0, 4);
  const diff = firstThursday - jan4.valueOf();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

// Simple CA -> salary calculation using brackets
export function calculateFromPaliers(value: number, paliers: { min: number; max: number; taux: number }[]): number {
  let total = 0;
  for (const p of paliers) {
    const spanStart = Math.max(p.min, 0);
    const spanEnd = Math.min(p.max, value);
    if (spanEnd > spanStart) {
      const taxable = spanEnd - spanStart;
      total += (taxable * p.taux) / 100;
    }
  }
  return Math.round(total);
}
