import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyDollar } from '@/lib/fmt';
import { Receipt, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export function ImpotForm() {
  // Mock data - En réalité, ces données viendraient d'une API
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

  const impotCards = [
    {
      title: "CA Brut",
      value: impotData.caBrut,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Dépenses Déductibles",
      value: impotData.depensesDeductibles,
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
    {
      title: "Bénéfice",
      value: impotData.benefice,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Montant d'Impôts",
      value: impotData.montantImpots,
      icon: Receipt,
      color: "text-warning",
      bgColor: "bg-warning/10",
      subtitle: `Taux: ${impotData.tauxImposition}%`
    },
    {
      title: "Bénéfice Après Impôt",
      value: impotData.beneficeApresImpot,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Total Primes",
      value: impotData.totalPrimes,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      title: "Bénéfice Après Primes",
      value: impotData.beneficeApresPrimes,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Impôt Richesse",
      value: impotData.impotRichesse,
      icon: Receipt,
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
    {
      title: "Solde Bancaire Après Salaire",
      value: impotData.soldeBancaireApresSalaire,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fiches d'Impôt</h2>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Receipt className="w-3 h-3" />
          <span>Synthèse Fiscale</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {impotCards.map((card, index) => {
          const IconComponent = card.icon;
          
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subtitle}
                  </p>
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
                    <span className="font-medium">{formatCurrencyDollar(impotData.caBrut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">- Dépenses déductibles :</span>
                    <span className="font-medium text-destructive">
                      -{formatCurrencyDollar(impotData.depensesDeductibles)}
                    </span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">= Bénéfice imposable :</span>
                    <span className="font-semibold text-primary">
                      {formatCurrencyDollar(impotData.benefice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taux d'imposition :</span>
                    <span className="font-medium">{impotData.tauxImposition}%</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">= Montant d'impôts :</span>
                    <span className="font-semibold text-warning">
                      {formatCurrencyDollar(impotData.montantImpots)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Bénéfice Final</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bénéfice après impôt :</span>
                    <span className="font-medium">{formatCurrencyDollar(impotData.beneficeApresImpot)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">- Total primes :</span>
                    <span className="font-medium text-warning">
                      -{formatCurrencyDollar(impotData.totalPrimes)}
                    </span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">= Bénéfice après primes :</span>
                    <span className="font-semibold text-primary">
                      {formatCurrencyDollar(impotData.beneficeApresPrimes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">- Impôt richesse :</span>
                    <span className="font-medium text-destructive">
                      -{formatCurrencyDollar(impotData.impotRichesse)}
                    </span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Solde final :</span>
                    <span className="font-bold text-success text-base">
                      {formatCurrencyDollar(impotData.soldeBancaireApresSalaire)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Receipt className="w-4 h-4" />
                <span>Données simulées - Les vrais calculs se baseront sur les données de dotation</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}