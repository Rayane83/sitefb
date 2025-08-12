// Role helpers and access-control predicates for the portal
import type { Role } from './types';

export function getUserGuildRoles(guildId: string): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mock: Record<string, string[]> = {
        '123456789': ['Staff', 'Moderator'],
        '987654321': ['Patron', 'Employé Bennys'],
        '456789123': ['Co-Patron', 'Employé Bennys'],
        '789123456': ['DOT', 'Employé Bennys'],
        default: ['Employé Bennys'],
      };
      resolve(mock[guildId] || mock.default);
    }, 300);
  });
}

export function resolveRole(roles: string[]): Role {
  const lower = roles.map((r) => r.toLowerCase());
  if (lower.some((r) => r.includes('staff'))) return 'staff';
  if (lower.some((r) => r.includes('co-patron') || r.includes('copatron'))) return 'co-patron';
  if (lower.some((r) => r.includes('patron'))) return 'patron';
  if (lower.some((r) => r.includes('dot'))) return 'dot';
  return 'employe';
}

export function getEntrepriseFromRoles(roles: string[]): string {
  const found = roles.find((r) => r.toLowerCase().includes('employé'));
  if (!found) return 'Aucune Entreprise';
  const m = found.match(/employé\s+(.+)/i);
  return m ? m[1] : 'Entreprise Inconnue';
}

export function getRoleDisplayName(role: Role): string {
  return {
    staff: 'Staff',
    patron: 'Patron',
    'co-patron': 'Co-Patron',
    dot: 'DOT',
    employe: 'Employé',
  }[role];
}

export function getRoleColor(role: Role): string {
  switch (role) {
    case 'staff':
      return 'text-primary';
    case 'patron':
      return 'text-success';
    case 'co-patron':
      return 'text-warning';
    case 'dot':
      return 'text-accent-foreground';
    default:
      return 'text-muted-foreground';
  }
}

export const isStaff = (role: Role) => role === 'staff';

export const canAccessDotation = (role: Role) => role !== 'employe';
export const canAccessImpot = (role: Role) => role !== 'employe';
export const canAccessBlanchiment = (role: Role) => role === 'staff' || role === 'patron' || role === 'co-patron';
export const canAccessStaffConfig = (role: Role) => role === 'staff';
export const canAccessCompanyConfig = (role: Role) => role === 'staff' || role === 'patron' || role === 'co-patron';
