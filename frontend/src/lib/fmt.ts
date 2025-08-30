// Utilitaires de formatage français et calculs

/**
 * Formate un nombre en devise française (€)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formate un nombre en format français avec suffixe $
 */
export function formatCurrencyDollar(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' $';
}

/**
 * Formate un nombre avec les séparateurs français
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(num: number, decimals: number = 1): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100);
}

/**
 * Parse un nombre depuis une chaîne formatée française
 */
export function parseNumber(str: string): number {
  if (!str) return 0;
  // Remplace les espaces insécables et virgules par des points
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Calcule le numéro de semaine ISO 8601
 */
export function getISOWeek(date: Date = new Date()): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Formate une date en français
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Formate une date et heure en français
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Calcule les valeurs depuis les paliers (interpolation linéaire)
 */
export function calculateFromPaliers(
  caTotal: number,
  paliers: Array<{
    min: number;
    max: number;
    sal_min_emp: number;
    sal_max_emp: number;
    sal_min_pat: number;
    sal_max_pat: number;
    pr_min_emp: number;
    pr_max_emp: number;
    pr_min_pat: number;
    pr_max_pat: number;
  }>,
  isPatron: boolean = false
): { salaire: number; prime: number } {
  if (!paliers.length) return { salaire: 0, prime: 0 };

  // Trouve le palier approprié
  const palier = paliers.find(p => caTotal >= p.min && caTotal <= p.max);
  
  if (!palier) {
    // Si pas de palier trouvé, utilise le dernier
    const lastPalier = paliers[paliers.length - 1];
    if (caTotal > lastPalier.max) {
      return {
        salaire: isPatron ? lastPalier.sal_max_pat : lastPalier.sal_max_emp,
        prime: isPatron ? lastPalier.pr_max_pat : lastPalier.pr_max_emp,
      };
    }
    // Si en dessous du premier palier
    const firstPalier = paliers[0];
    return {
      salaire: isPatron ? firstPalier.sal_min_pat : firstPalier.sal_min_emp,
      prime: isPatron ? firstPalier.pr_min_pat : firstPalier.pr_min_emp,
    };
  }

  // Interpolation linéaire
  const ratio = (caTotal - palier.min) / (palier.max - palier.min);
  
  const salaireMin = isPatron ? palier.sal_min_pat : palier.sal_min_emp;
  const salaireMax = isPatron ? palier.sal_max_pat : palier.sal_max_emp;
  const primeMin = isPatron ? palier.pr_min_pat : palier.pr_min_emp;
  const primeMax = isPatron ? palier.pr_max_pat : palier.pr_max_emp;

  return {
    salaire: Math.round(salaireMin + ratio * (salaireMax - salaireMin)),
    prime: Math.round(primeMin + ratio * (primeMax - primeMin)),
  };
}

/**
 * Debounce pour les recherches
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Génère un ID unique simple
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Clamp une valeur entre min et max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Valide si une chaîne est un nombre valide
 */
export function isValidNumber(str: string): boolean {
  const num = parseNumber(str);
  return !isNaN(num) && isFinite(num);
}