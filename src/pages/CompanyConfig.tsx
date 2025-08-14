import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Role, CompanyConfig, CompanyConfigData, Employee, TierConfig, CalculParam, GradeRule, Bracket, SalaryConfig, PrimeTier } from "@/lib/types";
import { getUserGuildRoles, resolveRole, canAccessCompanyConfig, getEntrepriseFromRoles, isStaff } from "@/lib/roles";
import { ArrowLeft, Download, FileUp, Save, Shield, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockApi, handleApiError } from "@/lib/api";
import { AdvancedSalaryCalculator } from "@/components/AdvancedSalaryCalculator";
import { useCompanyStorage } from "@/hooks/useUnifiedStorage";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const defaultCalculParam = (label: string): CalculParam => ({ label, actif: true, poids: 1, cumulatif: false, paliers: [] });

const defaultSalaryConfig: SalaryConfig = {
  pourcentageCA: 5, // 5% du CA par défaut
  modes: { caEmploye: true, heuresService: false, additionner: false },
  primeBase: { active: false, montant: 0 },
  paliersPrimes: []
};

const defaultCompanyConfig: CompanyConfig = {
  identification: { label: "Entreprise", type: "Société", description: "" },
  salaire: defaultSalaryConfig,
  parametres: {
    RUN: defaultCalculParam("RUN"),
    FACTURE: defaultCalculParam("FACTURE"),
    VENTE: defaultCalculParam("VENTE"),
    CA_TOTAL: defaultCalculParam("CA_TOTAL"),
    GRADE: defaultCalculParam("GRADE"),
    HEURE_SERVICE: defaultCalculParam("HEURE_SERVICE"),
  },
  gradeRules: [],
  errorTiers: [],
  roleDiscord: "",
};

// Assure la présence des champs salaire avec des valeurs par défaut
function mergeCompanyConfig(incoming?: CompanyConfig): CompanyConfig {
  const src = incoming || ({} as CompanyConfig);
  const merged: CompanyConfig = {
    ...defaultCompanyConfig,
    ...src,
    identification: { ...defaultCompanyConfig.identification, ...(src.identification || {}) },
    salaire: {
      ...defaultSalaryConfig,
      ...(src as any).salaire,
      modes: {
        ...defaultSalaryConfig.modes,
        ...(((src as any).salaire?.modes) || {}),
      },
      primeBase: {
        ...defaultSalaryConfig.primeBase,
        ...((src as any).salaire?.primeBase || {}),
      },
      paliersPrimes: (src as any).salaire?.paliersPrimes || defaultSalaryConfig.paliersPrimes,
    },
    parametres: {
      ...defaultCompanyConfig.parametres,
      ...(src.parametres || {}),
      RUN: { ...defaultCompanyConfig.parametres.RUN, ...(src.parametres?.RUN || {}) },
      FACTURE: { ...defaultCompanyConfig.parametres.FACTURE, ...(src.parametres?.FACTURE || {}) },
      VENTE: { ...defaultCompanyConfig.parametres.VENTE, ...(src.parametres?.VENTE || {}) },
      CA_TOTAL: { ...defaultCompanyConfig.parametres.CA_TOTAL, ...(src.parametres?.CA_TOTAL || {}) },
      GRADE: { ...defaultCompanyConfig.parametres.GRADE, ...(src.parametres?.GRADE || {}) },
      HEURE_SERVICE: { ...defaultCompanyConfig.parametres.HEURE_SERVICE, ...(src.parametres?.HEURE_SERVICE || {}) },
    },
    gradeRules: src.gradeRules || [],
    errorTiers: src.errorTiers || [],
    roleDiscord: src.roleDiscord || "",
  };
  return merged;
}

