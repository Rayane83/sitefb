import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyDollar } from '@/lib/fmt';
import { Receipt, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export function ImpotForm() {
  const impotData = {
    caBrut: 125000,
    depensesDeductibles: 28000,
    benefice: 97000,
    tauxImposition: 25,
    montantImpots: 24250,
    beneficeApresImpot: 72750,
    totalPrimes: 15000,
    beneficeApresPrimes: 57750,
    impotRichesse: 2500,
    soldeBancaireApresSalaire: 450000,
  };

  const cards = [
    { title: 'CA Brut', value: impotData.caBrut, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Dépenses Déductibles', value: impotData.depensesDeductibles, icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
    { title: 'Bénéfice', value: impotData.benefice, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    { title: "Montant d'Impôts", value: impotData.montantImpots, icon: Receipt, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{c.title}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrencyDollar(c.value)}</CardContent>
        </Card>
      ))}
    </div>
  );
}
