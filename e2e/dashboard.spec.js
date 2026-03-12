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
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.adm-main-header h1')).toBeVisible();
  });

  test('サンプルデータ読込でダッシュボードにデータが表示される', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 15000 });

    // Register a new account
    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('サンプルテスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`sample-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 20000 });

    // Click "サンプルデータ読込" in sidebar
    const sampleBtn = page.locator('.adm-sidebar-btn', { hasText: 'サンプルデータ読込' });
    // On mobile, sidebar may be hidden -- open it first
    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) {
      await admHamburger.click();
      await expect(page.locator('.adm-sidebar.open')).toBeVisible({ timeout: 5000 });
    }
    await sampleBtn.click();

    // Page reloads after sample data load, wait for dashboard to reappear
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 25000 });

    // Sample data banner should be visible
    await expect(page.locator('.adm-sample-banner')).toContainText('サンプルデータを表示中です', { timeout: 15000 });

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
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 15000 });

    // Register
    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('ナビテスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`nav-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 20000 });

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
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 15000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('通知テスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`notify-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 20000 });

    // Load sample data
    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) {
      await admHamburger.click();
      await expect(page.locator('.adm-sidebar.open')).toBeVisible({ timeout: 5000 });
    }
    await page.locator('.adm-sidebar-btn', { hasText: 'サンプルデータ読込' }).click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('.adm-sample-banner')).toContainText('サンプルデータを表示中です', { timeout: 15000 });
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

