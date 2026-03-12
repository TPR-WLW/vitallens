// @ts-check
import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers.js';

test.describe('お問い合わせフォーム', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
    // Scroll to #contact section
    await page.locator('#contact').scrollIntoViewIfNeeded();
  });

  test('フォームが表示される', async ({ page }) => {
    const form = page.locator('form[aria-label="お問い合わせフォーム"]');
    await expect(form).toBeVisible();
    await expect(page.locator('#cf-company')).toBeVisible();
    await expect(page.locator('#cf-name')).toBeVisible();
    await expect(page.locator('#cf-email')).toBeVisible();
    await expect(page.locator('#cf-phone')).toBeVisible();
    await expect(page.locator('#cf-type')).toBeVisible();
    await expect(page.locator('#cf-message')).toBeVisible();
  });

  test('必須フィールド未入力でバリデーションエラーが表示される', async ({ page }) => {
    await page.locator('.cf-submit').click();
    await expect(page.locator('#cf-company-error')).toBeVisible();
    await expect(page.locator('#cf-name-error')).toBeVisible();
    await expect(page.locator('#cf-email-error')).toBeVisible();
  });

  test('メールアドレス形式エラーが表示される', async ({ page }) => {
    await page.fill('#cf-company', 'テスト株式会社');
    await page.fill('#cf-name', '田中太郎');
    await page.fill('#cf-email', 'invalid-email');
    await page.locator('.cf-submit').click();
    await expect(page.locator('#cf-email-error')).toContainText('正しいメールアドレス');
  });

  test('正常送信でlocalStorageに保存され成功画面が表示される', async ({ page }) => {
    await page.fill('#cf-company', 'テスト株式会社');
    await page.fill('#cf-department', '人事部');
    await page.fill('#cf-name', '田中太郎');
    await page.fill('#cf-email', 'tanaka@example.co.jp');
    await page.fill('#cf-phone', '03-1234-5678');
    await page.selectOption('#cf-type', '資料請求');
    await page.fill('#cf-message', 'デモを希望します');

    await page.locator('.cf-submit').click();

    // 成功画面が表示される
    await expect(page.locator('.cf-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.cf-success h3')).toContainText('送信完了');

    // localStorage にリードが保存されている
    const leads = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('mc_leads') || '[]');
    });
    expect(leads).toHaveLength(1);
    expect(leads[0].company).toBe('テスト株式会社');
    expect(leads[0].email).toBe('tanaka@example.co.jp');
    expect(leads[0].type).toBe('資料請求');
    expect(leads[0].ts).toBeGreaterThan(0);
  });

  test('成功後「もう一度送信する」でフォームに戻る', async ({ page }) => {
    await page.fill('#cf-company', 'A社');
    await page.fill('#cf-name', '山田');
    await page.fill('#cf-email', 'yamada@a.co.jp');
    await page.locator('.cf-submit').click();
    await expect(page.locator('.cf-success')).toBeVisible({ timeout: 5000 });

    await page.locator('.cf-reset').click();
    await expect(page.locator('form[aria-label="お問い合わせフォーム"]')).toBeVisible();
    // フォームがリセットされている
    await expect(page.locator('#cf-company')).toHaveValue('');
  });

  test('入力中にエラーがクリアされる', async ({ page }) => {
    // まずエラーを出す
    await page.locator('.cf-submit').click();
    await expect(page.locator('#cf-company-error')).toBeVisible();

    // 入力開始でエラーが消える
    await page.fill('#cf-company', 'テスト');
    await expect(page.locator('#cf-company-error')).not.toBeVisible();
  });
});
