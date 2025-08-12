import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Components
import { LoginScreen } from '@/components/LoginScreen';
import { GuildSwitcher } from '@/components/GuildSwitcher';
import { RoleGate } from '@/components/RoleGate';
import { DashboardSummary } from '@/components/DashboardSummary';
import { DotationForm } from '@/components/DotationForm';
import { ImpotForm } from '@/components/ImpotForm';
import { BlanchimentToggle } from '@/components/BlanchimentToggle';
import { ArchiveTable } from '@/components/ArchiveTable';
import StaffConfig from '@/components/StaffConfig';
// Utils
import { 
  getUserGuildRoles, 
  resolveRole, 
  getEntrepriseFromRoles,
  getRoleDisplayName,
  getRoleColor,
  canAccessDotation,
  canAccessImpot,
  canAccessBlanchiment,
  canAccessStaffConfig
} from '@/lib/roles';
import { canAccessCompanyConfig } from '@/lib/roles';
import { Role, Guild, User } from '@/lib/types';

// Icons
import { 
  BarChart3, 
  Calculator, 
  Receipt, 
  Shield, 
  Archive, 
  Settings, 
  Building2,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon
} from 'lucide-react';

import { Link } from 'react-router-dom';
const Index = () => {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Guild & Role state
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<Role>('employe');
  const [entreprise, setEntreprise] = useState<string>('');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  
  // Loading state
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock login function
  const handleLogin = () => {
    // Simulate Discord OAuth
    const mockUser: User = {
      id: '123456789',
      name: 'Jean Dupont',
      avatar: 'https://cdn.discordapp.com/avatars/123456789/avatar.png',
      discriminator: '1234'
    };

    const mockGuilds: Guild[] = [
      {
        id: '123456789',
        name: 'Serveur Bennys',
        icon: 'https://cdn.discordapp.com/icons/123456789/icon.png'
      },
      {
        id: '987654321',
        name: 'Serveur Unicorn',
        icon: 'https://cdn.discordapp.com/icons/987654321/icon.png'
      },
      {
        id: '456789123',
        name: 'Serveur LSC',
        icon: 'https://cdn.discordapp.com/icons/456789123/icon.png'
      }
    ];

    setUser(mockUser);
    setGuilds(mockGuilds);
    setIsLoggedIn(true);
    
    // Set default guild from URL params or first guild
    const urlParams = new URLSearchParams(window.location.search);
    const guildParam = urlParams.get('guild');
    const initialGuild = guildParam && mockGuilds.find(g => g.id === guildParam) 
      ? guildParam 
      : mockGuilds[0]?.id || '';
    
    if (initialGuild) {
      setSelectedGuildId(initialGuild);
      updateURLGuild(initialGuild);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setGuilds([]);
    setSelectedGuildId('');
    setCurrentRole('employe');
    setEntreprise('');
    setUserRoles([]);
  };

  // Update URL when guild changes
  const updateURLGuild = (guildId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('guild', guildId);
    window.history.pushState({}, '', url.toString());
  };

  // Handle guild change
  const handleGuildChange = (guildId: string) => {
    setSelectedGuildId(guildId);
    updateURLGuild(guildId);
  };

  // Fetch user roles for selected guild
  useEffect(() => {
    let alive = true;

    async function fetchUserRoles() {
      if (!selectedGuildId) return;
      
      setIsLoadingRoles(true);
      
      try {
        const roles = await getUserGuildRoles(selectedGuildId);
        
        if (!alive) return;
        
        setUserRoles(roles);
        setCurrentRole(resolveRole(roles));
        setEntreprise(getEntrepriseFromRoles(roles));
      } catch (error) {
        console.error('Failed to fetch user roles:', error);
        if (alive) {
          setCurrentRole('employe');
          setEntreprise('Aucune Entreprise');
        }
      } finally {
        if (alive) {
          setIsLoadingRoles(false);
        }
      }
    }

    fetchUserRoles();

    return () => {
      alive = false;
    };
  }, [selectedGuildId]);

  // Show login screen if not authenticated
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold">Portail Entreprise</h1>
              </div>
              
              <GuildSwitcher 
                guilds={guilds}
                selectedGuildId={selectedGuildId}
                onGuildChange={handleGuildChange}
                isLoading={isLoadingRoles}
              />
            </div>

            <div className="flex items-center space-x-4">
              {/* User info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleColor(currentRole)}>
                      {getRoleDisplayName(currentRole)}
                    </Badge>
                    {entreprise && (
                      <Badge variant="outline" className="text-xs">
                        {entreprise}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-full h-full rounded-full" 
                    />
                  ) : (
                    <UserIcon className="w-5 h-5 text-primary" />
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  aria-label="Déconnexion"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </Button>

                {canAccessCompanyConfig(currentRole) && (
                  <Link to={`/company-config?guild=${selectedGuildId}`} aria-label="Configuration d’entreprise" title="Configuration d’entreprise">
                    <Button variant="outline" size="sm">
                      <SettingsIcon className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!selectedGuildId ? (
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
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <RoleGate
                allow={() => true}
                currentRole={currentRole}
                asTabTrigger
                value="dashboard"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </RoleGate>
              
              <RoleGate
                allow={canAccessDotation}
                currentRole={currentRole}
                asTabTrigger
                value="dotation"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Dotations
              </RoleGate>
              
              <RoleGate
                allow={canAccessImpot}
                currentRole={currentRole}
                asTabTrigger
                value="impot"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Impôts
              </RoleGate>
              
              <RoleGate
                allow={canAccessBlanchiment}
                currentRole={currentRole}
                asTabTrigger
                value="blanchiment"
              >
                <Shield className="w-4 h-4 mr-2" />
                Blanchiment
              </RoleGate>
              
              <RoleGate
                allow={() => true}
                currentRole={currentRole}
                asTabTrigger
                value="archive"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archives
              </RoleGate>
              
              <RoleGate
                allow={canAccessStaffConfig}
                currentRole={currentRole}
                asTabTrigger
                value="config"
              >
                <Settings className="w-4 h-4 mr-2" />
                Config
              </RoleGate>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <DashboardSummary guildId={selectedGuildId} />
            </TabsContent>

            <TabsContent value="dotation" className="space-y-6">
              <RoleGate allow={canAccessDotation} currentRole={currentRole}>
                <DotationForm 
                  guildId={selectedGuildId} 
                  entreprise={entreprise}
                  currentRole={getRoleDisplayName(currentRole)}
                />
              </RoleGate>
            </TabsContent>

            <TabsContent value="impot" className="space-y-6">
              <RoleGate allow={canAccessImpot} currentRole={currentRole}>
                <ImpotForm />
              </RoleGate>
            </TabsContent>

            <TabsContent value="blanchiment" className="space-y-6">
              <RoleGate allow={canAccessBlanchiment} currentRole={currentRole}>
                <BlanchimentToggle 
                  guildId={selectedGuildId}
                  entreprise={entreprise}
                  currentRole={getRoleDisplayName(currentRole)}
                />
              </RoleGate>
            </TabsContent>

            <TabsContent value="archive" className="space-y-6">
              <ArchiveTable 
                guildId={selectedGuildId}
                currentRole={getRoleDisplayName(currentRole)}
                entreprise={entreprise}
              />
            </TabsContent>

            <TabsContent value="config" className="space-y-6">
              <RoleGate allow={canAccessStaffConfig} currentRole={currentRole}>
                <StaffConfig guildId={selectedGuildId} currentRole={getRoleDisplayName(currentRole)} />
              </RoleGate>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Index;