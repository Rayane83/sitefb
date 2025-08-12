import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSummary as IDashboard } from '@/lib/types';
import { formatCurrencyDollar, formatPercentage, getISOWeek } from '@/lib/fmt';
import { mockApi, handleApiError } from '@/lib/api';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Users, Calendar, AlertCircle } from 'lucide-react';

export function DashboardSummary({ guildId }: { guildId: string }) {
  const [summary, setSummary] = useState<IDashboard | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!guildId) return;
      setIsLoading(true); setError(null);
      try {
        const s = await mockApi.getDashboardSummary(guildId);
        if (!alive) return; setSummary(s);
        if (!s.employee_count) {
          try { const c = await mockApi.getEmployeeCount(guildId, 'Employé Bennys'); if (alive) setEmployeeCount(c.count); } catch {}
        }
      } catch (e) { if (alive) setError(handleApiError(e)); }
      finally { if (alive) setIsLoading(false); }
    }
    run();
    return () => { alive = false };
  }, [guildId]);

  if (isLoading) return <div className="h-28 rounded-md bg-muted animate-pulse" />;
  if (error) return <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>;
  if (!summary) return null;

  const cards = [
    { title: 'CA Brut', value: formatCurrencyDollar(summary.ca_brut), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Dépenses', value: formatCurrencyDollar(summary.depenses ?? 0), icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
    { title: 'Bénéfice', value: formatCurrencyDollar(summary.benefice), icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    { title: "Montant d'Impôts", value: formatCurrencyDollar(summary.montant_impots), icon: Receipt, color: 'text-warning', bg: 'bg-warning/10', subtitle: `Taux: ${formatPercentage(summary.taux_imposition)}` },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.title} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold">{c.value}</div>
              {c.subtitle && <div className="text-xs text-muted-foreground mt-1">{c.subtitle}</div>}
            </div>
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${c.bg}`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Employés</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold">{employeeCount ?? summary.employee_count}</div>
            <div className="text-xs text-muted-foreground mt-1">Semaine {getISOWeek()}</div>
          </div>
          <div className="w-10 h-10 rounded-md flex items-center justify-center bg-secondary">
            <Users className="w-5 h-5 text-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Infos</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" /> Données mockées pour démonstration.
        </CardContent>
      </Card>
    </div>
  );
}
