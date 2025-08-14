import React from 'react';
import { formatCurrencyDollar, formatDate, formatDateTime } from '@/lib/fmt';

interface BlanchimentTemplateProps {
  data: {
    rows: any[];
    entreprise: string;
    percEntreprise: number;
    percGroupe: number;
    guildName?: string;
  };
}

export function BlanchimentTemplate({ data }: BlanchimentTemplateProps) {
  const currentDate = new Date();
  
  // Calcul des totaux par employé
  const employeeTotals = new Map<string, number>();
  data.rows.forEach(row => {
    if (row.employe && row.somme) {
      const current = employeeTotals.get(row.employe) || 0;
      employeeTotals.set(row.employe, current + (Number(row.somme) || 0));
    }
  });

  // Groupement par statut
  const statusGroups = new Map<string, string[]>();
  data.rows.forEach(row => {
    if (row.statut && row.employe) {
      if (!statusGroups.has(row.statut)) {
        statusGroups.set(row.statut, []);
      }
      statusGroups.get(row.statut)!.push(row.employe);
    }
  });

  // Calcul gain total entreprise
  const gainTotalEntreprise = Array.from(employeeTotals.values()).reduce((sum, total) => sum + (total * data.percEntreprise / 100), 0);

  return (
    <div className="min-h-screen bg-white text-black p-6 print:p-4" style={{ fontSize: '11px', lineHeight: '1.2' }}>
      {/* En-tête */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">BLANCHIMENT SUIVI</h1>
        <div className="text-lg font-semibold mb-1">
          NOM DU GROUPE: {data.guildName || 'GROUPE'}
        </div>
        <div className="text-sm mb-1">
          Entreprise: {data.entreprise}
        </div>
        <div className="text-sm text-gray-600">
          Généré le: {formatDateTime(currentDate)}
        </div>
        <div className="text-sm font-semibold mt-2">
          ENTREPRISE {data.percEntreprise}% — GROUPE {data.percGroupe}%
        </div>
      </div>

      {/* Gain entreprise */}
      <div className="text-center mb-6 p-3 border-2 border-gray-400 bg-gray-100">
        <div className="text-lg font-bold">
          GAIN ENTREPRISE {formatCurrencyDollar(gainTotalEntreprise)}
        </div>
      </div>

      {/* Tableau Semaine 1 - 50 lignes */}
      <div className="mb-8">
        <h2 className="text-sm font-bold mb-2">TABLEAU SEMAINE 1</h2>
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-1 text-xs font-bold w-8">#</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Statut</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Date Reçu</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Date Rendu</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Durée</th>
              <th className="border border-gray-400 p-1 text-xs font-bold">Nom</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 50 }, (_, i) => {
              const row = data.rows[i];
              const duree = row?.duree || 0;
              const dateRecu = row?.date_recu ? formatDate(new Date(row.date_recu)).replace(/\//g, '/') : '';
              const dateRendu = row?.date_rendu ? formatDate(new Date(row.date_rendu)).replace(/\//g, '/') : '';
              
              return (
                <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-400 p-1 text-xs text-center font-semibold">{i + 1}</td>
                  <td className="border border-gray-400 p-1 text-xs">{row?.statut || ''}</td>
                  <td className="border border-gray-400 p-1 text-xs text-center">{dateRecu}</td>
                  <td className="border border-gray-400 p-1 text-xs text-center">{dateRendu}</td>
                  <td className="border border-gray-400 p-1 text-xs text-center">{duree ? `${duree} j` : ''}</td>
                  <td className="border border-gray-400 p-1 text-xs">{row?.employe || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Nouvelle page pour les blocs de suivi */}
      <div className="print:break-before-page">
        {/* SUIVI ARGENT SALE RÉCUPÉRÉ */}
        <div className="mb-8">
          <h2 className="text-sm font-bold mb-3">SUIVI ARGENT SALE RÉCUPÉRÉ</h2>
          
          {Array.from(employeeTotals.entries()).length > 0 ? (
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-2 text-xs font-bold">Employé</th>
                  <th className="border border-gray-400 p-2 text-xs font-bold">Somme Totale</th>
                  <th className="border border-gray-400 p-2 text-xs font-bold">Entreprise ({data.percEntreprise}%)</th>
                  <th className="border border-gray-400 p-2 text-xs font-bold">Groupe ({data.percGroupe}%)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(employeeTotals.entries()).map(([name, total], idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-400 p-2 text-xs font-semibold">{name}</td>
                    <td className="border border-gray-400 p-2 text-xs text-right">{formatCurrencyDollar(total)}</td>
                    <td className="border border-gray-400 p-2 text-xs text-right">{formatCurrencyDollar(total * data.percEntreprise / 100)}</td>
                    <td className="border border-gray-400 p-2 text-xs text-right">{formatCurrencyDollar(total * data.percGroupe / 100)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-200 font-bold">
                  <td className="border border-gray-400 p-2 text-xs">TOTAL</td>
                  <td className="border border-gray-400 p-2 text-xs text-right">
                    {formatCurrencyDollar(Array.from(employeeTotals.values()).reduce((s, t) => s + t, 0))}
                  </td>
                  <td className="border border-gray-400 p-2 text-xs text-right">
                    {formatCurrencyDollar(gainTotalEntreprise)}
                  </td>
                  <td className="border border-gray-400 p-2 text-xs text-right">
                    {formatCurrencyDollar(Array.from(employeeTotals.values()).reduce((s, t) => s + (t * data.percGroupe / 100), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="text-center p-8 border border-gray-400 bg-gray-50">
              <span className="text-sm text-gray-600">Aucune donnée de récupération disponible</span>
            </div>
          )}
        </div>

        {/* LISTE DES ÉTATS EMPLOYÉ */}
        <div className="mb-8">
          <h2 className="text-sm font-bold mb-3">LISTE DES ÉTATS EMPLOYÉ</h2>
          
          {statusGroups.size > 0 ? (
            <div className="grid grid-cols-2 gap-6">
              {Array.from(statusGroups.entries()).map(([status, employees]) => (
                <div key={status} className="border border-gray-400 p-3">
                  <h3 className="font-bold text-sm mb-2 text-center bg-gray-100 p-1">
                    {status.toUpperCase()}
                  </h3>
                  <div className="space-y-1">
                    {[...new Set(employees)].map((employee, idx) => (
                      <div key={idx} className="text-xs flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        {employee}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-300 text-xs text-gray-600">
                    Total: {[...new Set(employees)].length} employé(s)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-gray-400 bg-gray-50">
              <span className="text-sm text-gray-600">Aucune donnée d'état employé disponible</span>
            </div>
          )}
        </div>

        {/* Détail des opérations par ID */}
        {data.rows.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold mb-3">DÉTAIL DES OPÉRATIONS</h2>
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-1 text-xs font-bold">Employé</th>
                  <th className="border border-gray-400 p-1 text-xs font-bold">Joueur qui donne</th>
                  <th className="border border-gray-400 p-1 text-xs font-bold">Joueur qui récupère</th>
                  <th className="border border-gray-400 p-1 text-xs font-bold">Somme</th>
                  <th className="border border-gray-400 p-1 text-xs font-bold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.filter(row => row.donneur_id || row.recep_id || row.somme).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-400 p-1 text-xs">{row.employe || ''}</td>
                    <td className="border border-gray-400 p-1 text-xs text-center">{row.donneur_id || ''}</td>
                    <td className="border border-gray-400 p-1 text-xs text-center">{row.recep_id || ''}</td>
                    <td className="border border-gray-400 p-1 text-xs text-right">{row.somme ? formatCurrencyDollar(row.somme) : ''}</td>
                    <td className="border border-gray-400 p-1 text-xs">{row.statut || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}