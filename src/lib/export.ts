// Export utilities for PDF and XLSX generation with HTML templates
import * as XLSX from 'xlsx';
import { formatCurrencyDollar, formatDate, formatDateTime } from './fmt';
import type { DotationRow, PalierConfig } from './types';

// Enhanced export functions using Puppeteer approach (HTML to PDF)
export async function exportDotationToPDF(data: {
  rows: any[];
  soldeActuel: number;
  totals: any;
  limits: any;
  paliers: any[];
  entreprise: string;
  employeesCount: number;
}): Promise<void> {
  // Use React components to generate HTML content and trigger print
  throw new Error('PDF export requires server-side implementation or print dialog');
}

export async function exportBlanchimentToPDF(data: {
  rows: any[];
  entreprise: string;
  percEntreprise: number;
  percGroupe: number;
  guildName?: string;
}): Promise<void> {
  // Use React components to generate HTML content
  const { createRoot } = await import('react-dom/client');
  const React = await import('react');
  
  // This would render the BlanchimentTemplate component and convert to PDF
  // For now, show print dialog
  throw new Error('PDF export requires server-side implementation or print dialog');
}

// Enhanced XLSX export for Dotations with multiple sheets
export async function exportDotationXLSX(data: {
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
  expenses?: Array<{ date: string; justificatif: string; montant: number }>;
  withdrawals?: Array<{ date: string; justificatif: string; montant: number }>;
  wealthBrackets?: Array<{ min: number; max: number; taux: number }>;
}): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Dotations
  const dotationsData = data.rows.map(row => ({
    'Grade': 'Employé',
    'Nom du salarié': row.name,
    'RUN ($)': row.run,
    'FACTURE ($)': row.facture,
    'VENTE ($)': row.vente,
    'CA TOTAL RÉALISÉ ($)': row.ca_total,
    'Salaire ($)': row.salaire,
    'Prime ($)': row.prime
  }));
  
  // Add totals row
  dotationsData.push({
    'Grade': 'TOTAUX',
    'Nom du salarié': '',
    'RUN ($)': data.rows.reduce((s, r) => s + r.run, 0),
    'FACTURE ($)': data.rows.reduce((s, r) => s + r.facture, 0),
    'VENTE ($)': data.rows.reduce((s, r) => s + r.vente, 0),
    'CA TOTAL RÉALISÉ ($)': data.totals.totalCA,
    'Salaire ($)': data.totals.totalSalaires,
    'Prime ($)': data.totals.totalPrimes
  });

  const wsDotations = XLSX.utils.json_to_sheet(dotationsData);
  XLSX.utils.book_append_sheet(wb, wsDotations, 'Dotations');

  // Sheet 2: Dépenses
  if (data.expenses && data.expenses.length > 0) {
    const expensesData = data.expenses.map(exp => ({
      'Date': formatDate(new Date(exp.date)),
      'Justificatif': exp.justificatif,
      'Montant ($)': exp.montant
    }));
    expensesData.push({
      'Date': 'TOTAL',
      'Justificatif': '',
      'Montant ($)': data.totals.totalExpenses || 0
    });
    const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Depenses');
  }

  // Sheet 3: Retraits
  if (data.withdrawals && data.withdrawals.length > 0) {
    const withdrawalsData = data.withdrawals.map(wth => ({
      'Date': formatDate(new Date(wth.date)),
      'Justificatif': wth.justificatif,
      'Montant ($)': wth.montant
    }));
    withdrawalsData.push({
      'Date': 'TOTAL',
      'Justificatif': '',
      'Montant ($)': data.totals.totalWithdrawals || 0
    });
    const wsWithdrawals = XLSX.utils.json_to_sheet(withdrawalsData);
    XLSX.utils.book_append_sheet(wb, wsWithdrawals, 'Retraits');
  }

  // Sheet 4: Paliers IS
  const paliersData = data.paliers.map(palier => ({
    'Tranche CA Min': palier.min,
    'Tranche CA Max': palier.max === null || palier.max === undefined ? 'Infini' : palier.max,
    'Taux d\'imposition (%)': palier.taux
  }));
  const wsPaliers = XLSX.utils.json_to_sheet(paliersData);
  XLSX.utils.book_append_sheet(wb, wsPaliers, 'PaliersIS');

  // Sheet 5: Wealth (if available)
  if (data.wealthBrackets && data.wealthBrackets.length > 0) {
    const wealthData = data.wealthBrackets.map(bracket => ({
      'Tranche Richesse Min': bracket.min,
      'Tranche Richesse Max': bracket.max === null || bracket.max === undefined ? 'Infini' : bracket.max,
      'Taux (%)': bracket.taux
    }));
    const wsWealth = XLSX.utils.json_to_sheet(wealthData);
    XLSX.utils.book_append_sheet(wb, wsWealth, 'Wealth');
  }

  // Sheet 6: Plafonds Employés
  const plafondsEmpData = data.paliers.map(palier => ({
    'Tranche CA Min': palier.min,
    'Tranche CA Max': palier.max === null || palier.max === undefined ? 'Infini' : palier.max,
    'Salaire Max': palier.sal_max_emp,
    'Prime Max': palier.pr_max_emp
  }));
  const wsPlafondsEmp = XLSX.utils.json_to_sheet(plafondsEmpData);
  XLSX.utils.book_append_sheet(wb, wsPlafondsEmp, 'PlafondsEmploye');

  // Sheet 7: Plafonds Patrons
  const plafondsPatData = data.paliers.map(palier => ({
    'Tranche CA Min': palier.min,
    'Tranche CA Max': palier.max === null || palier.max === undefined ? 'Infini' : palier.max,
    'Salaire Max': palier.sal_max_pat,
    'Prime Max': palier.pr_max_pat
  }));
  const wsPlafondsPatData = XLSX.utils.json_to_sheet(plafondsPatData);
  XLSX.utils.book_append_sheet(wb, wsPlafondsPatData, 'PlafondsPatron');

  // Apply formatting
  Object.keys(wb.Sheets).forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        
        // Format monetary columns
        if (cellAddress.includes('$') && typeof ws[cellAddress].v === 'number') {
          ws[cellAddress].z = '$#,##0.00';
        }
      }
    }
  });

  const fileName = `dotation_${data.entreprise}_${new Date().toISOString().split('T')[0]}.xlsx`;
  return new Promise((resolve) => {
    XLSX.writeFile(wb, fileName);
    resolve(new Blob()); // Return empty blob since XLSX.writeFile handles download
  });
}

