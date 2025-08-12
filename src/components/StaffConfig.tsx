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

interface StaffConfigProps {
  guildId: string;
  currentRole: string; // utilisé pour x-roles côté back
}

export default function StaffConfig({ guildId, currentRole }: StaffConfigProps) {
  const [entreprises, setEntreprises] = useState<{ id: string; name: string; roleId?: string }[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>("");
  const [entName, setEntName] = useState("");
  const [entRoleId, setEntRoleId] = useState("");
  const [taxBrackets, setTaxBrackets] = useState<Bracket[]>([]);
  const [wealth, setWealth] = useState<Wealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [blanchimentEnabled, setBlanchimentEnabled] = useState(false);

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
          .select('key,name,role_id')
          .eq('guild_id', guildId)
          .order('name', { ascending: true });
        if (err) throw err;
        const list = (data || []).map((e: any) => ({ id: e.key, name: e.name, roleId: e.role_id || undefined }));
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
    } else {
      setEntName("");
      setEntRoleId("");
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

  // Charger l'état de blanchiment pour l'entreprise sélectionnée
  useEffect(() => {
    let alive = true;
    async function loadBlanchiment() {
      if (!scope) return;
      try {
        if (!selectedEntreprise) { setBlanchimentEnabled(false); return; }
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
  }, [scope]);

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
      const payload = { id: selectedEntreprise, name: entName.trim(), roleId: entRoleId.trim() };
      await supabase.from('enterprises').upsert({ guild_id: guildId, key: selectedEntreprise, name: entName.trim(), role_id: entRoleId.trim() });
      toast({ title: 'Entreprise mise à jour', description: payload.name });
      const { data, error: err } = await supabase
        .from('enterprises')
        .select('key,name,role_id')
        .eq('guild_id', guildId)
        .order('name', { ascending: true });
      if (err) throw err;
      const list = (data || []).map((e: any) => ({ id: e.key, name: e.name, roleId: e.role_id || undefined }));
      setEntreprises(list);
    } catch (e) {
      toast({ title: 'Erreur', description: handleApiError(e), variant: 'destructive' });
    }
  };

  const saveAll = async () => {
    if (!guildId || !selectedEntreprise) return;
    setLoading(true);
    try {
      await Promise.all([
        apiPost<Bracket[]>("/api_proxy/config/tax-brackets", taxBrackets, {
          guildId,
          role: currentRole,
          headers: { "Content-Type": "application/json" },
        }),
        apiPost<Wealth[]>("/api_proxy/config/wealth", wealth, {
          guildId,
          role: currentRole,
          headers: { "Content-Type": "application/json" },
        }),
      ]);
      toast({ title: "Configurations enregistrées", description: "Barèmes et richesse sauvegardés." });
    } catch (e) {
      toast({ title: "Erreur de sauvegarde", description: handleApiError(e), variant: "destructive" });
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
          <Badge variant="outline">{guildId}</Badge>
          {selectedEntreprise && <Badge variant="secondary">{selectedEntreprise}</Badge>}
        </div>
      </div>

      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Entreprise</CardTitle>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nom de l'entreprise</Label>
              <Input value={entName} onChange={(e)=> setEntName(e.target.value)} placeholder="Ex: Bennys" />
            </div>
            <div className="space-y-2">
              <Label>ID rôle employée</Label>
              <Input value={entRoleId} onChange={(e)=> setEntRoleId(e.target.value)} placeholder="1234567890" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={saveEntreprise} className="btn-discord">
                <Save className="w-4 h-4 mr-2" /> Enregistrer l'entreprise
              </Button>
            </div>
          </div>

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

      {error && (
        <div className="flex items-center space-x-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
