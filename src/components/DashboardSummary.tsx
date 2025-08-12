import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSummary as IDashboardSummary } from '@/lib/types';
import { formatCurrencyDollar, formatPercentage, getISOWeek } from '@/lib/fmt';
import { handleApiError } from '@/lib/api';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Users, 
  Calendar,
  AlertCircle 
} from 'lucide-react';
import type { Role } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DashboardSummaryProps {
  guildId: string;
  currentRole?: Role;
  entreprise?: string;
}

export function DashboardSummary({ guildId, currentRole, entreprise }: DashboardSummaryProps) {
  const [items, setItems] = useState<Array<{
    entreprise: string;
    name?: string;
    ca_brut: number;
    depenses: number;
    benefice: number;
    taux_imposition: number;
    montant_impots: number;
    employee_count?: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enterpriseOptions, setEnterpriseOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEntKey, setSelectedEntKey] = useState<string>('all');

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!guildId) return;
      setIsLoading(true);
      setError(null);
      try {
        // 1) Entreprises disponibles
        const { data: ents, error: eEnt } = await supabase
          .from('enterprises')
          .select('key,name')
          .eq('guild_id', guildId)
          .order('name', { ascending: true });
        if (eEnt) throw eEnt;
        const list = (ents || []).map((e:any)=> ({ id: e.key as string, name: e.name as string }));
        setEnterpriseOptions(list);

        const role = (currentRole || 'employe').toLowerCase();
        const isStaffOrDot = role.includes('staff') || role.includes('dot');
        const targets = isStaffOrDot
          ? (selectedEntKey && selectedEntKey !== 'all' ? [selectedEntKey] : list.map((e) => e.id))
          : (entreprise ? [entreprise] : list[0] ? [list[0].id] : []);

        const results: any[] = [];
        for (const entKey of targets) {
          // Dernier rapport
          let rq = supabase
            .from('dotation_reports')
            .select('id, employees_count, totals, solde_actuel, created_at')
            .eq('guild_id', guildId)
            .eq('entreprise_key', entKey)
            .order('created_at', { ascending: false })
            .limit(1);
          const { data: rRows, error: rErr } = await rq;
          if (rErr) throw rErr;
          const report = rRows && rRows[0];

          let caBrut = 0, depenses = 0;
          if (report) {
            const { data: rows, error: rowsErr } = await supabase
              .from('dotation_rows')
              .select('ca_total, facture')
              .eq('report_id', report.id);
            if (rowsErr) throw rowsErr;
            for (const r of rows || []) {
              caBrut += Number(r.ca_total || 0);
              depenses += Number(r.facture || 0);
            }
          }

          const benefice = Math.max(0, caBrut - depenses);
          let tauxImposition = 0;
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
          const montantImpots = Math.round(benefice * (tauxImposition / 100));

          results.push({
            entreprise: entKey,
            name: list.find(e=>e.id===entKey)?.name || entKey,
            ca_brut: caBrut,
            depenses,
            benefice,
            taux_imposition: tauxImposition,
            montant_impots: montantImpots,
            employee_count: report?.employees_count || 0,
          });
        }
        if (!alive) return;
        setItems(results);
      } catch (e) {
        if (alive) setError(handleApiError(e));
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [guildId, currentRole, entreprise, selectedEntKey]);

  const currentWeek = getISOWeek();

  if (isLoading) return null;
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <Badge variant="outline">Semaine {currentWeek}</Badge>
        </div>
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
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-3">
          {(currentRole === 'staff' || currentRole === 'dot') && (
            <Select value={selectedEntKey} onValueChange={setSelectedEntKey}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Toutes les entreprises" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les entreprises</SelectItem>
                {enterpriseOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Badge variant="outline" className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>Semaine {currentWeek}</span>
          </Badge>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="stat-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Aucune entreprise disponible.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it) => (
            <Card key={it.entreprise} className="stat-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{it.name}</span>
                  <Badge variant="secondary">{it.entreprise}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CA Brut</span>
                  <span className="font-semibold text-success">{formatCurrencyDollar(it.ca_brut)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dépenses</span>
                  <span className="font-semibold text-destructive">-{formatCurrencyDollar(it.depenses)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bénéfice</span>
                  <span className="font-semibold text-primary">{formatCurrencyDollar(it.benefice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taux d'imposition</span>
                  <span className="font-semibold text-warning">{formatPercentage(it.taux_imposition)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Montant Impôts</span>
                  <span className="font-semibold text-warning">{formatCurrencyDollar(it.montant_impots)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Employés</span>
                  <span className="font-semibold flex items-center"><Users className="w-4 h-4 mr-1 text-muted-foreground" />{it.employee_count ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}