// @ts-check
import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers.js';

test.describe('アクセシビリティ基本テスト', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('ページタイトルとlang属性が正しい', async ({ page }) => {
    await expect(page).toHaveTitle(/ミルケア/);
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('ja');
  });

  test('見出し階層が正しい（h1が1つ、h2が複数）', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThan(3);
  });

  test('画像にalt属性がある、または装飾的でaria-hiddenがある', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaHidden = await img.getAttribute('aria-hidden');
      expect(alt !== null || ariaHidden === 'true').toBeTruthy();
    }
  });

  test('主要CTAボタンがキーボードでフォーカス可能', async ({ page }) => {
    await page.keyboard.press('Tab');

    for (let i = 0; i < 20; i++) {
      const focused = page.locator(':focus');
      const tagName = await focused.evaluate(el => el.tagName).catch(() => '');
      if (tagName === 'BUTTON' || tagName === 'A') {
        const isVisible = await focused.isVisible();
        expect(isVisible).toBeTruthy();
        break;
      }
      await page.keyboard.press('Tab');
    }
  });

  test('ハンバーガーボタンにaria-labelがある', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    const ariaLabel = await hamburger.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});
