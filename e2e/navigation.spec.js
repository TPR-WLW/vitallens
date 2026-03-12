// @ts-check
import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers.js';

test.describe('LP → 画面遷移', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('LPが正しく表示される', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ストレスチェックが義務化');
    await expect(page.locator('.nav-logo')).toContainText('ミルケア');
    await expect(page.locator('.hero-actions .btn-hero')).toBeVisible();
    await expect(page.locator('.hero-actions .btn-hero-secondary')).toBeVisible();
    await expect(page.locator('.hero-stats')).toContainText('95.9%');
    await expect(page.locator('.hero-stats')).toContainText('500円');
    await expect(page.locator('.hero-stats')).toContainText('3分');
  });

  test('「無料デモを体験する」→ StartScreen に遷移', async ({ page }) => {
    await page.locator('.hero-actions .btn-hero').click();
    await expect(page.locator('.start-screen')).toBeVisible({ timeout: 5000 });
  });

  test('「カメラなしでデモを見る」→ DemoMeasureScreen に遷移', async ({ page }) => {
    await page.locator('.hero-actions .btn-hero-secondary').click();
    await expect(page.locator('.demo-measure-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.demo-badge-label')).toContainText('デモモード');
  });

  test('ナビ「管理者デモ」→ Dashboard に遷移', async ({ page }) => {
    await page.locator('button.btn-nav-secondary').click();
    await expect(page.locator('[class*="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('ナビアンカーリンクが正しく機能する', async ({ page }) => {
    await page.locator('.nav-links a[href="#pricing"]').click();
    await expect(page.locator('#pricing')).toBeInViewport();
  });

  test('フッターリンクが存在する', async ({ page }) => {
    const footer = page.locator('.landing-footer');
    await expect(footer.locator('a[href="#company"]')).toBeVisible();
    await expect(footer.locator('a[href="#contact"]')).toBeVisible();
    await expect(footer.locator('.footer-guides a')).toHaveCount(9);
  });

  test('プライバシーポリシーモーダルが開閉する', async ({ page }) => {
    const privacyLink = page.locator('.landing-footer').getByText('プライバシーポリシー');
    await privacyLink.scrollIntoViewIfNeeded();
    await privacyLink.click();
    await expect(page.locator('.privacy-modal')).toBeVisible();
    await expect(page.locator('.privacy-modal h2')).toContainText('プライバシーポリシー');
    await page.locator('.privacy-close').click();
    await expect(page.locator('.privacy-modal')).not.toBeVisible();
  });
});
