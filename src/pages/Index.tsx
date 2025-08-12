import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Components
import { LoginScreen } from '@/components/LoginScreen';

import { RoleGate } from '@/components/RoleGate';
import { DashboardSummary } from '@/components/DashboardSummary';
import { DotationForm } from '@/components/DotationForm';
import { ImpotForm } from '@/components/ImpotForm';
import { BlanchimentToggle } from '@/components/BlanchimentToggle';
import { ArchiveTable } from '@/components/ArchiveTable';
import { DocsUpload } from '@/components/DocsUpload';
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
  canAccessStaffConfig,
  isDot,
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
import { supabase } from '@/integrations/supabase/client';

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

  // Supabase auth session
  useEffect(() => {
    // Set up auth listener FIRST to catch the OAuth redirect event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        const u = session.user;
        setUser({
          id: u.id,
          name: (u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'Utilisateur') as string,
          avatar: (u.user_metadata?.avatar_url || u.user_metadata?.avatar) as string | undefined,
          discriminator: ''
        } as any);
        // Defer any Supabase calls to avoid deadlocks in the callback
        setTimeout(() => { loadGuilds(); }, 0);
      } else {
        setUser(null);
        setGuilds([]);
        setSelectedGuildId('');
      }
    });

    // THEN check for an existing session (including one just returned via URL hash)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      if (session) {
        const u = session.user;
        setUser({
          id: u.id,
          name: (u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'Utilisateur') as string,
          avatar: (u.user_metadata?.avatar_url || u.user_metadata?.avatar) as string | undefined,
          discriminator: ''
        } as any);
        setTimeout(() => { loadGuilds(); }, 0);
      }
    });

    return () => { try { subscription.unsubscribe(); } catch {} };
  }, []);
  // Active tab
  const [activeTab, setActiveTab] = useState('dashboard');


  // Login via Supabase OAuth (Discord)
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin + window.location.pathname + window.location.search,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUser(null);
    setGuilds([]);
    setSelectedGuildId('');
    setCurrentRole('employe');
    setEntreprise('');
    setUserRoles([]);
  };

  // Load available guilds from Supabase config and DB
  const loadGuilds = async () => {
    try {
      const ids = new Set<string>();
      const { data: dc } = await supabase
        .from('discord_config')
        .select('data')
        .eq('id', 'default')
        .maybeSingle();
      const conf = (dc?.data as any) || {};
      if (conf.principalGuildId) ids.add(conf.principalGuildId);
      if (conf.dot?.guildId) ids.add(conf.dot.guildId);
      if (conf.enterprises) {
        Object.values(conf.enterprises as any).forEach((e: any) => { if (e?.guildId) ids.add(e.guildId); });
      }
      const { data: ents } = await supabase
        .from('enterprises')
        .select('guild_id,name')
        .order('name', { ascending: true });
      ents?.forEach((e: any) => { if (e.guild_id) ids.add(e.guild_id); });

      const result = Array.from(ids).map((id) => ({ id, name: id, icon: '' })) as Guild[];
      setGuilds(result);

      // Auto-select principal guild if configured; otherwise use provided default ID; else first available
      const defaultPrincipal = '1404608015230832742';
      const targetGuildId = (conf.principalGuildId as string | undefined) || defaultPrincipal || result[0]?.id || '';
      if (targetGuildId) {
        setSelectedGuildId(targetGuildId);
      }
    } catch (e) {
      console.warn('loadGuilds error', e);
    }
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
                  <p className="text-sm font-medium">{user?.name}</p>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleColor(currentRole)}>
                      {getRoleDisplayName(currentRole)}
                    </Badge>
                    {entreprise && entreprise !== 'Aucune Entreprise' && (
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
                
                <RoleGate allow={(role) => role === 'staff'} currentRole={currentRole}>
                  <Link to="/superadmin" aria-label="Espace Superadmin" title="Espace Superadmin">
                    <Button variant="outline" size="sm">
                      <SettingsIcon className="w-4 h-4" />
                    </Button>
                  </Link>
                </RoleGate>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
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
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
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
                allow={isDot}
                currentRole={currentRole}
                asTabTrigger
                value="docs"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Docs
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

            <TabsContent value="docs" className="space-y-6">
              <RoleGate allow={isDot} currentRole={currentRole}>
                <DocsUpload guildId={selectedGuildId} entreprise={entreprise} role={currentRole} />
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