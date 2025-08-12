import { useEffect, useState } from 'react';
import { Button } from "/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "/src/components/ui/card";
import { Input } from "/src/components/ui/input";
import { Label } from "/src/components/ui/label";
import { Badge } from "/src/components/ui/badge";
import { DotationData, DotationRow, PalierConfig } from '@/lib/types';
import { formatCurrencyDollar, parseNumber, calculateFromPaliers, generateId } from '@/lib/fmt';
import { mockApi, handleApiError } from '@/lib/api';
import { Plus, Save, Trash2, Calculator, AlertCircle, Check, Archive as ArchiveIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DotationFormProps { guildId: string; entreprise: string; currentRole: string }

export function DotationForm({ guildId, entreprise }: DotationFormProps) {
  const [data, setData] = useState<DotationData | null>(null);
  const [paliers, setPaliers] = useState<PalierConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!guildId) return;
      setLoading(true); setError(null);
      try {
        const res = await mockApi.getDotation(guildId, entreprise);
        if (!alive) return;
        setData(res);
        const staffCfg = await mockApi.getStaffConfig(guildId);
        if (alive) setPaliers(staffCfg.paliers);
      } catch (e) { if (alive) setError(handleApiError(e)); }
      finally { if (alive) setLoading(false); }
    }
    load();
    return () => { alive = false };
  }, [guildId, entreprise]);

  const addRow = () => setData((d) => d ? { ...d, rows: [...d.rows, { id: generateId(), name: '', run: 0, facture: 0, vente: 0, ca_total: 0, salaire: 0, prime: 0 }] } : d);
  const removeRow = (id: string) => setData((d) => d ? { ...d, rows: d.rows.filter(r => r.id !== id) } : d);

  const recalc = () => setData((d) => {
    if (!d) return d;
    const rows = d.rows.map(r => {
      const ca_total = r.run + r.facture + r.vente;
      const prime = calculateFromPaliers(ca_total, paliers);
      const salaire = Math.round(ca_total * 0.06);
      return { ...r, ca_total, prime, salaire } as DotationRow;
    });
    return { ...d, rows };
  });

  const save = async () => {
    if (!data) return;
    try {
      setSaving(true);
      await mockApi.saveDotation({ guildId, entreprise, data });
      toast({ title: 'Dotation enregistrée', description: 'Les données ont été sauvegardées.' });
    } catch (e) {
      toast({ title: 'Erreur', description: handleApiError(e), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="h-48 bg-muted animate-pulse rounded-md" />;
  if (error) return <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tableau de dotation</h3>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={recalc}><Calculator className="w-4 h-4 mr-2" />Calculer</Button>
          <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />Sauvegarder</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Employés</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground mb-2">
            <div className="col-span-3">Nom</div>
            <div className="col-span-1">RUN</div>
            <div className="col-span-1">FACT</div>
            <div className="col-span-1">VENTE</div>
            <div className="col-span-2">CA Total</div>
            <div className="col-span-1">Salaire</div>
            <div className="col-span-1">Prime</div>
            <div className="col-span-2 text-right">
              <Button size="sm" variant="outline" onClick={addRow}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
          {data.rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 items-center mb-2">
              <Input value={r.name} onChange={(e) => setData(d => d ? { ...d, rows: d.rows.map(x => x.id === r.id ? { ...x, name: e.target.value } : x) } : d)} className="col-span-3" />
              <Input value={r.run} onChange={(e) => setData(d => d ? { ...d, rows: d.rows.map(x => x.id === r.id ? { ...x, run: parseNumber(e.target.value) } : x) } : d)} className="col-span-1" />
              <Input value={r.facture} onChange={(e) => setData(d => d ? { ...d, rows: d.rows.map(x => x.id === r.id ? { ...x, facture: parseNumber(e.target.value) } : x) } : d)} className="col-span-1" />
              <Input value={r.vente} onChange={(e) => setData(d => d ? { ...d, rows: d.rows.map(x => x.id === r.id ? { ...x, vente: parseNumber(e.target.value) } : x) } : d)} className="col-span-1" />
              <div className="col-span-2 text-right text-sm"><Badge variant="secondary">{formatCurrencyDollar(r.ca_total)}</Badge></div>
              <div className="col-span-1 text-right">{formatCurrencyDollar(r.salaire)}</div>
              <div className="col-span-1 text-right">{formatCurrencyDollar(r.prime)}</div>
              <div className="col-span-2 text-right">
                <Button size="sm" variant="ghost" onClick={() => removeRow(r.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline"><ArchiveIcon className="w-4 h-4 mr-2" />Envoyer à l'archive</Button>
        <Button onClick={save} disabled={saving}><Check className="w-4 h-4 mr-2" />Valider</Button>
      </div>
    </div>
  );
}
