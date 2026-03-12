/**
 * LocalDataService — IndexedDBベースのデータサービス実装
 * DataServiceインターフェースを満たし、クラウド移行時はCloudDataServiceに差し替え可能。
 */

import { put, get, getAll, getByIndex, del, clearAll } from './idb-helpers.js';
import { register, login, logout, getSession, getUsersByOrg, changePassword } from './auth-local.js';

/** ID生成 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const MIN_TEAM_SIZE = 5; // プライバシー保護: 5名以上の集計のみ

export class LocalDataService {

  // === 組織管理 ===

  async createOrg({ name, plan = 'trial', slug = null, config = {} }) {
    const org = {
      id: generateId(),
      name,
      plan,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      config: { maxUsers: 100, checkCooldownMinutes: 5, timezone: 'Asia/Tokyo', ...config },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await put('organizations', org);
    return org;
  }

  async getOrg(orgId) {
    return get('organizations', orgId);
  }

  // === ユーザー管理 ===

  async createUser({ email, password, name, orgId, role = 'member' }) {
    const result = await register({ email, password, name, orgId, role });
    return result.user;
  }

  async getUser(userId) {
    const user = await get('users', userId);
    if (!user) return null;
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  async getUsersByOrg(orgId) {
    return getUsersByOrg(orgId);
  }

  // === 認証 ===

  async login({ email, password }) {
    return login({ email, password });
  }

  async logout() {
    logout();
  }

  getSession() {
    return getSession();
  }

  async changePassword({ userId, currentPassword, newPassword }) {
    return changePassword({ userId, currentPassword, newPassword });
  }

  // === 計測データ ===

  async saveMeasurement({
    userId, orgId, hr, confidence, hrv, freqMetrics = null,
    respiratory = null, stressScore, qualityGrade, emotionSummary = null,
  }) {
    // ユーザーのチームを取得
    const memberships = await getByIndex('teamMemberships', 'userId', userId);
    const teamId = memberships.length > 0 ? memberships[0].teamId : null;

    const measurement = {
      id: generateId(),
      userId,
      orgId,
      teamId,
      timestamp: new Date().toISOString(),
      hr,
      confidence,
      hrv: hrv || {},
      freqMetrics,
      respiratory,
      stressScore,
      qualityGrade,
      emotionSummary,
    };
    await put('measurements', measurement);

    // BroadcastChannelで他タブに通知
    try {
      const channel = new BroadcastChannel('mirucare-measurements');
      channel.postMessage({ type: 'measurement-saved', timestamp: Date.now() });
      channel.close();
    } catch (_e) {
      // BroadcastChannel未対応ブラウザは無視
    }

    return measurement;
  }

  async getMeasurements({ userId = null, orgId = null, from = null, to = null, limit = 1000 }) {
    let results;
    if (userId) {
      results = await getByIndex('measurements', 'userId', userId);
    } else if (orgId) {
      results = await getByIndex('measurements', 'orgId', orgId);
    } else {
      results = await getAll('measurements');
    }

    // 日付フィルタ
    if (from || to) {
      results = results.filter(m => {
        const ts = new Date(m.timestamp).getTime();
        if (from && ts < new Date(from).getTime()) return false;
        if (to && ts > new Date(to).getTime()) return false;
        return true;
      });
    }

    // 新しい順にソート
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return results.slice(0, limit);
  }

  // === チーム管理 ===

  async createTeam({ name, orgId }) {
    const team = {
      id: generateId(),
      orgId,
      name,
      createdAt: new Date().toISOString(),
    };
    await put('teams', team);
    return team;
  }

  async getTeams(orgId) {
    return getByIndex('teams', 'orgId', orgId);
  }

  async addTeamMember({ userId, teamId }) {
    const membership = {
      id: generateId(),
      userId,
      teamId,
      assignedAt: new Date().toISOString(),
    };
    await put('teamMemberships', membership);
    return membership;
  }

  async removeTeamMember(membershipId) {
    await del('teamMemberships', membershipId);
  }

  async getTeamMembers(teamId) {
    return getByIndex('teamMemberships', 'teamId', teamId);
  }

  // === チーム統計（5名ルール適用） ===

  async getTeamStats(teamId, { from = null, to = null } = {}) {
    const memberships = await getByIndex('teamMemberships', 'teamId', teamId);
    const memberUserIds = new Set(memberships.map(m => m.userId));
    const team = await get('teams', teamId);

    if (memberUserIds.size < MIN_TEAM_SIZE) {
      return {
        teamId,
        teamName: team?.name || '',
        memberCount: memberUserIds.size,
        period: { from, to },
        stats: null, // プライバシー保護: データ不足
        privacyFiltered: true,
      };
    }

    // チームメンバーの計測データを収集
    let allMeasurements = [];
    for (const userId of memberUserIds) {
      const userMeasurements = await getByIndex('measurements', 'userId', userId);
      allMeasurements.push(...userMeasurements);
    }

    // 日付フィルタ
    if (from || to) {
      allMeasurements = allMeasurements.filter(m => {
        const ts = new Date(m.timestamp).getTime();
        if (from && ts < new Date(from).getTime()) return false;
        if (to && ts > new Date(to).getTime()) return false;
        return true;
      });
    }

    if (allMeasurements.length === 0) {
      return {
        teamId,
        teamName: team?.name || '',
        memberCount: memberUserIds.size,
        period: { from, to },
        stats: { avgHr: 0, avgStress: 0, avgHrv: { rmssd: 0, sdnn: 0 }, measurementCount: 0 },
        privacyFiltered: false,
      };
    }

    // 集計
    const sum = { hr: 0, stress: 0, rmssd: 0, sdnn: 0 };
    for (const m of allMeasurements) {
      sum.hr += m.hr || 0;
      sum.stress += m.stressScore || 0;
      sum.rmssd += m.hrv?.rmssd || 0;
      sum.sdnn += m.hrv?.sdnn || 0;
    }
    const n = allMeasurements.length;

    return {
      teamId,
      teamName: team?.name || '',
      memberCount: memberUserIds.size,
      period: { from, to },
      stats: {
        avgHr: Math.round(sum.hr / n),
        avgStress: Math.round(sum.stress / n),
        avgHrv: {
          rmssd: Math.round(sum.rmssd / n * 10) / 10,
          sdnn: Math.round(sum.sdnn / n * 10) / 10,
        },
        measurementCount: n,
      },
      privacyFiltered: false,
    };
  }

  async getOrgStats(orgId, { from = null, to = null } = {}) {
    let measurements = await getByIndex('measurements', 'orgId', orgId);

    if (from || to) {
      measurements = measurements.filter(m => {
        const ts = new Date(m.timestamp).getTime();
        if (from && ts < new Date(from).getTime()) return false;
        if (to && ts > new Date(to).getTime()) return false;
        return true;
      });
    }

    const users = await getUsersByOrg(orgId);
    const uniqueMeasuredUsers = new Set(measurements.map(m => m.userId));

    if (measurements.length === 0) {
      return {
        orgId,
        totalMembers: users.length,
        activeMeasured: 0,
        period: { from, to },
        stats: { avgHr: 0, avgStress: 0, measurementCount: 0 },
      };
    }

    const sum = { hr: 0, stress: 0 };
    for (const m of measurements) {
      sum.hr += m.hr || 0;
      sum.stress += m.stressScore || 0;
    }
    const n = measurements.length;

    return {
      orgId,
      totalMembers: users.length,
      activeMeasured: uniqueMeasuredUsers.size,
      period: { from, to },
      stats: {
        avgHr: Math.round(sum.hr / n),
        avgStress: Math.round(sum.stress / n),
        measurementCount: n,
      },
    };
  }

  // === CSV出力（部署別日次集計のみ、個人データなし） ===

  async exportCSV(orgId, { teamId = null, from = null, to = null } = {}) {
    let measurements;
    if (teamId) {
      // チームの全メンバーの計測データ
      const memberships = await getByIndex('teamMemberships', 'teamId', teamId);
      const memberIds = new Set(memberships.map(m => m.userId));

      if (memberIds.size < MIN_TEAM_SIZE) {
        return '日付,部署名,計測人数,平均ストレススコア,平均心拍数,平均RMSSD,平均SDNN,平均pNN50,平均LF/HF,平均LFnorm(%),平均HFnorm(%),平均呼吸数(/min)\n※ プライバシー保護のため、5名以上のデータが必要です\n';
      }

      measurements = [];
      for (const userId of memberIds) {
        const userM = await getByIndex('measurements', 'userId', userId);
        measurements.push(...userM);
      }
    } else {
      measurements = await getByIndex('measurements', 'orgId', orgId);
    }

    // 日付フィルタ
    if (from || to) {
      measurements = measurements.filter(m => {
        const ts = new Date(m.timestamp).getTime();
        if (from && ts < new Date(from).getTime()) return false;
        if (to && ts > new Date(to).getTime()) return false;
        return true;
      });
    }

    // 日次 × チーム集計
    const teams = await getByIndex('teams', 'orgId', orgId);
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
    const memberships = await getAll('teamMemberships');

    // グループ化: date+teamId
    const groups = {};
    for (const m of measurements) {
      const date = m.timestamp.split('T')[0];
      const tId = m.teamId || 'unassigned';
      const key = `${date}|${tId}`;
      if (!groups[key]) groups[key] = { date, teamId: tId, measurements: [], userIds: new Set() };
      groups[key].measurements.push(m);
      groups[key].userIds.add(m.userId);
    }

    // CSV生成
    const rows = ['日付,部署名,計測人数,平均ストレススコア,平均心拍数,平均RMSSD,平均SDNN,平均pNN50,平均LF/HF,平均LFnorm(%),平均HFnorm(%),平均呼吸数(/min)'];
    const sortedKeys = Object.keys(groups).sort();

    for (const key of sortedKeys) {
      const g = groups[key];
      if (g.userIds.size < MIN_TEAM_SIZE) continue; // 5名未満はスキップ

      const ms = g.measurements;
      const n = ms.length;
      const avgStress = Math.round(ms.reduce((s, m) => s + (m.stressScore || 0), 0) / n);
      const avgHr = Math.round(ms.reduce((s, m) => s + (m.hr || 0), 0) / n);
      const avgRmssd = Math.round(ms.reduce((s, m) => s + (m.hrv?.rmssd || 0), 0) / n * 10) / 10;
      const avgSdnn = Math.round(ms.reduce((s, m) => s + (m.hrv?.sdnn || 0), 0) / n * 10) / 10;
      const avgPnn50 = Math.round(ms.reduce((s, m) => s + (m.hrv?.pnn50 || 0), 0) / n * 10) / 10;
      const avgLfHf = Math.round(ms.reduce((s, m) => s + (m.freqMetrics?.lfHfRatio || 0), 0) / n * 100) / 100;
      const avgLfNorm = Math.round(ms.reduce((s, m) => s + (m.freqMetrics?.lfNorm || 0), 0) / n * 10) / 10;
      const avgHfNorm = Math.round(ms.reduce((s, m) => s + (m.freqMetrics?.hfNorm || 0), 0) / n * 10) / 10;
      const avgRespRate = Math.round(ms.reduce((s, m) => s + (m.respiratory?.rate || 0), 0) / n * 10) / 10;
      const teamName = teamMap[g.teamId] || '未配属';

      rows.push(`${g.date},${teamName},${g.userIds.size},${avgStress},${avgHr},${avgRmssd},${avgSdnn},${avgPnn50},${avgLfHf},${avgLfNorm},${avgHfNorm},${avgRespRate}`);
    }

    return rows.join('\n') + '\n';
  }

  // === ユーザーデータ CSV出力（個人用） ===

  async exportUserCSV({ userId, from = null, to = null }) {
    let measurements = await getByIndex('measurements', 'userId', userId);

    if (from || to) {
      measurements = measurements.filter(m => {
        const ts = new Date(m.timestamp).getTime();
        if (from && ts < new Date(from).getTime()) return false;
        if (to && ts > new Date(to).getTime()) return false;
        return true;
      });
    }

    measurements.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const rows = ['日時,心拍数,ストレススコア,RMSSD,SDNN,pNN50,LF/HF,呼吸数,品質'];
    for (const m of measurements) {
      rows.push([
        m.timestamp,
        m.hr,
        m.stressScore,
        m.hrv?.rmssd || '',
        m.hrv?.sdnn || '',
        m.hrv?.pnn50 || '',
        m.freqMetrics?.lfHfRatio || '',
        m.respiratory?.rate || '',
        m.qualityGrade,
      ].join(','));
    }

    return rows.join('\n') + '\n';
  }

  // === データ管理 ===

  async deleteUserData(userId) {
    const measurements = await getByIndex('measurements', 'userId', userId);
    for (const m of measurements) {
      await del('measurements', m.id);
    }
    const memberships = await getByIndex('teamMemberships', 'userId', userId);
    for (const ms of memberships) {
      await del('teamMemberships', ms.id);
    }
  }

  async clearAllMeasurements(orgId) {
    const measurements = await getByIndex('measurements', 'orgId', orgId);
    for (const m of measurements) {
      await del('measurements', m.id);
    }
    return { deleted: measurements.length };
  }

  // === 組織設定（アラート閾値等） ===

  async getOrgSettings(orgId) {
    const org = await get('organizations', orgId);
    return org?.config || {};
  }

  async updateOrgSettings(orgId, settings) {
    const org = await get('organizations', orgId);
    if (!org) throw new Error('組織が見つかりません');
    org.config = { ...org.config, ...settings };
    org.updatedAt = new Date().toISOString();
    await put('organizations', org);
    return org.config;
  }

  async deleteAllData() {
    await clearAll();
  }
}
