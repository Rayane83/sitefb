import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { configRepo, DiscordConfig } from "@/lib/configRepo";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DEFAULTS: DiscordConfig = {
  clientId: "1402231031804723210",
  principalGuildId: "1404608015230832742",
  principalRoles: {
    staff: "1404608105723068547",
    patron: "1404608186421350400",
    coPatron: "1404608269556645968",
  },
  enterprises: {
    Bennys: { roleId: "1404608309218115615", guildId: "1404609471958749266", employeeRoleId: "1404609881553764383" },
    "Cayo Cigare": { roleId: "1404608418853031966", guildId: "1404609724435009657", employeeRoleId: "1404609759692460052" },
  },
  dot: {
    guildId: "1404609091372056606",
    roles: {
      staff: "1404609124255400096",
      dot: "1404609170367451196",
    },
  },
  superadmins: {
    userIds: ["462716512252329996"],
  },
};

export default function SuperadminPage() {
  const [cfg, setCfg] = useState<DiscordConfig>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const guildParam = useMemo(() => new URLSearchParams(location.search).get("guild") || "", [location.search]);

  useEffect(() => {
    document.title = "Superadmin Discord Config | Portail";
    (async () => {
      const stored = await configRepo.get();
      if (stored && Object.keys(stored).length > 0) {
        setCfg(prev => ({ ...prev, ...stored }));
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await configRepo.save(cfg);
    } finally {
      setSaving(false);
    }
  };

  const setPrincipalRole = (key: keyof NonNullable<DiscordConfig["principalRoles"]>, value: string) => {
    setCfg(prev => ({
      ...prev,
      principalRoles: { ...(prev.principalRoles || {}), [key]: value },
    }));
  };

  const setEnterprise = (name: string, field: "roleId" | "guildId" | "employeeRoleId", value: string) => {
    setCfg(prev => ({
      ...prev,
      enterprises: {
        ...(prev.enterprises || {}),
        [name]: { ...(prev.enterprises?.[name] || {}), [field]: value },
      },
    }));
  };

  const addEnterprise = () => {
    const name = prompt("Nom de l’entreprise");
    if (!name) return;
    setCfg(prev => ({
      ...prev,
      enterprises: { ...(prev.enterprises || {}), [name]: {} },
    }));
  };

  const removeEnterprise = (name: string) => {
    const copy = { ...(cfg.enterprises || {}) } as any;
    delete copy[name];
    setCfg(prev => ({ ...prev, enterprises: copy }));
  };

  const addSuperadmin = () => {
    const id = prompt("ID utilisateur Discord du superadmin");
    if (!id) return;
    const current = cfg.superadmins?.userIds || [];
    setCfg(prev => ({ ...prev, superadmins: { userIds: Array.from(new Set([...current, id])) } }));
  };

  const removeSuperadmin = (id: string) => {
    const current = cfg.superadmins?.userIds || [];
    setCfg(prev => ({ ...prev, superadmins: { userIds: current.filter(x => x !== id) } }));
  };

  const handleHealth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('discord-health');
      if (error || !(data as any)?.ok) {
        throw new Error((error as any)?.message || (data as any)?.error || 'Erreur inconnue');
      }
      const bot = (data as any).bot;
      toast({ title: 'Bot opérationnel', description: `${bot.username}#${bot.discriminator}` });
    } catch (e: any) {
      toast({ title: 'Bot non joignable', description: String(e.message || e), variant: 'destructive' });
    }
  };

  const handleSync = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('discord-sync');
      if (error || !(data as any)?.ok) {
        throw new Error((error as any)?.message || (data as any)?.error || 'Erreur inconnue');
      }
      const res = data as any;
      const okCount = (res.guilds || []).filter((g: any) => g.ok).length;
      toast({ title: 'Synchronisation vérifiée', description: `${okCount} serveur(s) Discord ok` });
    } catch (e: any) {
      toast({ title: 'Erreur de synchronisation', description: String(e.message || e), variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Espace Superadmin</h1>
        <p className="text-muted-foreground">Gestion des IDs et rôles Discord (les secrets restent côté serveur via Supabase).</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Discord</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Client ID</Label>
              <Input value={cfg.clientId || ""} onChange={(e) => setCfg({ ...cfg, clientId: e.target.value })} placeholder="Client ID" />
            </div>
            <div className="grid gap-2">
              <Label>Bot Token</Label>
              <Input value={"••••••••••••••"} readOnly aria-readonly />
              <p className="text-xs text-muted-foreground">Le Bot Token doit être configuré via Supabase Secrets, pas dans le frontend.</p>
            </div>
            <div className="grid gap-2">
              <Label>Client Secret</Label>
              <Input value={"••••••••••••••"} readOnly aria-readonly />
              <p className="text-xs text-muted-foreground">Le Client Secret doit être configuré via Supabase Secrets.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={handleHealth}>Tester le bot</Button>
              <Button variant="outline" onClick={handleSync}>Vérifier la synchro</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serveur Principal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Guild ID</Label>
              <Input value={cfg.principalGuildId || ""} onChange={(e) => setCfg({ ...cfg, principalGuildId: e.target.value })} placeholder="Principal Guild ID" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Rôle Staff</Label>
                <Input value={cfg.principalRoles?.staff || ""} onChange={(e) => setPrincipalRole("staff", e.target.value)} placeholder="Role ID" />
              </div>
              <div className="grid gap-2">
                <Label>Rôle Patron</Label>
                <Input value={cfg.principalRoles?.patron || ""} onChange={(e) => setPrincipalRole("patron", e.target.value)} placeholder="Role ID" />
              </div>
              <div className="grid gap-2">
                <Label>Rôle Co Patron</Label>
                <Input value={cfg.principalRoles?.coPatron || ""} onChange={(e) => setPrincipalRole("coPatron", e.target.value)} placeholder="Role ID" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Entreprises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(cfg.enterprises || {}).map(([name, data]) => (
              <div key={name} className="rounded-md border p-4 grid gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{name}</h3>
                  <Button variant="outline" size="sm" onClick={() => removeEnterprise(name)}>Supprimer</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Rôle (serveur principal)</Label>
                    <Input value={data.roleId || ""} onChange={(e) => setEnterprise(name, "roleId", e.target.value)} placeholder="Role ID" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Guild ID (serveur entreprise)</Label>
                    <Input value={data.guildId || ""} onChange={(e) => setEnterprise(name, "guildId", e.target.value)} placeholder="Guild ID" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Rôle Employé (serveur entreprise)</Label>
                    <Input value={data.employeeRoleId || ""} onChange={(e) => setEnterprise(name, "employeeRoleId", e.target.value)} placeholder="Role ID" />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={addEnterprise}>Ajouter une entreprise</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serveur DOT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Guild ID</Label>
              <Input value={cfg.dot?.guildId || ""} onChange={(e) => setCfg(prev => ({ ...prev, dot: { ...(prev.dot || {}), guildId: e.target.value } }))} placeholder="DOT Guild ID" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Rôle Staff</Label>
                <Input value={cfg.dot?.roles?.staff || ""} onChange={(e) => setCfg(prev => ({ ...prev, dot: { ...(prev.dot || {}), roles: { ...(prev.dot?.roles || {}), staff: e.target.value } } }))} placeholder="Role ID" />
              </div>
              <div className="grid gap-2">
                <Label>Rôle DOT</Label>
                <Input value={cfg.dot?.roles?.dot || ""} onChange={(e) => setCfg(prev => ({ ...prev, dot: { ...(prev.dot || {}), roles: { ...(prev.dot?.roles || {}), dot: e.target.value } } }))} placeholder="Role ID" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Superadmins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(cfg.superadmins?.userIds || []).map((id) => (
                <div key={id} className="flex items-center gap-2">
                  <Badge variant="outline">{id}</Badge>
                  <Button size="sm" variant="outline" onClick={() => removeSuperadmin(id)}>Retirer</Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={addSuperadmin}>Ajouter un superadmin</Button>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
        <Button variant="outline" onClick={() => navigate(`/${guildParam ? `?guild=${guildParam}` : ''}`)}>Retour</Button>
      </div>
    </div>
  );
}
