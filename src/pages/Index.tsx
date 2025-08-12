import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList } from "/src/components/ui/tabs";
import { Badge } from "/src/components/ui/badge";
import { Button } from "/src/components/ui/button";
import { Card, CardContent } from "/src/components/ui/card";
import { LoginScreen } from '@/components/LoginScreen';
import { GuildSwitcher } from '@/components/GuildSwitcher';
import { RoleGate } from '@/components/RoleGate';
import { DashboardSummary } from '@/components/DashboardSummary';
import { DotationForm } from '@/components/DotationForm';
import { ImpotForm } from '@/components/ImpotForm';
import { BlanchimentToggle } from '@/components/BlanchimentToggle';
import { ArchiveTable } from '@/components/ArchiveTable';
import CompanyConfigPage from './CompanyConfig';
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
  canAccessCompanyConfig,
} from '@/lib/roles';
import type { Role, Guild, User } from '@/lib/types';
import { BarChart3, Calculator, Receipt, Shield, Archive, Settings, Building2, LogOut, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  // Auth state (mock)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Guild & Role state
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [roles, setRoles] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<Role>('employe');
  const [entreprise, setEntreprise] = useState<string>('');

  useEffect(() => {
    // simulate available guilds
    setGuilds([
      { id: '123456789', name: 'Guilde A' },
      { id: '987654321', name: 'Guilde B' },
      { id: '456789123', name: 'Guilde C' },
    ]);
  }, []);

  useEffect(() => {
    if (!selectedGuildId) return;
    let alive = true;
    async function run() {
      const r = await getUserGuildRoles(selectedGuildId);
      if (!alive) return;
      setRoles(r);
      const role = resolveRole(r);
      setCurrentRole(role);
      setEntreprise(getEntrepriseFromRoles(r));
    }
    run();
    return () => { alive = false };
  }, [selectedGuildId]);

  const roleDisplay = getRoleDisplayName?.(currentRole) ?? currentRole;
  const roleColor = getRoleColor?.(currentRole) ?? 'text-primary';

  if (!isLoggedIn) return <LoginScreen onLogin={() => { setIsLoggedIn(true); setUser({ id: '1', name: 'Utilisateur' }); setSelectedGuildId('123456789'); }} />;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GuildSwitcher guilds={guilds} selectedGuildId={selectedGuildId} onGuildChange={setSelectedGuildId} />
          <Badge variant="outline" className={roleColor}>{roleDisplay}</Badge>
          {entreprise && <Badge variant="secondary">{entreprise}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline"><Link to="/company-config?guild_id=" >Configurer</Link></Button>
          <Button variant="ghost"><LogOut className="w-4 h-4 mr-2" />Déconnexion</Button>
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <RoleGate asTabTrigger value="dashboard" allow={() => true} currentRole={currentRole}><BarChart3 className="w-4 h-4 mr-2" />Dashboard</RoleGate>
          <RoleGate asTabTrigger value="dotation" allow={canAccessDotation} currentRole={currentRole}><Calculator className="w-4 h-4 mr-2" />Dotation</RoleGate>
          <RoleGate asTabTrigger value="impot" allow={canAccessImpot} currentRole={currentRole}><Receipt className="w-4 h-4 mr-2" />Impôts</RoleGate>
          <RoleGate asTabTrigger value="blanchiment" allow={canAccessBlanchiment} currentRole={currentRole}><Shield className="w-4 h-4 mr-2" />Blanchiment</RoleGate>
          <RoleGate asTabTrigger value="archive" allow={() => true} currentRole={currentRole}><Archive className="w-4 h-4 mr-2" />Archives</RoleGate>
          <RoleGate asTabTrigger value="staff" allow={canAccessStaffConfig} currentRole={currentRole}><Settings className="w-4 h-4 mr-2" />Staff</RoleGate>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardSummary guildId={selectedGuildId} />
        </TabsContent>

        <TabsContent value="dotation">
          <DotationForm guildId={selectedGuildId} entreprise={entreprise} currentRole={currentRole} />
        </TabsContent>

        <TabsContent value="impot">
          <ImpotForm />
        </TabsContent>

        <TabsContent value="blanchiment">
          <BlanchimentToggle guildId={selectedGuildId} entreprise={entreprise} currentRole={currentRole} />
        </TabsContent>

        <TabsContent value="archive">
          <ArchiveTable guildId={selectedGuildId} currentRole={currentRole} entreprise={entreprise} />
        </TabsContent>

        <TabsContent value="staff">
          <Card><CardContent className="py-10 text-center text-muted-foreground">Module Staff simplifié dans cette migration.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
