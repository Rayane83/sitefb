import { test, expect } from '@playwright/test';

test.describe('Export functionality tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (assuming it runs on localhost:3000)
    await page.goto('http://localhost:3000');
    
    // Mock authentication if needed
    // This would depend on your auth implementation
  });

  test.describe('Dotation exports', () => {
    test('should export Dotation to PDF', async ({ page }) => {
      // Navigate to Dotations tab
      await page.click('[data-testid="dotations-tab"]');
      
      // Wait for data to load
      await expect(page.locator('[data-testid="dotation-table"]')).toBeVisible();
      
      // Add test data by pasting
      const testData = 'Jean Dupont\t15000\t8000\t12000\nMarie Martin\t22000\t15000\t18000';
      
      // Click paste button or input area
      await page.click('[data-testid="paste-input"]');
      await page.fill('[data-testid="paste-input"]', testData);
      
      // Verify totals are calculated correctly
      const totalCA = await page.locator('[data-testid="total-ca"]').textContent();
      expect(totalCA).toContain('90 000'); // 35000 + 55000
      
      // Test PDF export
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-pdf-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/fiche_impot_.*\.pdf$/);
      
      // Verify toast notification
      await expect(page.locator('.toast')).toContainText('Fiche Impôt générée avec succès');
    });

    test('should export Dotation to Excel', async ({ page }) => {
      // Navigate to Dotations tab
      await page.click('[data-testid="dotations-tab"]');
      
      // Add test data
      const testData = 'Jean Dupont\t15000\t8000\t12000';
      await page.fill('[data-testid="paste-input"]', testData);
      
      // Test Excel export
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-excel-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/dotation_.*\.xlsx$/);
      
      // Verify toast notification
      await expect(page.locator('.toast')).toContainText('Fichier Excel généré avec succès');
    });

    test('should calculate totals correctly after pasting data', async ({ page }) => {
      await page.click('[data-testid="dotations-tab"]');
      
      // Paste multi-separator data
      const testData = 'Jean Dupont;15000;8000;12000\nMarie Martin,22000,15000,18000\nPierre Durand\t10000\t5000\t7000';
      await page.fill('[data-testid="paste-input"]', testData);
      
      // Wait for calculations
      await page.waitForTimeout(500);
      
      // Verify individual CA calculations
      const rows = page.locator('[data-testid="employee-row"]');
      await expect(rows.nth(0).locator('[data-testid="ca-total"]')).toContainText('35 000');
      await expect(rows.nth(1).locator('[data-testid="ca-total"]')).toContainText('55 000');
      await expect(rows.nth(2).locator('[data-testid="ca-total"]')).toContainText('22 000');
      
      // Verify global totals
      await expect(page.locator('[data-testid="total-ca"]')).toContainText('112 000');
    });
  });

  test.describe('Blanchiment exports', () => {
    test('should export Blanchiment to PDF', async ({ page }) => {
      // Navigate to Blanchiment tab
      await page.click('[data-testid="blanchiment-tab"]');
      
      // Enable blanchiment if not already enabled
      const enableButton = page.locator('[data-testid="enable-blanchiment"]');
      if (await enableButton.isVisible()) {
        await enableButton.click();
      }
      
      // Add test data
      await page.click('[data-testid="add-blanchiment-row"]');
      
      const firstRow = page.locator('[data-testid="blanchiment-row"]').first();
      await firstRow.locator('[data-testid="statut-input"]').fill('En cours');
      await firstRow.locator('[data-testid="date-recu-input"]').fill('2024-01-01');
      await firstRow.locator('[data-testid="date-rendu-input"]').fill('2024-01-08');
      await firstRow.locator('[data-testid="employe-input"]').fill('Jean Dupont');
      await firstRow.locator('[data-testid="somme-input"]').fill('50000');
      
      // Verify duration calculation (7 days)
      await expect(firstRow.locator('[data-testid="duree-input"]')).toHaveValue('7');
      
      // Save data
      await page.click('[data-testid="save-blanchiment"]');
      
      // Test PDF export
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-blanchiment-pdf"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/blanchiment_suivi_.*\.pdf$/);
      
      // Verify toast notification
      await expect(page.locator('.toast')).toContainText('Blanchiment Suivi généré avec succès');
    });

    test('should calculate duration correctly', async ({ page }) => {
      await page.click('[data-testid="blanchiment-tab"]');
      
      // Add row and set dates
      await page.click('[data-testid="add-blanchiment-row"]');
      
      const row = page.locator('[data-testid="blanchiment-row"]').first();
      await row.locator('[data-testid="date-recu-input"]').fill('2024-01-01');
      await row.locator('[data-testid="date-rendu-input"]').fill('2024-01-15');
      
      // Wait for calculation
      await page.waitForTimeout(300);
      
      // Verify duration (14 days)
      await expect(row.locator('[data-testid="duree-input"]')).toHaveValue('14');
    });
  });

  test.describe('Archives exports', () => {
    test('should export Archives to Excel with dynamic headers', async ({ page }) => {
      // Navigate to Archives tab
      await page.click('[data-testid="archives-tab"]');
      
      // Wait for data to load
      await expect(page.locator('[data-testid="archives-table"]')).toBeVisible();
      
      // Test Excel export
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-archives-excel"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/archives_.*\.xlsx$/);
      
      // Verify toast notification
      await expect(page.locator('.toast')).toContainText('Export généré');
    });

    test('should search archives with debounce', async ({ page }) => {
      await page.click('[data-testid="archives-tab"]');
      
      // Search for specific term
      await page.fill('[data-testid="search-input"]', 'dotation');
      
      // Wait for debounce (300ms)
      await page.waitForTimeout(400);
      
      // Verify filtered results
      const rows = page.locator('[data-testid="archive-row"]');
      const count = await rows.count();
      
      // All visible rows should contain 'dotation' type
      for (let i = 0; i < count; i++) {
        const rowType = await rows.nth(i).locator('[data-testid="archive-type"]').textContent();
        expect(rowType?.toLowerCase()).toContain('dotation');
      }
    });

    test('should import template and use for export', async ({ page }) => {
      await page.click('[data-testid="archives-tab"]');
      
      // Upload template file (this would need to be mocked or use a test file)
      const fileInput = page.locator('[data-testid="template-upload"]');
      await fileInput.setInputFiles('tests/fixtures/archive_template.xlsx');
      
      // Verify template loaded
      await expect(page.locator('.toast')).toContainText('Template importé');
      
      // Export with template
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-archives-excel"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/archives_.*\.xlsx$/);
      
      // Verify toast mentions template usage
      await expect(page.locator('.toast')).toContainText('Export avec template');
    });
  });

  test.describe('Role-based access control', () => {
    test('should disable exports for staff read-only users', async ({ page }) => {
      // Mock staff role
      await page.addInitScript(() => {
        window.localStorage.setItem('userRole', 'staff');
      });
      
      await page.goto('http://localhost:3000');
      
      // Check Dotations - inputs should be disabled
      await page.click('[data-testid="dotations-tab"]');
      await expect(page.locator('[data-testid="add-employee-button"]')).toBeDisabled();
      await expect(page.locator('[data-testid="save-button"]')).toBeDisabled();
      
      // Check Blanchiment - inputs should be disabled
      await page.click('[data-testid="blanchiment-tab"]');
      await expect(page.locator('[data-testid="add-blanchiment-row"]')).toBeDisabled();
      await expect(page.locator('[data-testid="save-blanchiment"]')).toBeDisabled();
      
      // Check Archives - staff actions should be available
      await page.click('[data-testid="archives-tab"]');
      await expect(page.locator('[data-testid="validate-button"]').first()).toBeEnabled();
      await expect(page.locator('[data-testid="delete-button"]').first()).toBeEnabled();
    });

    test('should allow full access for patron users', async ({ page }) => {
      // Mock patron role
      await page.addInitScript(() => {
        window.localStorage.setItem('userRole', 'patron');
      });
      
      await page.goto('http://localhost:3000');
      
      // Check all modules are accessible
      await page.click('[data-testid="dotations-tab"]');
      await expect(page.locator('[data-testid="add-employee-button"]')).toBeEnabled();
      
      await page.click('[data-testid="blanchiment-tab"]');
      await expect(page.locator('[data-testid="add-blanchiment-row"]')).toBeEnabled();
      
      await page.click('[data-testid="archives-tab"]');
      await expect(page.locator('[data-testid="export-archives-excel"]')).toBeEnabled();
    });
  });

  test.describe('Performance and UX', () => {
    test('should show loading states during operations', async ({ page }) => {
      await page.click('[data-testid="dotations-tab"]');
      
      // Click save and verify loading state
      await page.click('[data-testid="save-button"]');
      await expect(page.locator('[data-testid="loading-dots"]')).toBeVisible();
      
      // Wait for operation to complete
      await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible();
    });

    test('should disable buttons during save operations', async ({ page }) => {
      await page.click('[data-testid="dotations-tab"]');
      
      // Start save operation
      await page.click('[data-testid="save-button"]');
      
      // Verify buttons are disabled during save
      await expect(page.locator('[data-testid="save-button"]')).toBeDisabled();
      await expect(page.locator('[data-testid="export-pdf-button"]')).toBeDisabled();
    });

    test('should show appropriate toast messages', async ({ page }) => {
      await page.click('[data-testid="dotations-tab"]');
      
      // Test successful save
      await page.click('[data-testid="save-button"]');
      await expect(page.locator('.toast')).toContainText('Sauvegarde réussie');
      
      // Test successful export
      await page.click('[data-testid="export-excel-button"]');
      await expect(page.locator('.toast')).toContainText('Fichier Excel généré avec succès');
    });
  });
});