// Enhanced XLSX export for Blanchiment
export async function exportBlanchimentXLSX(data: {
  rows: any[];
  entreprise: string;
  percEntreprise: number;
  percGroupe: number;
  guildName?: string;
}): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Semaine 1 (50 lignes)
  const semaine1Data = Array.from({ length: 50 }, (_, i) => {
    const row = data.rows[i];
    return {
      '#': i + 1,
      'Statut': row?.statut || '',
      'Date Reçu': row?.date_recu ? formatDate(new Date(row.date_recu)) : '',
      'Date Rendu': row?.date_rendu ? formatDate(new Date(row.date_rendu)) : '',
      'Durée (jours)': row?.duree || '',
      'Nom': row?.employe || '',
      'Groupe': row?.groupe || '',
      'Somme': row?.somme || '',
      'Donneur ID': row?.donneur_id || '',
      'Recep ID': row?.recep_id || ''
    };
  });

  const wsSemaine1 = XLSX.utils.json_to_sheet(semaine1Data);
  XLSX.utils.book_append_sheet(wb, wsSemaine1, 'Semaine1');

  // Sheet 2: Suivi Récupération
  const employeeTotals = new Map<string, number>();
  data.rows.forEach(row => {
    if (row.employe && row.somme) {
      const current = employeeTotals.get(row.employe) || 0;
      employeeTotals.set(row.employe, current + (Number(row.somme) || 0));
    }
  });

  const suiviData = Array.from(employeeTotals.entries()).map(([name, total]) => ({
    'Employé': name,
    'Somme Totale': total,
    [`Entreprise (${data.percEntreprise}%)`]: total * data.percEntreprise / 100,
    [`Groupe (${data.percGroupe}%)`]: total * data.percGroupe / 100
  }));

  // Add totals row
  if (suiviData.length > 0) {
    const totalSomme = Array.from(employeeTotals.values()).reduce((s, t) => s + t, 0);
    suiviData.push({
      'Employé': 'TOTAL',
      'Somme Totale': totalSomme,
      [`Entreprise (${data.percEntreprise}%)`]: totalSomme * data.percEntreprise / 100,
      [`Groupe (${data.percGroupe}%)`]: totalSomme * data.percGroupe / 100
    });
  }

  const wsSuivi = XLSX.utils.json_to_sheet(suiviData);
  XLSX.utils.book_append_sheet(wb, wsSuivi, 'SuiviRecuperation');

  // Sheet 3: États Employés
  const statusGroups = new Map<string, string[]>();
  data.rows.forEach(row => {
    if (row.statut && row.employe) {
      if (!statusGroups.has(row.statut)) {
        statusGroups.set(row.statut, []);
      }
      statusGroups.get(row.statut)!.push(row.employe);
    }
  });

  const etatsData: any[] = [];
  statusGroups.forEach((employees, status) => {
    const uniqueEmployees = [...new Set(employees)];
    uniqueEmployees.forEach((employee, idx) => {
      etatsData.push({
        'Statut': idx === 0 ? status : '',
        'Employé': employee,
        'Nombre d\'occurrences': employees.filter(e => e === employee).length
      });
    });
  });

  if (etatsData.length > 0) {
    const wsEtats = XLSX.utils.json_to_sheet(etatsData);
    XLSX.utils.book_append_sheet(wb, wsEtats, 'EtatsEmployes');
  }

  const fileName = `blanchiment_${data.entreprise}_${new Date().toISOString().split('T')[0]}.xlsx`;
  return new Promise((resolve) => {
    XLSX.writeFile(wb, fileName);
    resolve(new Blob()); // Return empty blob since XLSX.writeFile handles download
  });
}

