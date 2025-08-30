// Utilitaires pour les appels API

const API_BASE = import.meta.env.VITE_REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'https://repo-optimizer-3.preview.emergentagent.com';

interface FetchOptions extends RequestInit {
  guildId?: string;
  role?: string;
}

/**
 * Helper pour les appels GET
 */
export async function apiGet<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { guildId, role, ...fetchOptions } = options;
  
  const url = new URL(endpoint, API_BASE);
  if (guildId) url.searchParams.set('guild_id', guildId);
  if (role) url.searchParams.set('role', role);

  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (role) {
    headers['x-roles'] = role;
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers,
      ...fetchOptions,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API GET Error:', error);
    throw error;
  }
}

/**
 * Helper pour les appels POST
 */
export async function apiPost<T>(
  endpoint: string,
  data: any,
  options: FetchOptions = {}
): Promise<T> {
  const { guildId, role, ...fetchOptions } = options;
  
  const url = new URL(endpoint, API_BASE);
  if (guildId) url.searchParams.set('guild_id', guildId);

  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (role) {
    headers['x-roles'] = role;
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      cache: 'no-store',
      headers,
      body: JSON.stringify(data),
      ...fetchOptions,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Certains endpoints retournent juste 200 OK sans body
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return {} as T;
  } catch (error) {
    console.error('API POST Error:', error);
    throw error;
  }
}

/**
 * Mock des APIs - Simulation des données pour le développement
 */
export const mockApi = {
  // Dashboard
  async getDashboardSummary(guildId: string) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      ca_brut: 125000,
      depenses: 35000,
      depenses_deductibles: 28000,
      benefice: 90000,
      taux_imposition: 25,
      montant_impots: 22500,
      employee_count: 12,
    };
  },

  async getEmployeeCount(guildId: string, role: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { count: 15 };
  },

  // Dotation
  async getStaffConfig(guildId: string) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      paliers: [
        {
          min: 0,
          max: 50000,
          taux: 15,
          sal_min_emp: 2500,
          sal_max_emp: 3500,
          sal_min_pat: 4000,
          sal_max_pat: 5500,
          pr_min_emp: 500,
          pr_max_emp: 1000,
          pr_min_pat: 1000,
          pr_max_pat: 2000,
        },
        {
          min: 50001,
          max: 100000,
          taux: 25,
          sal_min_emp: 3500,
          sal_max_emp: 5000,
          sal_min_pat: 5500,
          sal_max_pat: 7500,
          pr_min_emp: 1000,
          pr_max_emp: 2000,
          pr_min_pat: 2000,
          pr_max_pat: 3500,
        },
      ],
    };
  },

  async getDotation(guildId: string, entreprise?: string) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      rows: [
        {
          id: '1',
          name: 'Jean Dupont',
          run: 15000,
          facture: 8000,
          vente: 12000,
          ca_total: 35000,
          salaire: 3200,
          prime: 750,
        },
        {
          id: '2',
          name: 'Marie Martin',
          run: 22000,
          facture: 15000,
          vente: 18000,
          ca_total: 55000,
          salaire: 4200,
          prime: 1500,
        },
      ],
      soldeActuel: 450000,
    };
  },

  // Archives
  async getArchive(guildId: string, role: string, entreprise?: string) {
    await new Promise(resolve => setTimeout(resolve, 700));
    const base = [
      {
        id: 1,
        date: '2024-01-15',
        type: 'Dotation',
        employé: 'Jean Dupont',
        montant: 3950,
        statut: 'Validé',
      },
      {
        id: 2,
        date: '2024-01-14',
        type: 'Impôt',
        entreprise: 'Bennys',
        montant: 22500,
        statut: 'Payé',
      },
    ];
    // Merge with locally saved archive entries (simulate DB)
    let extras: any[] = [];
    try {
      extras = JSON.parse(localStorage.getItem(`archives:${guildId}`) || '[]');
    } catch {}
    return [...extras, ...base];
  },

  // Configuration
  async getEntreprises(guildId: string) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const staticList = [
      { id: 'bennys', name: 'Bennys' },
      { id: 'unicorn', name: 'Unicorn Taxi' },
      { id: 'lsc', name: 'Los Santos Customs' },
    ];
    // Merge with locally saved enterprises (simulate DB)
    let extras: any[] = [];
    try {
      extras = JSON.parse(localStorage.getItem(`enterprises:${guildId}`) || '[]');
    } catch {}
    const map = new Map(staticList.map(e => [e.id, e]));
    for (const ex of extras) {
      map.set(ex.id, { ...map.get(ex.id), ...ex });
    }
    return Array.from(map.values());
  },

  async upsertEntreprise(guildId: string, entreprise: { id: string; name: string; roleId?: string; members?: string[] }) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const key = `enterprises:${guildId}`;
    let list: any[] = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    const idx = list.findIndex((e:any) => e.id === entreprise.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...entreprise };
    else list.push(entreprise);
    localStorage.setItem(key, JSON.stringify(list));
    return entreprise;
  },

  async saveDotation(data: any) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // simulate persist
    const key = `dotation:last`;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    return {};
  },

  async addArchiveEntry(guildId: string, entry: any) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const key = `archives:${guildId}`;
    let list: any[] = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    list.unshift(entry);
    localStorage.setItem(key, JSON.stringify(list));
    return entry;
  },

  async getTaxBrackets(guildId: string, entreprise: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        min: 0,
        max: 50000,
        taux: 15,
        sal_min_emp: 2500,
        sal_max_emp: 3500,
        sal_min_pat: 4000,
        sal_max_pat: 5500,
        pr_min_emp: 500,
        pr_max_emp: 1000,
        pr_min_pat: 1000,
        pr_max_pat: 2000,
      },
    ];
  },

  async getWealth(guildId: string, entreprise: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      { min: 0, max: 1000000, taux: 1 },
      { min: 1000001, max: 5000000, taux: 2.5 },
    ];
  },

  // Blanchiment (persisté localStorage)
  async getBlanchimentState(scope: string) {
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      const raw = localStorage.getItem(`blanchiment:scope:${scope}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { enabled: false, useGlobal: true };
  },

  async saveBlanchimentState(scope: string, enabled: boolean) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const key = `blanchiment:scope:${scope}`;
    try {
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      const next = { ...prev, enabled };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    } catch {
      const next = { enabled } as any;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    }
  },

  async saveBlanchimentConfig(scope: string, cfg: any) {
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.setItem(`blanchiment:scope:${scope}`, JSON.stringify(cfg));
    return cfg;
  },

  async getBlanchimentGlobal(guildId: string) {
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      const raw = localStorage.getItem(`blanchiment:global:${guildId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { percEntreprise: 15, percGroupe: 80 };
  },

  async saveBlanchimentGlobal(guildId: string, data: any) {
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.setItem(`blanchiment:global:${guildId}`, JSON.stringify(data));
    return data;
  },
};

/**
 * Gestion centralisée des erreurs API
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('HTTP 403')) {
      return "Accès refusé. Vous n'avez pas les permissions nécessaires.";
    }
    if (error.message.includes('HTTP 404')) {
      return 'Ressource non trouvée.';
    }
    if (error.message.includes('HTTP 500')) {
      return 'Erreur serveur. Veuillez réessayer plus tard.';
    }
    return error.message;
  }
  return 'Une erreur inattendue est survenue.';
}