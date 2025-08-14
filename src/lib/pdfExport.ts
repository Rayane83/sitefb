// PDF export utilities using React components and browser print API
import React from 'react';
import { createRoot } from 'react-dom/client';
import { FicheImpotTemplate } from '@/components/export/FicheImpotTemplate';
import { BlanchimentTemplate } from '@/components/export/BlanchimentTemplate';
import type { DotationRow, PalierConfig } from '@/lib/types';

// Generate PDF from React component using print API
export async function generatePDFFromComponent(
  Component: React.ComponentType<any>,
  props: any,
  filename: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create hidden container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '210mm'; // A4 width
      container.style.height = '297mm'; // A4 height
      document.body.appendChild(container);

      // Render React component
      const root = createRoot(container);
      
      root.render(
        React.createElement(Component, props)
      );

      // Wait for component to render then open print window
      setTimeout(() => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
          document.body.removeChild(container);
          reject(new Error('Popup bloqué. Veuillez autoriser les popups pour générer le PDF.'));
          return;
        }

        // Get rendered HTML
        const renderedHTML = container.innerHTML;

        // Write to print window with proper styling
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                  color-adjust: exact;
                }
                .print\\:break-before-page {
                  break-before: page;
                }
                table {
                  break-inside: avoid;
                }
                tr {
                  break-inside: avoid;
                }
              }
              
              body {
                font-family: Arial, sans-serif;
                line-height: 1.2;
                color: black;
                background: white;
                font-size: 11px;
              }
              
              table {
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 1rem;
              }
              
              th, td {
                border: 1px solid #666;
                padding: 4px 6px;
                text-align: left;
                font-size: 10px;
              }
              
              th {
                background-color: #f0f0f0;
                font-weight: bold;
              }
              
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .text-lg { font-size: 16px; }
              .text-xl { font-size: 18px; }
              .text-2xl { font-size: 24px; }
              .text-sm { font-size: 10px; }
              .text-xs { font-size: 9px; }
              .mb-1 { margin-bottom: 0.25rem; }
              .mb-2 { margin-bottom: 0.5rem; }
              .mb-3 { margin-bottom: 0.75rem; }
              .mb-4 { margin-bottom: 1rem; }
              .mb-6 { margin-bottom: 1.5rem; }
              .mb-8 { margin-bottom: 2rem; }
              .mt-2 { margin-top: 0.5rem; }
              .mt-3 { margin-top: 0.75rem; }
              .p-1 { padding: 0.25rem; }
              .p-2 { padding: 0.5rem; }
              .p-3 { padding: 0.75rem; }
              .p-4 { padding: 1rem; }
              .p-6 { padding: 1.5rem; }
              .border { border: 1px solid #666; }
              .border-2 { border: 2px solid #666; }
              .bg-gray-50 { background-color: #f9fafb; }
              .bg-gray-100 { background-color: #f3f4f6; }
              .bg-gray-200 { background-color: #e5e7eb; }
              .text-gray-600 { color: #4b5563; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .gap-4 { gap: 1rem; }
              .gap-6 { gap: 1.5rem; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .space-y-1 > * + * { margin-top: 0.25rem; }
              .space-y-2 > * + * { margin-top: 0.5rem; }
              .border-b { border-bottom: 1px solid #d1d5db; }
              .border-t { border-top: 1px solid #d1d5db; }
              .pt-2 { padding-top: 0.5rem; }
              .w-2 { width: 0.5rem; }
              .h-2 { height: 0.5rem; }
              .rounded-full { border-radius: 9999px; }
              .mr-2 { margin-right: 0.5rem; }
              .w-8 { width: 8px; }
              
              /* Custom print styles */
              .print\\:break-before-page {
                page-break-before: always;
              }
            </style>
          </head>
          <body>
            ${renderedHTML}
          </body>
          </html>
        `);

        printWindow.document.close();

        // Trigger print after content loads
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            
            // Clean up
            printWindow.onafterprint = () => {
              printWindow.close();
              document.body.removeChild(container);
              resolve();
            };
            
            // Fallback cleanup if print dialog is cancelled
            setTimeout(() => {
              if (!printWindow.closed) {
                printWindow.close();
              }
              if (document.body.contains(container)) {
                document.body.removeChild(container);
              }
              resolve();
            }, 10000);
          }, 500);
        };

      }, 100);

    } catch (error) {
      reject(error);
    }
  });
}

// Export Dotation to PDF using React template
export async function exportDotationToPDF(data: {
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
}): Promise<void> {
  const filename = `fiche_impot_${data.entreprise}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  return generatePDFFromComponent(
    FicheImpotTemplate,
    { data },
    filename
  );
}

// Export Blanchiment to PDF using React template
export async function exportBlanchimentToPDF(data: {
  rows: any[];
  entreprise: string;
  percEntreprise: number;
  percGroupe: number;
  guildName?: string;
}): Promise<void> {
  const filename = `blanchiment_suivi_${data.entreprise}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  return generatePDFFromComponent(
    BlanchimentTemplate,
    { data },
    filename
  );
}