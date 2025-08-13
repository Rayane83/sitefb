import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { handleApiError } from '@/lib/api';
import { debounce } from '@/lib/fmt';
import { 
  Search, 
  Archive, 
  AlertCircle,
  FileText,
  Calendar,
  User,
  Eye,
  Pencil,
  CheckCircle,
  XCircle,
  Trash2,
  FileSpreadsheet,
  Download,
  FileImage,
  Building2,
  Receipt,
  GraduationCap
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface ArchiveTableProps {
  guildId: string;
  currentRole: string;
  entreprise?: string;
}

export function ArchiveTable({ guildId, currentRole, entreprise }: ArchiveTableProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const role = (currentRole || '').toLowerCase();
  const isStaffRole = role.includes('staff');
  const isDotRole = role.includes('dot');
  const isPatronRole = role.includes('patron') && !role.includes('co');
  const isCoPatronRole = role.includes('co');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [form, setForm] = useState<{ date: string; montant: number; description: string }>({ date: '', montant: 0, description: '' });

  // Template d'export (Staff uniquement)
  const [templateHeaders, setTemplateHeaders] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`archives:templateHeaders:${guildId}`) || '[]'); } catch { return []; }
  });
  const templateInputId = `template-upload-${guildId}`;

  useEffect(() => {
    let alive = true;

    async function fetchArchive() {
      if (!guildId) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // Charger depuis Supabase
        let q: any = supabase
          .from('archives')
          .select('*')
          .eq('guild_id', guildId)
          .order('created_at', { ascending: false });
        if (entreprise) q = q.eq('entreprise_key', entreprise);
        const { data, error: dbError } = await q;
        if (dbError) throw dbError;

        if (!alive) return;

        const normalizedRows = (data as any[]) || [];
        setRows(normalizedRows);
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

    fetchArchive();

    return () => {
      alive = false;
    };
  }, [guildId, currentRole, entreprise]);

  // Filtrage côté client via JSON.stringify
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    
    const query = searchQuery.toLowerCase();
    return rows.filter(row => 
      JSON.stringify(row).toLowerCase().includes(query)
    );
  }, [rows, searchQuery]);

  // Headers générés dynamiquement depuis la première ligne filtrée
  const headers = useMemo(() => {
    if (filteredRows.length === 0) return [];
    return Object.keys(filteredRows[0]);
  }, [filteredRows]);

  // Debounced search
  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => setSearchQuery(value), 300),
    []
  );

  const handleSearchChange = (value: string) => {
    debouncedSetSearch(value);
  };

  // Export Excel
  const exportToExcel = () => {
    try {
      const headersForData = headers;
      const data = filteredRows.map((row) => {
        // Si un template est présent, suivre l'ordre et les intitulés du template
        if (isStaffRole && templateHeaders.length) {
          const obj: Record<string, any> = {};
          for (const th of templateHeaders) {
            const keyLower = th.toLowerCase();
            // heuristiques simples de mapping
            if (keyLower.includes('date')) obj[th] = row.date || row.created_at || '';
            else if (keyLower.includes('montant')) obj[th] = row.montant ?? '';
            else if (keyLower.includes('entreprise')) obj[th] = row.entreprise_key || entreprise || '';
            else if (keyLower.includes('type')) obj[th] = row.type || '';
            else if (keyLower.includes('statut')) obj[th] = row.statut || '';
            else if (keyLower === 'id') obj[th] = row.id || '';
            else obj[th] = '';
          }
          return obj;
        }
        // Sinon, export dynamique avec entêtes formatés
        const obj: Record<string, any> = {};
        headersForData.forEach((h) => {
          const label = formatHeaderName(h);
          let v = (row as any)[h];
          if (v && typeof v === 'object') v = JSON.stringify(v);
          obj[label] = v;
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Archives');
      const date = new Date();
      const stamp = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const name = `archives_${entreprise || 'toutes'}_${guildId || 'guild'}_${stamp}.xlsx`;
      XLSX.writeFile(wb, name);
      toast({ title: 'Export Excel', description: templateHeaders.length ? 'Export avec template.' : 'Export généré.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur export', description: "Impossible de générer le fichier.", variant: 'destructive' as any });
    }
  };

  // Permissions
  const canEdit = (row: any) => {
    const statut = String(row?.statut || '').toLowerCase();
    const isRefused = statut.includes('refus');
    return isStaffRole || ((isPatronRole || isCoPatronRole) && isRefused);
  };
  const canValidate = (_row: any) => isStaffRole;
  const canDelete = (_row: any) => isStaffRole; // suppression réservée au Staff

  // Modal helpers
  const openView = (row: any) => {
    setSelectedRow(row);
    setForm({
      date: row.date || '',
      montant: Number(row.montant) || 0,
      description: row.description || ''
    });
    setModalMode('view');
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setSelectedRow(row);
    setForm({
      date: row.date || '',
      montant: Number(row.montant) || 0,
      description: row.description || ''
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedRow) return;
    try {
      const payload = {
        date: form.date || null,
        montant: form.montant || null,
        payload: { ...(selectedRow.payload || {}), description: form.description }
      };
      const { data, error } = await supabase
        .from('archives')
        .update(payload)
        .eq('id', selectedRow.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      setRows(prev => prev.map(r => r.id === selectedRow.id ? (data || { ...r, ...payload }) : r));
      setModalOpen(false);
      toast({ title: 'Modifié', description: 'La fiche a été mise à jour.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Mise à jour impossible.', variant: 'destructive' });
    }
  };

  const handleValidate = async (row: any) => {
    try {
      const { data, error } = await supabase
        .from('archives')
        .update({ statut: 'Validé' })
        .eq('id', row.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      setRows(prev => prev.map(r => r.id === row.id ? (data || { ...r, statut: 'Validé' }) : r));
      toast({ title: 'Statut mis à jour', description: 'La fiche a été validée.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Mise à jour du statut impossible.', variant: 'destructive' });
    }
  };

  const handleRefuse = async (row: any) => {
    try {
      const { data, error } = await supabase
        .from('archives')
        .update({ statut: 'Refusé' })
        .eq('id', row.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      setRows(prev => prev.map(r => r.id === row.id ? (data || { ...r, statut: 'Refusé' }) : r));
      toast({ title: 'Statut mis à jour', description: 'La fiche a été refusée.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Mise à jour du statut impossible.', variant: 'destructive' });
    }
  };

  const handleDelete = async (row: any) => {
    if (!canDelete(row)) return;
    if (!window.confirm('Supprimer cette fiche ?')) return;
    try {
      const { error } = await supabase.from('archives').delete().eq('id', row.id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast({ title: 'Supprimé', description: 'La fiche a été supprimée.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Suppression impossible.', variant: 'destructive' });
    }
  };

  // Import d'un template Excel (Staff)
  const onTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
      const hdrs: string[] = (rows?.[0] || []).map((x: any) => String(x));
      if (hdrs.length === 0) throw new Error('Aucune colonne détectée');
      setTemplateHeaders(hdrs);
      localStorage.setItem(`archives:templateHeaders:${guildId}`, JSON.stringify(hdrs));
      toast({ title: 'Template importé', description: `${hdrs.length} colonnes détectées.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Import impossible', description: 'Vérifiez le fichier .xlsx', variant: 'destructive' as any });
    } finally {
      e.currentTarget.value = '';
    }
  };

  // Télécharger un fichier depuis le storage
  const downloadFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('archives')
        .download(path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'fichier';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Téléchargement', description: 'Fichier téléchargé avec succès.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de télécharger le fichier.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Archives</h2>
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
        <h2 className="text-2xl font-bold">Archives</h2>
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
        <h2 className="text-2xl font-bold">Archives</h2>
        <div className="flex items-center space-x-2">
          {entreprise && <Badge variant="outline">{entreprise}</Badge>}
          <Badge variant="secondary" className="flex items-center space-x-1">
            <FileText className="w-3 h-3" />
            <span>Total: {filteredRows.length}</span>
          </Badge>
          {isStaffRole && (
            <>
              <input id={templateInputId} type="file" accept=".xlsx,.xls" className="hidden" onChange={onTemplateUpload} />
              <Button variant="outline" size="sm" onClick={() => document.getElementById(templateInputId)?.click()} aria-label="Importer un template">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Importer Template
              </Button>
              {templateHeaders.length > 0 && (
                <Badge variant="outline" className="text-xs">Template: {templateHeaders.length} colonnes</Badge>
              )}
            </>
          )}
          <Button variant="outline" size="sm" onClick={exportToExcel} aria-label="Exporter Excel">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Exporter
          </Button>
        </div>
      </div>

      {/* Recherche */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Recherche</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les archives..."
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredRows.length} résultat(s) trouvé(s) pour "{searchQuery}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Table des archives */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Archive className="w-5 h-5 text-primary" />
            <span>Données Archivées</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              {rows.length === 0 ? (
                <div>
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    Aucune archive disponible
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Les données archivées apparaîtront ici une fois générées
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    Aucun résultat
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Aucune donnée ne correspond à votre recherche
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {headers.map((header) => (
                      <th key={header} className="text-left p-3 font-medium text-muted-foreground">
                        {formatHeaderName(header)}
                      </th>
                    ))}
                    <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                      {headers.map((header) => (
                        <td key={header} className="p-3">
                          {formatCellValue(row[header], header, row)}
                        </td>
                      ))}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openView(row)} aria-label="Voir">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEdit(row) && (
                            <Button variant="outline" size="sm" onClick={() => openEdit(row)} aria-label="Éditer">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canValidate(row) && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleValidate(row)} aria-label="Valider" disabled={String(row.statut || '').toLowerCase().includes('valid')}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleRefuse(row)} aria-label="Refuser" disabled={String(row.statut || '').toLowerCase().includes('refus')}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {canDelete(row) && (
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(row)} aria-label="Supprimer">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info & Modals */}
      <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
        <Archive className="w-4 h-4" />
        <span>Actions selon le rôle: lecture pour tous, édition/validation selon permissions.</span>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'view' ? 'Détails de la fiche' : 'Éditer la fiche'}
              {selectedRow && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {getArchiveDisplayName(selectedRow)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRow && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input 
                    type="date" 
                    value={form.date} 
                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} 
                    disabled={modalMode === 'view'} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Montant</label>
                  <Input 
                    type="number" 
                    value={form.montant} 
                    onChange={(e) => setForm(f => ({ ...f, montant: Number(e.target.value) || 0 }))} 
                    disabled={modalMode === 'view'} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  value={form.description} 
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} 
                  disabled={modalMode === 'view'} 
                />
              </div>

              {/* Contenu spécifique selon le type */}
              {renderArchiveContent(selectedRow)}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Fermer</Button>
            {modalMode === 'edit' && (
              <Button onClick={saveEdit}>Enregistrer</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Fonction pour obtenir le nom d'affichage d'une archive
function getArchiveDisplayName(row: any): string {
  const entreprise = row.entreprise_key || 'Inconnue';
  const type = row.type || 'Archive';
  return `${entreprise} - ${type}`;
}

// Fonction pour rendre le contenu spécifique d'une archive
function renderArchiveContent(row: any): React.ReactNode {
  const type = String(row.type || '').toLowerCase();
  
  if (type === 'dotation') {
    return renderDotationContent(row);
  } else if (type === 'facture' || type === 'diplôme') {
    return renderFileContent(row);
  }
  
  return null;
}

// Rendu pour les dotations (format template)
function renderDotationContent(row: any): React.ReactNode {
  const payload = row.payload || {};
  const rows = payload.rows || [];
  const totals = payload.totals || {};

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <User className="w-4 h-4" />
        Rapport de Dotation
      </h3>
      
      {/* Résumé */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{rows.length}</div>
          <div className="text-sm text-muted-foreground">Employés</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat('fr-FR').format(totals.totalSalaires || 0)} $
          </div>
          <div className="text-sm text-muted-foreground">Total Salaires</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat('fr-FR').format(totals.totalPrimes || 0)} $
          </div>
          <div className="text-sm text-muted-foreground">Total Primes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {new Intl.NumberFormat('fr-FR').format((totals.totalSalaires || 0) + (totals.totalPrimes || 0))} $
          </div>
          <div className="text-sm text-muted-foreground">Total Général</div>
        </div>
      </div>

      {/* Table des employés */}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Employé</th>
                <th className="text-right p-2">RUN</th>
                <th className="text-right p-2">Facture</th>
                <th className="text-right p-2">Vente</th>
                <th className="text-right p-2">CA Total</th>
                <th className="text-right p-2">Salaire</th>
                <th className="text-right p-2">Prime</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((empRow: any, idx: number) => (
                <tr key={idx} className="border-b">
                  <td className="p-2 font-medium">{empRow.name}</td>
                  <td className="p-2 text-right">{new Intl.NumberFormat('fr-FR').format(empRow.run || 0)} $</td>
                  <td className="p-2 text-right">{new Intl.NumberFormat('fr-FR').format(empRow.facture || 0)} $</td>
                  <td className="p-2 text-right">{new Intl.NumberFormat('fr-FR').format(empRow.vente || 0)} $</td>
                  <td className="p-2 text-right font-medium">{new Intl.NumberFormat('fr-FR').format(empRow.ca_total || 0)} $</td>
                  <td className="p-2 text-right text-green-600 font-medium">{new Intl.NumberFormat('fr-FR').format(empRow.salaire || 0)} $</td>
                  <td className="p-2 text-right text-blue-600 font-medium">{new Intl.NumberFormat('fr-FR').format(empRow.prime || 0)} $</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Rendu pour les fichiers (factures/diplômes)
function renderFileContent(row: any): React.ReactNode {
  const payload = row.payload || {};
  const filePath = payload.filePath;
  const fileName = payload.fileName || 'Fichier';
  const fileType = fileName.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType || '');
  const isPDF = fileType === 'pdf';

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        {row.type === 'facture' ? <Receipt className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
        {row.type === 'facture' ? 'Facture' : 'Diplôme'}
      </h3>

      {filePath && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isImage ? <FileImage className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              <span className="font-medium">{fileName}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => downloadFile(filePath)}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>

          {/* Aperçu pour les images */}
          {isImage && (
            <div className="max-w-md mx-auto">
              <img 
                src={`https://pmhktnxqponixycsjcwr.supabase.co/storage/v1/object/public/archives/${filePath}`}
                alt="Aperçu"
                className="w-full h-auto rounded border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Aperçu pour les PDF */}
          {isPDF && (
            <div className="text-center p-8 bg-muted/50 rounded border-2 border-dashed">
              <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Fichier PDF - Cliquez sur "Télécharger" pour l'ouvrir
              </p>
            </div>
          )}

          {/* Autres informations du fichier */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            {payload.userName && (
              <div>
                <span className="font-medium">Nom:</span> {payload.userName}
              </div>
            )}
            {payload.grade && (
              <div>
                <span className="font-medium">Grade:</span> {payload.grade}
              </div>
            )}
            {payload.description && (
              <div className="col-span-2">
                <span className="font-medium">Description:</span> {payload.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper pour formater les noms d'en-têtes
function formatHeaderName(header: string): string {
  const headerNames: Record<string, string> = {
    id: 'ID',
    date: 'Date',
    type: 'Type',
    employé: 'Employé',
    entreprise_key: 'Entreprise',
    montant: 'Montant',
    statut: 'Statut',
    description: 'Description',
    created_at: 'Créé le',
    updated_at: 'Modifié le'
  };

  return headerNames[header] || header.charAt(0).toUpperCase() + header.slice(1);
}

// Helper pour formater les valeurs des cellules
function formatCellValue(value: any, header: string, row?: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  // Cas spécial pour la colonne entreprise_key + type (nom d'affichage)
  if (header === 'entreprise_key' && row) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium">{getArchiveDisplayName(row)}</span>
      </div>
    );
  }

  // Objets complexes: afficher un résumé textuel pour éviter l'erreur React
  if (typeof value === 'object') {
    try {
      const preview = JSON.stringify(value);
      return <span className="text-xs text-muted-foreground" title={preview}>[données]</span>;
    } catch {
      return <span className="text-xs text-muted-foreground">[données]</span>;
    }
  }

  // Dates
  if (header.includes('date') || header.includes('_at')) {
    try {
      const date = new Date(value);
      return (
        <div className="flex items-center space-x-1">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span className="text-sm">
            {date.toLocaleDateString('fr-FR')}
          </span>
        </div>
      );
    } catch {
      return String(value);
    }
  }

  // Montants
  if (header.includes('montant') || header.includes('amount')) {
    if (typeof value === 'number') {
      return (
        <span className="font-medium text-primary">
          {new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)} $
        </span>
      );
    }
  }

  // Statuts
  if (header.includes('statut') || header.includes('status')) {
    const statusColors: Record<string, string> = {
      'validé': 'badge-success',
      'payé': 'badge-success',
      'en_attente': 'badge-warning',
      'en attente': 'badge-warning',
      'refusé': 'badge-destructive',
      'annulé': 'badge-destructive'
    };

    const colorClass = statusColors[String(value).toLowerCase()] || 'bg-muted text-muted-foreground';
    
    return (
      <Badge variant="outline" className={colorClass}>
        {String(value)}
      </Badge>
    );
  }

  // Types
  if (header.includes('type')) {
    const typeIcons: Record<string, React.ReactNode> = {
      'dotation': <User className="w-3 h-3" />,
      'facture': <Receipt className="w-3 h-3" />,
      'diplôme': <GraduationCap className="w-3 h-3" />,
      'impôt': <FileText className="w-3 h-3" />,
      'blanchiment': <Archive className="w-3 h-3" />
    };

    return (
      <div className="flex items-center space-x-2">
        {typeIcons[String(value).toLowerCase()] || <FileText className="w-3 h-3" />}
        <span>{String(value)}</span>
      </div>
    );
  }

  return String(value);
}

// Fonction helper pour télécharger un fichier
const downloadFile = async (path: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('archives')
      .download(path);
    
    if (error) throw error;
    
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'fichier';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Erreur téléchargement:', e);
  }
};