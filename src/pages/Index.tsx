import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Components
import { LoginScreen } from '@/components/LoginScreen';
import { SEOHead } from '@/components/SEOHead';
import { RoleGate } from '@/components/RoleGate';
import { DashboardSummary } from '@/components/DashboardSummary';
import { DotationForm } from '@/components/DotationForm';
import { ImpotForm } from '@/components/ImpotForm';
import { BlanchimentToggle } from '@/components/BlanchimentToggle';
import { ArchiveTable } from '@/components/ArchiveTable';
import { DocsUpload } from '@/components/DocsUpload';
import StaffConfig from '@/components/StaffConfig';

// Hooks
import { useAuth, useGuilds, useGuildRoles } from '@/hooks';
import { useConfigSync } from '@/hooks/useConfigSync';

// Utils
import { 
  getRoleDisplayName,
  getRoleColor,
  canAccessDotation,
  canAccessImpot,
  canAccessBlanchiment,
  canAccessStaffConfig,
  canAccessCompanyConfig,
  isDot,
} from '@/lib/roles';

// Icons
import { 
  BarChart3, 
  Calculator, 
  FileText, 
  Shield, 
  Archive, 
  Settings, 
  Building2,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon
} from 'lucide-react';

import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const Index = () => {
  // Custom hooks for clean state management
  const auth = useAuth();
  const guilds = useGuilds();
  const guildRoles = useGuildRoles(guilds.selectedGuildId);
  
  // Synchronisation automatique des configurations
  const { triggerDataRefresh } = useConfigSync();

  // Debug: ajouter un listener pour voir les événements de sync
  useEffect(() => {
    const handleConfigSync = (event: CustomEvent) => {
      console.log('Événement config-sync reçu:', event.detail);
    };
    const handleDataSync = (event: CustomEvent) => {
      console.log('Événement data-sync reçu:', event.detail);
    };

    window.addEventListener('config-sync', handleConfigSync as EventListener);
    window.addEventListener('data-sync', handleDataSync as EventListener);

    return () => {
      window.removeEventListener('config-sync', handleConfigSync as EventListener);
      window.removeEventListener('data-sync', handleDataSync as EventListener);
    };
  }, []);
  
  // Local UI state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Memoized derived state
  const currentEntreprise = useMemo(() => 
    guildRoles.entreprise || 'Aucune Entreprise', 
    [guildRoles.entreprise]
  );

  const isLoading = useMemo(() => 
    auth.isLoading || guilds.isLoading || guildRoles.isLoading, 
    [auth.isLoading, guilds.isLoading, guildRoles.isLoading]
  );

  if (!auth.isAuthenticated) {
    return (
      <>
        <SEOHead 
          title="Connexion - Portail Entreprise Flashback Fa"
          description="Connectez-vous au portail de gestion des entreprises Discord avec votre compte Discord."
        />
        <LoginScreen onLogin={auth.signInWithDiscord} />
      </>
    );
  }

  const pageTitle = activeTab === 'dashboard' 
    ? 'Dashboard - Portail Entreprise Flashback Fa'
    : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} - Portail Entreprise Flashback Fa`;

  return (
    <>
      <SEOHead 
        title={pageTitle}
        description={`Gérez votre entreprise Discord avec le portail Flashback Fa - ${currentEntreprise}`}
      />
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img
                  src="/lovable-uploads/edb98f3b-c1fa-4ca1-8a20-dd0be59b3591.png"
                  alt="Logo Flashback Fa - Portail Entreprise"
                  className="h-8 w-8 rounded-sm"
                  loading="lazy"
                  decoding="async"
                />
                <h1 className="text-2xl font-bold">Portail Entreprise Flashback Fa</h1>
              </div>
              
            </div>

            <div className="flex items-center space-x-4">
              {/* User info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{auth.user?.name}</p>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleColor(guildRoles.currentRole)}>
                      {getRoleDisplayName(guildRoles.currentRole)}
                    </Badge>
                    {currentEntreprise && currentEntreprise !== 'Aucune Entreprise' && (
                      <Badge variant="outline" className="text-xs">
                        {currentEntreprise}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  {auth.user?.avatar ? (
                    <img 
                      src={auth.user.avatar} 
                      alt={auth.user.name} 
                      className="w-full h-full rounded-full" 
                    />
                  ) : (
                    <UserIcon className="w-5 h-5 text-primary" />
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" aria-label="Administration" title="Administration">
                      <Settings className="w-4 h-4 mr-2" /> Admin
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Administration</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <RoleGate allow={(role) => role === 'staff'} currentRole={guildRoles.currentRole}>
                      <DropdownMenuItem asChild>
                        <Link to="/superadmin">Espace Superadmin</Link>
                      </DropdownMenuItem>
                    </RoleGate>
                    <RoleGate allow={canAccessStaffConfig} currentRole={guildRoles.currentRole}>
                      <DropdownMenuItem onSelect={(e)=>{ e.preventDefault(); setActiveTab('config'); }}>Config Staff</DropdownMenuItem>
                    </RoleGate>
                    <RoleGate allow={canAccessCompanyConfig} currentRole={guildRoles.currentRole}>
                      <DropdownMenuItem asChild>
                        <Link to={`/patron-config?guild=${guilds.selectedGuildId}`}>Config Patron</Link>
                      </DropdownMenuItem>
                    </RoleGate>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={auth.signOut}
                  aria-label="Déconnexion"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </Button>


              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!guilds.selectedGuildId ? (
          <Card className="stat-card max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Sélectionner une guilde</h3>
              <p className="text-muted-foreground">
                Veuillez sélectionner une guilde pour accéder au portail.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
              <RoleGate
                allow={() => true}
                currentRole={guildRoles.currentRole}
                asTabTrigger
                value="dashboard"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </RoleGate>
              
              <RoleGate
                allow={canAccessDotation}
                currentRole={guildRoles.currentRole}
                asTabTrigger
                value="dotation"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Dotations
              </RoleGate>
              
              <RoleGate
                allow={canAccessImpot}
                currentRole={guildRoles.currentRole}
                asTabTrigger
                value="impot"
              >
                <FileText className="w-4 h-4 mr-2" />
                Impôts
              </RoleGate>
              
              <RoleGate
                allow={isDot}
                currentRole={guildRoles.currentRole}
                asTabTrigger
                value="docs"
              >
                <FileText className="w-4 h-4 mr-2" />
                Factures/Diplômes
              </RoleGate>
              
              <RoleGate
                allow={canAccessBlanchiment}
                currentRole={guildRoles.currentRole}
                asTabTrigger
                value="blanchiment"
              >
                <Shield className="w-4 h-4 mr-2" />
                Blanchiment
              </RoleGate>
              
              <RoleGate
                allow={() => true}
                currentRole={guildRoles.currentRole}
                asTabTrigger
                value="archive"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archives
              </RoleGate>
              
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <DashboardSummary 
                guildId={guilds.selectedGuildId} 
                currentRole={guildRoles.currentRole} 
                entreprise={guildRoles.entreprise} 
              />
            </TabsContent>

            <TabsContent value="dotation" className="space-y-6">
              <RoleGate allow={canAccessDotation} currentRole={guildRoles.currentRole}>
                <DotationForm 
                  guildId={guilds.selectedGuildId} 
                  entreprise={currentEntreprise}
                  currentRole={getRoleDisplayName(guildRoles.currentRole)}
                />
              </RoleGate>
            </TabsContent>

            <TabsContent value="impot" className="space-y-6">
              <RoleGate allow={canAccessImpot} currentRole={guildRoles.currentRole}>
                <ImpotForm 
                  guildId={guilds.selectedGuildId} 
                  entreprise={currentEntreprise} 
                  currentRole={guildRoles.currentRole} 
                />
              </RoleGate>
            </TabsContent>

            <TabsContent value="blanchiment" className="space-y-6">
              <RoleGate allow={canAccessBlanchiment} currentRole={guildRoles.currentRole}>
                <BlanchimentToggle 
                  guildId={guilds.selectedGuildId}
                  entreprise={currentEntreprise}
                  currentRole={getRoleDisplayName(guildRoles.currentRole)}
                />
              </RoleGate>
            </TabsContent>

            <TabsContent value="docs" className="space-y-6">
              <RoleGate allow={isDot} currentRole={guildRoles.currentRole}>
                <DocsUpload 
                  guildId={guilds.selectedGuildId} 
                  entreprise={currentEntreprise} 
                  role={guildRoles.currentRole} 
                />
              </RoleGate>
            </TabsContent>

            <TabsContent value="archive" className="space-y-6">
              <ArchiveTable 
                guildId={guilds.selectedGuildId}
                currentRole={getRoleDisplayName(guildRoles.currentRole)}
                entreprise={currentEntreprise}
              />
            </TabsContent>

            <TabsContent value="config" className="space-y-6">
              <RoleGate allow={canAccessStaffConfig} currentRole={guildRoles.currentRole}>
                <StaffConfig 
                  guildId={guilds.selectedGuildId} 
                  currentRole={getRoleDisplayName(guildRoles.currentRole)} 
                />
              </RoleGate>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
    </>
  );
};

export default Index;