export default function CompanyConfigPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const guildId = query.get("guild") || "";
  const [currentRole, setCurrentRole] = useState<Role>("employe");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cfg, setCfg] = useState<CompanyConfig>(defaultCompanyConfig);
  const [salaryPaliers, setSalaryPaliers] = useState<Bracket[]>([]);
  const { toast } = useToast();

  const [entreprises, setEntreprises] = useState<Array<{id:string; name:string}>>([]);
  const [selectedEntrepriseId, setSelectedEntrepriseId] = useState<string>("");
  const [selectedGradeIdx, setSelectedGradeIdx] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Configuration d’entreprise | Portail";
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadRole() {
      if (!guildId) return;
      const roles = await getUserGuildRoles(guildId);
      if (!alive) return;
      const role = resolveRole(roles);
      setCurrentRole(role);
      if (role === 'patron' || role === 'co-patron') {
        const entreprise = getEntrepriseFromRoles(roles);
        setCfg((prev)=> {
          const current = prev.identification.label;
          const shouldReplace = !current || current.toLowerCase() === 'entreprise';
          return { ...prev, identification: { ...prev.identification, label: shouldReplace ? entreprise : current } };
        });
      }
    }
    loadRole();
    return () => {
      alive = false;
    };
  }, [guildId]);

  // Liste des entreprises (Staff)
  useEffect(() => {
    let alive = true;
    async function loadList() {
      if (!guildId) return;
      try {
        const list = await mockApi.getEntreprises(guildId);
        if (!alive) return;
        setEntreprises(list as any);
      } catch {}
    }
    loadList();
    return () => { alive = false; };
  }, [guildId]);

  // Sélection d'entreprise -> refléter dans l'identification affichée
  useEffect(() => {
    if (!isStaff(currentRole)) return;
    const ent = entreprises.find(e => e.id === selectedEntrepriseId);
    if (ent) {
      setCfg((prev) => ({ ...prev, identification: { ...prev.identification, label: ent.name } }));
    }
  }, [selectedEntrepriseId, entreprises, currentRole]);

  // Accès
  const hasAccess = canAccessCompanyConfig(currentRole);

  // Stockage unifié pour la configuration d'entreprise
  const configStorage = useCompanyStorage<CompanyConfigData>(
    guildId, 
    '_', // entreprise key pour config générale 
    'company_config',
    { cfg: mergeCompanyConfig(defaultCompanyConfig), employees: [] }
  );

  const salaryPaliersStorage = useCompanyStorage<Bracket[]>(
    guildId,
    '_',
    'salary_paliers',
    []
  );

  useEffect(() => {
    if (configStorage.value) {
      setCfg(mergeCompanyConfig(configStorage.value.cfg));
      setEmployees(configStorage.value.employees || []);
    }
  }, [configStorage.value]);

  useEffect(() => {
    if (salaryPaliersStorage.value) {
      setSalaryPaliers(salaryPaliersStorage.value);
    }
  }, [salaryPaliersStorage.value]);

  const saveLocal = async () => {
    try {
      const payload: CompanyConfigData = { cfg, employees };
      await Promise.all([
        configStorage.save(payload),
        salaryPaliersStorage.save(salaryPaliers)
      ]);
      toast({ title: "Configuration sauvegardée localement" });
    } catch (error) {
      toast({ title: "Erreur lors de la sauvegarde", description: "Impossible de sauvegarder la configuration.", variant: "destructive" });
    }
  };

  const exportJSON = () => {
    const payload: any = { cfg, employees, salaryPrimesPaliers: salaryPaliers };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `company-config-${guildId}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = async (file: File) => {
    const text = await file.text();
    parseAndMergeEmployees(text);
  };

  const parseAndMergeEmployees = (text: string) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const rows = lines.map((l) => l.split(/[\t,;]/).map((s) => s.trim()));
    const mapped: Employee[] = rows.map((cols, i) => ({
      id: `${Date.now()}-${i}`,
      name: cols[0] || `Employé ${i + 1}`,
      discordRole: cols[1] || "",
      grade: cols[2] || undefined,
    }));
    setEmployees((prev) => [...prev, ...mapped]);
    toast({ title: "Import effectué", description: `${mapped.length} employé(s) importé(s).` });
  };

  const addEmployee = () => setEmployees((prev) => [...prev, { id: `${Date.now()}`, name: "", discordRole: "", grade: "" }]);
  const removeEmployee = (id: string) => setEmployees((prev) => prev.filter((e) => e.id !== id));

  const addTier = (key: keyof CompanyConfig["parametres"]) => {
    setCfg((prev) => ({
      ...prev,
      parametres: {
        ...prev.parametres,
        [key]: {
          ...prev.parametres[key],
          paliers: [...prev.parametres[key].paliers, { seuil: 0, bonus: 0 } as TierConfig].slice(0, 10),
        },
      },
    }));
  };

  const addGradeRule = () => setCfg((prev) => ({ ...prev, gradeRules: [...prev.gradeRules, { grade: "", roleDiscordId: "", pourcentageCA: 0, tauxHoraire: 0 } as GradeRule] }));
  // const addErrorTier = () => {}; // paliers globaux supprimés

  // Gestion des paliers de primes dans salaire
  const addPrimeTier = () => {
    setCfg((prev) => ({
      ...prev,
      salaire: {
        ...prev.salaire,
        paliersPrimes: [...prev.salaire.paliersPrimes, { seuil: 0, prime: 0 }].slice(0, 10),
      },
    }));
  };

  const updatePrimeTier = (index: number, field: keyof PrimeTier, value: number) => {
    setCfg((prev) => ({
      ...prev,
      salaire: {
        ...prev.salaire,
        paliersPrimes: prev.salaire.paliersPrimes.map((tier, i) =>
          i === index ? { ...tier, [field]: value } : tier
        ),
      },
    }));
  };

  const removePrimeTier = (index: number) => {
    setCfg((prev) => ({
      ...prev,
      salaire: {
        ...prev.salaire,
        paliersPrimes: prev.salaire.paliersPrimes.filter((_, i) => i !== index),
      },
    }));
  };

  // Chargement des entreprises (staff)

  // Remplir le formulaire quand on sélectionne une entreprise


  if (!hasAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="stat-card max-w-xl mx-auto">
          <CardContent className="p-8 text-center">
            <Shield className="w-10 h-10 mx-auto mb-3 text-destructive" />
            <p className="font-semibold mb-1">Accès restreint</p>
            <p className="text-sm text-muted-foreground">Cette page est réservée aux patrons, co-patrons et staff.</p>
            <Button className="mt-4" onClick={() => navigate(`/?guild=${guildId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2"/>Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/?guild=${guildId}`)} aria-label="Retour">
            <ArrowLeft className="w-4 h-4 mr-2"/>Retour
          </Button>
          <h1 className="text-2xl font-bold">Configuration d’entreprise avancée</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Guild: {guildId || "-"}</Badge>
          <Badge className="badge-success">Rôle: {currentRole}</Badge>
        </div>
      </div>


      {isStaff(currentRole) && (
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="text-lg">Entreprise à configurer (Staff)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Choisir l'entreprise</Label>
            <Select value={selectedEntrepriseId || "__none__"} onValueChange={(v)=> setSelectedEntrepriseId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sélectionner</SelectItem>
                {entreprises.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Nom</Label>
            <div className="text-sm font-medium">{cfg.identification.label || '-'}</div>
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <div className="text-sm">{cfg.identification.type || '-'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration du système de salaire */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Configuration du système de salaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sélection du grade à configurer */}
          <div className="space-y-2">
            <Label>Grade à configurer</Label>
            {cfg.gradeRules.length > 0 ? (
              <Select value={selectedGradeIdx !== null ? String(selectedGradeIdx) : "__none__"} onValueChange={(v)=> setSelectedGradeIdx(v === "__none__" ? null : Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {cfg.gradeRules.map((gr, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{gr.grade || `Grade ${idx+1}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun grade. Ajoutez-en dans la section “Grades”.</p>
            )}
          </div>

          {/* Edition du grade sélectionné */}
          {selectedGradeIdx !== null && cfg.gradeRules[selectedGradeIdx] && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>% du CA pour ce grade</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={cfg.gradeRules[selectedGradeIdx].pourcentageCA}
                    onChange={(e)=> setCfg((prev)=> ({...prev, gradeRules: prev.gradeRules.map((r,i)=> i===selectedGradeIdx?{...r, pourcentageCA: Number(e.target.value)||0}:r)}))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taux horaire ($/h)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cfg.gradeRules[selectedGradeIdx].tauxHoraire}
                  onChange={(e)=> setCfg((prev)=> ({...prev, gradeRules: prev.gradeRules.map((r,i)=> i===selectedGradeIdx?{...r, tauxHoraire: Number(e.target.value)||0}:r)}))}
                />
              </div>
              <div className="space-y-2">
                <Label>ID rôle Discord</Label>
                <Input
                  value={cfg.gradeRules[selectedGradeIdx].roleDiscordId || ""}
                  onChange={(e)=> setCfg((prev)=> ({...prev, gradeRules: prev.gradeRules.map((r,i)=> i===selectedGradeIdx?{...r, roleDiscordId: e.target.value}:r)}))}
                />
              </div>
            </div>
          )}

          {/* Pourcentage du CA */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Pourcentage du CA total pour le salaire</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={cfg.salaire.pourcentageCA}
                  onChange={(e) => setCfg((prev) => ({
                    ...prev,
                    salaire: { ...prev.salaire, pourcentageCA: Number(e.target.value) || 0 }
                  }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Prime de base */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="primeBase"
                checked={cfg.salaire.primeBase.active}
                onChange={(e) => setCfg((prev) => ({
                  ...prev,
                  salaire: {
                    ...prev.salaire,
                    primeBase: { ...prev.salaire.primeBase, active: e.target.checked }
                  }
                }))}
                className="rounded"
              />
              <Label htmlFor="primeBase">Activer une prime de base</Label>
            </div>
            
            {cfg.salaire.primeBase.active && (
              <div className="ml-6 space-y-2">
                <Label>Montant de la prime de base</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    value={cfg.salaire.primeBase.montant}
                    onChange={(e) => setCfg((prev) => ({
                      ...prev,
                      salaire: {
                        ...prev.salaire,
                        primeBase: { ...prev.salaire.primeBase, montant: Number(e.target.value) || 0 }
                      }
                    }))}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Prime fixe accordée à tous les employés
                </p>
              </div>
            )}
          </div>

          {/* Paliers de primes (seuil $ -> montant de prime $) */}
          <div className="space-y-3">
            <Label>Paliers de primes</Label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Seuil ($ de CA)</th>
                    <th className="p-2 text-left">Prime ($)</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cfg.salaire.paliersPrimes.map((t, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 w-40"><Input type="number" value={t.seuil} onChange={(e)=> updatePrimeTier(idx, 'seuil', Number(e.target.value) || 0)} /></td>
                      <td className="p-2 w-40"><Input type="number" value={t.prime} onChange={(e)=> updatePrimeTier(idx, 'prime', Number(e.target.value) || 0)} /></td>
                      <td className="p-2">
                        <Button variant="destructive" size="sm" onClick={()=> removePrimeTier(idx)}><Trash2 className="w-4 h-4"/></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" onClick={addPrimeTier} disabled={cfg.salaire.paliersPrimes.length>=10}>Ajouter un palier</Button>
            <p className="text-xs text-muted-foreground">Exemple: seuil 3000 → prime 10000$.</p>
          </div>

          {/* Mode de calcul */}

          <div className="space-y-3">
            <Label>Mode de calcul</Label>
            <div className="flex flex-col gap-2 ml-1">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cfg.salaire.modes?.caEmploye ?? true}
                  onChange={(e) => setCfg((prev) => ({
                    ...prev,
                    salaire: {
                      ...prev.salaire,
                      modes: { ...(prev.salaire.modes || { caEmploye: true, heuresService: false, additionner: false }), caEmploye: e.target.checked }
                    }
                  }))}
                  className="rounded"
                />
                <span>CA total de l’employé</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cfg.salaire.modes?.heuresService ?? false}
                  onChange={(e) => setCfg((prev) => ({
                    ...prev,
                    salaire: {
                      ...prev.salaire,
                      modes: { ...(prev.salaire.modes || { caEmploye: true, heuresService: false, additionner: false }), heuresService: e.target.checked }
                    }
                  }))}
                  className="rounded"
                />
                <span>Heures de service</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={!(cfg.salaire.modes?.caEmploye ?? true) || !(cfg.salaire.modes?.heuresService ?? false)}
                  checked={cfg.salaire.modes?.additionner ?? false}
                  onChange={(e) => setCfg((prev) => ({
                    ...prev,
                    salaire: {
                      ...prev.salaire,
                      modes: { ...(prev.salaire.modes || { caEmploye: true, heuresService: false, additionner: false }), additionner: e.target.checked }
                    }
                  }))}
                  className="rounded"
                />
                <span>Additionner les options</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Le pourcentage de CA s’applique au CA de chaque employé et peut varier selon le grade.</p>
          </div>
        </CardContent>
      </Card>

      {/* Paramètres de calcul (RUN, FACTURE, VENTE, CA_TOTAL, GRADE, HEURE_SERVICE) */}
      {Object.entries(cfg.parametres).map(([key, param]) => (
        <Card key={key} className="stat-card">
          <CardHeader>
            <CardTitle className="text-lg">Paramètre {param.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Actif</Label>
                <Input type="checkbox" checked={param.actif} onChange={(e)=> setCfg((prev)=> ({
                  ...prev,
                  parametres: { ...prev.parametres, [key]: { ...prev.parametres[key as keyof CompanyConfig["parametres"]], actif: e.target.checked } },
                }))} />
              </div>
              <div className="space-y-2">
                <Label>Cumulatif</Label>
                <Input type="checkbox" checked={param.cumulatif} onChange={(e)=> setCfg((prev)=> ({
                  ...prev,
                  parametres: { ...prev.parametres, [key]: { ...prev.parametres[key as keyof CompanyConfig["parametres"]], cumulatif: e.target.checked } },
                }))} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Seuil</th>
                    <th className="p-2 text-left">Bonus/Pénalité</th>
                  </tr>
                </thead>
                <tbody>
                  {param.paliers.map((t, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2"><Input type="number" value={t.seuil} onChange={(e)=> setCfg((prev)=> ({
                        ...prev,
                        parametres: { ...prev.parametres, [key]: { ...prev.parametres[key as keyof CompanyConfig["parametres"]], paliers: prev.parametres[key as keyof CompanyConfig["parametres"]].paliers.map((r,i)=> i===idx?{...r, seuil:Number(e.target.value)||0}:r) } },
                      }))} /></td>
                      <td className="p-2"><Input type="number" value={t.bonus} onChange={(e)=> setCfg((prev)=> ({
                        ...prev,
                        parametres: { ...prev.parametres, [key]: { ...prev.parametres[key as keyof CompanyConfig["parametres"]], paliers: prev.parametres[key as keyof CompanyConfig["parametres"]].paliers.map((r,i)=> i===idx?{...r, bonus:Number(e.target.value)||0}:r) } },
                      }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" onClick={()=> addTier(key as keyof CompanyConfig["parametres"]) } disabled={param.paliers.length>=10}>Ajouter un palier</Button>
          </CardContent>
        </Card>
      ))}


      {/* Grades */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Grades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Nom du grade</th>
                  <th className="p-2 text-left">ID rôle Discord du grade</th>
                  <th className="p-2 text-left">% du CA (CA de l’employé)</th>
                  <th className="p-2 text-left">Taux horaire ($/h)</th>
                </tr>
              </thead>
              <tbody>
                {cfg.gradeRules.map((gr, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2"><Input value={gr.grade} onChange={(e)=> setCfg((prev)=> ({...prev, gradeRules: prev.gradeRules.map((r,i)=> i===idx?{...r, grade:e.target.value}:r) }))} /></td>
                    <td className="p-2"><Input value={gr.roleDiscordId || ""} onChange={(e)=> setCfg((prev)=> ({...prev, gradeRules: prev.gradeRules.map((r,i)=> i===idx?{...r, roleDiscordId:e.target.value}:r) }))} /></td>
                    <td className="p-2"><Input type="number" value={gr.pourcentageCA} onChange={(e)=> setCfg((prev)=> ({...prev, gradeRules: prev.gradeRules.map((r,i)=> i===idx?{...r, pourcentageCA:Number(e.target.value)||0}:r) }))} /></td>
                    <td className="p-2"><Input type="number" value={gr.tauxHoraire} onChange={(e)=> setCfg((prev)=> ({...prev, gradeRules: prev.gradeRules.map((r,i)=> i===idx?{...r, tauxHoraire:Number(e.target.value)||0}:r) }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" onClick={addGradeRule}>Ajouter un grade</Button>
        </CardContent>
      </Card>

      {/* Section Paliers globaux retirée selon demande */}

      {/* Employés */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="text-lg">Employés</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button className="btn-discord" onClick={saveLocal}><Save className="w-4 h-4 mr-2"/>Enregistrer localement</Button>
            <Button variant="outline" onClick={exportJSON}><Download className="w-4 h-4 mr-2"/>Exporter JSON</Button>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <FileUp className="w-4 h-4"/>
              <input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importCSV(f); }} />
              <span>Importer CSV/TSV</span>
            </label>
            <Button variant="outline" onClick={addEmployee}>Ajouter un employé</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Nom</th>
                  <th className="p-2 text-left">Rôle Discord</th>
                  <th className="p-2 text-left">Grade</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e, idx) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-2"><Input value={e.name} onChange={(ev)=> setEmployees((prev)=> prev.map((r,i)=> i===idx?{...r, name: ev.target.value}:r))} /></td>
                    <td className="p-2"><Input value={e.discordRole} onChange={(ev)=> setEmployees((prev)=> prev.map((r,i)=> i===idx?{...r, discordRole: ev.target.value}:r))} /></td>
                    <td className="p-2"><Input value={e.grade || ""} onChange={(ev)=> setEmployees((prev)=> prev.map((r,i)=> i===idx?{...r, grade: ev.target.value}:r))} /></td>
                    <td className="p-2"><Button variant="destructive" onClick={()=> removeEmployee(e.id)}>Supprimer</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Aperçu JSON (extrait):</p>
            <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-auto">{JSON.stringify({ cfg, employees }, null, 2)}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Calculateur de salaires avancé */}
      <AdvancedSalaryCalculator 
        entreprise={cfg.identification.label || 'Entreprise'}
        currentRole={currentRole}
        currentGuild={guildId}
      />
    </div>
  );
}