test.describe('ダッシュボード 期間比較・共有・アクセシビリティ', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  async function registerAndLoadSample(page) {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 15000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('期間テスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`period-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 20000 });

    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) {
      await admHamburger.click();
      await expect(page.locator('.adm-sidebar.open')).toBeVisible({ timeout: 5000 });
    }
    await page.locator('.adm-sidebar-btn', { hasText: 'サンプルデータ読込' }).click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('.adm-sample-banner')).toContainText('サンプルデータを表示中です', { timeout: 15000 });
  }

  test('チームビューに期間比較レポートが表示される', async ({ page }) => {
    await registerAndLoadSample(page);

    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) {
      await admHamburger.click();
      await expect(page.locator('.adm-sidebar.open')).toBeVisible();
    }
    await page.locator('.adm-nav-item', { hasText: 'チーム' }).click();
    await expect(page.locator('.adm-view-title')).toContainText('チーム ストレス推移');

    // Period comparison section should appear
    await expect(page.locator('.adm-section-title', { hasText: '期間比較レポート' })).toBeVisible({ timeout: 10000 });

    // KPI cards for month comparison should be visible
    const kpiCards = page.locator('.adm-kpi-card');
    await expect(kpiCards.first()).toBeVisible();
  });

  test('ベンチマークテーブルにaria-label属性がある', async ({ page }) => {
    await registerAndLoadSample(page);

    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) {
      await admHamburger.click();
      await expect(page.locator('.adm-sidebar.open')).toBeVisible();
    }
    await page.locator('.adm-nav-item', { hasText: 'チーム' }).click();
    await expect(page.locator('.adm-view-title')).toContainText('チーム ストレス推移');

    // Benchmark table should have aria-label
    await expect(page.locator('.adm-section-title', { hasText: '部署間ベンチマーク' })).toBeVisible({ timeout: 10000 });
    const benchmarkTable = page.locator('table[aria-label="部署間ベンチマーク比較"]');
    await expect(benchmarkTable).toBeVisible();

    // th elements should have scope="col"
    const ths = benchmarkTable.locator('th');
    const thCount = await ths.count();
    for (let i = 0; i < thCount; i++) {
      await expect(ths.nth(i)).toHaveAttribute('scope', 'col');
    }
  });

  test('概要ビューのテーブルにaria-label属性がある', async ({ page }) => {
    await registerAndLoadSample(page);

    // Overview table should have aria-label
    const overviewTable = page.locator('table[aria-label="部署別サマリー"]');
    await expect(overviewTable).toBeVisible({ timeout: 10000 });

    // th elements should have scope="col"
    const ths = overviewTable.locator('th');
    const thCount = await ths.count();
    for (let i = 0; i < thCount; i++) {
      await expect(ths.nth(i)).toHaveAttribute('scope', 'col');
    }
  });

  test('共有リンクで結果画面に「自分も計測してみる」CTAが表示される', async ({ page }) => {
    // Build a shared URL with base64-encoded result data
    const shareData = {
      hr: 72,
      confidence: 0.85,
      duration: 180,
      samples: 5400,
      algorithm: 'POS',
      hrv: {
        metrics: { rmssd: 35, sdnn: 40, pnn50: 16, meanIBI: 833, meanHR: 72 },
        stress: { level: 'low', score: 30, label: 'リラックス', color: '#22c55e' },
        quality: { grade: 'A', score: 0.85, message: '信号品質: 優秀' },
        freqMetrics: null,
      },
      ts: new Date().toISOString(),
    };
    const encoded = Buffer.from(JSON.stringify(shareData)).toString('base64');
    await page.goto(`/#shared=${encoded}`);

    // Wait for result screen
    await expect(page.locator('.result-screen')).toBeVisible({ timeout: 10000 });

    // Shared CTA should be visible
    const sharedCta = page.locator('.shared-result-cta');
    await expect(sharedCta).toBeVisible();
    await expect(sharedCta.locator('.shared-result-note')).toContainText('共有リンクから表示');

    // "自分も計測してみる" button
    const tryBtn = sharedCta.locator('.btn-try-measure');
    await expect(tryBtn).toBeVisible();
    await expect(tryBtn).toContainText('自分も計測してみる');
  });

  test('結果画面にミニトレンドチャートが履歴2件以上で表示される', async ({ page }) => {
    // Seed localStorage with 3 measurement entries
    const entries = Array.from({ length: 3 }, (_, i) => ({
      id: `test-${i}`,
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      data: {
        hr: 70 + i,
        confidence: 0.8,
        duration: 180,
        samples: 5400,
        isDemo: false,
        isSample: false,
        hrv: {
          metrics: { rmssd: 30 + i * 2, sdnn: 35 + i, pnn50: 12 + i, meanIBI: 800, meanHR: 70 + i },
          stress: { level: 'moderate', score: 40 + i * 5, label: '通常', color: '#4f8cff' },
          quality: { grade: 'A', score: 0.8, message: '信号品質: 優秀' },
        },
        emotionSummary: null,
      },
    }));

    await page.evaluate((data) => {
      localStorage.setItem('mirucare_history', JSON.stringify(data));
    }, entries);

    // Navigate to sample result
    await page.goto('/');
    await skipOnboarding(page);
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('a.btn-nav', { hasText: /デモ|ストレスチェック/ }).first().click();

    const sampleBtn = page.locator('button', { hasText: 'サンプル結果を見る' });
    if (await sampleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sampleBtn.click();
    }

    // Wait for result screen
    await expect(page.locator('.result-screen')).toBeVisible({ timeout: 10000 });

    // Mini trend chart should be visible
    const miniTrend = page.locator('.mini-trend-container');
    await expect(miniTrend).toBeVisible();
    await expect(miniTrend).toHaveAttribute('aria-label', '直近のコンディション推移');
    await expect(miniTrend.locator('.mini-trend-label')).toContainText('直近');
  });

  test('結果画面にシェアボタンが表示される', async ({ page }) => {
    // Navigate to demo result
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('a.btn-nav', { hasText: /デモ|ストレスチェック/ }).first().click();

    // Click "サンプル結果" if available, or navigate to sample
    const sampleBtn = page.locator('button', { hasText: 'サンプル結果を見る' });
    if (await sampleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sampleBtn.click();
    } else {
      // Fall back: go back and use sample route
      await page.goto('/');
      await skipOnboarding(page);
      const navHamburger = page.locator('.nav-hamburger');
      if (await navHamburger.isVisible()) await navHamburger.click();
      await page.locator('a.btn-nav', { hasText: /デモ|ストレスチェック/ }).first().click();
      await page.locator('button', { hasText: /サンプル/ }).first().click({ timeout: 5000 });
    }

    // Wait for result screen
    await expect(page.locator('.result-screen')).toBeVisible({ timeout: 10000 });

    // Share button should be visible
    const shareBtn = page.locator('.btn-share-result');
    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toContainText('結果を共有する');
    await expect(shareBtn).toHaveAttribute('aria-label', '計測結果を共有する');
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
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 15000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('モバイルテスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`mobile-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 20000 });

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
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 15000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const timestamp = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('オーバーレイテスト');
    await page.locator('.adm-login-form input[type="email"]').fill(`overlay-${timestamp}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 20000 });

    // Open sidebar
    await page.locator('.adm-hamburger').click();
    await expect(page.locator('.adm-sidebar')).toHaveClass(/open/);

    // Click overlay to close
    await page.locator('.adm-overlay').click();
    await expect(page.locator('.adm-sidebar')).not.toHaveClass(/open/);
  });
});

// ===== 履歴画面トレンド期間フィルタ =====

test.describe('HistoryScreen トレンド期間フィルタ', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('期間フィルタボタンが表示される', async ({ page }) => {
    // Seed history with 3 real entries via addInitScript (before page load)
    const entries = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      entries.push({
        id: `trend-filter-${i}`,
        timestamp: d.toISOString(),
        data: {
          hr: 72 + i,
          confidence: 0.85,
          isDemo: false,
          isSample: false,
          hrv: {
            metrics: { rmssd: 38 + i, sdnn: 42, pnn50: 18 },
            stress: { score: 35 + i * 5, label: '低い', color: '#22c55e', level: 'low' },
          },
        },
      });
    }
    await page.addInitScript((e) => {
      localStorage.setItem('mirucare_history', JSON.stringify(e));
    }, entries);
    await page.goto('/');

    // Click hero CTA to go to start screen, then navigate to history
    await page.locator('.btn-hero').first().click();
    await expect(page.locator('.start-screen')).toBeVisible({ timeout: 10000 });
    await page.locator('button.btn-history').click();
    await expect(page.locator('.history-screen')).toBeVisible({ timeout: 10000 });

    // Period filter buttons should exist
    await expect(page.locator('.trend-period-btn')).toHaveCount(3);
    await expect(page.locator('.trend-period-btn.active')).toContainText('全期間');
  });
});

// ===== 履歴カード展開テスト =====

test.describe('HistoryScreen カード展開', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('詳細ボタンでHRV指標が展開表示される', async ({ page }) => {
    // Seed history with entry containing full HRV data
    const entries = [{
      id: 'expand-test-1',
      timestamp: new Date().toISOString(),
      data: {
        hr: 72,
        confidence: 0.85,
        isDemo: false,
        isSample: false,
        algorithm: 'POS',
        hrv: {
          metrics: { rmssd: 38, sdnn: 42, pnn50: 18, meanIBI: 833, meanHR: 72 },
          stress: { score: 35, label: '低い', color: '#22c55e', level: 'low' },
          quality: { grade: 'A', score: 0.85, message: '信号品質: 優秀' },
          freqMetrics: { lf: 0.02, hf: 0.03, lfHfRatio: 1.5, lfNorm: 45, hfNorm: 55, totalPower: 0.05, respiratory: { respiratoryRate: 15.2, confidence: 0.8, peakFrequency: 0.25 } },
        },
        emotionSummary: null,
      },
    }, {
      id: 'expand-test-2',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      data: {
        hr: 68, confidence: 0.8, isDemo: false, isSample: false,
        hrv: {
          metrics: { rmssd: 40, sdnn: 45, pnn50: 20, meanIBI: 882, meanHR: 68 },
          stress: { score: 30, label: '低い', color: '#22c55e', level: 'low' },
          quality: { grade: 'A', score: 0.9, message: '信号品質: 優秀' },
        },
        emotionSummary: null,
      },
    }];

    await page.addInitScript((e) => {
      localStorage.setItem('mirucare_history', JSON.stringify(e));
    }, entries);
    await page.goto('/');

    // Navigate to history
    await page.locator('.btn-hero').first().click();
    await expect(page.locator('.start-screen')).toBeVisible({ timeout: 10000 });
    await page.locator('button.btn-history').click();
    await expect(page.locator('.history-screen')).toBeVisible({ timeout: 10000 });

    // Expand button should exist on card with full HRV data
    const expandBtn = page.locator('.btn-history-expand').first();
    await expect(expandBtn).toBeVisible();
    await expect(expandBtn).toContainText('詳細');

    // Click to expand
    await expandBtn.click();

    // Detail grid should show HRV metrics
    const detail = page.locator('.history-detail').first();
    await expect(detail).toBeVisible();
    await expect(detail.locator('.history-detail-item')).toHaveCount(8); // sdnn, pnn50, meanHR, LF/HF, LF norm, HF norm, respiratory, grade

    // Click again to collapse
    await expandBtn.click();
    await expect(detail).not.toBeVisible();
  });
});

// ===== History Screen フィルタ =====

test.describe('HistoryScreen フィルタ機能', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('フィルタバーが表示され、種別フィルタで絞り込める', async ({ page }) => {
    // Seed history with mixed entries
    const entries = [
      {
        id: 'filter-1',
        timestamp: new Date().toISOString(),
        data: {
          hr: 72, confidence: 0.85, isDemo: false, isSample: false,
          hrv: {
            metrics: { rmssd: 38, sdnn: 42, pnn50: 18, meanIBI: 833, meanHR: 72 },
            stress: { score: 42, label: '中程度', color: '#f59e0b', level: 'medium' },
            quality: { grade: 'B', score: 0.75, message: '信号品質: 良好' },
          },
          emotionSummary: null,
        },
      },
      {
        id: 'filter-2',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        data: {
          hr: 65, confidence: 0.9, isDemo: true, isSample: false,
          hrv: {
            metrics: { rmssd: 50, sdnn: 55, pnn50: 25, meanIBI: 923, meanHR: 65 },
            stress: { score: 25, label: '低い', color: '#22c55e', level: 'low' },
            quality: { grade: 'A', score: 0.9, message: '信号品質: 優秀' },
          },
          emotionSummary: null,
        },
      },
    ];

    await page.addInitScript((e) => {
      localStorage.setItem('mirucare_history', JSON.stringify(e));
    }, entries);
    await page.goto('/');

    // Navigate to history
    await page.locator('.btn-hero').first().click();
    await expect(page.locator('.start-screen')).toBeVisible({ timeout: 10000 });
    await page.locator('button.btn-history').click();
    await expect(page.locator('.history-screen')).toBeVisible({ timeout: 10000 });

    // Filter bar should be visible
    await expect(page.locator('.history-filter-bar')).toBeVisible();

    // Count display should show
    await expect(page.locator('.history-filter-count')).toContainText('2件');

    // Select demo-only filter
    const typeSelect = page.locator('.history-filter-bar select').first();
    await typeSelect.selectOption('demo');

    // Should now show 1 entry
    await expect(page.locator('.history-filter-count')).toContainText('1件');
  });
});

// ===== チームドリルダウン =====

test.describe('TeamView 部署ドリルダウン', () => {
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
    const ts = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('ドリルテスト社');
    await page.locator('.adm-login-form input[type="email"]').fill(`drill-${ts}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) await admHamburger.click();
    await page.locator('.adm-sidebar-btn', { hasText: 'サンプルデータ読込' }).click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('.adm-sample-banner')).toContainText('サンプルデータを表示中です', { timeout: 15000 });
  }

  test('部署名クリックで日次推移ドリルダウンが表示される', async ({ page }) => {
    await registerAndLoadSample(page);

    // Navigate to Team view
    const admHamburger = page.locator('.adm-hamburger');
    if (await admHamburger.isVisible()) await admHamburger.click();
    await page.locator('.adm-nav-item', { hasText: 'チーム分析' }).click();
    await expect(page.locator('.adm-view-title', { hasText: 'チーム ストレス推移' })).toBeVisible({ timeout: 10000 });

    // Find clickable team link in status list
    const drillLink = page.locator('.adm-drill-link').first();
    if (await drillLink.isVisible({ timeout: 5000 })) {
      await drillLink.click();

      // Drill-down panel should appear
      await expect(page.locator('.adm-section-title', { hasText: 'の日次推移' })).toBeVisible({ timeout: 10000 });

      // Close button should work
      const closeBtn = page.locator('.adm-drill-close');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await expect(page.locator('.adm-section-title', { hasText: 'の日次推移' })).not.toBeVisible();
      }
    }
  });
});

