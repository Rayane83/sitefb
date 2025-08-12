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

interface DashboardSummaryProps {
  guildId: string;
}

export function DashboardSummary({ guildId }: DashboardSummaryProps) {
  const [summary, setSummary] = useState<IDashboardSummary | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(false);
    setSummary(null);
    setError(null);
  }, [guildId]);

  const currentWeek = getISOWeek();
  const finalEmployeeCount = summary?.employee_count ?? employeeCount ?? 0;

  if (isLoading) {
    // plus de chargement de mock
    return null;
  }

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

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <span>Semaine {currentWeek}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CA Brut */}
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CA Brut
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrencyDollar(summary.ca_brut)}
            </div>
          </CardContent>
        </Card>

        {/* Dépenses */}
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dépenses
            </CardTitle>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrencyDollar(summary.depenses || 0)}
            </div>
            {summary.depenses_deductibles && (
              <p className="text-xs text-muted-foreground mt-1">
                Déductibles: {formatCurrencyDollar(summary.depenses_deductibles)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bénéfice */}
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bénéfice
            </CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrencyDollar(summary.benefice)}
            </div>
          </CardContent>
        </Card>

        {/* Taux d'imposition */}
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux d'imposition
            </CardTitle>
            <Receipt className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatPercentage(summary.taux_imposition)}
            </div>
          </CardContent>
        </Card>

        {/* Montant impôts */}
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Montant Impôts
            </CardTitle>
            <Receipt className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrencyDollar(summary.montant_impots)}
            </div>
          </CardContent>
        </Card>

        {/* Nombre d'employés */}
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Employés
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {finalEmployeeCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {finalEmployeeCount === summary.employee_count ? 'Direct' : 'Calculé'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}