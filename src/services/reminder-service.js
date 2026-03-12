/**
 * ReminderService — ブラウザ通知APIを使った計測リマインダー
 * スケジュール設定（daily/thrice/weekly）に連動して通知を表示
 */

const STORAGE_KEY = 'mirucare_reminder';
const PERMISSION_KEY = 'mirucare_notification_enabled';

/** 通知の間隔（ミリ秒） */
const SCHEDULE_INTERVALS = {
  daily: 24 * 60 * 60 * 1000,       // 24時間
  thrice: 2.3 * 24 * 60 * 60 * 1000, // 約2.3日（週3回）
  weekly: 7 * 24 * 60 * 60 * 1000,   // 7日
};

export class ReminderService {

  /** 通知許可状態を取得 */
  static getPermissionState() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }

  /** ユーザーが通知を有効にしているか */
  static isEnabled() {
    return localStorage.getItem(PERMISSION_KEY) === 'true';
  }

  /** 通知の有効/無効を切り替え */
  static setEnabled(enabled) {
    localStorage.setItem(PERMISSION_KEY, String(enabled));
    if (!enabled) {
      ReminderService.clearTimer();
    }
  }

  /** 通知許可をリクエスト */
  static async requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      ReminderService.setEnabled(true);
    }
    return result;
  }

  /** 最後の計測日時を記録 */
  static recordMeasurement() {
    const data = ReminderService._getData();
    data.lastMeasurement = Date.now();
    ReminderService._saveData(data);
  }

  /** リマインダーチェック：必要なら通知を表示 */
  static checkAndNotify(schedule = 'daily') {
    if (!ReminderService.isEnabled()) return false;
    if (ReminderService.getPermissionState() !== 'granted') return false;

    const data = ReminderService._getData();
    const interval = SCHEDULE_INTERVALS[schedule] || SCHEDULE_INTERVALS.daily;
    const lastMeasurement = data.lastMeasurement || 0;
    const lastNotification = data.lastNotification || 0;
    const now = Date.now();

    // 最後の計測から間隔以上経過 AND 最後の通知から4時間以上経過
    const measurementOverdue = (now - lastMeasurement) > interval;
    const notificationCooldown = (now - lastNotification) > 4 * 60 * 60 * 1000;

    if (measurementOverdue && notificationCooldown) {
      ReminderService._showNotification(schedule);
      data.lastNotification = now;
      ReminderService._saveData(data);
      return true;
    }
    return false;
  }

  /** 定期チェックタイマーを開始（1時間ごと） */
  static startTimer(schedule = 'daily') {
    ReminderService.clearTimer();
    if (!ReminderService.isEnabled()) return;

    // 初回チェック
    ReminderService.checkAndNotify(schedule);

    // 1時間ごとにチェック
    const timerId = setInterval(() => {
      ReminderService.checkAndNotify(schedule);
    }, 60 * 60 * 1000);

    window.__mirucareReminderTimer = timerId;
  }

  /** タイマーをクリア */
  static clearTimer() {
    if (window.__mirucareReminderTimer) {
      clearInterval(window.__mirucareReminderTimer);
      window.__mirucareReminderTimer = null;
    }
  }

  /** 通知を表示 */
  static _showNotification(schedule) {
    const scheduleLabels = { daily: '毎日', thrice: '週3回', weekly: '週1回' };
    const label = scheduleLabels[schedule] || '定期';

    try {
      new Notification('ミルケア — 計測リマインダー', {
        body: `${label}計測のお時間です。ストレスチェックを行いましょう。`,
        icon: '/vitallens/icon-192.png',
        tag: 'mirucare-reminder',
        requireInteraction: false,
      });
    } catch (_e) {
      // 通知表示に失敗しても無視
    }
  }

  static _getData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  static _saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
