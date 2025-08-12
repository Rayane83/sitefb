import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "/src/components/ui/card";
import { Button } from "/src/components/ui/button";
import { Input } from "/src/components/ui/input";
import { Label } from "/src/components/ui/label";
import { Badge } from "/src/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "/src/components/ui/select";
import { Role, CompanyConfig, CompanyConfigData, CalculParam, SalaryConfig, PrimeTier, Bracket } from '@/lib/types';
import { getUserGuildRoles, resolveRole, canAccessCompanyConfig, getEntrepriseFromRoles, isStaff } from '@/lib/roles';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mockApi, handleApiError } from '@/lib/api';

function useQuery() { const { search } = useLocation(); return useMemo(() => new URLSearchParams(search), [search]); }

const defaultCalculParam = (label: string): CalculParam => ({ label, actif: true, poids: 1, cumulatif: false, paliers: [] });
const defaultSalaryConfig: SalaryConfig = { pourcentageCA: 5, modes: { caEmploye: true, heuresService: false, additionner: false }, primeBase: { active: false, montant: 0 }, paliersPrimes: [] };
const defaultCompanyConfig: CompanyConfig = { identification: { label: 'Entreprise', type: 'Société', description: '' }, salaire: defaultSalaryConfig, parametres: { RUN: defaultCalculParam('RUN'), FACTURE: defaultCalculParam('FACTURE'), VENTE: defaultCalculParam('VENTE') } };

export default function CompanyConfigPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const guildId = query.get('guild_id') || '123456789';
  const [roles, setRoles] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<Role>('employe');
  const [entreprise, setEntreprise] = useState<string>('Bennys');
  const [entreprises, setEntreprises] = useState<{ id: string; name: string }[]>([]);
  const [cfg, setCfg] = useState<CompanyConfig>(defaultCompanyConfig);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    async function init() {
      const r = await getUserGuildRoles(guildId);
      if (!alive) return; setRoles(r); setCurrentRole(resolveRole(r));
      const list = await mockApi.getEntreprises(guildId); if (alive) setEntreprises(list);
      setEntreprise(getEntrepriseFromRoles(r));
    }
    init();
    return () => { alive = false };
  }, [guildId]);

  const canEdit = canAccessCompanyConfig(currentRole);

  const addPrimeTier = () => setCfg((c) => ({ ...c, salaire: { ...c.salaire, paliersPrimes: [...c.salaire.paliersPrimes, { threshold: 0, amount: 0 }] } }));
  const removePrimeTier = (i: number) => setCfg((c) => ({ ...c, salaire: { ...c.salaire, paliersPrimes: c.salaire.paliersPrimes.filter((_, idx) => idx !== i) } }));

  const save = async () => { toast({ title: 'Configuration enregistrée' }); };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild><Link to="/"> <ArrowLeft className="w-4 h-4 mr-2" />Retour</Link></Button>
        <div className="text-sm text-muted-foreground">Guilde: {guildId} • Rôle: <Badge variant="outline" className="ml-1">{currentRole}</Badge></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Identification</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Label</Label>
            <Input value={cfg.identification.label} onChange={(e) => setCfg({ ...cfg, identification: { ...cfg.identification, label: e.target.value } })} disabled={!canEdit} />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={cfg.identification.type} onChange={(e) => setCfg({ ...cfg, identification: { ...cfg.identification, type: e.target.value } })} disabled={!canEdit} />
          </div>
          <div className="md:col-span-3">
            <Label>Description</Label>
            <Input value={cfg.identification.description} onChange={(e) => setCfg({ ...cfg, identification: { ...cfg.identification, description: e.target.value } })} disabled={!canEdit} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Paramètres Salaire</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>% du CA vers salaires</Label>
            <Input type="number" value={cfg.salaire.pourcentageCA} onChange={(e) => setCfg({ ...cfg, salaire: { ...cfg.salaire, pourcentageCA: Number(e.target.value) } })} disabled={!canEdit} />
          </div>
          <div className="md:col-span-3">
            <Label>Primes (paliers)</Label>
            <div className="space-y-2">
              {cfg.salaire.paliersPrimes.map((p, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center">
                  <Input type="number" value={p.threshold} onChange={(e) => setCfg(c => ({ ...c, salaire: { ...c.salaire, paliersPrimes: c.salaire.paliersPrimes.map((x, idx) => idx === i ? { ...x, threshold: Number(e.target.value) } : x) } }))} disabled={!canEdit} />
                  <Input type="number" value={p.amount} onChange={(e) => setCfg(c => ({ ...c, salaire: { ...c.salaire, paliersPrimes: c.salaire.paliersPrimes.map((x, idx) => idx === i ? { ...x, amount: Number(e.target.value) } : x) } }))} disabled={!canEdit} />
                  <Button variant="ghost" onClick={() => removePrimeTier(i)} disabled={!canEdit}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addPrimeTier} disabled={!canEdit}><Plus className="w-4 h-4 mr-2" />Ajouter un palier</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!canEdit}><Save className="w-4 h-4 mr-2" />Enregistrer</Button>
      </div>
    </div>
  );
}
