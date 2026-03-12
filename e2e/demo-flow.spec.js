// @ts-check
import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers.js';

test.describe('デモモード完走テスト', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('カメラなしデモが20秒で完走し結果画面に遷移する', async ({ page }) => {
    await page.goto('/');

    await page.locator('.hero-actions .btn-hero-secondary').click();
    await expect(page.locator('.demo-measure-screen')).toBeVisible();

    // Verify demo badge
    await expect(page.locator('.demo-badge-label')).toContainText('デモモード');

    // Progress container should exist
    await expect(page.locator('.progress-bar')).toBeVisible();

    // Phase label should show one of the phases
    await expect(page.locator('.phase-label')).toBeVisible();

    // Wait for HR to appear (after ~3 seconds)
    await expect(page.locator('.hr-value')).toBeVisible({ timeout: 8000 });

    // Wait for completion — demo is 20 seconds
    await expect(page.locator('.result-screen, .result')).toBeVisible({ timeout: 30000 });

    // Verify result screen has key elements
    await expect(page.locator('text=BPM').first()).toBeVisible();
  });

  test('デモ中に「中止」で StartScreen に戻る', async ({ page }) => {
    await page.goto('/');

    await page.locator('.hero-actions .btn-hero-secondary').click();
    await expect(page.locator('.demo-measure-screen')).toBeVisible();

    await page.locator('.btn-cancel').click();
    await expect(page.locator('.start-screen')).toBeVisible({ timeout: 5000 });
  });

  test('最終CTAからデモモードにアクセスできる', async ({ page }) => {
    await page.goto('/');

    await page.locator('#cta .btn-text-link').scrollIntoViewIfNeeded();
    await page.locator('#cta .btn-text-link').click();

    await expect(page.locator('.demo-measure-screen')).toBeVisible({ timeout: 5000 });
  });
});
