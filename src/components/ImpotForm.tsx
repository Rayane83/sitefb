import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrencyDollar } from '@/lib/fmt';
import { Receipt, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Role } from '@/lib/types';

interface ImpotFormProps {
  guildId: string;
  entreprise?: string;
  currentRole?: Role;
}

export function ImpotForm({ guildId, entreprise, currentRole }: ImpotFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entreprisesList, setEntreprisesList] = useState<{ id: string; name: string }[]>([]);
  const [entKey, setEntKey] = useState<string>(entreprise || '');

  const [state, setState] = useState({
    caBrut: 0,
    depensesDeductibles: 0,
    benefice: 0,
    tauxImposition: 0,
    montantImpots: 0,
    beneficeApresImpot: 0,
    totalPrimes: 0,
    totalSalaires: 0,
    beneficeApresPrimes: 0,
    impotRichesse: 0,
    soldeBancaireApresSalaire: 0,
  });

useEffect(() => {
    let alive = true;
    async function fetchEnterprises() {
      if (!guildId) return;
      try {
        const { data, error } = await supabase
          .from('enterprises')
          .select('key,name')
          .eq('guild_id', guildId)
          .order('name', { ascending: true });
        if (error) throw error;
        const list = (data || []).map((e: any) => ({ id: e.key, name: e.name }));
        if (!alive) return;
        setEntreprisesList(list);
        if (!entKey && (entreprise || list[0]?.id)) {
          setEntKey(entreprise || list[0]?.id || '');
        }
      } catch { /* ignore */ }
    }
    fetchEnterprises();
  }, [guildId]);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!guildId) return;
      setIsLoading(true);
      setError(null);
      try {
        // 1) Dernier rapport de dotation (par guilde + entreprise)
        let rq = supabase
          .from('dotation_reports')
          .select('id, solde_actuel, employees_count, totals, created_at')
          .eq('guild_id', guildId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (entKey) rq = rq.eq('entreprise_key', entKey);
        const { data: reportRows, error: rErr } = await rq;
        if (rErr) throw rErr;
        const report = reportRows && reportRows[0];

        // 2) Lignes du rapport pour agréger les montants
        let caBrut = 0, depenses = 0, primes = 0, salaires = 0;
        if (report) {
          const { data: rows, error: rowsErr } = await supabase
            .from('dotation_rows')
            .select('ca_total, facture, prime, salaire')
            .eq('report_id', report.id);
          if (rowsErr) throw rowsErr;
          for (const r of rows || []) {
            caBrut += Number(r.ca_total || 0);
            depenses += Number(r.facture || 0);
            primes += Number(r.prime || 0);
            salaires += Number((r as any).salaire || 0);
          }
        }

        // 3) Barème d'impôt (taux) basé sur bénéfice
        const benefice = Math.max(0, caBrut - depenses);
        let tauxImposition = 0;
        if (entKey) {
          const { data: brackets } = await supabase
            .from('tax_brackets')
            .select('min,max,taux')
            .eq('guild_id', guildId)
            .eq('entreprise_key', entKey)
            .order('min', { ascending: true });
          if (brackets && brackets.length) {
            const b = brackets.find(b => Number(b.min) <= benefice && (b.max === null || Number(b.max) >= benefice)) || brackets[brackets.length - 1];
            tauxImposition = Number(b?.taux || 0);
          }
        }
        const montantImpots = Math.round(benefice * (tauxImposition / 100));
        const beneficeApresImpot = benefice - montantImpots;

        // 4) Impôt richesse basé sur le solde actuel et la table wealth_brackets
        let impotRichesse = 0;
        let solde = Number(report?.solde_actuel || 0);
        if (entKey) {
          const { data: wealth } = await supabase
            .from('wealth_brackets')
            .select('min,max,taux')
            .eq('guild_id', guildId)
            .eq('entreprise_key', entKey)
            .order('min', { ascending: true });
          if (wealth && wealth.length && solde > 0) {
            const w = wealth.find(w => Number(w.min) <= solde && (w.max === null || Number(w.max) >= solde)) || wealth[wealth.length - 1];
            const taux = Number(w?.taux || 0); // %
            impotRichesse = Math.round(solde * (taux / 100));
          }
        }

        const beneficeApresPrimes = beneficeApresImpot - primes;

        if (!alive) return;
        setState({
          caBrut,
          depensesDeductibles: depenses,
          benefice,
          tauxImposition,
          montantImpots,
          beneficeApresImpot,
          totalPrimes: primes,
          totalSalaires: salaires,
          beneficeApresPrimes,
          impotRichesse,
          soldeBancaireApresSalaire: Math.max(0, solde - salaires),
        });
      } catch (e: any) {
        if (alive) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [guildId, entKey]);

  const impotCards = useMemo(() => [
    { title: 'CA Brut', value: state.caBrut, icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/10' },
    { title: 'Dépenses Déductibles', value: state.depensesDeductibles, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { title: 'Bénéfice', value: state.benefice, icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: "Montant d'Impôts", value: state.montantImpots, icon: Receipt, color: 'text-warning', bgColor: 'bg-warning/10', subtitle: `Taux: ${state.tauxImposition}%` },
    { title: "Bénéfice Après Impôt", value: state.beneficeApresImpot, icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Total Primes', value: state.totalPrimes, icon: TrendingUp, color: 'text-warning', bgColor: 'bg-warning/10' },
    { title: 'Total Salaires', value: state.totalSalaires, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { title: 'Bénéfice Après Primes', value: state.beneficeApresPrimes, icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Impôt Richesse', value: state.impotRichesse, icon: Receipt, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { title: 'Solde Bancaire Après Salaires', value: state.soldeBancaireApresSalaire, icon: DollarSign, color: 'text-success', bgColor: 'bg-success/10' },
  ], [state]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Fiches d'Impôt</h2>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Receipt className="w-3 h-3" />
            <span>Chargement...</span>
          </Badge>
        </div>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="animate-pulse h-24 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Fiches d'Impôt</h2>
          <Badge variant="outline" className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>Erreur</span>
          </Badge>
        </div>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Impossible de charger les données</p>
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
        <h2 className="text-2xl font-bold">Fiches d'Impôt</h2>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Receipt className="w-3 h-3" />
          <span>Synthèse Fiscale</span>
        </Badge>
      </div>

      {(currentRole === 'staff' || currentRole === 'dot') && (
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="text-lg">Entreprise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Choisir l'entreprise</Label>
                <Select value={entKey} onValueChange={setEntKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {entreprisesList.map((e)=> (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {entKey && (
                <div className="space-y-2">
                  <Label>Entreprise sélectionnée</Label>
                  <Badge variant="secondary">{entKey}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(!currentRole || (currentRole !== 'staff' && currentRole !== 'dot')) && entKey && (
        <div className="flex items-center justify-end">
          <Badge variant="outline">{entKey}</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {impotCards.map((card, index) => {
          const IconComponent = card.icon as any;
          return (
            <Card key={index} className="stat-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${card.bgColor}`}>
                  <IconComponent className={`w-4 h-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.color}`}>
                  {formatCurrencyDollar(card.value)}
                </div>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Résumé fiscal */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-primary" />
            <span>Résumé Fiscal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Calcul des Impôts</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA Brut :</span>
                    <span className="font-medium">{formatCurrencyDollar(state.caBrut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">- Dépenses déductibles :</span>
                    <span className="font-medium text-destructive">-{formatCurrencyDollar(state.depensesDeductibles)}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">= Bénéfice imposable :</span>
                    <span className="font-semibold text-primary">{formatCurrencyDollar(state.benefice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taux d'imposition :</span>
                    <span className="font-medium">{state.tauxImposition}%</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">= Montant d'impôts :</span>
                    <span className="font-semibold text-warning">{formatCurrencyDollar(state.montantImpots)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Bénéfice Final</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bénéfice après impôt :</span>
                    <span className="font-medium">{formatCurrencyDollar(state.beneficeApresImpot)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">- Total primes :</span>
                    <span className="font-medium text-warning">-{formatCurrencyDollar(state.totalPrimes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">- Total salaires :</span>
                    <span className="font-medium text-destructive">-{formatCurrencyDollar(state.totalSalaires)}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">= Bénéfice après primes :</span>
                    <span className="font-semibold text-primary">{formatCurrencyDollar(state.beneficeApresPrimes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">- Impôt richesse :</span>
                    <span className="font-medium text-destructive">-{formatCurrencyDollar(state.impotRichesse)}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Solde après salaires :</span>
                    <span className="font-bold text-success text-base">{formatCurrencyDollar(state.soldeBancaireApresSalaire)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
