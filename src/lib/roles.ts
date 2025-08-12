import type { Role, UserGuildRole } from './types';
import { supabase } from "@/integrations/supabase/client";
// Récupération des rôles d'un utilisateur pour une guilde
// En production, ceci doit venir de Discord via un backend sécurisé.
export async function getUserGuildRoles(guildId: string): Promise<string[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const providerId = (user?.user_metadata as any)?.provider_id || (user?.user_metadata as any)?.sub;
    if (!providerId) return [];

    const { data, error } = await supabase.functions.invoke('discord-user-roles', {
      body: { guild_id: guildId, user_id: String(providerId) },
    });

    if (error) {
      console.warn('discord-user-roles error', error);
      return [];
    }

    const rolesByName: string[] = (data as any)?.roles_by_name || [];
    return rolesByName;
  } catch (e) {
    console.warn('getUserGuildRoles failed', e);
    return [];
  }
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
  // Tente de déduire l'entreprise depuis plusieurs formats de rôles
  // Ex: "Employé Bennys", "Emp Bennys", "Patron Bennys", "Co-Patron Bennys", "DOT Bennys"
  const patterns = [
    /^(?:employ[eé]|emp)\s+(.+)$/i,
    /^(?:patron)\s+(.+)$/i,
    /^(?:co-?patron)\s+(.+)$/i,
    /^(?:dot)\s+(.+)$/i,
  ];
  for (const r of roles) {
    const role = r.trim();
    for (const p of patterns) {
      const m = role.match(p);
      if (m && m[1]) {
        return m[1].trim();
      }
    }
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