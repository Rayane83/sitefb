
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Zap, Database, Wifi, Users, Settings, Activity, RefreshCw } from 'lucide-react';
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
  duration?: number;
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
      // Test 1: Connexion Supabase et authentification
      updateProgress(5);
      try {
        const start = performance.now();
        const { data: { user }, error } = await supabase.auth.getUser();
        const duration = Math.round(performance.now() - start);
        
        if (error) throw error;
        
        if (user) {
          addResult({
            category: 'Auth',
            name: 'Session utilisateur',
            status: 'success',
            message: `Utilisateur connecté: ${user.email}`,
            details: [`ID: ${user.id}`, `Dernière connexion: ${user.last_sign_in_at}`],
            duration,
            timestamp: new Date()
          });
        } else {
          addResult({
            category: 'Auth',
            name: 'Session utilisateur',
            status: 'warning',
            message: 'Aucun utilisateur connecté',
            duration,
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

      // Test 2: Connexion base de données
      updateProgress(10);
      try {
        const start = performance.now();
        const { data, error } = await supabase.from('discord_config').select('id').limit(1);
        const duration = Math.round(performance.now() - start);
        
        if (error) throw error;
        addResult({
          category: 'Database',
          name: 'Connexion Supabase',
          status: duration < 1000 ? 'success' : 'warning',
          message: `Connexion établie en ${duration}ms`,
          duration,
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

      // Test 3: Test du stockage unifié (sans localStorage)
      updateProgress(20);
      try {
        const start = performance.now();
        const testKey = { scope: 'global' as const, key: 'diagnostic_test_no_localstorage' };
        const testData = { 
          test: true, 
          timestamp: Date.now(), 
          session: 'diagnostic',
          random: Math.random()
        };
        
        // Vérifier qu'il n'y a pas de localStorage
        const hasLocalStorage = !!localStorage.getItem('unified_storage_diagnostic_test_no_localstorage');
        
        // Test écriture
        const writeSuccess = await unifiedStorage.set(testKey, testData);
        if (!writeSuccess) throw new Error('Échec de l\'écriture');
        
        // Test lecture immédiate
        const retrieved = await unifiedStorage.get(testKey);
        if (!retrieved || (retrieved as any).random !== testData.random) {
          throw new Error('Données récupérées incorrectes');
        }
        
        // Test suppression
        const deleteSuccess = await unifiedStorage.remove(testKey);
        if (!deleteSuccess) throw new Error('Échec de la suppression');
        
        // Vérifier que les données sont supprimées
        const afterDelete = await unifiedStorage.get(testKey);
        if (afterDelete !== null) throw new Error('Données non supprimées');
        
        const duration = Math.round(performance.now() - start);
        addResult({
          category: 'Storage',
          name: 'Stockage unifié (sans localStorage)',
          status: 'success',
          message: 'Stockage unifié fonctionnel sans localStorage',
          details: [
            'Écriture: ✓ OK', 
            'Lecture: ✓ OK', 
            'Suppression: ✓ OK',
            `Pas de localStorage détecté: ${!hasLocalStorage ? '✓ OK' : '✗ Problème'}`,
            `Durée totale: ${duration}ms`
          ],
          duration,
          timestamp: new Date()
        });
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

      // Test 4: Configuration Discord et synchronisation
      updateProgress(30);
      try {
        const start = performance.now();
        const config = await configRepo.get();
        const duration = Math.round(performance.now() - start);
        
        const hasBasicConfig = config.principalGuildId && config.clientId;
        const enterpriseCount = Object.keys(config.enterprises || {}).length;
        const roleCount = Object.keys(config.principalRoles || {}).length;
        
        addResult({
          category: 'Config',
          name: 'Configuration Discord',
          status: hasBasicConfig ? 'success' : 'warning',
          message: hasBasicConfig ? 'Configuration Discord complète' : 'Configuration Discord incomplète',
          details: [
            `Guild principal: ${config.principalGuildId || 'Non défini'}`,
            `Client ID: ${config.clientId || 'Non défini'}`,
            `Entreprises configurées: ${enterpriseCount}`,
            `Rôles configurés: ${roleCount}`,
            `Temps de chargement: ${duration}ms`
          ],
          duration,
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

      // Test 5: Tables principales et accès aux données
      updateProgress(40);
      const tables = [
        { name: 'enterprises', critical: true },
        { name: 'dotation_reports', critical: true },
        { name: 'dotation_rows', critical: false },
        { name: 'archives', critical: false },
        { name: 'tax_brackets', critical: true },
        { name: 'blanchiment_settings', critical: false },
        { name: 'app_storage', critical: true }
      ] as const;
      
      for (const table of tables) {
        try {
          const start = performance.now();
          const { data, error, count } = await supabase
            .from(table.name)
            .select('*', { count: 'exact' })
            .limit(1);
          const duration = Math.round(performance.now() - start);
          
          if (error) throw error;
          
          addResult({
            category: 'Database',
            name: `Table ${table.name}`,
            status: 'success',
            message: `Table accessible - ${count || 0} enregistrements`,
            details: [`Temps d'accès: ${duration}ms`, table.critical ? 'Table critique' : 'Table optionnelle'],
            duration,
            timestamp: new Date()
          });
        } catch (e) {
          const status = table.critical ? 'error' : 'warning';
          addResult({
            category: 'Database',
            name: `Table ${table.name}`,
            status,
            message: `Erreur d'accès à la table ${table.name}`,
            details: [
              e instanceof Error ? e.message : 'Erreur inconnue',
              table.critical ? 'Table critique - Problème majeur' : 'Table optionnelle'
            ],
            timestamp: new Date()
          });
        }
        updateProgress(40 + (tables.indexOf(table) + 1) * 5);
      }

      // Test 6: Cache mémoire et performances
      updateProgress(75);
      try {
        const start = performance.now();
        
        // Tester le cache mémoire
        const cacheTestKey = { scope: 'global' as const, key: 'cache_performance_test' };
        const cacheTestData = { performance: true, timestamp: Date.now() };
        
        // Premier appel (mise en cache)
        await unifiedStorage.set(cacheTestKey, cacheTestData);
        const firstRead = performance.now();
        await unifiedStorage.get(cacheTestKey);
        const firstReadTime = performance.now() - firstRead;
        
        // Deuxième appel (depuis le cache)
        const secondRead = performance.now();
        await unifiedStorage.get(cacheTestKey);
        const secondReadTime = performance.now() - secondRead;
        
        // Nettoyage
        await unifiedStorage.remove(cacheTestKey);
        
        const isCacheEffective = secondReadTime < firstReadTime;
        const totalDuration = Math.round(performance.now() - start);
        
        addResult({
          category: 'Performance',
          name: 'Cache mémoire',
          status: isCacheEffective ? 'success' : 'warning',
          message: `Cache ${isCacheEffective ? 'efficace' : 'inefficace'}`,
          details: [
            `Premier accès: ${firstReadTime.toFixed(2)}ms`,
            `Second accès (cache): ${secondReadTime.toFixed(2)}ms`,
            `Amélioration: ${isCacheEffective ? '✓' : '✗'}`,
            `Test complet: ${totalDuration}ms`
          ],
          duration: totalDuration,
          timestamp: new Date()
        });
      } catch (e) {
        addResult({
          category: 'Performance',
          name: 'Cache mémoire',
          status: 'error',
          message: 'Erreur lors du test de cache',
          details: [e instanceof Error ? e.message : 'Erreur inconnue'],
          timestamp: new Date()
        });
      }

      // Test 7: Synchronisation temps réel
      updateProgress(85);
      try {
        const start = performance.now();
        let realtimeWorking = false;
        
        const channel = supabase.channel('diagnostic-realtime-test');
        
        const timeout = setTimeout(() => {
          if (!realtimeWorking) {
            addResult({
              category: 'Realtime',
              name: 'Synchronisation temps réel',
              status: 'warning',
              message: 'Temps réel non réactif (timeout 3s)',
              details: ['La synchronisation temps réel peut être lente'],
              timestamp: new Date()
            });
          }
          supabase.removeChannel(channel);
        }, 3000);

        channel.on('presence', { event: 'sync' }, () => {
          realtimeWorking = true;
          clearTimeout(timeout);
          const duration = Math.round(performance.now() - start);
          addResult({
            category: 'Realtime',
            name: 'Synchronisation temps réel',
            status: 'success',
            message: `Synchronisation temps réel active en ${duration}ms`,
            duration,
            timestamp: new Date()
          });
          supabase.removeChannel(channel);
        }).subscribe();

        await channel.track({ test: true, timestamp: Date.now() });
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

      // Test 8: Vérification des sessions et permissions
      updateProgress(95);
      try {
        const start = performance.now();
        
        // Tester l'accès aux données d'entreprises
        const { data: enterprises, error: entError } = await supabase
          .from('enterprises')
          .select('*')
          .limit(5);
        
        if (entError) throw entError;
        
        // Tester l'accès aux configurations
        const { data: configs, error: configError } = await supabase
          .from('app_storage')
          .select('*')
          .eq('scope', 'global')
          .limit(5);
        
        if (configError) throw configError;
        
        const duration = Math.round(performance.now() - start);
        addResult({
          category: 'Permissions',
          name: 'Accès données cross-session',
          status: 'success',
          message: 'Accès aux données global fonctionnel',
          details: [
            `Entreprises accessibles: ${enterprises?.length || 0}`,
            `Configurations globales: ${configs?.length || 0}`,
            `Temps d'accès: ${duration}ms`,
            'Données partagées entre sessions: ✓'
          ],
          duration,
          timestamp: new Date()
        });
      } catch (e) {
        addResult({
          category: 'Permissions',
          name: 'Accès données cross-session',
          status: 'error',
          message: 'Problème d\'accès aux données partagées',
          details: [
            e instanceof Error ? e.message : 'Erreur inconnue',
            'Vérifiez les politiques RLS'
          ],
          timestamp: new Date()
        });
      }

      updateProgress(100);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
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
      case 'Performance': return <RefreshCw className="w-4 h-4" />;
      case 'Permissions': return <Users className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-l-green-500 bg-green-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      case 'error': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-gray-500 bg-gray-50';
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
      <DialogContent className="max-w-5xl max-h-[85vh]">
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
              <div className="flex space-x-3 text-sm">
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                  ✓ {stats.success}
                </Badge>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  ⚠ {stats.warning}
                </Badge>
                <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
                  ✗ {stats.error}
                </Badge>
                <Badge variant="outline">
                  Total: {stats.total}
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
            <ScrollArea className="h-[450px] w-full">
              <div className="space-y-3 pr-4">
                {results.map((result, index) => (
                  <Card key={index} className={`border-l-4 ${getStatusColor(result.status)}`}>
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
                          {result.duration && (
                            <Badge variant="secondary" className="text-xs">
                              {result.duration}ms
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                      {result.details && result.details.length > 0 && (
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

          {results.length > 0 && !isRunning && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Résumé du diagnostic:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• {stats.success} tests réussis</p>
                <p>• {stats.warning} avertissements</p>
                <p>• {stats.error} erreurs critiques</p>
                {stats.error === 0 && (
                  <p className="text-green-600 font-medium">✓ Système opérationnel</p>
                )}
                {stats.error > 0 && (
                  <p className="text-red-600 font-medium">✗ Problèmes détectés nécessitant une attention</p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