// ===== キャリブレーションガイド =====

test.describe('計測画面 キャリブレーションガイド', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('計測ガイドにステップ表示が含まれる', async ({ page }) => {
    // Navigate to demo
    await page.locator('.btn-hero').first().click();
    await expect(page.locator('.start-screen')).toBeVisible({ timeout: 10000 });

    // Start demo
    await page.locator('.btn-start-demo').click();
    await expect(page.locator('.demo-measure-screen, .measure-screen')).toBeVisible({ timeout: 10000 });

    // The guide text should contain step-by-step instructions
    const guideSteps = page.locator('.guide-text-steps');
    const guideDetected = page.locator('.guide-text-detected');

    // Either the steps (face not detected) or detected message should be visible
    const stepsVisible = await guideSteps.isVisible({ timeout: 5000 }).catch(() => false);
    const detectedVisible = await guideDetected.isVisible({ timeout: 2000 }).catch(() => false);

    expect(stepsVisible || detectedVisible).toBeTruthy();

    if (stepsVisible) {
      await expect(page.locator('.guide-step')).toContainText('ガイド枠');
      await expect(page.locator('.guide-step-sub')).toContainText('40〜60cm');
    }
  });
});

// ===== 組織レポートPDFボタン =====

test.describe('ExportView 組織レポートPDF', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('組織レポートPDFボタンが表示される', async ({ page }) => {
    // Navigate to dashboard
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    // Register
    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const ts = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('PDFテスト社');
    await page.locator('.adm-login-form input[type="email"]').fill(`pdf-${ts}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Load sample data
    const sampleBtn = page.locator('button', { hasText: 'サンプルデータ' });
    if (await sampleBtn.isVisible()) await sampleBtn.click();

    // Navigate to CSV Export view
    await page.locator('.adm-nav-item', { hasText: 'CSV出力' }).click();
    await expect(page.locator('.adm-view-title', { hasText: 'CSVデータ出力' })).toBeVisible({ timeout: 10000 });

    // Organization report PDF button should be present
    await expect(page.locator('button', { hasText: '組織レポートをPDF出力' })).toBeVisible();
  });
});

// ===== メンバースコアタイムライン =====

test.describe('OverviewView 直近7日ウィジェット', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('サンプルデータでウィジェットカードが表示される', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const ts = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('ウィジェットテスト社');
    await page.locator('.adm-login-form input[type="email"]').fill(`wid-${ts}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Load sample data
    await page.locator('.adm-sidebar-btn', { hasText: 'サンプルデータ読込' }).click();
    await page.waitForTimeout(3000);
    await page.reload();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // OverviewView should show weekly widgets
    await expect(page.locator('.adm-weekly-widgets')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.adm-widget-card')).toHaveCount(2);
  });
});

test.describe('MembersView CSVインポート', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('CSVインポートセクションが表示される', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const ts = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('CSVテスト社');
    await page.locator('.adm-login-form input[type="email"]').fill(`csv-${ts}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Navigate to Members view
    await page.locator('.adm-nav-item', { hasText: 'メンバー' }).click();
    await expect(page.locator('.adm-view-title', { hasText: 'メンバー管理' })).toBeVisible({ timeout: 10000 });

    // CSV import section visible
    await expect(page.locator('.adm-csv-import-section')).toBeVisible();
    await expect(page.locator('.adm-csv-dropzone')).toBeVisible();
  });
});

test.describe('OverviewView 通知パネル', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('サンプルデータで通知パネルが表示される', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const ts = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('通知テスト社');
    await page.locator('.adm-login-form input[type="email"]').fill(`notif-${ts}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Load sample data
    await page.locator('.adm-sidebar-btn', { hasText: 'サンプルデータ読込' }).click();
    await page.waitForTimeout(3000);
    await page.reload();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Notification panel section title should be visible
    await expect(page.locator('.adm-notifications')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.adm-section-title', { hasText: '最近のイベント' })).toBeVisible();
  });
});

test.describe('MembersView スコアタイムライン', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
  });

  test('管理者自身の行にあなたバッジと展開ボタンが表示される', async ({ page }) => {
    // Navigate to dashboard
    const hamburger = page.locator('.nav-hamburger');
    if (await hamburger.isVisible()) await hamburger.click();
    await page.locator('button.btn-nav-secondary', { hasText: 'チーム管理' }).click();
    await expect(page.locator('.adm-login-page')).toBeVisible({ timeout: 10000 });

    // Register
    await page.locator('.adm-login-tab', { hasText: '新規登録' }).click();
    const ts = Date.now();
    await page.locator('.adm-login-form input[type="text"]').first().fill('タイムラインテスト社');
    await page.locator('.adm-login-form input[type="email"]').fill(`tl-${ts}@example.co.jp`);
    const passwords = page.locator('.adm-login-form input[type="password"]');
    await passwords.nth(0).fill('testpassword123');
    await passwords.nth(1).fill('testpassword123');
    await page.locator('.adm-login-form .adm-btn-primary').click();
    await expect(page.locator('.adm-layout')).toBeVisible({ timeout: 15000 });

    // Navigate to Members view
    await page.locator('.adm-nav-item', { hasText: 'メンバー' }).click();
    await expect(page.locator('.adm-view-title', { hasText: 'メンバー管理' })).toBeVisible({ timeout: 10000 });

    // "あなた" badge should be visible
    await expect(page.locator('.adm-member-you-badge')).toBeVisible();

    // Click the admin row to expand timeline
    await page.locator('.adm-member-clickable').first().click();

    // Timeline panel should appear (empty or with data)
    await expect(page.locator('.adm-member-timeline')).toBeVisible({ timeout: 5000 });

    // Close button should work
    await page.locator('.adm-timeline-close').click();
    await expect(page.locator('.adm-member-timeline')).not.toBeVisible();
  });
});
