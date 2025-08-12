import type { Role, UserGuildRole } from './types';

// Récupération des rôles d'un utilisateur pour une guilde
// En production, ceci doit venir de Discord via un backend sécurisé.
// Pour l’instant, on ne simule plus de rôles côté frontend.
export function getUserGuildRoles(guildId: string): Promise<string[]> {
  return Promise.resolve([]);
}


export function resolveRole(roles: string[]): Role {
  // Hiérarchie des rôles (du plus important au moins important)
  if (roles.some(r => r.toLowerCase().includes('staff'))) return 'staff';
  if (roles.some(r => r.toLowerCase().includes('patron') && !r.toLowerCase().includes('co'))) return 'patron';
  if (roles.some(r => r.toLowerCase().includes('co-patron') || r.toLowerCase().includes('copatron'))) return 'co-patron';
  if (roles.some(r => r.toLowerCase().includes('dot'))) return 'dot';
  return 'employe';
}

export function getEntrepriseFromRoles(roles: string[]): string {
  // Extrait l'entreprise depuis les rôles Discord
  const entrepriseRole = roles.find(r => r.toLowerCase().includes('employé'));
  if (entrepriseRole) {
    // Ex: "Employé Bennys" -> "Bennys"
    const match = entrepriseRole.match(/employé\s+(.+)/i);
    return match ? match[1] : 'Entreprise Inconnue';
  }
  return 'Aucune Entreprise';
}

// Prédicats pour les contrôles d'accès
export function isStaff(role: Role): boolean {
  return role === 'staff';
}

export function isPatron(role: Role): boolean {
  return role === 'patron' || role === 'staff';
}

export function isCoPatron(role: Role): boolean {
  return role === 'co-patron' || role === 'patron' || role === 'staff';
}

export function isDot(role: Role): boolean {
  return role === 'dot' || role === 'co-patron' || role === 'patron' || role === 'staff';
}

export function canAccessDotation(role: Role): boolean {
  return isStaff(role) || isPatron(role);
}

export function canAccessImpot(role: Role): boolean {
  return isStaff(role) || isPatron(role) || isDot(role);
}

export function canAccessBlanchiment(role: Role): boolean {
  return isStaff(role) || isPatron(role);
}

export function canAccessStaffConfig(role: Role): boolean {
  return isStaff(role);
}

export function canAccessCompanyConfig(role: Role): boolean {
  return isStaff(role) || isPatron(role) || isCoPatron(role);
}

// Fonction pour obtenir le nom d'affichage du rôle
export function getRoleDisplayName(role: Role): string {
  const roleNames = {
    staff: 'Staff',
    patron: 'Patron',
    'co-patron': 'Co-Patron',
    dot: 'DOT',
    employe: 'Employé'
  };
  return roleNames[role] || 'Inconnu';
}

// Fonction pour obtenir la couleur du badge de rôle
export function getRoleColor(role: Role): string {
  const roleColors = {
    staff: 'bg-destructive text-destructive-foreground',
    patron: 'bg-warning text-warning-foreground',
    'co-patron': 'bg-primary text-primary-foreground',
    dot: 'bg-success text-success-foreground',
    employe: 'bg-muted text-muted-foreground'
  };
  return roleColors[role] || 'bg-muted text-muted-foreground';
}