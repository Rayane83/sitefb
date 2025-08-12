import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "/src/components/ui/card";
import { Input } from "/src/components/ui/input";
import { Button } from "/src/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { mockApi, handleApiError } from '@/lib/api';
import { Search, Archive, FileSpreadsheet } from 'lucide-react';

interface ArchiveTableProps { guildId: string; currentRole: string; entreprise?: string }

export function ArchiveTable({ guildId }: ArchiveTableProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try { const r = await mockApi.getArchive(guildId, ''); if (alive) setRows(r); }
      catch (e) { toast({ title: 'Erreur', description: handleApiError(e), variant: 'destructive' }); }
      finally { if (alive) setLoading(false); }
    }
    load();
    return () => { alive = false };
  }, [guildId]);

  const filtered = useMemo(() => rows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase())), [rows, search]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Archive');
    XLSX.writeFile(wb, 'archive.xlsx');
  };

  if (loading) return <div className="h-48 bg-muted animate-pulse rounded-md" />;

  return (
    <Card>
      <CardHeader className="flex md:flex-row md:items-center md:justify-between gap-3">
        <CardTitle className="text-base flex items-center gap-2"><Archive className="w-4 h-4" />Archive</CardTitle>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Button variant="secondary" onClick={exportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Exporter</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {Object.keys(filtered[0] || { id: 0 }).map((k) => (
                  <th key={k} className="text-left p-2 capitalize">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  {Object.keys(filtered[0] || { id: 0 }).map((k) => (
                    <td key={k} className="p-2">{String(r[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
