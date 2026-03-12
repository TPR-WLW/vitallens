// @ts-check
import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers.js';

test.describe('レスポンシブ表示テスト', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('モバイル（390x844）: ハンバーガーメニューが表示される', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Hamburger should be visible
    await expect(page.locator('.nav-hamburger')).toBeVisible();

    // Nav links should be hidden by default
    const navLinks = page.locator('.nav-links');
    await expect(navLinks).not.toHaveClass(/nav-open/);

    // Click hamburger to open menu
    await page.locator('.nav-hamburger').click();
    await expect(navLinks).toHaveClass(/nav-open/);

    // Click a nav link to close
    await page.locator('.nav-links a[href="#pricing"]').click();
    await expect(navLinks).not.toHaveClass(/nav-open/);
  });

  test('タブレット（768x1024）: レイアウトが崩れない', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.hero-stats')).toBeVisible();

    const problemCards = page.locator('.problem-card');
    await expect(problemCards).toHaveCount(3);

    await expect(page.locator('.pricing-number')).toContainText('500');
  });

  test('デスクトップ（1280x800）: フルレイアウト表示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.locator('.nav-links a[href="#pricing"]')).toBeVisible();

    const benefitCards = page.locator('.benefit-card');
    await expect(benefitCards).toHaveCount(6);

    const guideLinks = page.locator('.footer-guides a');
    await expect(guideLinks).toHaveCount(9);
  });

  test('モバイルでデモフローが動作する', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.locator('.hero-actions .btn-hero-secondary').click();
    await expect(page.locator('.demo-measure-screen')).toBeVisible({ timeout: 5000 });

    await page.locator('.btn-cancel').click();
    await expect(page.locator('.start-screen')).toBeVisible({ timeout: 5000 });
  });
});
