import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DotationData, DotationRow, PalierConfig } from '@/lib/types';
import { formatCurrencyDollar, parseNumber, calculateFromPaliers, generateId } from '@/lib/fmt';
import { handleApiError } from '@/lib/api';
import { 
  Plus, 
  Save, 
  Trash2, 
  Calculator,
  AlertCircle,
  Check,
  Archive,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { exportDotationToPDF } from '@/lib/pdfExport';
import { exportDotationXLSX, parseClipboardDotationData } from '@/lib/export';

interface DotationFormProps {
  guildId: string;
  entreprise: string;
  currentRole: string;
}

export function DotationForm({ guildId, entreprise, currentRole }: DotationFormProps) {
  const [dotationData, setDotationData] = useState<DotationData | null>(null);
  const [paliers, setPaliers] = useState<PalierConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Lecture seule pour Staff
  const isStaffReadOnly = (currentRole || '').toLowerCase().includes('staff');
  const [reportId, setReportId] = useState<string | null>(null);
  const [initialRowIds, setInitialRowIds] = useState<string[]>([]);
  // Tableaux simples: Dépense déductible et Tableau des retraits
  type SimpleEntry = { id: string; date: string; label: string; amount: number };
  const [expenses, setExpenses] = useState<SimpleEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<SimpleEntry[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;

    async function fetchData() {
      if (!guildId) return;
      
      setIsLoading(true);
      setError(null);

        try {
          // Charger paliers depuis Supabase
          const { data: brk, error: e1 } = await supabase
            .from('tax_brackets')
            .select('*')
            .eq('guild_id', guildId)
            .eq('entreprise_key', entreprise);
          if (e1) throw e1;

          let paliersToUse: PalierConfig[] = (brk || []).map((b: any) => ({
            min: Number(b.min) || 0,
            max: b.max === null || b.max === undefined ? Number((Number(b.min) || 0) + 1e12) : Number(b.max),
            taux: Number(b.taux) || 0,
            sal_min_emp: Number(b.sal_min_emp) || 0,
            sal_max_emp: Number(b.sal_max_emp) || 0,
            sal_min_pat: Number(b.sal_min_pat) || 0,
            sal_max_pat: Number(b.sal_max_pat) || 0,
            pr_min_emp: Number(b.pr_min_emp) || 0,
            pr_max_emp: Number(b.pr_max_emp) || 0,
            pr_min_pat: Number(b.pr_min_pat) || 0,
            pr_max_pat: Number(b.pr_max_pat) || 0,
          }));

          setPaliers(paliersToUse);

          // Charger la liste des rapports non archivés (en attente)
          const { data: pend, error: ePend } = await supabase
            .from('dotation_reports')
            .select('id, created_at, solde_actuel, totals, employees_count')
            .eq('guild_id', guildId)
            .eq('entreprise_key', entreprise)
            .is('archived_at', null)
            .order('created_at', { ascending: false });
          if (ePend) throw ePend;
          setPendingReports(pend || []);

          // Déterminer quel rapport charger dans le formulaire (le plus récent non archivé si existe)
          let rep: any | null = pend && pend.length ? pend[0] : null;
          if (!rep) {
            const { data: reps, error: e2 } = await supabase
              .from('dotation_reports')
              .select('id, solde_actuel')
              .eq('guild_id', guildId)
              .eq('entreprise_key', entreprise)
              .order('created_at', { ascending: false })
              .limit(1);
            if (e2) throw e2;
            rep = reps && reps.length ? reps[0] : null;
          }

          if (rep) {
            const { data: rows, error: e3 } = await supabase
              .from('dotation_rows')
              .select('*')
              .eq('report_id', rep.id);
            if (e3) throw e3;

            const mappedRows: DotationRow[] = (rows || []).map((r: any) => ({
              id: r.id,
              name: r.name,
              run: Number(r.run) || 0,
              facture: Number(r.facture) || 0,
              vente: Number(r.vente) || 0,
              ca_total: Number(r.ca_total) || 0,
              salaire: Number(r.salaire) || 0,
              prime: Number(r.prime) || 0,
            }));

            setReportId(rep.id);
            setInitialRowIds(mappedRows.map((r)=> r.id));
            setDotationData({ rows: mappedRows, soldeActuel: Number(rep.solde_actuel) || 0 });
          } else {
            // Valeurs par défaut
            setReportId(null);
            setInitialRowIds([]);
            setDotationData({ rows: [], soldeActuel: 0 });
          }

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

    fetchData();

    return () => {
      alive = false;
    };
  }, [guildId, entreprise]);

  // Écoute les événements de synchronisation pour rafraîchir automatiquement
  useEffect(() => {
    const handleDataSync = (event: CustomEvent) => {
      const { table } = event.detail;
      // Rafraîchir si c'est une table qui affecte les dotations
      if (['dotation_reports', 'dotation_rows', 'periodic', 'focus'].includes(table)) {
        console.log(`Rafraîchissement des dotations suite à: ${table}`);
        // Refetch data
        setIsLoading(true);
        const fetchData = async () => {
          if (!guildId) return;
          setError(null);
          try {
            // Recharger les données de dotation
            const { data: pend, error: ePend } = await supabase
              .from('dotation_reports')
              .select('id, created_at, solde_actuel, totals, employees_count')
              .eq('guild_id', guildId)
              .eq('entreprise_key', entreprise)
              .is('archived_at', null);
            if (ePend) throw ePend;
            setPendingReports(pend || []);
          } catch (err) {
            setError(handleApiError(err));
          } finally {
            setIsLoading(false);
          }
        };
        fetchData();
      }
    };

    window.addEventListener('data-sync', handleDataSync as EventListener);
    return () => window.removeEventListener('data-sync', handleDataSync as EventListener);
  }, [guildId, entreprise]);

  const loadReport = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: rep, error: e1 } = await supabase
        .from('dotation_reports')
        .select('id, solde_actuel')
        .eq('id', id)
        .maybeSingle();
      if (e1) throw e1;
      const { data: rows, error: e2 } = await supabase
        .from('dotation_rows')
        .select('*')
        .eq('report_id', id);
      if (e2) throw e2;
      const mapped: DotationRow[] = (rows || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        run: Number(r.run) || 0,
        facture: Number(r.facture) || 0,
        vente: Number(r.vente) || 0,
        ca_total: Number(r.ca_total) || 0,
        salaire: Number(r.salaire) || 0,
        prime: Number(r.prime) || 0,
      }));
      setReportId(id);
      setInitialRowIds(mapped.map((r)=> r.id));
      setDotationData({ rows: mapped, soldeActuel: Number(rep?.solde_actuel) || 0 });
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const updateRow = (id: string, field: keyof DotationRow, value: any) => {
    if (!dotationData) return;

    const updatedRows = dotationData.rows.map(row => {
      if (row.id === id) {
        const newRow: DotationRow = { ...row, [field]: value } as DotationRow;
        // Recalcul automatique quand des champs chiffres changent
        if (['run', 'facture', 'vente'].includes(field as string)) {
          newRow.run = Number(newRow.run) || 0;
          newRow.facture = Number(newRow.facture) || 0;
          newRow.vente = Number(newRow.vente) || 0;
          newRow.ca_total = newRow.run + newRow.facture + newRow.vente;

          const isPatron = currentRole.toLowerCase().includes('patron');
          const { salaire, prime } = calculateFromPaliers(newRow.ca_total, paliers, isPatron);
          newRow.salaire = salaire;
          newRow.prime = prime;
        }
        return newRow;
      }
      return row;
    });

    setDotationData({ ...dotationData, rows: updatedRows });
  };

  const addEmployee = () => {
    if (!dotationData) return;

    const newEmployee: DotationRow = {
      id: generateId(),
      name: `Employé ${dotationData.rows.length + 1}`,
      run: 0,
      facture: 0,
      vente: 0,
      ca_total: 0,
      salaire: 0,
      prime: 0,
    };

    setDotationData({
      ...dotationData,
      rows: [...dotationData.rows, newEmployee]
    });
  };

  const removeEmployee = (id: string) => {
    if (!dotationData) return;

    setDotationData({
      ...dotationData,
      rows: dotationData.rows.filter(row => row.id !== id)
    });
  };

  const handleSave = async () => {
    if (!dotationData) return;

    setIsSaving(true);
    try {
      const totalExpenses = expenses.reduce((sum, r) => sum + r.amount, 0);
      const totalWithdrawals = withdrawals.reduce((sum, r) => sum + r.amount, 0);

      const totalsPayload = {
        totalExpenses,
        totalWithdrawals,
        totalCA,
        totalSalaires,
        totalPrimes,
      };

      if (reportId) {
        // UPDATE existing report
        const { data: repUpd, error: repUpdErr } = await supabase
          .from('dotation_reports')
          .update({
            solde_actuel: dotationData.soldeActuel,
            totals: totalsPayload,
            employees_count: dotationData.rows.length,
          })
          .eq('id', reportId)
          .select('id')
          .maybeSingle();
        if (repUpdErr) throw repUpdErr;
        const rid = repUpd?.id || reportId;

        const currentIds = dotationData.rows.map((r) => r.id);
        const deletedIds = initialRowIds.filter((id) => !currentIds.includes(id));
        if (deletedIds.length) {
          const { error } = await supabase.from('dotation_rows').delete().in('id', deletedIds);
          if (error) throw error;
        }

        // Update existing rows
        for (const r of dotationData.rows) {
          if (initialRowIds.includes(r.id)) {
            const { error } = await supabase
              .from('dotation_rows')
              .update({
                name: r.name,
                run: r.run,
                facture: r.facture,
                vente: r.vente,
                ca_total: r.ca_total,
                salaire: r.salaire,
                prime: r.prime,
              })
              .eq('id', r.id);
            if (error) throw error;
          }
        }

        // Insert new rows
        const newRows = dotationData.rows.filter((r) => !initialRowIds.includes(r.id));
        if (newRows.length) {
          const inserts = newRows.map((r) => ({
            report_id: rid,
            name: r.name,
            run: r.run,
            facture: r.facture,
            vente: r.vente,
            ca_total: r.ca_total,
            salaire: r.salaire,
            prime: r.prime,
          }));
          const { error } = await supabase.from('dotation_rows').insert(inserts);
          if (error) throw error;
        }

        // Refresh from DB to capture real IDs
        const { data: fresh, error: freshErr } = await supabase
          .from('dotation_rows')
          .select('*')
          .eq('report_id', rid);
        if (freshErr) throw freshErr;
        const mapped: DotationRow[] = (fresh || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          run: Number(r.run) || 0,
          facture: Number(r.facture) || 0,
          vente: Number(r.vente) || 0,
          ca_total: Number(r.ca_total) || 0,
          salaire: Number(r.salaire) || 0,
          prime: Number(r.prime) || 0,
        }));
        setDotationData({ rows: mapped, soldeActuel: dotationData.soldeActuel });
        setInitialRowIds(mapped.map((r) => r.id));
        setReportId(rid);
      } else {
        // CREATE new report + rows
        const { data: repIns, error: repErr } = await supabase
          .from('dotation_reports')
          .insert({
            guild_id: guildId,
            entreprise_key: entreprise,
            solde_actuel: dotationData.soldeActuel,
            totals: totalsPayload,
            employees_count: dotationData.rows.length,
          })
          .select('id')
          .single();
        if (repErr) throw repErr;

        const rowsPayload = dotationData.rows.map((r) => ({
          report_id: repIns!.id,
          name: r.name,
          run: r.run,
          facture: r.facture,
          vente: r.vente,
          ca_total: r.ca_total,
          salaire: r.salaire,
          prime: r.prime,
        }));
        const { error: rowsErr } = await supabase
          .from('dotation_rows')
          .insert(rowsPayload);
        if (rowsErr) throw rowsErr;

        // Refresh
        const { data: fresh, error: freshErr } = await supabase
          .from('dotation_rows')
          .select('*')
          .eq('report_id', repIns!.id);
        if (freshErr) throw freshErr;
        const mapped: DotationRow[] = (fresh || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          run: Number(r.run) || 0,
          facture: Number(r.facture) || 0,
          vente: Number(r.vente) || 0,
          ca_total: Number(r.ca_total) || 0,
          salaire: Number(r.salaire) || 0,
          prime: Number(r.prime) || 0,
        }));
        setDotationData({ rows: mapped, soldeActuel: dotationData.soldeActuel });
        setInitialRowIds(mapped.map((r) => r.id));
        setReportId(repIns!.id);
      }

      toast({
        title: 'Sauvegarde réussie',
        description: 'Les dotations ont été enregistrées avec succès',
      });
    } catch (err) {
      toast({
        title: 'Erreur de sauvegarde',
        description: handleApiError(err),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

// Export supprimés (impôt/blanchiment) selon la nouvelle demande

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dotations</h2>
          <div className="loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dotations</h2>
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

  if (!dotationData) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dotations</h2>
        <Card className="stat-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Aucune donnée de dotation disponible</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCA = dotationData.rows.reduce((sum, row) => sum + row.ca_total, 0);
  const totalSalaires = dotationData.rows.reduce((sum, row) => sum + row.salaire, 0);
  const totalPrimes = dotationData.rows.reduce((sum, row) => sum + row.prime, 0);
  const totalExpenses = expenses.reduce((sum, r) => sum + r.amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum, r) => sum + r.amount, 0);

  // Max calculés automatiquement depuis les paliers (fenêtre d’info)
  const maxSalaireEmp = Math.max(0, ...paliers.map((p) => Number(p.sal_max_emp) || 0));
  const maxPrimeEmp = Math.max(0, ...paliers.map((p) => Number(p.pr_max_emp) || 0));
  const maxSalairePat = Math.max(0, ...paliers.map((p) => Number(p.sal_max_pat) || 0));
  const maxPrimePat = Math.max(0, ...paliers.map((p) => Number(p.pr_max_pat) || 0));

  // Envoyer aux archives
  const handleSendToArchive = async () => {
    if (!dotationData) return;
    setIsSaving(true);
    try {
      const entry = {
        date: new Date().toISOString(),
        type: 'dotation',
        entreprise,
        statut: 'En attente',
        payload: {
          rows: dotationData.rows,
          soldeActuel: dotationData.soldeActuel,
          totals: { totalCA, totalSalaires, totalPrimes, totalExpenses, totalWithdrawals },
          limits: { maxSalaireEmp, maxPrimeEmp, maxSalairePat, maxPrimePat },
          paliers,
          employeesCount: dotationData.rows.length,
        }
      };
      const { error: archErr } = await supabase.from('archives').insert({
        guild_id: guildId,
        entreprise_key: entreprise,
        type: entry.type,
        payload: entry.payload as any,
        statut: entry.statut,
        date: entry.date,
        montant: totalSalaires + totalPrimes
      });
      if (archErr) throw archErr;

      // Marquer le rapport comme archivé s'il existe
      if (reportId) {
        const { error: updErr } = await supabase
          .from('dotation_reports')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', reportId);
        if (updErr) throw updErr;

        // Rafraîchir la liste des enregistrements en attente
        const { data: pend, error: ePend } = await supabase
          .from('dotation_reports')
          .select('id, created_at, solde_actuel, totals, employees_count')
          .eq('guild_id', guildId)
          .eq('entreprise_key', entreprise)
          .is('archived_at', null)
          .order('created_at', { ascending: false });
        if (!ePend) setPendingReports(pend || []);
      }

      toast({ title: 'Envoyé aux archives', description: 'Le rapport a été archivé.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible d’archiver.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dotations</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{entreprise}</Badge>
          <Badge variant="secondary">{dotationData.rows.length} employé(s)</Badge>
        </div>
      </div>

      {/* Enregistrements non archivés */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Enregistrements non archivés</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun enregistrement en attente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-center p-2">Employés</th>
                    <th className="text-center p-2">Solde</th>
                    <th className="text-center p-2">CA total</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReports.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="p-2 text-center">{r.employees_count ?? 0}</td>
                      <td className="p-2 text-center">{formatCurrencyDollar(Number(r.solde_actuel) || 0)}</td>
                      <td className="p-2 text-center">{formatCurrencyDollar(Number((r.totals as any)?.totalCA || 0))}</td>
                      <td className="p-2 text-center">
                        <Button size="sm" variant="outline" onClick={() => loadReport(r.id)}>Ouvrir</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solde actuel */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Solde Actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Label htmlFor="solde" className="text-sm font-medium">
              Solde bancaire :
            </Label>
            <Input
              id="solde"
              type="text"
              value={formatCurrencyDollar(dotationData.soldeActuel)}
              onChange={(e) => {
                const value = parseNumber(e.target.value);
                setDotationData({ ...dotationData, soldeActuel: value });
              }}
              className="w-48"
              disabled={isStaffReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Limites actuelles (calcul automatique) */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Limites actuelles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Salaire maximum employé</div>
              <div className="text-xl font-semibold">{formatCurrencyDollar(maxSalaireEmp)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Prime maximum employé</div>
              <div className="text-xl font-semibold">{formatCurrencyDollar(maxPrimeEmp)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Salaire maximum patron</div>
              <div className="text-xl font-semibold">{formatCurrencyDollar(maxSalairePat)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Prime maximum patron</div>
              <div className="text-xl font-semibold">{formatCurrencyDollar(maxPrimePat)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des employés */}
      <Card className="stat-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Employés</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Astuce: collez depuis Excel (Nom, RUN, FACTURE, VENTE)</span>
            <Button onClick={addEmployee} size="sm" className="btn-discord" disabled={isStaffReadOnly}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un employé
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-2">
            <Label>Zone de collage (Nom, RUN, FACTURE, VENTE)</Label>
            <Textarea
              placeholder="Nom; RUN; FACTURE; VENTE"
              onPaste={(e)=>{
                if (!dotationData) return;
                const text = e.clipboardData.getData('text/plain');
                if (!text) return;
                e.preventDefault(); e.stopPropagation();
                const lines = text.split(/\r?\n/).filter(Boolean);
                const parsed = lines.map((l) => l.split(/[\t,;]/));
                let rows = [...dotationData.rows];
                let idx = 0;
                for (const cols of parsed) {
                  const [name, runStr, factureStr, venteStr] = cols;
                  const run = parseNumber(runStr || '0');
                  const facture = parseNumber(factureStr || '0');
                  const vente = parseNumber(venteStr || '0');
                  const ca_total = run + facture + vente;
                  const isPatron = currentRole.toLowerCase().includes('patron');
                  const { salaire, prime } = calculateFromPaliers(ca_total, paliers, isPatron);
                  if (idx < rows.length) {
                    rows[idx] = { ...rows[idx], name: name || rows[idx].name, run, facture, vente, ca_total, salaire, prime };
                  } else {
                    rows.push({ id: generateId(), name: name || `Employé ${rows.length + 1}`, run, facture, vente, ca_total, salaire, prime });
                  }
                  idx++;
                }
                setDotationData({ ...dotationData, rows });
                toast({ title: 'Collage importé', description: `${parsed.length} ligne(s) appliquée(s).` });
              }}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Nom</th>
                  <th className="text-center p-2">RUN</th>
                  <th className="text-center p-2">FACTURE</th>
                  <th className="text-center p-2">VENTE</th>
                  <th className="text-center p-2">CA Total</th>
                  <th className="text-center p-2">Salaire</th>
                  <th className="text-center p-2">Prime</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dotationData.rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                        className="min-w-32"
                        disabled={isStaffReadOnly}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.run}
                        onChange={(e) => updateRow(row.id, 'run', parseNumber(e.target.value))}
                        className="w-24 text-center"
                        disabled={isStaffReadOnly}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.facture}
                        onChange={(e) => updateRow(row.id, 'facture', parseNumber(e.target.value))}
                        className="w-24 text-center"
                        disabled={isStaffReadOnly}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.vente}
                        onChange={(e) => updateRow(row.id, 'vente', parseNumber(e.target.value))}
                        className="w-24 text-center"
                        disabled={isStaffReadOnly}
                      />
                    </td>
                    <td className="p-2 text-center font-semibold text-primary">
                      {formatCurrencyDollar(row.ca_total)}
                    </td>
                    <td className="p-2 text-center font-semibold text-success">
                      {formatCurrencyDollar(row.salaire)}
                    </td>
                    <td className="p-2 text-center font-semibold text-warning">
                      {formatCurrencyDollar(row.prime)}
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeEmployee(row.id)}
                        disabled={isStaffReadOnly}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between items-center font-semibold">
              <span>Totaux :</span>
              <div className="flex space-x-8">
                <span className="text-primary">CA: {formatCurrencyDollar(totalCA)}</span>
                <span className="text-success">Salaires: {formatCurrencyDollar(totalSalaires)}</span>
                <span className="text-warning">Primes: {formatCurrencyDollar(totalPrimes)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dépense déductible + Tableau des retraits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dépense déductible */}
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Dépense déductible</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Collez: Date, Justificatif, Montant</span>
              <Button size="sm" variant="outline" onClick={() => setExpenses((prev)=> [...prev, { id: generateId(), date: '', label: '', amount: 0 }])} disabled={isStaffReadOnly}>
                <Plus className="w-4 h-4 mr-2" />Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <Label>Zone de collage (Date, Justificatif, Montant)</Label>
              <Textarea placeholder="JJ/MM/AAAA; Libellé; Montant" onPaste={(e)=>{
                const text = e.clipboardData.getData('text/plain');
                if(!text) return; e.preventDefault(); e.stopPropagation();
                const lines = text.split(/\r?\n/).filter(Boolean);
                const parsed = lines.map((l)=> l.split(/[\t,;]/));
                const toAdd: SimpleEntry[] = [];
                for(const cols of parsed){
                  const [date, label, amountStr] = cols;
                  const amount = parseNumber(amountStr || '0');
                  toAdd.push({ id: generateId(), date: (date||'').trim(), label: (label||'').trim(), amount });
                }
                setExpenses((prev)=> [...prev, ...toAdd]);
                toast({ title: 'Collage importé', description: `${toAdd.length} ligne(s) ajoutée(s).` });
              }} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Justificatif</th>
                    <th className="text-center p-2">Montant</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((row, idx)=> (
                    <tr key={row.id} className="border-b hover:bg-muted/50">
                      <td className="p-2"><Input value={row.date} onChange={(e)=> setExpenses((prev)=> prev.map((r,i)=> i===idx?{...r, date: e.target.value}:r))} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input value={row.label} onChange={(e)=> setExpenses((prev)=> prev.map((r,i)=> i===idx?{...r, label: e.target.value}:r))} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input type="number" className="w-28 text-center" value={row.amount} onChange={(e)=> setExpenses((prev)=> prev.map((r,i)=> i===idx?{...r, amount: parseNumber(e.target.value)}:r))} disabled={isStaffReadOnly} /></td>
                      <td className="p-2 text-center">
                        <Button size="sm" variant="destructive" onClick={()=> setExpenses((prev)=> prev.filter((_,i)=> i!==idx))} disabled={isStaffReadOnly}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-right font-semibold">
              Total: {formatCurrencyDollar(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        {/* Tableau des retraits */}
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Tableau des retraits</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Collez: Date, Justificatif, Montant</span>
              <Button size="sm" variant="outline" onClick={() => setWithdrawals((prev)=> [...prev, { id: generateId(), date: '', label: '', amount: 0 }])} disabled={isStaffReadOnly}>
                <Plus className="w-4 h-4 mr-2" />Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <Label>Zone de collage (Date, Justificatif, Montant)</Label>
              <Textarea placeholder="JJ/MM/AAAA; Libellé; Montant" onPaste={(e)=>{
                const text = e.clipboardData.getData('text/plain');
                if(!text) return; e.preventDefault(); e.stopPropagation();
                const lines = text.split(/\r?\n/).filter(Boolean);
                const parsed = lines.map((l)=> l.split(/[\t,;]/));
                const toAdd: SimpleEntry[] = [];
                for(const cols of parsed){
                  const [date, label, amountStr] = cols;
                  const amount = parseNumber(amountStr || '0');
                  toAdd.push({ id: generateId(), date: (date||'').trim(), label: (label||'').trim(), amount });
                }
                setWithdrawals((prev)=> [...prev, ...toAdd]);
                toast({ title: 'Collage importé', description: `${toAdd.length} ligne(s) ajoutée(s).` });
              }} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Justificatif</th>
                    <th className="text-center p-2">Montant</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((row, idx)=> (
                    <tr key={row.id} className="border-b hover:bg-muted/50">
                      <td className="p-2"><Input value={row.date} onChange={(e)=> setWithdrawals((prev)=> prev.map((r,i)=> i===idx?{...r, date: e.target.value}:r))} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input value={row.label} onChange={(e)=> setWithdrawals((prev)=> prev.map((r,i)=> i===idx?{...r, label: e.target.value}:r))} disabled={isStaffReadOnly} /></td>
                      <td className="p-2"><Input type="number" className="w-28 text-center" value={row.amount} onChange={(e)=> setWithdrawals((prev)=> prev.map((r,i)=> i===idx?{...r, amount: parseNumber(e.target.value)}:r))} disabled={isStaffReadOnly} /></td>
                      <td className="p-2 text-center">
                        <Button size="sm" variant="destructive" onClick={()=> setWithdrawals((prev)=> prev.filter((_,i)=> i!==idx))} disabled={isStaffReadOnly}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-right font-semibold">
              Total: {formatCurrencyDollar(totalWithdrawals)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleSave}
          disabled={isSaving || isStaffReadOnly}
          className="btn-discord"
        >
          {isSaving ? (
            <div className="loading-dots mr-2">
              <span></span><span></span><span></span>
            </div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer
        </Button>

        <Button
          onClick={handleSendToArchive}
          variant="outline"
          disabled={isStaffReadOnly}
        >
          <Archive className="w-4 h-4 mr-2" />
          Envoyer aux archives
        </Button>

        <Button
          onClick={async () => {
            try {
              await exportDotationToPDF({
                rows: dotationData.rows,
                soldeActuel: dotationData.soldeActuel,
                totals: { totalCA, totalSalaires, totalPrimes, totalExpenses, totalWithdrawals },
                limits: { maxSalaireEmp, maxPrimeEmp, maxSalairePat, maxPrimePat },
                paliers,
                entreprise,
                employeesCount: dotationData.rows.length,
                expenses: expenses.map(e => ({ date: e.date, justificatif: e.label, montant: e.amount })),
                withdrawals: withdrawals.map(w => ({ date: w.date, justificatif: w.label, montant: w.amount }))
              });
              toast({
                title: 'Export PDF',
                description: 'Fiche Impôt générée avec succès'
              });
            } catch (error) {
              toast({
                title: 'Erreur export PDF',
                description: String(error),
                variant: 'destructive'
              });
            }
          }}
          variant="outline"
        >
          <FileText className="w-4 h-4 mr-2" />
          Export PDF Fiche Impôt
        </Button>

        <Button
          onClick={async () => {
            try {
              await exportDotationXLSX({
                rows: dotationData.rows,
                soldeActuel: dotationData.soldeActuel,
                totals: { totalCA, totalSalaires, totalPrimes, totalExpenses, totalWithdrawals },
                limits: { maxSalaireEmp, maxPrimeEmp, maxSalairePat, maxPrimePat },
                paliers,
                entreprise,
                employeesCount: dotationData.rows.length,
                expenses: expenses.map(e => ({ date: e.date, justificatif: e.label, montant: e.amount })),
                withdrawals: withdrawals.map(w => ({ date: w.date, justificatif: w.label, montant: w.amount }))
              });
              toast({
                title: 'Export Excel',
                description: 'Fichier Excel généré avec succès'
              });
            } catch (error) {
              toast({
                title: 'Erreur export Excel',
                description: String(error),
                variant: 'destructive'
              });
            }
          }}
          variant="outline"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export Excel
        </Button>

      </div>
    </div>
  );
}