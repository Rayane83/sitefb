// Types pour le portail Discord Multi-Guilde

export type Role = 'staff' | 'patron' | 'co-patron' | 'dot' | 'employe';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  discriminator?: string;
}

export interface Guild {
  id: string;
  name: string;
  icon?: string;
}

export interface UserGuildRole {
  guildId: string;
  roles: string[];
  entreprise?: string;
}

// Configuration des paliers
export interface Bracket {
  min: number;
  max: number;
  taux: number;
  sal_min_emp: number;
  sal_max_emp: number;
  sal_min_pat: number;
  sal_max_pat: number;
  pr_min_emp: number;
  pr_max_emp: number;
  pr_min_pat: number;
  pr_max_pat: number;
}

export interface Wealth {
  min: number;
  max: number;
  taux: number;
}

export interface PalierConfig extends Bracket {}

// Dotation
export interface DotationRow {
  id: string;
  name: string;
  run: number;
  facture: number;
  vente: number;
  ca_total: number;
  salaire: number;
  prime: number;
}

export interface DotationData {
  rows: DotationRow[];
  soldeActuel: number;
  expenses?: number;
  withdrawals?: number;
  commissions?: number;
  interInvoices?: number;
}

// Dashboard
export interface DashboardSummary {
  ca_brut: number;
  depenses?: number;
  depenses_deductibles?: number;
  benefice: number;
  taux_imposition: number;
  montant_impots: number;
  employee_count?: number;
}

// Entreprises
export interface Entreprise {
  id: string;
  name: string;
}

// Blanchiment
export interface BlanchimentState {
  enabled: boolean;
  useGlobal?: boolean; // si vrai, utilise les % globaux
  percEntreprise?: number; // % pour l'entreprise (si non global)
  percGroupe?: number; // % pour le groupe (si non global)
}

// Configuration d'entreprise avancée
export interface Employee {
  id: string;
  name: string;
  discordRole: string;
  grade?: string;
}

export interface TierConfig {
  seuil: number;
  bonus: number; // peut être négatif (pénalité)
}

export interface CalculParam {
  label: string;
  actif: boolean;
  poids: number;
  cumulatif: boolean;
  paliers: TierConfig[]; // max 10
}

export interface GradeRule {
  grade: string;
  roleDiscordId?: string; // ID du rôle Discord associé à ce grade
  pourcentageCA: number;
  tauxHoraire: number; // salaire par heure pour ce grade
}

export interface SalaryConfig {
  pourcentageCA: number; // % du CA total (de l'employé) que l'employé reçoit en salaire
  modes?: {
    caEmploye: boolean; // calculer avec le CA total de l'employé
    heuresService: boolean; // calculer avec les heures de service
    additionner: boolean; // additionner les options sélectionnées
  };
  primeBase: {
    active: boolean;
    montant: number;
  };
  paliersPrimes: PrimeTier[]; // paliers en dollars avec primes
}

export interface PrimeTier {
  seuil: number; // seuil en dollars du CA
  prime: number; // montant de la prime en dollars
}

export interface CompanyConfig {
  identification: {
    label: string;
    type: string;
    description: string;
  };
  salaire: SalaryConfig;
  parametres: {
    RUN: CalculParam;
    FACTURE: CalculParam;
    VENTE: CalculParam;
    CA_TOTAL: CalculParam;
    GRADE: CalculParam;
    HEURE_SERVICE: CalculParam;
  };
  gradeRules: GradeRule[];
  errorTiers: TierConfig[];
  roleDiscord: string; // ID du rôle Discord pour la gestion d'entreprise
}

export interface CompanyConfigData {
  cfg: CompanyConfig;
  employees: Employee[];
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface EmployeeCountResponse {
  count: number;
}
