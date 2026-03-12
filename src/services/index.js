/**
 * DataService ファクトリー — MiruCare
 * ローカルモード (IndexedDB) とクラウドモード (Cloudflare Workers) を切り替え。
 */

import { LocalDataService } from './local-data-service.js';
// import { CloudDataService } from './cloud-data-service.js'; // 未実装 — 創業者承認待ち

const CONFIG = {
  mode: 'local', // 'local' | 'cloud'
  // cloudBaseUrl: 'https://mirucare-api.workers.dev', // 将来用
};

/**
 * DataServiceインスタンスを作成
 * @param {object} [config] - オーバーライド設定
 * @returns {LocalDataService}
 */
export function createDataService(config = CONFIG) {
  if (config.mode === 'cloud') {
    // return new CloudDataService(config.cloudBaseUrl);
    throw new Error('クラウドモードは未実装です。創業者の承認を待っています。');
  }
  return new LocalDataService();
}

/** シングルトンインスタンス */
export const dataService = createDataService();
