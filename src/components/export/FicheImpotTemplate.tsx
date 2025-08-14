import React from 'react';
import { formatCurrencyDollar, formatDate, formatDateTime } from '@/lib/fmt';
import type { DotationRow, PalierConfig } from '@/lib/types';

interface FicheImpotTemplateProps {
  data: {
    rows: DotationRow[];
    soldeActuel: number;
    totals: {
      totalCA: number;
      totalSalaires: number;
      totalPrimes: number;
      totalExpenses?: number;
      totalWithdrawals?: number;
    };
    limits: {
      maxSalaireEmp: number;
      maxPrimeEmp: number;
      maxSalairePat: number;
      maxPrimePat: number;
    };
    paliers: PalierConfig[];
    entreprise: string;
    employeesCount: number;
    period?: {
      start_at: string;
      end_at: string;
    };
    expenses?: Array<{ date: string; justificatif: string; montant: number }>;
    withdrawals?: Array<{ date: string; justificatif: string; montant: number }>;
    wealthBrackets?: Array<{ min: number; max: number; taux: number }>;
  };
}

export function FicheImpotTemplate({ data }: FicheImpotTemplateProps) {
  const currentDate = new Date();
  const beneficeAvantImpot = data.totals.totalCA - data.totals.totalSalaires - data.totals.totalPrimes - (data.totals.totalExpenses || 0);
  
  // Calcul impôt société basé sur les paliers
  const calculateIS = (benefice: number) => {
    if (!data.paliers.length) return 0;
    let impot = 0;
    let remaining = benefice;
    
    for (const palier of data.paliers) {
      const tranche = Math.min(remaining, (palier.max || Infinity) - palier.min);
      if (tranche > 0) {
        impot += tranche * (palier.taux / 100);
        remaining -= tranche;
      }
      if (remaining <= 0) break;
    }
    return Math.round(impot);
  };

  const impotSociete = calculateIS(beneficeAvantImpot);
  const beneficeApresImpot = beneficeAvantImpot - impotSociete;

  // Calcul impôt richesse
  const calculateWealthTax = (solde: number) => {
    if (!data.wealthBrackets?.length) return 0;
    let impot = 0;
    let remaining = solde;
    
    for (const bracket of data.wealthBrackets) {
      const tranche = Math.min(remaining, (bracket.max || Infinity) - bracket.min);
      if (tranche > 0) {
        impot += tranche * (bracket.taux / 100);
        remaining -= tranche;
      }
      if (remaining <= 0) break;
    }
    return Math.round(impot);
  };

  const impotRichesse = calculateWealthTax(data.soldeActuel);

  return (
    <div className="min-h-screen bg-white text-black p-6 print:p-4" style={{ fontSize: '11px', lineHeight: '1.2' }}>
      {/* En-tête */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">FICHE IMPÔT</h1>
        <div className="text-lg font-semibold mb-1">Entreprise: {data.entreprise}</div>
        {data.period && (
          <div className="text-sm">
            Période: {formatDate(new Date(data.period.start_at))} → {formatDate(new Date(data.period.end_at))}
          </div>
        )}
        <div className="text-sm text-gray-600">
          Généré le: {formatDateTime(currentDate)}
        </div>
      </div>

      {/* Tableau principal des employés */}
      <div className="mb-6">
        <h2 className="text-sm font-bold mb-2">TABLEAU DES EMPLOYÉS</h2>
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-1 text-xs font-bold">Grade</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Nom du salarié</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">RUN ($)</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">FACTURE ($)</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">VENTE ($)</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">CA TOTAL RÉALISÉ ($)</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Salaire ($)</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="border border-gray-400 p-1 text-xs">Employé</td>
                <td className="border border-gray-400 p-1 text-xs">{row.name}</td>
                <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(row.run)}</td>
                <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(row.facture)}</td>
                <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(row.vente)}</td>
                <td className="border border-gray-400 p-1 text-xs text-right font-semibold">{formatCurrencyDollar(row.ca_total)}</td>
                <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(row.salaire)}</td>
              </tr>
            ))}
            <tr className="bg-gray-200 font-bold">
              <td className="border border-gray-400 p-1 text-xs" colSpan={2}>TOTAUX</td>
              <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(data.rows.reduce((s, r) => s + r.run, 0))}</td>
              <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(data.rows.reduce((s, r) => s + r.facture, 0))}</td>
              <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(data.rows.reduce((s, r) => s + r.vente, 0))}</td>
              <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(data.totals.totalCA)}</td>
              <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(data.totals.totalSalaires)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section synthèse en deux colonnes */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Colonne gauche - Résumé entreprise */}
        <div>
          <div className="mb-4 p-3 border border-gray-400">
            <h3 className="font-bold text-sm mb-2">{data.entreprise.toUpperCase()} CA BRUT</h3>
            <div className="text-lg font-bold">{formatCurrencyDollar(data.totals.totalCA)}</div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold">Prime:</span>
              <span>{formatCurrencyDollar(data.totals.totalPrimes)}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold">Salaire:</span>
              <span>{formatCurrencyDollar(data.totals.totalSalaires)}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold">Nombre d'employés:</span>
              <span>{data.employeesCount}</span>
            </div>
          </div>
        </div>

        {/* Colonne droite - Limites */}
        <div>
          <h3 className="font-bold text-sm mb-2">LIMITES</h3>
          <div className="text-xs">
            <div className="mb-2">
              <div className="font-semibold">Salaire Maximum employé:</div>
              <div>{formatCurrencyDollar(data.limits.maxSalaireEmp)}</div>
            </div>
            <div className="mb-2">
              <div className="font-semibold">Salaire Maximum patron:</div>
              <div>{formatCurrencyDollar(data.limits.maxSalairePat)}</div>
            </div>
            <div className="mb-2">
              <div className="font-semibold">Prime Maximum employé:</div>
              <div>{formatCurrencyDollar(data.limits.maxPrimeEmp)}</div>
            </div>
            <div className="mb-2">
              <div className="font-semibold">Prime Maximum patron:</div>
              <div>{formatCurrencyDollar(data.limits.maxPrimePat)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dépenses déductibles */}
      <div className="mb-6">
        <h3 className="font-bold text-sm mb-2">DÉPENSES DÉDUCTIBLES</h3>
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-1 text-xs font-bold">Date</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Justificatif</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Montant ($)</th>
            </tr>
          </thead>
          <tbody>
            {data.expenses?.map((expense, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="border border-gray-400 p-1 text-xs">{formatDate(new Date(expense.date))}</td>
                <td className="border border-gray-400 p-1 text-xs">{expense.justificatif}</td>
                <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(expense.montant)}</td>
              </tr>
            )) || (
              <tr>
                <td className="border border-gray-400 p-1 text-xs text-center" colSpan={3}>Aucune dépense déductible</td>
              </tr>
            )}
            <tr className="bg-gray-200 font-bold">
              <td className="border border-gray-400 p-1 text-xs" colSpan={2}>TOTAL</td>
              <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(data.totals.totalExpenses || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tableau des retraits */}
      <div className="mb-6">
        <h3 className="font-bold text-sm mb-2">TABLEAU DES RETRAITS</h3>
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-1 text-xs font-bold">Date</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Justificatif</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Montant ($)</th>
            </tr>
          </thead>
          <tbody>
            {data.withdrawals?.map((withdrawal, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="border border-gray-400 p-1 text-xs">{formatDate(new Date(withdrawal.date))}</td>
                <td className="border border-gray-400 p-1 text-xs">{withdrawal.justificatif}</td>
                <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(withdrawal.montant)}</td>
              </tr>
            )) || (
              <tr>
                <td className="border border-gray-400 p-1 text-xs text-center" colSpan={3}>Aucun retrait</td>
              </tr>
            )}
            <tr className="bg-gray-200 font-bold">
              <td className="border border-gray-400 p-1 text-xs" colSpan={2}>TOTAL</td>
              <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(data.totals.totalWithdrawals || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Nouvelle page pour les tableaux fiscaux */}
      <div className="print:break-before-page">
        {/* Taux d'imposition */}
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-2">TAUX D'IMPOSITION</h3>
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-1 text-xs font-bold">Tranche CA</th>
                <th className="border border-gray-400 p-1 text-xs font-bold">Taux d'imposition</th>
              </tr>
            </thead>
            <tbody>
              {data.paliers.map((palier, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-400 p-1 text-xs">
                    {formatCurrencyDollar(palier.min)} - {palier.max === null || palier.max === undefined ? '∞' : formatCurrencyDollar(palier.max)}
                  </td>
                  <td className="border border-gray-400 p-1 text-xs text-center">{palier.taux}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Impôt sur la richesse */}
        {data.wealthBrackets && data.wealthBrackets.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-2">IMPÔT SUR LA RICHESSE</h3>
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-1 text-xs font-bold">Tranche Richesse</th>
                  <th className="border border-gray-400 p-1 text-xs font-bold">Taux</th>
                </tr>
              </thead>
              <tbody>
                {data.wealthBrackets.map((bracket, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-400 p-1 text-xs">
                      {formatCurrencyDollar(bracket.min)} - {bracket.max === null || bracket.max === undefined ? '∞' : formatCurrencyDollar(bracket.max)}
                    </td>
                    <td className="border border-gray-400 p-1 text-xs text-center">{bracket.taux}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Synthèse finale */}
        <div className="mb-6 p-4 border-2 border-gray-400 bg-gray-50">
          <h3 className="font-bold text-sm mb-3">SYNTHÈSE FINALE</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex justify-between py-1 border-b">
                <span>Montant total des primes:</span>
                <span className="font-semibold">{formatCurrencyDollar(data.totals.totalPrimes)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Bénéfice avant primes:</span>
                <span className="font-semibold">{formatCurrencyDollar(beneficeAvantImpot + data.totals.totalPrimes)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Bénéfice après primes:</span>
                <span className="font-semibold">{formatCurrencyDollar(beneficeAvantImpot)}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between py-1 border-b">
                <span>Montant IS (société):</span>
                <span className="font-semibold">{formatCurrencyDollar(impotSociete)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Montant richesse:</span>
                <span className="font-semibold">{formatCurrencyDollar(impotRichesse)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Bénéfice après impôt:</span>
                <span className="font-semibold">{formatCurrencyDollar(beneficeApresImpot)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Relevé du compte bancaire */}
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-2">RELEVÉ DU COMPTE BANCAIRE</h3>
          <div className="p-3 border border-gray-400 bg-gray-50">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Solde après salaires:</span>
                <span className="font-bold text-lg">{formatCurrencyDollar(data.soldeActuel)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plafonds employés et patrons */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold text-sm mb-2">PLAFONDS EMPLOYÉS</h3>
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-1 text-xs font-bold">Tranche CA</th>
                  <th className="border border-gray-400 p-1 text-xs font-bold">Salaire max</th>
                  <th className="border border-gray-400 p-1 text-xs font-bold">Prime max</th>
                </tr>
              </thead>
              <tbody>
                {data.paliers.map((palier, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-400 p-1 text-xs">
                      {formatCurrencyDollar(palier.min)} - {palier.max === null || palier.max === undefined ? '∞' : formatCurrencyDollar(palier.max)}
                    </td>
                    <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(palier.sal_max_emp)}</td>
                    <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(palier.pr_max_emp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-bold text-sm mb-2">PLAFONDS PATRONS</h3>
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-1 text-xs font-bold">Tranche CA</th>
                  <th className="border border-gray-400 p-1 text-xs font-bold">Salaire max</th>
                  <th className="border border-gray-400 p-1 text-xs font-bold">Prime max</th>
                </tr>
              </thead>
              <tbody>
                {data.paliers.map((palier, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-400 p-1 text-xs">
                      {formatCurrencyDollar(palier.min)} - {palier.max === null || palier.max === undefined ? '∞' : formatCurrencyDollar(palier.max)}
                    </td>
                    <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(palier.sal_max_pat)}</td>
                    <td className="border border-gray-400 p-1 text-xs text-right">{formatCurrencyDollar(palier.pr_max_pat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}