// Enhanced Archives XLSX export with template support
export async function exportArchivesXLSX(params: {
  data: any[];
  guildId: string;
  entrepriseKey?: string;
  templateHeaders?: string[];
}): Promise<Blob> {
  const { data, guildId, entrepriseKey, templateHeaders } = params;
  
  let exportData: any[];

  if (templateHeaders && templateHeaders.length > 0) {
    // Use template headers and map data accordingly
    exportData = data.map(row => {
      const mappedRow: Record<string, any> = {};
      templateHeaders.forEach(header => {
        const lowerHeader = header.toLowerCase();
        // Enhanced mapping heuristics
        if (lowerHeader.includes('date') || lowerHeader.includes('créé')) {
          mappedRow[header] = row.date || row.created_at || '';
        } else if (lowerHeader.includes('montant') || lowerHeader.includes('somme')) {
          mappedRow[header] = row.montant || '';
        } else if (lowerHeader.includes('entreprise') || lowerHeader.includes('company')) {
          mappedRow[header] = row.entreprise_key || '';
        } else if (lowerHeader.includes('type') || lowerHeader.includes('catégorie')) {
          mappedRow[header] = row.type || '';
        } else if (lowerHeader.includes('statut') || lowerHeader.includes('status')) {
          mappedRow[header] = row.statut || '';
        } else if (lowerHeader.includes('id') || lowerHeader === 'identifiant') {
          mappedRow[header] = row.id || '';
        } else if (lowerHeader.includes('description') || lowerHeader.includes('contenu')) {
          mappedRow[header] = typeof row.payload === 'object' ? JSON.stringify(row.payload) : (row.payload || '');
        } else if (lowerHeader.includes('modifié') || lowerHeader.includes('updated')) {
          mappedRow[header] = row.updated_at || '';
        } else {
          // Try to find a matching key in the data
          const matchingKey = Object.keys(row).find(key => 
            key.toLowerCase().includes(lowerHeader) || 
            lowerHeader.includes(key.toLowerCase())
          );
          mappedRow[header] = matchingKey ? row[matchingKey] : '';
        }
      });
      return mappedRow;
    });
  } else {
    // Dynamic export with formatted headers
    exportData = data.map(row => {
      const formattedRow: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        const formattedKey = formatHeaderName(key);
        formattedRow[formattedKey] = formatCellValue(value);
      });
      return formattedRow;
    });
  }

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Archives');

  // Auto-size columns
  const colWidths = Object.keys(exportData[0] || {}).map(key => ({
    wch: Math.max(key.length, 15)
  }));
  ws['!cols'] = colWidths;

  // Apply date formatting
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;
      
      const cellValue = ws[cellAddress].v;
      if (typeof cellValue === 'string' && cellValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        ws[cellAddress].z = 'dd/mm/yyyy';
      } else if (typeof cellValue === 'number' && cellValue > 1000) {
        // Likely a monetary value
        ws[cellAddress].z = '$#,##0.00';
      }
    }
  }

  const date = new Date();
  const stamp = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const fileName = `archives_${entrepriseKey || 'toutes'}_${guildId}_${stamp}.xlsx`;
  
  return new Promise((resolve) => {
    XLSX.writeFile(wb, fileName);
    resolve(new Blob()); // Return empty blob since XLSX.writeFile handles download
  });
}

