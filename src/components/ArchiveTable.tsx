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
  FileSpreadsheet
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
      const data = filteredRows.map((row) => {
        const obj: Record<string, any> = {};
        headers.forEach((h) => {
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
      toast({ title: 'Export Excel', description: 'Le fichier a été généré.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur export', description: 'Impossible de générer le fichier.', variant: 'destructive' as any });
    }
  };
  // Permissions
  const canEdit = (row: any) => {
    const statut = String(row?.statut || '').toLowerCase();
    const isRefused = statut.includes('refus');
    return isStaffRole || isDotRole || ((isPatronRole || isCoPatronRole) && isRefused);
  };
  const canValidate = (_row: any) => isStaffRole || isDotRole;
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

  const saveEdit = () => {
    if (!selectedRow) return;
    setRows(prev => prev.map(r => r.id === selectedRow.id ? { ...r, date: form.date, montant: form.montant, description: form.description } : r));
    setModalOpen(false);
    toast({ title: 'Modifié', description: 'La fiche a été mise à jour.' });
  };

  const handleValidate = (row: any) => {
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, statut: 'Validé' } : r));
    toast({ title: 'Statut mis à jour', description: 'La fiche a été validée.' });
  };

  const handleRefuse = (row: any) => {
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, statut: 'Refusé' } : r));
    toast({ title: 'Statut mis à jour', description: 'La fiche a été refusée.' });
  };

  const handleDelete = (row: any) => {
    if (!canDelete(row)) return;
    if (window.confirm('Supprimer cette fiche ?')) {
      setRows(prev => prev.filter(r => r.id !== row.id));
      toast({ title: 'Supprimé', description: 'La fiche a été supprimée.' });
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
                          {formatCellValue(row[header], header)}
                        </td>
                      ))}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openView(row)} aria-label="Voir"><Eye className="w-4 h-4" /></Button>
                          {canEdit(row) && (
                            <Button variant="outline" size="sm" onClick={() => openEdit(row)} aria-label="Éditer"><Pencil className="w-4 h-4" /></Button>
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
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(row)} aria-label="Supprimer"><Trash2 className="w-4 h-4" /></Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'view' ? 'Détails de la fiche' : 'Éditer la fiche'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={form.date} onChange={(e)=> setForm(f=>({ ...f, date: e.target.value }))} disabled={modalMode==='view'} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Montant</label>
              <Input type="number" value={form.montant} onChange={(e)=> setForm(f=>({ ...f, montant: Number(e.target.value)||0 }))} disabled={modalMode==='view'} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={form.description} onChange={(e)=> setForm(f=>({ ...f, description: e.target.value }))} disabled={modalMode==='view'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setModalOpen(false)}>Fermer</Button>
            {modalMode === 'edit' && (
              <Button onClick={saveEdit}>Enregistrer</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    entreprise: 'Entreprise',
    montant: 'Montant',
    statut: 'Statut',
    description: 'Description',
    created_at: 'Créé le',
    updated_at: 'Modifié le'
  };

  return headerNames[header] || header.charAt(0).toUpperCase() + header.slice(1);
}

// Helper pour formater les valeurs des cellules
function formatCellValue(value: any, header: string): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
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