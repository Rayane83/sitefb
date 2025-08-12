import { ReactNode } from 'react';
import { Role } from '@/lib/types';
import { TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface RoleGateProps {
  children: ReactNode;
  allow: (role: Role) => boolean;
  currentRole: Role;
  fallback?: ReactNode;
  asTabTrigger?: boolean;
  value?: string;
  className?: string;
}

export function RoleGate({ 
  children, 
  allow, 
  currentRole, 
  fallback,
  asTabTrigger = false,
  value,
  className 
}: RoleGateProps) {
  const hasAccess = allow(currentRole);

  if (asTabTrigger && value) {
    return (
      <TabsTrigger 
        value={value} 
        disabled={!hasAccess}
        className={cn(
          "relative",
          !hasAccess && "opacity-50 cursor-not-allowed",
          className
        )}
        title={!hasAccess ? "Accès restreint" : undefined}
      >
        <div className="flex items-center space-x-2">
          {children}
          {!hasAccess && <Lock className="w-3 h-3" />}
        </div>
      </TabsTrigger>
    );
  }

  if (!hasAccess) {
    // Ne rien afficher quand l'accès est refusé (sauf si un fallback explicite est fourni)
    return fallback ? <>{fallback}</> : null;
  }


  return <>{children}</>;
}

// Helper pour déterminer les rôles autorisés (pour l'affichage)
function getAllowedRoles(allow: (role: Role) => boolean): string[] {
  const roles: Role[] = ['staff', 'patron', 'co-patron', 'dot', 'employe'];
  const allowedRoles = roles.filter(role => allow(role));
  
  const roleNames = {
    staff: 'Staff',
    patron: 'Patron',
    'co-patron': 'Co-Patron',
    dot: 'DOT',
    employe: 'Employé'
  };
  
  return allowedRoles.map(role => roleNames[role]);
}