// Utility functions
function formatHeaderName(header: string): string {
  const headerMap: Record<string, string> = {
    'id': 'ID',
    'created_at': 'Date de création',
    'updated_at': 'Date de modification',
    'guild_id': 'Guilde',
    'entreprise_key': 'Entreprise',
    'type': 'Type',
    'statut': 'Statut',
    'montant': 'Montant',
    'date': 'Date',
    'payload': 'Données'
  };

  return headerMap[header] || header.charAt(0).toUpperCase() + header.slice(1);
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'number') return value.toString();
  return String(value);
}

// Parse clipboard data for Dotation
export function parseClipboardDotationData(text: string): Partial<DotationRow>[] {
  const lines = text.trim().split('\n');
  const rows: Partial<DotationRow>[] = [];

  lines.forEach(line => {
    // Support multiple separators: tab, comma, semicolon
    const parts = line.split(/[\t,;]/).map(p => p.trim());
    
    if (parts.length >= 4) {
      const [name, runStr, factureStr, venteStr] = parts;
      const run = Number(runStr) || 0;
      const facture = Number(factureStr) || 0;
      const vente = Number(venteStr) || 0;
      
      rows.push({
        name: name || `Employé ${rows.length + 1}`,
        run,
        facture,
        vente,
        ca_total: run + facture + vente
      });
    }
  });

  return rows;
}

// Client-side PDF generation using print API
export function generatePDFFromHTML(htmlContent: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        reject(new Error('Popup blocked. Please allow popups for PDF generation.'));
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${filename}</title>
          <style>
            @media print {
              @page {
                size: A4 portrait;
                margin: 12mm 10mm;
              }
              body {
                margin: 0;
                padding: 0;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .print\\:break-before-page {
                break-before: page;
              }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.2;
              color: black;
              background: white;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          resolve();
        }, 500);
      };
      
      // Handle print dialog closure
      printWindow.onafterprint = () => {
        printWindow.close();
      };
      
    } catch (error) {
      reject(error);
    }
}

// Legacy export function for compatibility
export function exportToXLSX(
  data: any[],
  filename: string,
  templateHeaders?: string[],
  sheetName: string = 'Data'
) {
  return exportArchivesXLSX({
    data,
    guildId: 'legacy',
    entrepriseKey: filename.split('_')[1],
    templateHeaders
  });
}