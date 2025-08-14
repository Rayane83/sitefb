// Export utilities for PDF and XLSX generation
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrencyDollar, formatDate, formatDateTime } from './fmt';
import type { DotationRow, PalierConfig } from './types';

// Types for jsPDF with autotable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

// Export Dotation to PDF (Fiche Impôt format)
export function exportDotationToPDF(data: {
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
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHE IMPÔT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Nom de l'entreprise
  doc.setFontSize(12);
  doc.text(`Nom de l'entreprise: ${data.entreprise}`, 20, yPos);
  yPos += 10;

  // Date de génération
  doc.setFontSize(10);
  doc.text(`Généré le: ${formatDateTime(new Date())}`, 20, yPos);
  yPos += 15;

  // Tableau des employés
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TABLEAU DES EMPLOYÉS', 20, yPos);
  yPos += 5;

  const employeeTableData = data.rows.map(row => [
    row.name,
    'Employé', // Grade par défaut
    formatCurrencyDollar(row.run),
    formatCurrencyDollar(row.facture),
    formatCurrencyDollar(row.vente),
    formatCurrencyDollar(row.ca_total),
    formatCurrencyDollar(row.salaire)
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['Nom', 'Grade', 'RUN', 'FACTURE', 'VENTE', 'CA Total', 'Salaire']],
    body: employeeTableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 60, 60] }
  });

  yPos = doc.lastAutoTable?.finalY || yPos + 50;
  yPos += 10;

  // Totaux
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAUX', 20, yPos);
  yPos += 5;

  const totalsData = [
    ['CA Total', formatCurrencyDollar(data.totals.totalCA)],
    ['Salaires Total', formatCurrencyDollar(data.totals.totalSalaires)],
    ['Primes Total', formatCurrencyDollar(data.totals.totalPrimes)],
    ['Nombre d\'employés', data.employeesCount.toString()]
  ];

  doc.autoTable({
    startY: yPos,
    body: totalsData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  yPos = doc.lastAutoTable?.finalY || yPos + 30;
  yPos += 10;

  // Dépenses déductibles
  doc.setFont('helvetica', 'bold');
  doc.text('DÉPENSES DÉDUCTIBLES', 20, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total: ${formatCurrencyDollar(data.totals.totalExpenses || 0)}`, 20, yPos);
  yPos += 10;

  // Tableau des retraits
  doc.setFont('helvetica', 'bold');
  doc.text('TABLEAU DES RETRAITS', 20, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total: ${formatCurrencyDollar(data.totals.totalWithdrawals || 0)}`, 20, yPos);
  yPos += 15;

  // Limites
  doc.setFont('helvetica', 'bold');
  doc.text('LIMITES SALARIALES', 20, yPos);
  yPos += 5;

  const limitsData = [
    ['Salaire max employé', formatCurrencyDollar(data.limits.maxSalaireEmp)],
    ['Salaire max patron', formatCurrencyDollar(data.limits.maxSalairePat)],
    ['Prime max employé', formatCurrencyDollar(data.limits.maxPrimeEmp)],
    ['Prime max patron', formatCurrencyDollar(data.limits.maxPrimePat)]
  ];

  doc.autoTable({
    startY: yPos,
    body: limitsData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  yPos = doc.lastAutoTable?.finalY || yPos + 30;
  yPos += 15;

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Paliers de taxation
  doc.setFont('helvetica', 'bold');
  doc.text('PALIERS DE TAXATION', 20, yPos);
  yPos += 5;

  const paliersData = data.paliers.map(p => [
    `${formatCurrencyDollar(p.min)} - ${p.max === Number.MAX_SAFE_INTEGER ? '∞' : formatCurrencyDollar(p.max)}`,
    `${p.taux}%`,
    formatCurrencyDollar(p.sal_min_emp),
    formatCurrencyDollar(p.sal_max_emp)
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['Tranche CA', 'Taux', 'Sal Min Emp', 'Sal Max Emp']],
    body: paliersData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 60, 60] }
  });

  // Relevé du compte bancaire
  yPos = doc.lastAutoTable?.finalY || yPos + 50;
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('RELEVÉ DU COMPTE BANCAIRE', 20, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Solde actuel: ${formatCurrencyDollar(data.soldeActuel)}`, 20, yPos);

  // Save the PDF
  const fileName = `fiche_impot_${data.entreprise}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// Export Blanchiment to PDF (BLANCHIMENT SUIVI format)
export function exportBlanchimentToPDF(data: {
  rows: any[];
  entreprise: string;
  percEntreprise: number;
  percGroupe: number;
  guildName?: string;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BLANCHIMENT SUIVI', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Subtitle
  doc.setFontSize(12);
  doc.text(`NOM DU GROUPE: ${data.guildName || 'Groupe'}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Entreprise info
  doc.setFontSize(10);
  doc.text(`Entreprise: ${data.entreprise}`, 20, yPos);
  yPos += 5;
  doc.text(`Généré le: ${formatDateTime(new Date())}`, 20, yPos);
  yPos += 10;

  // Tableau Semaine 1 (1-50 lignes)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TABLEAU SEMAINE 1', 20, yPos);
  yPos += 5;

  // Prepare data for table - ensure we have 50 rows
  const tableData = [];
  for (let i = 0; i < 50; i++) {
    const row = data.rows[i];
    if (row) {
      const duree = row.duree || 0;
      tableData.push([
        (i + 1).toString(),
        row.statut || '',
        row.date_recu || '',
        row.date_rendu || '',
        `${duree} j`,
        row.employe || ''
      ]);
    } else {
      tableData.push([
        (i + 1).toString(),
        '',
        '',
        '',
        '',
        ''
      ]);
    }
  }

  doc.autoTable({
    startY: yPos,
    head: [['#', 'Statut', 'Date Reçu', 'Date Rendu', 'Durée', 'Nom']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 60, 60] },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20 },
      5: { cellWidth: 35 }
    }
  });

  // New page for summary blocks
  doc.addPage();
  yPos = 20;

  // SUIVI ARGENT SALE RÉCUPÉRÉ
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SUIVI ARGENT SALE RÉCUPÉRÉ', 20, yPos);
  yPos += 10;

  // Calculate totals by employee
  const employeeTotals = new Map<string, number>();
  data.rows.forEach(row => {
    if (row.employe && row.somme) {
      const current = employeeTotals.get(row.employe) || 0;
      employeeTotals.set(row.employe, current + (Number(row.somme) || 0));
    }
  });

  const employeeSummaryData = Array.from(employeeTotals.entries()).map(([name, total]) => [
    name,
    formatCurrencyDollar(total),
    formatCurrencyDollar(total * data.percEntreprise / 100),
    formatCurrencyDollar(total * data.percGroupe / 100)
  ]);

  if (employeeSummaryData.length > 0) {
    doc.autoTable({
      startY: yPos,
      head: [['Employé', 'Somme Totale', `Entreprise (${data.percEntreprise}%)`, `Groupe (${data.percGroupe}%)`]],
      body: employeeSummaryData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 60, 60] }
    });
    yPos = doc.lastAutoTable?.finalY || yPos + 30;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text('Aucune donnée disponible', 20, yPos);
    yPos += 20;
  }

  yPos += 10;

  // LISTE DES ÉTATS EMPLOYÉ
  doc.setFont('helvetica', 'bold');
  doc.text('LISTE DES ÉTATS EMPLOYÉ', 20, yPos);
  yPos += 10;

  // Group by status
  const statusGroups = new Map<string, string[]>();
  data.rows.forEach(row => {
    if (row.statut && row.employe) {
      if (!statusGroups.has(row.statut)) {
        statusGroups.set(row.statut, []);
      }
      statusGroups.get(row.statut)!.push(row.employe);
    }
  });

  statusGroups.forEach((employees, status) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${status}:`, 25, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    const uniqueEmployees = [...new Set(employees)];
    uniqueEmployees.forEach(emp => {
      doc.text(`• ${emp}`, 30, yPos);
      yPos += 5;
    });
    yPos += 3;
  });

  // Save the PDF
  const fileName = `blanchiment_suivi_${data.entreprise}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// Export to XLSX with template support
export function exportToXLSX(
  data: any[],
  filename: string,
  templateHeaders?: string[],
  sheetName: string = 'Data'
) {
  try {
    let exportData: any[];

    if (templateHeaders && templateHeaders.length > 0) {
      // Use template headers and map data accordingly
      exportData = data.map(row => {
        const mappedRow: Record<string, any> = {};
        templateHeaders.forEach(header => {
          const lowerHeader = header.toLowerCase();
          // Simple mapping heuristics
          if (lowerHeader.includes('date')) {
            mappedRow[header] = row.date || row.created_at || '';
          } else if (lowerHeader.includes('montant')) {
            mappedRow[header] = row.montant || '';
          } else if (lowerHeader.includes('entreprise')) {
            mappedRow[header] = row.entreprise_key || '';
          } else if (lowerHeader.includes('type')) {
            mappedRow[header] = row.type || '';
          } else if (lowerHeader.includes('statut')) {
            mappedRow[header] = row.statut || '';
          } else if (lowerHeader === 'id') {
            mappedRow[header] = row.id || '';
          } else {
            mappedRow[header] = '';
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
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, filename);
    return true;
  } catch (error) {
    console.error('Excel export error:', error);
    return false;
  }
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