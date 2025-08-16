import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlanchimentState } from '@/lib/types';
import { formatCurrencyDollar, parseNumber } from '@/lib/fmt';
import { handleApiError } from '@/lib/api';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Calculator, 
  AlertCircle,
  Save,
  Copy,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { exportBlanchimentToPDF } from '@/lib/pdfExport';
import { exportBlanchimentXLSX } from '@/lib/export';

interface BlanchimentToggleProps {
  guildId: string;
  entreprise: string;
  currentRole: string;
}

export function BlanchimentToggle({ guildId, entreprise, currentRole }: BlanchimentToggleProps) {
  const [state, setState] = useState<BlanchimentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isStaff = currentRole.toLowerCase().includes('staff');
  const isStaffReadOnly = isStaff; // Staff en lecture seule
  const isPatronRole = currentRole.toLowerCase().includes('patron');
  const [globalPercs, setGlobalPercs] = useState<{ percEntreprise: number; percGroupe: number } | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  
  const { toast } = useToast();

  // Scoping avec entreprise
  const scope = `${guildId}:${entreprise}`;

  useEffect(() => {
    let alive = true;

    async function fetchState() {
      if (!guildId || !entreprise) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('blanchiment_settings')
          .select('*')
          .eq('guild_id', guildId)
          .eq('entreprise_key', entreprise)
          .maybeSingle();
        if (error) throw error;
        if (!alive) return;
        setState(data ? {
          enabled: !!data.enabled,
          useGlobal: !!data.use_global,
          percEntreprise: data.perc_entreprise ?? undefined,
          percGroupe: data.perc_groupe ?? undefined,
        } : { enabled: false, useGlobal: true });
      } catch (err) {
        if (alive) {
          setError(handleApiError(err));
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    }

    fetchState();

    return () => {
      alive = false;
    };
  }, [scope]);

  const handleToggle = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('blanchiment_settings')
        .upsert({
          guild_id: guildId,
          entreprise_key: entreprise,
          enabled,
        }, { onConflict: 'guild_id,entreprise_key' });
      if (error) throw error;

      setState((prev) => ({ ...(prev || {}), enabled } as BlanchimentState));
      toast({
        title: enabled ? "Blanchiment activé" : "Blanchiment désactivé",
        description: `Le blanchiment a été ${enabled ? 'activé' : 'désactivé'} pour ${entreprise}`,
      });
    } catch (err) {
      toast({ title: "Erreur", description: handleApiError(err), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  // Charger pourcentages globaux et lignes sauvegardées via Supabase
  useEffect(() => {
    (async () => {
      try {
        const { data: gl, error: ge } = await supabase
          .from('blanchiment_global')
          .select('*')
          .eq('guild_id', guildId)
          .maybeSingle();
        if (!ge && gl) setGlobalPercs({
          percEntreprise: Number(gl.perc_entreprise ?? 15),
          percGroupe: Number(gl.perc_groupe ?? 80),
        });
      } catch {}
      try {
        const { data: rs, error: re } = await supabase
          .from('blanchiment_rows')
          .select('*')
          .eq('guild_id', guildId)
          .eq('entreprise_key', entreprise)
          .order('created_at', { ascending: false });
        if (!re) setRows((rs || []) as any[]);
      } catch {}
    })();
  }, [guildId, entreprise]);

  const percEntrepriseEff = (state?.useGlobal ? globalPercs?.percEntreprise : state?.percEntreprise) ?? 0;
  const percGroupeEff = (state?.useGlobal ? globalPercs?.percGroupe : state?.percGroupe) ?? 0;

  const addRow = () => setRows(prev => [...prev, { id: Date.now(), statut: 'Statut', date_recu: '', date_rendu: '', duree: 0, groupe: '', employe: '', donneur_id: '', recep_id: '', somme: 0 }]);
  const updateRow = (idx: number, field: string, value: any) => {
    setRows(prev => prev.map((r,i) => {
      if (i !== idx) return r;
      const next = { ...r, [field]: value } as any;
      if (field === 'date_recu' || field === 'date_rendu') {
        const d1 = new Date(next.date_recu);
        const d2 = new Date(next.date_rendu);
        if (!isNaN(d1 as any) && !isNaN(d2 as any)) {
          const ms = d2.getTime() - d1.getTime();
          next.duree = Math.max(0, Math.round(ms / (1000*60*60*24)));
        }
      }
      return next;
    }));
  };

  const saveRows = async () => {
    if (isStaffReadOnly) return;
    try {
      const existing = rows.filter((r: any) => typeof r.id === 'string');
      const created = rows.filter((r: any) => typeof r.id !== 'string');

      if (existing.length) {
        for (const r of existing) {
          const payload = {
            statut: r.statut,
            date_recu: r.date_recu || null,
            date_rendu: r.date_rendu || null,
            duree: r.duree || null,
            groupe: r.groupe,
            employe: r.employe,
            donneur_id: r.donneur_id,
            recep_id: r.recep_id,
            somme: r.somme,
          };
          const { error } = await supabase.from('blanchiment_rows').update(payload).eq('id', r.id);
          if (error) throw error;
        }
      }

      if (created.length) {
        const inserts = created.map((r: any) => ({
          guild_id: guildId,
          entreprise_key: entreprise,
          statut: r.statut,
          date_recu: r.date_recu || null,
          date_rendu: r.date_rendu || null,
          duree: r.duree || null,
          groupe: r.groupe,
          employe: r.employe,
          donneur_id: r.donneur_id,
          recep_id: r.recep_id,
          somme: r.somme,
        }));
        const { error } = await supabase.from('blanchiment_rows').insert(inserts);
        if (error) throw error;
      }

      const { data } = await supabase
        .from('blanchiment_rows')
        .select('*')
        .eq('guild_id', guildId)
        .eq('entreprise_key', entreprise)
        .order('created_at', { ascending: false });
      setRows((data || []) as any[]);
      toast({ title: 'Sauvegardé', description: 'Lignes synchronisées avec la base.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    }
  };

  const removeRow = async (id: any) => {
    if (isStaffReadOnly) return;
    setRows(prev => prev.filter(r => r.id !== id));
    if (typeof id === 'string') {
      try { await supabase.from('blanchiment_rows').delete().eq('id', id); } catch {}
    }
  };
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Blanchiment</h2>
          <div className="loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Blanchiment</h2>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Erreur de chargement</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Blanchiment</h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{entreprise}</Badge>
          {isPatronRole && (
            <Badge variant="secondary" className="text-xs">
              Contrôlé par le staff
            </Badge>
          )}
        </div>
      </div>

      {state?.enabled && (
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="text-lg">Suivi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Pourcentages appliqués: Entreprise {percEntrepriseEff}% • Groupe {percGroupeEff}%
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={addRow} disabled={isStaffReadOnly}>Ajouter une ligne</Button>
                <Button size="sm" className="btn-discord" onClick={saveRows} disabled={isStaffReadOnly}>Sauvegarder</Button>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={async () => {
                    try {
                      await exportBlanchimentToPDF({
                        rows,
                        entreprise,
                        percEntreprise: percEntrepriseEff,
                        percGroupe: percGroupeEff,
                        guildName: guildId
                      });
                      toast({
                        title: 'Export PDF',
                        description: 'Blanchiment Suivi généré avec succès'
                      });
                    } catch (error) {
                      toast({
                        title: 'Erreur export PDF',
                        description: String(error),
                        variant: 'destructive'
                      });
                    }
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>

              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">État</th>
                    <th className="p-2 text-left">Date reçu</th>
                    <th className="p-2 text-left">Date rendu</th>
                    <th className="p-2 text-left">Durée (j)</th>
                    <th className="p-2 text-left">Nom du groupe</th>
                    <th className="p-2 text-left">Employé</th>
                    <th className="p-2 text-left">Joueur qui donne (ID)</th>
                    <th className="p-2 text-left">Joueur qui récupère (ID)</th>
                    <th className="p-2 text-left">Somme à blanchir</th>
                    <th className="p-2 text-left">Entreprise %</th>
                    <th className="p-2 text-left">Groupe %</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-2"><Input value={r.statut} onChange={(e)=> updateRow(idx,'statut', e.target.value)} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input type="date" value={r.date_recu} onChange={(e)=> updateRow(idx,'date_recu', e.target.value)} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input type="date" value={r.date_rendu} onChange={(e)=> updateRow(idx,'date_rendu', e.target.value)} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input type="number" value={r.duree} onChange={(e)=> updateRow(idx,'duree', Number(e.target.value)||0)} className="w-24" disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input value={r.groupe} onChange={(e)=> updateRow(idx,'groupe', e.target.value)} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input value={r.employe} onChange={(e)=> updateRow(idx,'employe', e.target.value)} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input value={r.donneur_id} onChange={(e)=> updateRow(idx,'donneur_id', e.target.value)} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input value={r.recep_id} onChange={(e)=> updateRow(idx,'recep_id', e.target.value)} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input type="number" value={r.somme} onChange={(e)=> updateRow(idx,'somme', Number(e.target.value)||0)} disabled={isStaffReadOnly} /></td>
                      <td className="p-2">{percEntrepriseEff}%</td>
                      <td className="p-2">{percGroupeEff}%</td>
                      <td className="p-2">
                        <Button size="sm" variant="destructive" onClick={()=> removeRow(r.id)} disabled={isStaffReadOnly}>Supprimer</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
