// @ts-check
import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers.js';

test.describe('ダッシュボード・ログイン画面', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('「チーム管理」からログイン画面に遷移する', async ({ page }) => {
    // Open hamburger if visible (mobile/tablet)
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();

    // Click "チーム管理" button
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();

    // Verify login screen appears
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.adm-login-header h1')).toContainText('ミルケア');
    await expect(page.locator('.adm-login-header p')).toContainText('チーム ストレスモニタリング');
  });

  test('ログイン画面のUI要素が正しく表示される', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    // Login tab is active by default
    const loginTab = page.locator('.adm-login-tab', { hasText: 'ログイン' });
    const registerTab = page.locator('.adm-login-tab', { hasText: '新規登録' });
    await expect(loginTab).toHaveClass(/active/);

    // Login form fields
    await expect(page.locator('.adm-login-form input[type="email"]')).toBeVisible();
    await expect(page.locator('.adm-login-form input[type="password"]')).toBeVisible();
    await expect(page.locator('.adm-login-form .adm-btn-primary')).toContainText('ログイン');

    // Footer note about local data
    await expect(page.locator('.adm-login-local-note')).toContainText('データはこの端末にのみ保存されます');

    // "計測デモに戻る" link
    await expect(page.locator('.adm-login-footer .adm-link-btn')).toContainText('計測デモに戻る');
  });

  test('ログイン/新規登録タブの切り替え', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    // Switch to register tab
    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();

    // Register form fields should appear
    await expect(page.locator('.adm-login-form input[type="text"]').first()).toBeVisible();
    await expect(page.locator('.adm-login-form input[type="email"]')).toBeVisible();
    const passwordFields = page.locator('.adm-login-form input[type="password"]');
    await expect(passwordFields).toHaveCount(2); // password + confirm

    // Role selection
    await expect(page.locator('.adm-role-option', { hasText: '管理者として登録' })).toBeVisible();
    await expect(page.locator('.adm-role-option', { hasText: 'メンバーとして参加' })).toBeVisible();

    // Submit button text
    await expect(page.locator('.adm-login-form .adm-btn-primary')).toContainText('アカウントを作成');

    // Password warning
    await expect(page.locator('.adm-login-warning')).toContainText('パスワードを忘れた場合、復旧できません');

    // Switch back to login tab
    await page.locator('.adm-login-tab', { hasText: 'ログイン' }).click();
    await expect(page.locator('.adm-login-form .adm-btn-primary')).toContainText('ログイン');
  });

  test('新規登録フォームのバリデーション（パスワード短すぎ）', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    // Switch to register
    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();

    // Fill form with short password
    await page.locator('.adm-login-form input[type="text"]').first().fill('テスト太郎');
    await page.locator('.adm-login-form input[type="email"]').fill('test@example.co.jp');
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('short');
    await passwords.nth(1).fill('short');

    // Submit
    await page.locator('.adm-login-form .adm-btn-primary').click();

    // Expect validation error
    await expect(page.locator('.adm-login-error')).toContainText('パスワードは8文字以上');
  });

  test('新規登録フォームのバリデーション（パスワード不一致）', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();

    await page.locator('.adm-login-form input[type="text"]').first().fill('テスト太郎');
    await page.locator('.adm-login-form input[type="email"]').fill('test@example.co.jp');
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('password123');
    await passwords.nth(1).fill('password456');

    await page.locator('.adm-login-form .adm-btn-primary').click();

    await expect(page.locator('.adm-login-error')).toContainText('パスワードが一致しません');
  });

  test('「計測デモに戻る」でLP画面に戻る', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    // Click back link
    await page.locator('.adm-login-footer .adm-link-btn').click();

    // Should return to landing page
    await expect(page.locator('h1')).toContainText('ストレスチェックが義務化');
  });

  test('メンバーロール選択で招待コード欄が表示される', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();

    // By default, admin is selected -- no invite code field
    await expect(page.locator('input[placeholder="招待コードを入力"]')).not.toBeVisible();

    // Select member role
    await page.locator('.adm-role-option', { hasText: 'メンバーとして参加' }).click();

    // Invite code field should appear
    await expect(page.locator('input[placeholder="招待コードを入力"]')).toBeVisible();
  });
});

