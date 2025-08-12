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

// Tax brackets / salary
export interface Bracket {
  min: number;
  max: number;
  taux: number; // % of tax or rate
  sal_min_emp: number;
  sal_max_emp: number;
  sal_min_pat: number;
  sal_max_pat: number;
  pr_min_emp: number;
  pr_max_emp: number;
  pr_min_pat: number;
  pr_max_pat: number;
}

export interface Wealth { min: number; max: number; taux: number }
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
export interface Entreprise { id: string; name: string; roleId?: string; members?: string[] }

// Blanchiment
export interface BlanchimentState { enabled: boolean; useGlobal?: boolean; percEntreprise?: number }

// Company configuration
export interface PrimeTier { threshold: number; amount: number }

export interface SalaryConfig {
  pourcentageCA: number; // % of CA to salary pool
  modes: { caEmploye: boolean; heuresService: boolean; additionner: boolean };
  primeBase: { active: boolean; montant: number };
  paliersPrimes: PrimeTier[];
}

export interface CalculParam {
  label: string;
  actif: boolean;
  poids: number; // weight
  cumulatif: boolean;
  paliers: PalierConfig[];
}

export interface TierConfig {
  label: string;
  paliers: PalierConfig[];
}

export interface Employee { id: string; name: string; grade?: string }

export interface GradeRule { grade: string; coef: number }

export interface CompanyConfigData {
  employees: Employee[];
  grades?: GradeRule[];
}

export interface CompanyIdentification { label: string; type: string; description?: string }

export interface CompanyConfig {
  identification: CompanyIdentification;
  salaire: SalaryConfig;
  parametres: Record<string, CalculParam>;
  data?: CompanyConfigData;
}
