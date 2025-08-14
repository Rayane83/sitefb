import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyDollar } from '@/lib/fmt';
import { handleApiError } from '@/lib/api';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompanyStorage } from '@/hooks/useUnifiedStorage';

interface AdvancedSalaryCalculatorProps {
  entreprise: string;
  currentRole: string;
  currentGuild: string;
}

interface SalaryRule {
  id: string;
  name: string;
  type: 'percentage_ca' | 'hourly_rate' | 'fixed_amount' | 'performance_bonus' | 'tier_bonus';
  value: number;
  active: boolean;
  conditions: {
    minCA?: number;
    maxCA?: number;
    minHours?: number;
    grade?: string;
    performanceScore?: number;
  };
  tier?: {
    threshold: number;
    bonus: number;
  }[];
}

interface Employee {
  id: string;
  name: string;
  grade: string;
  ca: number;
  hours: number;
  performanceScore: number;
  appliedRules: string[];
}

interface CalculationResult {
  employeeId: string;
  baseSalary: number;
  bonuses: number;
  totalSalary: number;
  breakdown: {
    ruleName: string;
    amount: number;
    type: string;
  }[];
}

export function AdvancedSalaryCalculator({ entreprise, currentRole, currentGuild }: AdvancedSalaryCalculatorProps) {
  const [salaryRules, setSalaryRules] = useState<SalaryRule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [calculations, setCalculations] = useState<CalculationResult[]>([]);
  const [activeTab, setActiveTab] = useState('rules');
  const { toast } = useToast();

  const isPatron = currentRole === 'patron' || currentRole === 'co-patron';

  // Règles par défaut
  const defaultRules: SalaryRule[] = [
    {
      id: 'base_percentage',
      name: 'Pourcentage de base du CA',
      type: 'percentage_ca',
      value: 5,
      active: true,
      conditions: {}
    },
    {
      id: 'hourly_base',
      name: 'Taux horaire de base',
      type: 'hourly_rate',
      value: 50,
      active: false,
      conditions: {}
    },
    {
      id: 'performance_bonus',
      name: 'Bonus de performance',
      type: 'performance_bonus',
      value: 1000,
      active: false,
      conditions: { performanceScore: 8 }
    }
  ];

  // Stockage unifié pour les règles de salaire et employés
  const salaryRulesStorage = useCompanyStorage(
    currentGuild, 
    entreprise, 
    'salary_rules', 
    defaultRules
  );
  
  const employeesStorage = useCompanyStorage<Employee[]>(
    currentGuild, 
    entreprise, 
    'employees', 
    []
  );

  useEffect(() => {
    if (salaryRulesStorage.value) {
      setSalaryRules(salaryRulesStorage.value);
    }
  }, [salaryRulesStorage.value]);

  useEffect(() => {
    if (employeesStorage.value) {
      setEmployees(employeesStorage.value);
    }
  }, [employeesStorage.value]);

  const addRule = () => {
    const newRule: SalaryRule = {
      id: `rule_${Date.now()}`,
      name: 'Nouvelle règle',
      type: 'percentage_ca',
      value: 0,
      active: true,
      conditions: {}
    };
    setSalaryRules(prev => [...prev, newRule]);
  };

  const updateRule = (id: string, updates: Partial<SalaryRule>) => {
    setSalaryRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const removeRule = (id: string) => {
    setSalaryRules(prev => prev.filter(rule => rule.id !== id));
  };

  const addEmployee = () => {
    const newEmployee: Employee = {
      id: `emp_${Date.now()}`,
      name: `Employé ${employees.length + 1}`,
      grade: 'Junior',
      ca: 0,
      hours: 0,
      performanceScore: 5,
      appliedRules: []
    };
    setEmployees(prev => [...prev, newEmployee]);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === id ? { ...emp, ...updates } : emp
    ));
  };

  const removeEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  };

  const calculateSalary = useCallback((employee: Employee): CalculationResult => {
    let baseSalary = 0;
    let bonuses = 0;
    const breakdown: { ruleName: string; amount: number; type: string }[] = [];

    const activeRules = salaryRules.filter(rule => rule.active);

    for (const rule of activeRules) {
      let ruleAmount = 0;
      let shouldApply = true;

      // Vérifier les conditions
      if (rule.conditions.minCA && employee.ca < rule.conditions.minCA) shouldApply = false;
      if (rule.conditions.maxCA && employee.ca > rule.conditions.maxCA) shouldApply = false;
      if (rule.conditions.minHours && employee.hours < rule.conditions.minHours) shouldApply = false;
      if (rule.conditions.grade && employee.grade !== rule.conditions.grade) shouldApply = false;
      if (rule.conditions.performanceScore && employee.performanceScore < rule.conditions.performanceScore) shouldApply = false;

      if (!shouldApply) continue;

      // Calculer le montant selon le type de règle
      switch (rule.type) {
        case 'percentage_ca':
          ruleAmount = (employee.ca * rule.value) / 100;
          baseSalary += ruleAmount;
          break;
        case 'hourly_rate':
          ruleAmount = employee.hours * rule.value;
          baseSalary += ruleAmount;
          break;
        case 'fixed_amount':
          ruleAmount = rule.value;
          baseSalary += ruleAmount;
          break;
        case 'performance_bonus':
          ruleAmount = rule.value;
          bonuses += ruleAmount;
          break;
        case 'tier_bonus':
          if (rule.tier) {
            for (const tier of rule.tier) {
              if (employee.ca >= tier.threshold) {
                ruleAmount = tier.bonus;
                bonuses += ruleAmount;
              }
            }
          }
          break;
      }

      if (ruleAmount > 0) {
        breakdown.push({
          ruleName: rule.name,
          amount: ruleAmount,
          type: rule.type
        });
      }
    }

    return {
      employeeId: employee.id,
      baseSalary,
      bonuses,
      totalSalary: baseSalary + bonuses,
      breakdown
    };
  }, [salaryRules]);

  const calculateAllSalaries = () => {
    const results = employees.map(calculateSalary);
    setCalculations(results);
  };

  const saveConfiguration = async () => {
    try {
      await Promise.all([
        salaryRulesStorage.save(salaryRules),
        employeesStorage.save(employees)
      ]);
      toast({
        title: 'Configuration sauvegardée',
        description: 'Les règles de calcul ont été enregistrées'
      });
    } catch (error) {
      toast({
        title: 'Erreur de sauvegarde',
        description: 'Impossible de sauvegarder la configuration.',
        variant: 'destructive'
      });
    }
  };

  if (!isPatron) {
    return (
      <Card className="stat-card">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p>Accès réservé aux patrons et co-patrons</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          Calculateur de salaires avancé
        </h3>
        <Badge variant="outline">{entreprise}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rules">Règles de calcul</TabsTrigger>
          <TabsTrigger value="employees">Employés</TabsTrigger>
          <TabsTrigger value="calculation">Calculs</TabsTrigger>
          <TabsTrigger value="templates">Modèles</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card className="stat-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Règles de calcul des salaires</CardTitle>
                <Button onClick={addRule} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une règle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {salaryRules.map((rule) => (
                <Card key={rule.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={rule.active}
                          onCheckedChange={(checked) => 
                            updateRule(rule.id, { active: !!checked })
                          }
                        />
                        <Input
                          value={rule.name}
                          onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                          className="font-medium"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label>Type de règle</Label>
                        <Select
                          value={rule.type}
                          onValueChange={(value) => 
                            updateRule(rule.id, { type: value as SalaryRule['type'] })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage_ca">% du CA</SelectItem>
                            <SelectItem value="hourly_rate">Taux horaire</SelectItem>
                            <SelectItem value="fixed_amount">Montant fixe</SelectItem>
                            <SelectItem value="performance_bonus">Bonus performance</SelectItem>
                            <SelectItem value="tier_bonus">Bonus par paliers</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Valeur</Label>
                        <Input
                          type="number"
                          value={rule.value}
                          onChange={(e) => 
                            updateRule(rule.id, { value: Number(e.target.value) || 0 })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Conditions</Label>
                        <div className="text-xs text-muted-foreground">
                          {rule.type === 'percentage_ca' && 'Appliqué sur le CA total'}
                          {rule.type === 'hourly_rate' && 'Multiplié par les heures'}
                          {rule.type === 'fixed_amount' && 'Montant fixe ajouté'}
                          {rule.type === 'performance_bonus' && 'Si score ≥ valeur seuil'}
                          {rule.type === 'tier_bonus' && 'Bonus par paliers de CA'}
                        </div>
                      </div>
                    </div>

                    {/* Conditions avancées */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">CA min</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={rule.conditions.minCA || ''}
                          onChange={(e) => 
                            updateRule(rule.id, { 
                              conditions: { 
                                ...rule.conditions, 
                                minCA: Number(e.target.value) || undefined 
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CA max</Label>
                        <Input
                          type="number"
                          placeholder="∞"
                          value={rule.conditions.maxCA || ''}
                          onChange={(e) => 
                            updateRule(rule.id, { 
                              conditions: { 
                                ...rule.conditions, 
                                maxCA: Number(e.target.value) || undefined 
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Heures min</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={rule.conditions.minHours || ''}
                          onChange={(e) => 
                            updateRule(rule.id, { 
                              conditions: { 
                                ...rule.conditions, 
                                minHours: Number(e.target.value) || undefined 
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Grade</Label>
                        <Input
                          placeholder="Tous"
                          value={rule.conditions.grade || ''}
                          onChange={(e) => 
                            updateRule(rule.id, { 
                              conditions: { 
                                ...rule.conditions, 
                                grade: e.target.value || undefined 
                              }
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <Card className="stat-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gestion des employés</CardTitle>
                <Button onClick={addEmployee} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un employé
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employees.map((employee) => (
                  <Card key={employee.id} className="border-l-4 border-l-accent/20">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="space-y-1">
                          <Label>Nom</Label>
                          <Input
                            value={employee.name}
                            onChange={(e) => 
                              updateEmployee(employee.id, { name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Grade</Label>
                          <Input
                            value={employee.grade}
                            onChange={(e) => 
                              updateEmployee(employee.id, { grade: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>CA ($)</Label>
                          <Input
                            type="number"
                            value={employee.ca}
                            onChange={(e) => 
                              updateEmployee(employee.id, { ca: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Heures</Label>
                          <Input
                            type="number"
                            value={employee.hours}
                            onChange={(e) => 
                              updateEmployee(employee.id, { hours: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Performance (1-10)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={employee.performanceScore}
                            onChange={(e) => 
                              updateEmployee(employee.id, { 
                                performanceScore: Math.max(1, Math.min(10, Number(e.target.value) || 1))
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Actions</Label>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeEmployee(employee.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculation" className="space-y-4">
          <Card className="stat-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Résultats des calculs</CardTitle>
                <Button onClick={calculateAllSalaries} className="btn-discord">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculer les salaires
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {calculations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Cliquez sur "Calculer les salaires" pour voir les résultats</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calculations.map((result) => {
                    const employee = employees.find(emp => emp.id === result.employeeId);
                    if (!employee) return null;

                    return (
                      <Card key={result.employeeId} className="border-l-4 border-l-success/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{employee.name}</h4>
                            <div className="flex items-center gap-4">
                              <Badge variant="outline">
                                Total: {formatCurrencyDollar(result.totalSalary)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <div className="text-sm text-muted-foreground">Salaire de base</div>
                              <div className="font-semibold">{formatCurrencyDollar(result.baseSalary)}</div>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <div className="text-sm text-muted-foreground">Bonus</div>
                              <div className="font-semibold">{formatCurrencyDollar(result.bonuses)}</div>
                            </div>
                            <div className="text-center p-2 bg-success/10 rounded">
                              <div className="text-sm text-muted-foreground">Total</div>
                              <div className="font-bold text-success">{formatCurrencyDollar(result.totalSalary)}</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Détail des calculs:</Label>
                            {result.breakdown.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm bg-background/50 p-2 rounded">
                                <span>{item.ruleName}</span>
                                <span className="font-mono">{formatCurrencyDollar(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="stat-card">
            <CardHeader>
              <CardTitle>Modèles prédéfinis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-dashed border-muted">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Modèle "Commerce"</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Adapté pour les entreprises de commerce avec bonus par paliers
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const commerceRules: SalaryRule[] = [
                          {
                            id: 'commerce_base',
                            name: '3% du CA de base',
                            type: 'percentage_ca',
                            value: 3,
                            active: true,
                            conditions: {}
                          },
                          {
                            id: 'commerce_tier',
                            name: 'Bonus paliers commerce',
                            type: 'tier_bonus',
                            value: 0,
                            active: true,
                            conditions: {},
                            tier: [
                              { threshold: 50000, bonus: 1000 },
                              { threshold: 100000, bonus: 2500 },
                              { threshold: 200000, bonus: 5000 }
                            ]
                          }
                        ];
                        setSalaryRules(commerceRules);
                      }}
                    >
                      Appliquer
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed border-muted">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Modèle "Service"</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Basé sur les heures travaillées avec bonus de performance
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const serviceRules: SalaryRule[] = [
                          {
                            id: 'service_hourly',
                            name: 'Taux horaire 75$/h',
                            type: 'hourly_rate',
                            value: 75,
                            active: true,
                            conditions: {}
                          },
                          {
                            id: 'service_performance',
                            name: 'Bonus performance (score ≥8)',
                            type: 'performance_bonus',
                            value: 1500,
                            active: true,
                            conditions: { performanceScore: 8 }
                          }
                        ];
                        setSalaryRules(serviceRules);
                      }}
                    >
                      Appliquer
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveConfiguration} className="btn-discord">
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder la configuration
        </Button>
      </div>
    </div>
  );
}