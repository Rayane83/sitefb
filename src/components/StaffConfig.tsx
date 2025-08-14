import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bracket, Wealth } from "@/lib/types";
import { apiGet, apiPost, handleApiError } from "@/lib/api";
import { AlertCircle, Database, Factory, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { configRepo } from "@/lib/configRepo";
import { StaffDotationViewer } from "@/components/StaffDotationViewer";

interface StaffConfigProps {
  guildId: string;
  currentRole: string; // utilisé pour x-roles côté back
}

export default function StaffConfig({ guildId, currentRole }: StaffConfigProps) {
  const [entreprises, setEntreprises] = useState<{ id: string; name: string; roleId?: string; employeeRoleId?: string; enterpriseGuildId?: string }[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>("");
  const [entName, setEntName] = useState("");
  const [entRoleId, setEntRoleId] = useState("");
  const [entEmployeeRoleId, setEntEmployeeRoleId] = useState("");
  const [entGuildId, setEntGuildId] = useState("");
  const [newEntKey, setNewEntKey] = useState("");
  const [newEntName, setNewEntName] = useState("");
  const [newEntPrincipalRoleId, setNewEntPrincipalRoleId] = useState("");
  const [newEntGuildId, setNewEntGuildId] = useState("");
  const [newEntEmployeeRoleId, setNewEntEmployeeRoleId] = useState("");
  const [taxBrackets, setTaxBrackets] = useState<Bracket[]>([]);
  const [wealth, setWealth] = useState<Wealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [blanchimentEnabled, setBlanchimentEnabled] = useState(false);
  const [blanchimentGlobalPercs, setBlanchimentGlobalPercs] = useState({ percEntreprise: 15, percGroupe: 80 });

  const scope = useMemo(() => (selectedEntreprise ? `${guildId}:${selectedEntreprise}` : guildId), [guildId, selectedEntreprise]);

  useEffect(() => {
    document.title = "Staff Config | Portail Entreprise";
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadEntreprises() {
      if (!guildId) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('enterprises')
          .select('key,name,role_id,employee_role_id,enterprise_guild_id')
          .eq('guild_id', guildId)
          .order('name', { ascending: true });
        if (err) throw err;
        let list = (data || []).map((e: any) => ({ id: e.key, name: e.name, roleId: e.role_id || undefined, employeeRoleId: e.employee_role_id || undefined, enterpriseGuildId: e.enterprise_guild_id || undefined }));

        // Fallback sur la config Superadmin si la table est vide
        if (!list.length) {
          const cfg = await configRepo.get();
          const entries = Object.entries(cfg.enterprises || {});
          list = entries.map(([name, d]: any) => ({
            id: name,
            name,
            roleId: d?.roleId || undefined,
            employeeRoleId: d?.employeeRoleId || undefined,
            enterpriseGuildId: d?.enterpriseGuildId || undefined,
          }));
        }

        if (!alive) return;
        setEntreprises(list);
        setSelectedEntreprise((prev) => prev || list[0]?.id || "");
      } catch (e) {
        if (alive) setError(handleApiError(e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadEntreprises();
    return () => {
      alive = false;
    };
  }, [guildId]);

  // Sync champs édition quand l'entreprise change
  useEffect(() => {
    const ent = entreprises.find(e => e.id === selectedEntreprise);
    if (ent) {
      setEntName(ent.name || "");
      setEntRoleId(ent.roleId || "");
      setEntEmployeeRoleId(ent.employeeRoleId || "");
      setEntGuildId(ent.enterpriseGuildId || "");
    } else {
      setEntName("");
      setEntRoleId("");
      setEntEmployeeRoleId("");
      setEntGuildId("");
    }
  }, [selectedEntreprise, entreprises]);

  useEffect(() => {
    let alive = true;
    async function loadConfig() {
      if (!guildId || !selectedEntreprise) return;
      setLoading(true);
      setError(null);
      try {
        const { data: tb, error: e1 } = await supabase
          .from('tax_brackets')
          .select('min,max,taux,sal_min_emp,sal_max_emp,sal_min_pat,sal_max_pat,pr_min_emp,pr_max_emp,pr_min_pat,pr_max_pat')
          .eq('guild_id', guildId)
          .eq('entreprise_key', selectedEntreprise)
          .order('min', { ascending: true });
        const { data: w, error: e2 } = await supabase
          .from('wealth_brackets')
          .select('min,max,taux')
          .eq('guild_id', guildId)
          .eq('entreprise_key', selectedEntreprise)
          .order('min', { ascending: true });
        if (e1) throw e1;
        if (e2) throw e2;
        if (!alive) return;
        setTaxBrackets((tb as any) || []);
        setWealth((w as any) || []);
      } catch (e) {
        if (alive) setError(handleApiError(e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadConfig();
    return () => {
      alive = false;
    };
  }, [guildId, selectedEntreprise]);

  const addTaxRow = () => {
    setTaxBrackets((prev) => [
      ...prev,
      {
        min: prev.at(-1)?.max ?? 0,
        max: (prev.at(-1)?.max ?? 0) + 50000,
        taux: 0,
        sal_min_emp: 0,
        sal_max_emp: 0,
        sal_min_pat: 0,
        sal_max_pat: 0,
        pr_min_emp: 0,
        pr_max_emp: 0,
        pr_min_pat: 0,
        pr_max_pat: 0,
      },
    ]);
  };

  const addWealthRow = () => {
    setWealth((prev) => [
      ...prev,
      { min: prev.at(-1)?.max ?? 0, max: (prev.at(-1)?.max ?? 0) + 1000000, taux: 0 },
    ]);
  };

  // Charger l'état de blanchiment pour l'entreprise sélectionnée et les pourcentages globaux
  useEffect(() => {
    let alive = true;
    async function loadBlanchiment() {
      if (!guildId) return;
      try {
        // Charger les pourcentages globaux
        const { data: global, error: globalErr } = await supabase
          .from('blanchiment_global')
          .select('*')
          .eq('guild_id', guildId)
          .maybeSingle();
        if (!globalErr && global && alive) {
          setBlanchimentGlobalPercs({
            percEntreprise: Number(global.perc_entreprise) || 15,
            percGroupe: Number(global.perc_groupe) || 80
          });
        }

        // Charger l'état pour l'entreprise sélectionnée
        if (!selectedEntreprise) { 
          setBlanchimentEnabled(false); 
          return; 
        }
        const { data: s, error: e3 } = await supabase
          .from('blanchiment_settings')
          .select('enabled')
          .eq('guild_id', guildId)
          .eq('entreprise_key', selectedEntreprise)
          .maybeSingle();
        if (e3) throw e3;
        if (!alive) return;
        setBlanchimentEnabled(!!s?.enabled);
      } catch {
        // ignore
      }
    }
    loadBlanchiment();
    return () => { alive = false; };
  }, [guildId, selectedEntreprise]);

  const toNum = (s: string) => Number((s || '').replace(/[^\d,.-]+/g, '').replace(/\s/g, '').replace(',', '.')) || 0;

  const onPasteTax = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const imported: Bracket[] = [];
    for (const line of lines) {
      const cols = line.split(/[\t,;]+/).map((c) => c.trim());
      if (cols.length < 7) continue;
      const [min, max, taux, salMinEmp, salMaxPat, prMinEmp, prMaxPat] = cols.map(toNum);
      imported.push({
        min, max, taux,
        sal_min_emp: salMinEmp,
        sal_max_emp: 0,
        sal_min_pat: 0,
        sal_max_pat: salMaxPat,
        pr_min_emp: prMinEmp,
        pr_max_emp: 0,
        pr_min_pat: 0,
        pr_max_pat: prMaxPat,
      });
    }
    if (imported.length) {
      setTaxBrackets((prev) => [...prev, ...imported]);
      toast({ title: 'Collage barème', description: `${imported.length} ligne(s) ajoutée(s).` });
    }
  };

  const onPasteWealth = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const imported: Wealth[] = [];
    for (const line of lines) {
      const cols = line.split(/[\t,;]+/).map((c) => c.trim());
      if (cols.length < 3) continue;
      const [min, max, taux] = cols.map(toNum);
      imported.push({ min, max, taux });
    }
    if (imported.length) {
      setWealth((prev) => [...prev, ...imported]);
      toast({ title: 'Collage richesse', description: `${imported.length} ligne(s) ajoutée(s).` });
    }
  };
  
  const toggleBlanchiment = async (checked: boolean) => {
    setBlanchimentEnabled(checked);
    try {
      await supabase
        .from('blanchiment_settings')
        .upsert({ guild_id: guildId, entreprise_key: selectedEntreprise, enabled: checked, use_global: true });
      toast({ title: checked ? 'Blanchiment activé' : 'Blanchiment désactivé', description: selectedEntreprise ? `Entreprise: ${selectedEntreprise}` : undefined });
    } catch (e) {
      setBlanchimentEnabled(!checked);
      toast({ title: 'Erreur', description: handleApiError(e), variant: 'destructive' });
    }
  };

  const saveEntreprise = async () => {
    if (!guildId || !selectedEntreprise) return;
    try {
      const payload = { id: selectedEntreprise, name: entName.trim(), roleId: entRoleId.trim(), employeeRoleId: entEmployeeRoleId.trim(), enterpriseGuildId: entGuildId.trim() };
      await supabase.from('enterprises').upsert({ 
        guild_id: guildId, 
        key: selectedEntreprise, 
        name: entName.trim(), 
        role_id: entRoleId.trim() || null,
        employee_role_id: entEmployeeRoleId.trim() || null,
        enterprise_guild_id: entGuildId.trim() || null
      });
      toast({ title: 'Entreprise mise à jour', description: payload.name });
      const { data, error: err } = await supabase
        .from('enterprises')
        .select('key,name,role_id,employee_role_id,enterprise_guild_id')
        .eq('guild_id', guildId)
        .order('name', { ascending: true });
      if (err) throw err;
      const list = (data || []).map((e: any) => ({ id: e.key, name: e.name, roleId: e.role_id || undefined, employeeRoleId: e.employee_role_id || undefined, enterpriseGuildId: e.enterprise_guild_id || undefined }));
      setEntreprises(list);
    } catch (e) {
      toast({ title: 'Erreur', description: handleApiError(e), variant: 'destructive' });
    }
  };
  
  const createEntreprise = async () => {
    if (!guildId) return;
    const key = newEntKey.trim();
    const name = newEntName.trim();
    const principalRoleId = newEntPrincipalRoleId.trim();
    const enterpriseGuildId = newEntGuildId.trim();
    const employeeRoleId = newEntEmployeeRoleId.trim();
    if (!key || !name || !principalRoleId || !enterpriseGuildId || !employeeRoleId) {
      toast({ title: 'Champs requis', description: 'ID, Nom, ID rôle (principal), ID serveur (guild) et ID rôle employé sont obligatoires.', variant: 'destructive' });
      return;
    }
    try {
      await supabase.from('enterprises').insert({ 
        guild_id: guildId, // serveur principal de référencement
        key, 
        name,
        role_id: principalRoleId,
        employee_role_id: employeeRoleId,
        enterprise_guild_id: enterpriseGuildId
      });
      toast({ title: 'Entreprise créée', description: name });
      const { data, error: err } = await supabase
        .from('enterprises')
        .select('key,name,role_id,employee_role_id,enterprise_guild_id')
        .eq('guild_id', guildId)
        .order('name', { ascending: true });
      if (err) throw err;
      const list = (data || []).map((e: any) => ({ id: e.key, name: e.name, roleId: e.role_id || undefined, employeeRoleId: e.employee_role_id || undefined, enterpriseGuildId: e.enterprise_guild_id || undefined }));
      setEntreprises(list);
      setSelectedEntreprise(key);
      setNewEntKey("");
      setNewEntName("");
      setNewEntPrincipalRoleId("");
      setNewEntGuildId("");
      setNewEntEmployeeRoleId("");
    } catch (e) {
      toast({ title: 'Erreur', description: handleApiError(e), variant: 'destructive' });
    }
  };
  
const saveAll = async () => {
  if (!guildId || !selectedEntreprise) return;
  setLoading(true);
  try {
    // Charger existants
    const { data: existingTB } = await supabase
      .from('tax_brackets')
      .select('id')
      .eq('guild_id', guildId)
      .eq('entreprise_key', selectedEntreprise)
      .order('min', { ascending: true });
    const { data: existingW } = await supabase
      .from('wealth_brackets')
      .select('id')
      .eq('guild_id', guildId)
      .eq('entreprise_key', selectedEntreprise)
      .order('min', { ascending: true });

    // Upsert par index (UPDATE si existe, sinon INSERT)
    const updates: Promise<any>[] = [];
    const lenTB = Math.max(taxBrackets.length, existingTB?.length || 0);
    for (let i = 0; i < lenTB; i++) {
      const row = taxBrackets[i];
      const ex = existingTB?.[i];
      if (row && ex) {
        updates.push((async () => {
          const { error } = await supabase
            .from('tax_brackets')
            .update({
              min: row.min, max: row.max, taux: row.taux,
              sal_min_emp: row.sal_min_emp, sal_max_emp: row.sal_max_emp,
              sal_min_pat: row.sal_min_pat, sal_max_pat: row.sal_max_pat,
              pr_min_emp: row.pr_min_emp, pr_max_emp: row.pr_max_emp,
              pr_min_pat: row.pr_min_pat, pr_max_pat: row.pr_max_pat,
            })
            .eq('id', ex.id);
          if (error) throw error;
        })());
      } else if (row && !ex) {
        updates.push((async () => {
          const { error } = await supabase
            .from('tax_brackets')
            .insert({
              guild_id: guildId,
              entreprise_key: selectedEntreprise,
              min: row.min, max: row.max, taux: row.taux,
              sal_min_emp: row.sal_min_emp, sal_max_emp: row.sal_max_emp,
              sal_min_pat: row.sal_min_pat, sal_max_pat: row.sal_max_pat,
              pr_min_emp: row.pr_min_emp, pr_max_emp: row.pr_max_emp,
              pr_min_pat: row.pr_min_pat, pr_max_pat: row.pr_max_pat,
            });
          if (error) throw error;
        })());
      }
    }

    const lenW = Math.max(wealth.length, existingW?.length || 0);
    for (let i = 0; i < lenW; i++) {
      const row = wealth[i];
      const ex = existingW?.[i];
      if (row && ex) {
        updates.push((async () => {
          const { error } = await supabase
            .from('wealth_brackets')
            .update({ min: row.min, max: row.max, taux: row.taux })
            .eq('id', ex.id);
          if (error) throw error;
        })());
      } else if (row && !ex) {
        updates.push((async () => {
          const { error } = await supabase
            .from('wealth_brackets')
            .insert({ guild_id: guildId, entreprise_key: selectedEntreprise, min: row.min, max: row.max, taux: row.taux });
          if (error) throw error;
        })());
      }
    }

    await Promise.all(updates);

    toast({ title: 'Configurations enregistrées', description: 'Barèmes et richesse sauvegardés.' });
  } catch (e) {
    toast({ title: 'Erreur de sauvegarde', description: handleApiError(e), variant: 'destructive' });
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Factory className="w-5 h-5 text-primary" />
          Configuration Staff
        </h2>
        <div className="flex items-center gap-2">
          {selectedEntreprise && <Badge variant="secondary">{selectedEntreprise}</Badge>}
        </div>
      </div>

      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Sélection entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Choisir l'entreprise</Label>
              <Select value={selectedEntreprise} onValueChange={setSelectedEntreprise}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {entreprises.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Identification — Nom</Label>
              <div className="text-sm font-medium">{entName || '-'}</div>
            </div>
            <div className="space-y-2">
              <Label>Identification — ID</Label>
              <div className="text-sm">{selectedEntreprise || '-'}</div>
            </div>
          </div>

          {/* Édition d'entreprise déplacée dans Espace Superadmin */}

          {/* Création d'entreprise déplacée dans Espace Superadmin */}

          <div className="flex items-end gap-2">
            <Button onClick={saveAll} disabled={loading} className="btn-discord">
              <Save className="w-4 h-4 mr-2" /> Enregistrer barèmes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Barème d'imposition */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Barème d'imposition / Salaires / Primes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" onPaste={onPasteTax}>
          <p className="text-xs text-muted-foreground">Astuce: collez un tableau (min, max, taux, sal_min_emp, sal_max_pat, pr_min_emp, pr_max_pat)</p>
          <div className="space-y-2">
            <Label>Zone de collage</Label>
            <Textarea placeholder="min, max, taux, sal_min_emp, sal_max_pat, pr_min_emp, pr_max_pat" onPaste={(e)=>{ onPasteTax(e); e.stopPropagation(); }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Min</th>
                  <th className="p-2 text-left">Max</th>
                  <th className="p-2 text-left">Taux %</th>
                  <th className="p-2 text-left">Sal. min (Emp.)</th>
                  <th className="p-2 text-left">Sal. max (Pat.)</th>
                  <th className="p-2 text-left">Prime min (Emp.)</th>
                  <th className="p-2 text-left">Prime max (Pat.)</th>
                </tr>
              </thead>
              <tbody>
                {taxBrackets.map((b, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2"><Input type="number" value={b.min} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setTaxBrackets((prev)=> prev.map((r,i)=> i===idx?{...r, min:v}:r));
                    }}/></td>
                    <td className="p-2"><Input type="number" value={b.max} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setTaxBrackets((prev)=> prev.map((r,i)=> i===idx?{...r, max:v}:r));
                    }}/></td>
                    <td className="p-2"><Input type="number" value={b.taux} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setTaxBrackets((prev)=> prev.map((r,i)=> i===idx?{...r, taux:v}:r));
                    }}/></td>
                    <td className="p-2"><Input type="number" value={b.sal_min_emp} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setTaxBrackets((prev)=> prev.map((r,i)=> i===idx?{...r, sal_min_emp:v}:r));
                    }}/></td>
                    <td className="p-2"><Input type="number" value={b.sal_max_pat} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setTaxBrackets((prev)=> prev.map((r,i)=> i===idx?{...r, sal_max_pat:v}:r));
                    }}/></td>
                    <td className="p-2"><Input type="number" value={b.pr_min_emp} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setTaxBrackets((prev)=> prev.map((r,i)=> i===idx?{...r, pr_min_emp:v}:r));
                    }}/></td>
                    <td className="p-2"><Input type="number" value={b.pr_max_pat} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setTaxBrackets((prev)=> prev.map((r,i)=> i===idx?{...r, pr_max_pat:v}:r));
                    }}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={addTaxRow} variant="outline"><Plus className="w-4 h-4 mr-2"/>Ajouter une tranche</Button>
        </CardContent>
      </Card>

      {/* Impôt sur la richesse */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Impôt sur la richesse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" onPaste={onPasteWealth}>
          <p className="text-xs text-muted-foreground">Astuce: collez un tableau (min, max, taux)</p>
          <div className="space-y-2">
            <Label>Zone de collage</Label>
            <Textarea placeholder="min, max, taux" onPaste={(e)=>{ onPasteWealth(e); e.stopPropagation(); }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Min</th>
                  <th className="p-2 text-left">Max</th>
                  <th className="p-2 text-left">Taux %</th>
                </tr>
              </thead>
              <tbody>
                {wealth.map((w, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2"><Input type="number" value={w.min} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setWealth((prev)=> prev.map((r,i)=> i===idx?{...r, min:v}:r));
                    }}/></td>
                    <td className="p-2"><Input type="number" value={w.max} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setWealth((prev)=> prev.map((r,i)=> i===idx?{...r, max:v}:r));
                    }}/></td>
                    <td className="p-2"><Input type="number" value={w.taux} onChange={(e)=>{
                      const v = Number(e.target.value)||0; setWealth((prev)=> prev.map((r,i)=> i===idx?{...r, taux:v}:r));
                    }}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={addWealthRow} variant="outline"><Plus className="w-4 h-4 mr-2"/>Ajouter une tranche</Button>
        </CardContent>
      </Card>

      {/* Configuration des pourcentages de blanchiment pour toutes les entreprises */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Configuration globale du blanchiment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Ces pourcentages s'appliquent à toutes les entreprises utilisant les paramètres globaux.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pourcentage Entreprise (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={blanchimentGlobalPercs.percEntreprise}
                onChange={(e) => setBlanchimentGlobalPercs(prev => ({
                  ...prev,
                  percEntreprise: Number(e.target.value) || 0
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Pourcentage Groupe (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={blanchimentGlobalPercs.percGroupe}
                onChange={(e) => setBlanchimentGlobalPercs(prev => ({
                  ...prev,
                  percGroupe: Number(e.target.value) || 0
                }))}
              />
            </div>
          </div>
          
          <Button
            onClick={async () => {
              try {
                await supabase
                  .from('blanchiment_global')
                  .upsert({
                    guild_id: guildId,
                    perc_entreprise: blanchimentGlobalPercs.percEntreprise,
                    perc_groupe: blanchimentGlobalPercs.percGroupe
                  });
                toast({
                  title: 'Pourcentages sauvegardés',
                  description: 'Configuration globale du blanchiment mise à jour'
                });
              } catch (error) {
                toast({
                  title: 'Erreur',
                  description: handleApiError(error),
                  variant: 'destructive'
                });
              }
            }}
            className="btn-discord"
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder les pourcentages globaux
          </Button>
        </CardContent>
      </Card>

      {/* Intégration BlanchimentToggle scoping entreprise */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Blanchiment (scope entreprise)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Scope actuel: {scope}</div>
          <div className="flex items-center gap-3">
            <Label htmlFor="blanchiment">Blanchiment</Label>
            <Switch id="blanchiment" checked={blanchimentEnabled} onCheckedChange={toggleBlanchiment} />
          </div>
        </CardContent>
      </Card>

      {/* Viewer des fiches dotation pour le staff */}
      <StaffDotationViewer 
        guildId={guildId}
        currentRole={currentRole}
      />

      {error && (
        <div className="flex items-center space-x-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
