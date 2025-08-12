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
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Accès restreint
        </h3>
        <p className="text-muted-foreground mb-4">
          Vous n'avez pas les permissions nécessaires pour accéder à cette section.
        </p>
        <p className="text-sm text-muted-foreground">
          Rôle requis : {getAllowedRoles(allow).join(', ')}
        </p>
      </div>
    );
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