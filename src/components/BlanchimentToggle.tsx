import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "/src/components/ui/card";
import { Button } from "/src/components/ui/button";
import { Badge } from "/src/components/ui/badge";
import { Input } from "/src/components/ui/input";
import { BlanchimentState } from '@/lib/types';
import { formatCurrencyDollar, parseNumber } from '@/lib/fmt';
import { mockApi, handleApiError } from '@/lib/api';
import { Shield, ShieldCheck, ShieldX, Calculator, AlertCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props { guildId: string; entreprise: string; currentRole: string }

export function BlanchimentToggle({ guildId, entreprise, currentRole }: Props) {
  const [state, setState] = useState<BlanchimentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const scope = `${guildId}:${entreprise}`;

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true); setError(null);
      try { const s = await mockApi.getBlanchimentState(scope); if (alive) setState(s); }
      catch (e) { if (alive) setError(handleApiError(e)); }
      finally { if (alive) setLoading(false); }
    }
    load();
    return () => { alive = false };
  }, [scope]);

  const toggle = async () => {
    if (!state) return;
    setSaving(true);
    try {
      const next = await mockApi.saveBlanchimentState(scope, !state.enabled);
      setState(next);
      toast({ title: 'Mise à jour', description: `Blanchiment ${next.enabled ? 'activé' : 'désactivé'}` });
    } catch (e) {
      toast({ title: 'Erreur', description: handleApiError(e), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="h-32 bg-muted animate-pulse rounded-md" />;
  if (error) return <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>;
  if (!state) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Blanchiment</CardTitle>
        <Badge variant={state.enabled ? 'secondary' : 'outline'}>{state.enabled ? 'Activé' : 'Désactivé'}</Badge>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button onClick={toggle} disabled={saving}>
          {state.enabled ? <ShieldCheck className="w-4 h-4 mr-2" /> : <ShieldX className="w-4 h-4 mr-2" />} 
          {state.enabled ? 'Désactiver' : 'Activer'}
        </Button>
        <div className="text-sm text-muted-foreground">Paramétrage simulé pour démonstration.</div>
      </CardContent>
    </Card>
  );
}