test.describe('ダッシュボード（新規登録→サンプルデータ）', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('新規登録してダッシュボードにアクセスできる', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    // Switch to register tab
    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();

    // Fill registration form
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('テスト管理者');
    await page.locator('.adm-login-form input[type="email"]').fill(`test-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');

    // Admin role is default, submit
    await page.locator('.adm-login-form .adm-btn-primary').click();

    // Should reach the admin dashboard
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.adm-main-header h1')).toBeVisible();
  });

  test('サンプルデータ読込でダッシュボードにデータが表示される', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    // Register a new account
    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('サンプルテスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`sample-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Click "サンプルデータ読込" in sidebar
    const sampleBtn = page.locator('.adm-sidebar-btn', { hasText: 'サンプルデータ読込' });
    // On mobile, sidebar may be hidden -- open it first
    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) {
      await admHamburger.click();
      await expect(page.locator('.adm-sidebar.open')).toBeVisible();
    }
    await sampleBtn.click();

    // Page reloads after sample data load, wait for dashboard to reappear
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 20000 });

    // Sample data banner should be visible
    await expect(page.locator('.adm-sample-banner')).toContainText('サンプルデータを表示中です', { timeout: 10000 });

    // KPI cards should show data (not empty)
    await expect(page.locator('.adm-kpi-card').first()).toBeVisible();
    await expect(page.locator('.adm-kpi-value').first()).not.toBeEmpty();

    // Team summary table should have rows
    await expect(page.locator('.adm-table tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('ダッシュボード内のビュー切り替え', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    // Register
    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('ナビテスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`nav-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Helper: ensure sidebar is accessible
    const openSidebar = async () => {
      const admHamburger = page.locator('.adm-hamburger');
      if (await admHamburger.isVisible()) {
        await admHamburger.click();
        await expect(page.locator('.adm-sidebar.open')).toBeVisible();
      }
    };

    // Navigate to "チーム" view
    await openSidebar();
    await page.locator('.adm-nav-item', { hasText: 'チーム' }).click();
    await expect(page.locator('.adm-view-title')).toContainText('チーム ストレス推移');

    // Navigate to "メンバー" view
    await openSidebar();
    await page.locator('.adm-nav-item', { hasText: 'メンバー' }).click();
    await expect(page.locator('.adm-view-title')).toContainText('メンバー管理');

    // Navigate to "CSV出力" view
    await openSidebar();
    await page.locator('.adm-nav-item', { hasText: 'CSV出力' }).click();
    await expect(page.locator('.adm-view-title')).toContainText('CSVデータ出力');

    // Navigate to "設定" view
    await openSidebar();
    await page.locator('.adm-nav-item', { hasText: '設定' }).click();
    await expect(page.locator('.adm-view-title')).toContainText('設定');

    // Navigate back to "ダッシュボード" (overview)
    await openSidebar();
    await page.locator('.adm-nav-item', { hasText: 'ダッシュボード' }).click();
    await expect(page.locator('.adm-section-title')).toContainText('部署別サマリー');
  });
});

test.describe('ダッシュボード 通知・印刷・ベンチマーク', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  async function registerAndLoadSample(page) {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('通知テスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`notify-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Load sample data
    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) {
      await admHamburger.click();
      await expect(page.locator('.adm-sidebar.open')).toBeVisible();
    }
    await page.locator('.adm-sidebar-btn', { hasText: 'サンプルデータ読込' }).click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.adm-sample-banner')).toContainText('サンプルデータを表示中です', { timeout: 10000 });
  }

  test('印刷ボタンが表示されクリック可能', async ({ page }) => {
    await registerAndLoadSample(page);

    // Print button should be visible
    const printBtn = page.locator('.adm-print-btn');
    await expect(printBtn).toBeVisible();
    await expect(printBtn).toContainText('印刷');
    await expect(printBtn).toHaveAttribute('title', '印刷 / PDF出力');
  });

  test('アラートバナーのrole=alert属性が正しい', async ({ page }) => {
    await registerAndLoadSample(page);

    // AlertBanner may or may not be visible depending on stress scores
    // Verify: if it exists, it has role="alert" and correct structure
    const alertBanner = page.locator('.adm-alert-banner');
    const count = await alertBanner.count();
    if (count > 0) {
      await expect(alertBanner).toHaveAttribute('role', 'alert');
      await expect(page.locator('.adm-alert-icon')).toContainText('⚠');
      await expect(page.locator('.adm-alert-content strong')).toContainText('要注意');
    }
    // If no alert, that's also valid (all teams below threshold)
  });

  test('チームビューに部署間ベンチマークが表示される', async ({ page }) => {
    await registerAndLoadSample(page);

    // Navigate to team view
    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) {
      await admHamburger.click();
      await expect(page.locator('.adm-sidebar.open')).toBeVisible();
    }
    await page.locator('.adm-nav-item', { hasText: 'チーム' }).click();
    await expect(page.locator('.adm-view-title')).toContainText('チーム ストレス推移');

    // Benchmark section should be visible (sample data has 3 departments)
    await expect(page.locator('.adm-section-title', { hasText: '部署間ベンチマーク' })).toBeVisible({ timeout: 10000 });

    // Table should have rows for departments
    const benchmarkRows = page.locator('.adm-table').last().locator('tbody tr');
    await expect(benchmarkRows).toHaveCount(3); // 3 departments in sample data
  });
});

test.describe('ダッシュボード モバイルサイドバー', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
  });

  test('モバイルでハンバーガーメニューからサイドバーが開閉する', async ({ page }) => {
    // Navigate to login, register, get to dashboard
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('モバイルテスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`mobile-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Dashboard hamburger should be visible on mobile
    const admHamburger = page.locator('.adm-hamburger');
    await expect(admHamburger).toBeVisible();

    // Sidebar should not have 'open' class initially
    const sidebar = page.locator('.adm-sidebar');
    await expect(sidebar).not.toHaveClass(/open/);

    // Click hamburger to open sidebar
    await admHamburger.click();
    await expect(sidebar).toHaveClass(/open/);

    // Overlay should be visible
    await expect(page.locator('.adm-overlay')).toBeVisible();

    // Click a nav item -- sidebar should close
    await page.locator('.adm-nav-item', { hasText: 'チーム' }).click();
    await expect(sidebar).not.toHaveClass(/open/);
    await expect(page.locator('.adm-view-title')).toContainText('チーム ストレス推移');
  });

  test('モバイルでオーバーレイクリックでサイドバーが閉じる', async ({ page }) => {
    // Navigate to dashboard
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('オーバーレイテスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`overlay-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Open sidebar
    await page.locator('.adm-hamburger').click();
    await expect(page.locator('.adm-sidebar')).toHaveClass(/open/);

    // Click overlay to close
    await page.locator('.adm-overlay').click();
    await expect(page.locator('.adm-sidebar')).not.toHaveClass(/open/);
  });
});
