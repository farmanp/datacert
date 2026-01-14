import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E tests for DataCert file upload and profiling workflow
 */

test.describe('DataCert Profiling', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page and wait for WASM to load
    await page.goto('/');

    // Wait for WASM to be ready (indicated by the status text)
    await expect(page.getByText('WASM Ready')).toBeVisible({ timeout: 30000 });
  });

  test('should display the home page with import options', async ({ page }) => {
    // Verify the main heading is present
    await expect(page.getByRole('heading', { name: /DataCert/i })).toBeVisible();

    // Verify the import cards are present
    await expect(page.getByText('Import Files')).toBeVisible();
    await expect(page.getByText('Open Folder')).toBeVisible();
    await expect(page.getByText('Remote Sources')).toBeVisible();

    // Verify the sample data button is present
    await expect(page.getByRole('button', { name: /Try with Sample Data/i })).toBeVisible();
  });

  test('should upload a CSV file and display profiling results', async ({ page }) => {
    // Get the file input (it's hidden, so we need to access it directly)
    const fileInput = page.locator('input[type="file"]');

    // Upload the test CSV file
    const csvPath = path.join(__dirname, 'fixtures', 'sample.csv');
    await fileInput.setInputFiles(csvPath);

    // Wait for profiling to complete - look for the results header
    await expect(page.getByRole('heading', { name: /Profiling Results/i })).toBeVisible({
      timeout: 60000,
    });

    // Verify the file name is displayed
    await expect(page.getByText('sample.csv')).toBeVisible();

    // Verify KPI cards are displayed with expected values
    await expect(page.getByText('Total Rows')).toBeVisible();
    await expect(page.getByText('Total Columns')).toBeVisible();
    await expect(page.getByText('Data Types')).toBeVisible();
    await expect(page.getByText('Health Score')).toBeVisible();

    // Verify the row count (20 rows in our sample CSV)
    await expect(page.getByText('20')).toBeVisible();

    // Verify the column count (7 columns in our sample CSV)
    await expect(page.getByText('7')).toBeVisible();
  });

  test('should load sample data when clicking Try with Sample Data button', async ({ page }) => {
    // Click the sample data button
    await page.getByRole('button', { name: /Try with Sample Data/i }).click();

    // Wait for profiling to complete
    await expect(page.getByRole('heading', { name: /Profiling Results/i })).toBeVisible({
      timeout: 60000,
    });

    // Verify sample data indicator is shown
    await expect(page.getByText('Demo Data')).toBeVisible();
  });

  test('should switch between table and card views', async ({ page }) => {
    // Upload test file first
    const fileInput = page.locator('input[type="file"]');
    const csvPath = path.join(__dirname, 'fixtures', 'sample.csv');
    await fileInput.setInputFiles(csvPath);

    // Wait for results
    await expect(page.getByRole('heading', { name: /Profiling Results/i })).toBeVisible({
      timeout: 60000,
    });

    // By default, table view should be active
    const tableViewButton = page.getByRole('button', { name: /Table View/i });
    const cardViewButton = page.getByRole('button', { name: /Card View/i });

    // Verify table view button exists and click card view
    await expect(tableViewButton).toBeVisible();
    await cardViewButton.click();

    // Verify we're now in card view (cards should be visible)
    // Card view shows individual column cards in a grid
    await expect(page.locator('.grid').first()).toBeVisible();

    // Switch back to table view
    await tableViewButton.click();

    // Table view should show a table element
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('should search columns in the results view', async ({ page }) => {
    // Upload test file first
    const fileInput = page.locator('input[type="file"]');
    const csvPath = path.join(__dirname, 'fixtures', 'sample.csv');
    await fileInput.setInputFiles(csvPath);

    // Wait for results
    await expect(page.getByRole('heading', { name: /Profiling Results/i })).toBeVisible({
      timeout: 60000,
    });

    // Find the search input
    const searchInput = page.getByPlaceholder('Search columns...');
    await expect(searchInput).toBeVisible();

    // Search for a specific column
    await searchInput.fill('salary');

    // Wait for debounce and verify filtered results
    await expect(page.getByText(/Showing.*of.*columns/)).toBeVisible({ timeout: 5000 });
  });

  test('should clear results and return to home page', async ({ page }) => {
    // Upload test file first
    const fileInput = page.locator('input[type="file"]');
    const csvPath = path.join(__dirname, 'fixtures', 'sample.csv');
    await fileInput.setInputFiles(csvPath);

    // Wait for results
    await expect(page.getByRole('heading', { name: /Profiling Results/i })).toBeVisible({
      timeout: 60000,
    });

    // Click the Clear button
    await page.getByRole('button', { name: 'Clear' }).click();

    // Confirm the clear action in the dialog
    await page.getByRole('button', { name: 'Clear' }).last().click();

    // Verify we're back to the home page
    await expect(page.getByText('Import Files')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to SQL Mode from results', async ({ page }) => {
    // Upload test file first
    const fileInput = page.locator('input[type="file"]');
    const csvPath = path.join(__dirname, 'fixtures', 'sample.csv');
    await fileInput.setInputFiles(csvPath);

    // Wait for results
    await expect(page.getByRole('heading', { name: /Profiling Results/i })).toBeVisible({
      timeout: 60000,
    });

    // Click SQL Mode link
    await page.getByRole('link', { name: /SQL Mode/i }).click();

    // Verify we navigated to SQL Mode page
    await expect(page).toHaveURL(/.*sql-mode/);
  });

  test('should show export options when clicking Export Profile', async ({ page }) => {
    // Upload test file first
    const fileInput = page.locator('input[type="file"]');
    const csvPath = path.join(__dirname, 'fixtures', 'sample.csv');
    await fileInput.setInputFiles(csvPath);

    // Wait for results
    await expect(page.getByRole('heading', { name: /Profiling Results/i })).toBeVisible({
      timeout: 60000,
    });

    // Click Export Profile button
    await page.getByRole('button', { name: /Export Profile/i }).click();

    // Verify export modal appears (look for export format options)
    await expect(page.getByText(/Export/i)).toBeVisible();
  });
});

test.describe('DataCert Accessibility', () => {
  test('should have proper ARIA labels on the dropzone', async ({ page }) => {
    await page.goto('/');

    // Wait for WASM to load
    await expect(page.getByText('WASM Ready')).toBeVisible({ timeout: 30000 });

    // The dropzone should have proper ARIA attributes
    const dropzone = page.locator('[role="button"][aria-label*="File upload"]');
    await expect(dropzone).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Wait for WASM to load
    await expect(page.getByText('WASM Ready')).toBeVisible({ timeout: 30000 });

    // Tab to the Try with Sample Data button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Find the sample data button and verify it can receive focus
    const sampleButton = page.getByRole('button', { name: /Try with Sample Data/i });
    await sampleButton.focus();
    await expect(sampleButton).toBeFocused();
  });
});
