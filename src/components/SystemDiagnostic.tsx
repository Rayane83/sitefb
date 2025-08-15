import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Zap, Database, Wifi, Users, Settings, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { unifiedStorage } from '@/lib/unifiedStorage';
import { configRepo } from '@/lib/configRepo';

interface DiagnosticResult {
  category: string;
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
  timestamp: Date;
}

interface DiagnosticStats {
  total: number;
  success: number;
  warning: number;
  error: number;
}

export function SystemDiagnostic() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<DiagnosticStats>({ total: 0, success: 0, warning: 0, error: 0 });

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
    setStats(prev => ({
      total: prev.total + 1,
      success: prev.success + (result.status === 'success' ? 1 : 0),
      warning: prev.warning + (result.status === 'warning' ? 1 : 0),
      error: prev.error + (result.status === 'error' ? 1 : 0),
    }));
  };

  const updateProgress = (value: number) => {
    setProgress(value);
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    setStats({ total: 0, success: 0, warning: 0, error: 0 });
    setProgress(0);

    try {
      // Test 1: Connexion Supabase
      updateProgress(10);
      try {
        const { data, error } = await supabase.from('discord_config').select('id').limit(1);
        if (error) throw error;
        addResult({
          category: 'Database',
          name: 'Connexion Supabase',
          status: 'success',
          message: 'Connexion à la base de données établie',
          timestamp: new Date()
        });
      } catch (e) {
        addResult({
          category: 'Database',
          name: 'Connexion Supabase',
          status: 'error',
          message: 'Échec de connexion à Supabase',
          details: [e instanceof Error ? e.message : 'Erreur inconnue'],
          timestamp: new Date()
        });
      }

      // Test 2: Authentification
      updateProgress(20);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (user) {
          addResult({
            category: 'Auth',
            name: 'Session utilisateur',
            status: 'success',
            message: `Utilisateur connecté: ${user.email}`,
            timestamp: new Date()
          });
        } else {
          addResult({
            category: 'Auth',
            name: 'Session utilisateur',
            status: 'warning',
            message: 'Aucun utilisateur connecté',
            timestamp: new Date()
          });
        }
      } catch (e) {
        addResult({
          category: 'Auth',
          name: 'Session utilisateur',
          status: 'error',
          message: 'Erreur lors de la vérification de l\'authentification',
          details: [e instanceof Error ? e.message : 'Erreur inconnue'],
          timestamp: new Date()
        });
      }

      // Test 3: Configuration Discord
      updateProgress(30);
      try {
        const config = await configRepo.get();
        const hasBasicConfig = config.principalGuildId && config.clientId;
        addResult({
          category: 'Config',
          name: 'Configuration Discord',
          status: hasBasicConfig ? 'success' : 'warning',
          message: hasBasicConfig ? 'Configuration Discord complète' : 'Configuration Discord incomplète',
          details: [
            `Guild principal: ${config.principalGuildId || 'Non défini'}`,
            `Client ID: ${config.clientId || 'Non défini'}`,
            `Entreprises: ${Object.keys(config.enterprises || {}).length} configurées`,
            `Rôles: ${Object.keys(config.principalRoles || {}).length} configurés`
          ],
          timestamp: new Date()
        });
      } catch (e) {
        addResult({
          category: 'Config',
          name: 'Configuration Discord',
          status: 'error',
          message: 'Erreur lors du chargement de la configuration',
          details: [e instanceof Error ? e.message : 'Erreur inconnue'],
          timestamp: new Date()
        });
      }

      // Test 4: Stockage unifié
      updateProgress(40);
      try {
        const testKey = { scope: 'global' as const, key: 'diagnostic_test' };
        const testData = { test: true, timestamp: Date.now() };
        
        // Test écriture
        await unifiedStorage.set(testKey, testData);
        
        // Test lecture
        const retrieved = await unifiedStorage.get(testKey);
        
        // Test suppression
        await unifiedStorage.remove(testKey);
        
        if (retrieved && (retrieved as any).test === true) {
          addResult({
            category: 'Storage',
            name: 'Stockage unifié',
            status: 'success',
            message: 'Stockage unifié fonctionnel',
            details: ['Écriture: OK', 'Lecture: OK', 'Suppression: OK'],
            timestamp: new Date()
          });
        } else {
          throw new Error('Données récupérées incorrectes');
        }
      } catch (e) {
        addResult({
          category: 'Storage',
          name: 'Stockage unifié',
          status: 'error',
          message: 'Erreur dans le stockage unifié',
          details: [e instanceof Error ? e.message : 'Erreur inconnue'],
          timestamp: new Date()
        });
      }

      // Test 5: Tables principales
      updateProgress(50);
      const tables = ['enterprises', 'dotation_reports', 'dotation_rows', 'archives', 'tax_brackets'] as const;
      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(1);
          if (error) throw error;
          addResult({
            category: 'Database',
            name: `Table ${table}`,
            status: 'success',
            message: `Table ${table} accessible`,
            timestamp: new Date()
          });
        } catch (e) {
          addResult({
            category: 'Database',
            name: `Table ${table}`,
            status: 'error',
            message: `Erreur d'accès à la table ${table}`,
            details: [e instanceof Error ? e.message : 'Erreur inconnue'],
            timestamp: new Date()
          });
        }
        updateProgress(50 + (tables.indexOf(table) + 1) * 8);
      }

      // Test 6: Edge Functions
      updateProgress(90);
      try {
        const { data, error } = await supabase.functions.invoke('discord-health');
        if (error) throw error;
        addResult({
          category: 'Functions',
          name: 'Edge Functions',
          status: 'success',
          message: 'Edge Functions opérationnelles',
          details: data ? [JSON.stringify(data)] : undefined,
          timestamp: new Date()
        });
      } catch (e) {
        addResult({
          category: 'Functions',
          name: 'Edge Functions',
          status: 'warning',
          message: 'Edge Functions non disponibles ou en erreur',
          details: [e instanceof Error ? e.message : 'Erreur inconnue'],
          timestamp: new Date()
        });
      }

      // Test 7: Synchronisation temps réel
      updateProgress(95);
      try {
        const channel = supabase.channel('diagnostic-test');
        let realtimeWorking = false;
        
        const timeout = setTimeout(() => {
          if (!realtimeWorking) {
            addResult({
              category: 'Realtime',
              name: 'Synchronisation temps réel',
              status: 'warning',
              message: 'Temps réel non réactif (timeout)',
              timestamp: new Date()
            });
          }
        }, 3000);

        channel.on('presence', { event: 'sync' }, () => {
          realtimeWorking = true;
          clearTimeout(timeout);
          addResult({
            category: 'Realtime',
            name: 'Synchronisation temps réel',
            status: 'success',
            message: 'Synchronisation temps réel fonctionnelle',
            timestamp: new Date()
          });
          supabase.removeChannel(channel);
        }).subscribe();

        // Trigger test
        await channel.track({ test: true });
      } catch (e) {
        addResult({
          category: 'Realtime',
          name: 'Synchronisation temps réel',
          status: 'error',
          message: 'Erreur de synchronisation temps réel',
          details: [e instanceof Error ? e.message : 'Erreur inconnue'],
          timestamp: new Date()
        });
      }

      // Test 8: Latence Supabase
      updateProgress(98);
      try {
        const start = performance.now();
        const { error } = await supabase.from('enterprises').select('id').limit(1);
        if (error) throw error;
        const duration = Math.round(performance.now() - start);
        addResult({
          category: 'Performance',
          name: 'Latence Supabase',
          status: duration < 1500 ? 'success' : 'warning',
          message: `Requête en ${duration} ms`,
          timestamp: new Date(),
        });
      } catch (e) {
        addResult({
          category: 'Performance',
          name: 'Latence Supabase',
          status: 'error',
          message: 'Impossible de mesurer la latence',
          details: [e instanceof Error ? e.message : 'Erreur inconnue'],
          timestamp: new Date(),
        });
      }

      updateProgress(100);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Database': return <Database className="w-4 h-4" />;
      case 'Auth': return <Users className="w-4 h-4" />;
      case 'Config': return <Settings className="w-4 h-4" />;
      case 'Storage': return <Zap className="w-4 h-4" />;
      case 'Functions': return <Activity className="w-4 h-4" />;
      case 'Realtime': return <Wifi className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Activity className="w-4 h-4" />
          <span>Diagnostic Système</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Diagnostic Système Complet</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={runDiagnostic} 
              disabled={isRunning}
              className="flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>{isRunning ? 'Diagnostic en cours...' : 'Lancer le diagnostic'}</span>
            </Button>
            
            {stats.total > 0 && (
              <div className="flex space-x-4 text-sm">
                <Badge variant="default" className="bg-success text-success-foreground">
                  ✓ {stats.success}
                </Badge>
                <Badge variant="secondary" className="bg-warning text-warning-foreground">
                  ⚠ {stats.warning}
                </Badge>
                <Badge variant="destructive">
                  ✗ {stats.error}
                </Badge>
              </div>
            )}
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {results.length > 0 && (
            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-3">
                {results.map((result, index) => (
                  <Card key={index} className={`border-l-4 ${
                    result.status === 'success' ? 'border-l-success' :
                    result.status === 'warning' ? 'border-l-warning' :
                    'border-l-destructive'
                  }`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(result.category)}
                          <span>{result.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(result.status)}
                          <Badge variant="outline" className="text-xs">
                            {result.category}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                      {result.details && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {result.details.map((detail, i) => (
                            <li key={i} className="pl-2 border-l border-border">• {detail}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {result.timestamp.toLocaleTimeString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}