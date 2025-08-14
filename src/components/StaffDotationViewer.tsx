import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DotationRow } from '@/lib/types';
import { formatCurrencyDollar } from '@/lib/fmt';
import { handleApiError } from '@/lib/api';
import { 
  Archive, 
  AlertCircle, 
  Eye, 
  Edit, 
  Save,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { exportDotationToPDF } from '@/lib/pdfExport';

interface StaffDotationViewerProps {
  guildId: string;
  currentRole: string;
}

interface DotationReport {
  id: string;
  created_at: string;
  entreprise_key: string;
  solde_actuel: number;
  totals: any;
  employees_count: number;
  rows: DotationRow[];
}

export function StaffDotationViewer({ guildId, currentRole }: StaffDotationViewerProps) {
  const [reports, setReports] = useState<DotationReport[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingReport, setEditingReport] = useState<DotationReport | null>(null);
  const { toast } = useToast();

  const isStaff = currentRole.toLowerCase().includes('staff');

  useEffect(() => {
    let alive = true;

    async function fetchReports() {
      if (!guildId || !isStaff) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // Charger tous les rapports non archivés
        const { data: reportsData, error: reportsErr } = await supabase
          .from('dotation_reports')
          .select('*')
          .eq('guild_id', guildId)
          .is('archived_at', null)
          .order('created_at', { ascending: false });

        if (reportsErr) throw reportsErr;

        if (!alive) return;

        // Charger les lignes pour chaque rapport
        const reportsWithRows: DotationReport[] = [];
        for (const report of reportsData || []) {
          const { data: rowsData, error: rowsErr } = await supabase
            .from('dotation_rows')
            .select('*')
            .eq('report_id', report.id);

          if (rowsErr) throw rowsErr;

          const mappedRows: DotationRow[] = (rowsData || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            run: Number(r.run) || 0,
            facture: Number(r.facture) || 0,
            vente: Number(r.vente) || 0,
            ca_total: Number(r.ca_total) || 0,
            salaire: Number(r.salaire) || 0,
            prime: Number(r.prime) || 0,
          }));

          reportsWithRows.push({
            id: report.id,
            created_at: report.created_at,
            entreprise_key: report.entreprise_key,
            solde_actuel: Number(report.solde_actuel) || 0,
            totals: report.totals,
            employees_count: report.employees_count || 0,
            rows: mappedRows
          });
        }

        setReports(reportsWithRows);
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

    fetchReports();

    return () => {
      alive = false;
    };
  }, [guildId, isStaff]);

  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const updateRowInEdit = (rowIndex: number, field: keyof DotationRow, value: any) => {
    if (!editingReport) return;

    const updatedRows = editingReport.rows.map((row, index) => {
      if (index === rowIndex) {
        const newRow = { ...row, [field]: value };
        // Recalcul automatique du CA total
        if (['run', 'facture', 'vente'].includes(field as string)) {
          newRow.ca_total = newRow.run + newRow.facture + newRow.vente;
        }
        return newRow;
      }
      return row;
    });

    setEditingReport({ ...editingReport, rows: updatedRows });
  };

  const saveEditedReport = async () => {
    if (!editingReport) return;

    try {
      // Sauvegarder les modifications
      for (const row of editingReport.rows) {
        const { error } = await supabase
          .from('dotation_rows')
          .update({
            name: row.name,
            run: row.run,
            facture: row.facture,
            vente: row.vente,
            ca_total: row.ca_total,
            salaire: row.salaire,
            prime: row.prime,
          })
          .eq('id', row.id);
        if (error) throw error;
      }

      // Mettre à jour le rapport local
      setReports(prev => prev.map(r => 
        r.id === editingReport.id ? editingReport : r
      ));

      setEditMode(false);
      setEditingReport(null);

      toast({
        title: 'Modifications sauvegardées',
        description: 'Le rapport a été mis à jour avec succès'
      });
    } catch (err) {
      toast({
        title: 'Erreur de sauvegarde',
        description: handleApiError(err),
        variant: 'destructive'
      });
    }
  };

  if (!isStaff) {
    return (
      <Card className="stat-card">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p>Accès réservé au staff</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="stat-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Fiches dotation non archivées</h3>
        <div className="flex items-center gap-2">
            <Label>
              <Checkbox
                checked={editMode}
                onCheckedChange={(checked) => setEditMode(checked === true)}
              />
              <span className="ml-2">Mode édition</span>
            </Label>
          {selectedReports.length > 0 && (
            <Button
              onClick={async () => {
                const selectedData = reports.filter(r => selectedReports.includes(r.id));
                for (const report of selectedData) {
                  try {
                    await exportDotationToPDF({
                      rows: report.rows,
                      soldeActuel: report.solde_actuel,
                      totals: {
                        totalCA: report.rows.reduce((sum, row) => sum + row.ca_total, 0),
                        totalSalaires: report.rows.reduce((sum, row) => sum + row.salaire, 0),
                        totalPrimes: report.rows.reduce((sum, row) => sum + row.prime, 0),
                      },
                      limits: {
                        maxSalaireEmp: 0,
                        maxPrimeEmp: 0,
                        maxSalairePat: 0,
                        maxPrimePat: 0,
                      },
                      paliers: [],
                      entreprise: report.entreprise_key,
                      employeesCount: report.employees_count,
                    });
                  } catch (error) {
                    console.error('Erreur export PDF:', error);
                  }
                }
                toast({
                  title: 'Export PDF',
                  description: `${selectedReports.length} rapport(s) exporté(s)`
                });
              }}
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              Exporter sélection PDF
            </Button>
          )}
        </div>
      </div>

      {reports.length === 0 ? (
        <Card className="stat-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Aucune fiche de dotation en attente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="stat-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Checkbox
                      checked={selectedReports.includes(report.id)}
                      onCheckedChange={(checked) => {
                        if (checked) toggleReportSelection(report.id);
                      }}
                    />
                    <span>{report.entreprise_key}</span>
                    <Badge variant="outline">
                      {new Date(report.created_at).toLocaleDateString()}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {report.employees_count} employés
                    </Badge>
                    <Badge variant="outline">
                      Solde: {formatCurrencyDollar(report.solde_actuel)}
                    </Badge>
                    {editMode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingReport(editingReport?.id === report.id ? null : report)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingReport?.id === report.id ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="p-2 text-left">Nom</th>
                            <th className="p-2 text-left">RUN</th>
                            <th className="p-2 text-left">Facture</th>
                            <th className="p-2 text-left">Vente</th>
                            <th className="p-2 text-left">CA Total</th>
                            <th className="p-2 text-left">Salaire</th>
                            <th className="p-2 text-left">Prime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingReport.rows.map((row, idx) => (
                            <tr key={row.id} className="border-b">
                              <td className="p-2">
                                <Input
                                  value={row.name}
                                  onChange={(e) => updateRowInEdit(idx, 'name', e.target.value)}
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={row.run}
                                  onChange={(e) => updateRowInEdit(idx, 'run', Number(e.target.value) || 0)}
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={row.facture}
                                  onChange={(e) => updateRowInEdit(idx, 'facture', Number(e.target.value) || 0)}
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={row.vente}
                                  onChange={(e) => updateRowInEdit(idx, 'vente', Number(e.target.value) || 0)}
                                />
                              </td>
                              <td className="p-2">
                                <span className="font-mono">{formatCurrencyDollar(row.ca_total)}</span>
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={row.salaire}
                                  onChange={(e) => updateRowInEdit(idx, 'salaire', Number(e.target.value) || 0)}
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={row.prime}
                                  onChange={(e) => updateRowInEdit(idx, 'prime', Number(e.target.value) || 0)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEditedReport} className="btn-discord">
                        <Save className="w-4 h-4 mr-2" />
                        Sauvegarder
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingReport(null);
                          setEditMode(false);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-left">Nom</th>
                          <th className="p-2 text-left">RUN</th>
                          <th className="p-2 text-left">Facture</th>
                          <th className="p-2 text-left">Vente</th>
                          <th className="p-2 text-left">CA Total</th>
                          <th className="p-2 text-left">Salaire</th>
                          <th className="p-2 text-left">Prime</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows.map((row) => (
                          <tr key={row.id} className="border-b">
                            <td className="p-2">{row.name}</td>
                            <td className="p-2">{formatCurrencyDollar(row.run)}</td>
                            <td className="p-2">{formatCurrencyDollar(row.facture)}</td>
                            <td className="p-2">{formatCurrencyDollar(row.vente)}</td>
                            <td className="p-2 font-mono">{formatCurrencyDollar(row.ca_total)}</td>
                            <td className="p-2">{formatCurrencyDollar(row.salaire)}</td>
                            <td className="p-2">{formatCurrencyDollar(row.prime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}