/**
 * LocalDataService — IndexedDBベースのデータサービス実装
 * DataServiceインターフェースを満たし、クラウド移行時はCloudDataServiceに差し替え可能。
 */

import { put, get, getAll, getByIndex, del, clearAll } from './idb-helpers.js';
import { register, login, logout, getSession, getUsersByOrg, changePassword, setSecurityQuestion, resetPasswordWithSecurityAnswer, getSecurityQuestion } from './auth-local.js';

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

  async setSecurityQuestion({ userId, question, answer }) {
    return setSecurityQuestion({ userId, question, answer });
  }

  async resetPasswordWithSecurityAnswer({ email, answer, newPassword }) {
    return resetPasswordWithSecurityAnswer({ email, answer, newPassword });
  }

  async getSecurityQuestion(email) {
    return getSecurityQuestion(email);
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

  async updateMeasurementMemo(measurementId, memo) {
    const m = await get('measurements', measurementId);
    if (!m) throw new Error('計測データが見つかりません');
    m.memo = memo || '';
    m.memoUpdatedAt = new Date().toISOString();
    await put('measurements', m);
    return m;
  }

  async deactivateUser(userId, orgId) {
    const user = await get('users', userId);
    if (!user) throw new Error('ユーザーが見つかりません');
    if (user.orgId !== orgId) throw new Error('権限がありません');
    // チームメンバーシップを削除
    const memberships = await getByIndex('teamMemberships', 'userId', userId);
    for (const ms of memberships) {
      await del('teamMemberships', ms.id);
    }
    // 計測データを削除
    const measurements = await getByIndex('measurements', 'userId', userId);
    for (const m of measurements) {
      await del('measurements', m.id);
    }
    // ユーザーレコード自体を削除
    await del('users', userId);
    return { deleted: true, measurementsDeleted: measurements.length };
  }

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

  // === メンバー別CSV出力（最終計測日付き） ===

  async exportMemberCSV(orgId, { teamId = null } = {}) {
    const users = await getUsersByOrg(orgId);
    const lastDates = await this.getLastMeasurementDates(orgId);
    const memberships = await getAll('teamMemberships');
    const teams = await getByIndex('teams', 'orgId', orgId);
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));

    const rows = ['表示名,ロール,部署,参加日,最終計測日'];
    for (const u of users) {
      const userMemberships = memberships.filter(m => m.userId === u.id);
      const userTeamId = userMemberships.length > 0 ? userMemberships[0].teamId : null;
      const teamName = userTeamId && teamMap[userTeamId] ? teamMap[userTeamId] : '未配属';

      // 部署フィルター: 指定時はその部署のメンバーのみ
      if (teamId && userTeamId !== teamId) continue;

      const role = u.role === 'admin' ? '管理者' : 'メンバー';
      const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ja-JP') : '';
      const lastDate = lastDates[u.id]
        ? new Date(lastDates[u.id]).toLocaleDateString('ja-JP') : '未計測';
      rows.push(`${u.name || ''},${role},${teamName},${joinDate},${lastDate}`);
    }
    return rows.join('\n') + '\n';
  }

  // === 計測サマリー生成（メール下書き用） ===

  async generateMeasurementSummary(orgId, { period = 'weekly' } = {}) {
    const now = new Date();
    const days = period === 'monthly' ? 30 : 7;
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const periodLabel = period === 'monthly' ? '月次' : '週次';
    const fromLabel = `${periodStart.getFullYear()}/${periodStart.getMonth() + 1}/${periodStart.getDate()}`;
    const toLabel = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

    const measurements = await this.getMeasurements({
      orgId,
      from: periodStart.toISOString(),
      to: now.toISOString(),
    });
    const users = await getUsersByOrg(orgId);
    const teams = await getByIndex('teams', 'orgId', orgId);

    const uniqueUsers = new Set(measurements.map(m => m.userId));
    const totalCount = measurements.length;
    const avgStress = totalCount > 0
      ? Math.round(measurements.reduce((s, m) => s + (m.stressScore || 0), 0) / totalCount)
      : null;
    const avgHr = totalCount > 0
      ? Math.round(measurements.reduce((s, m) => s + (m.hr || 0), 0) / totalCount)
      : null;
    const participationRate = users.length > 0
      ? Math.round((uniqueUsers.size / users.length) * 100)
      : 0;

    // 部署別集計
    const teamStats = {};
    for (const m of measurements) {
      const tid = m.teamId || 'unassigned';
      if (!teamStats[tid]) teamStats[tid] = { count: 0, stress: 0, users: new Set() };
      teamStats[tid].count++;
      teamStats[tid].stress += m.stressScore || 0;
      teamStats[tid].users.add(m.userId);
    }
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));

    let lines = [];
    lines.push(`【${periodLabel}計測サマリー】`);
    lines.push(`期間: ${fromLabel} 〜 ${toLabel}`);
    lines.push('');
    lines.push('■ 全体サマリー');
    lines.push(`  計測回数: ${totalCount}件`);
    lines.push(`  参加者数: ${uniqueUsers.size}名 / ${users.length}名（${participationRate}%）`);
    if (avgStress != null) lines.push(`  平均ストレス: ${avgStress}`);
    if (avgHr != null) lines.push(`  平均心拍数: ${avgHr} bpm`);
    lines.push('');

    const teamEntries = Object.entries(teamStats).filter(([, v]) => v.users.size >= MIN_TEAM_SIZE);
    if (teamEntries.length > 0) {
      lines.push('■ 部署別');
      for (const [tid, stats] of teamEntries) {
        const name = teamMap[tid] || '未配属';
        const avg = Math.round(stats.stress / stats.count);
        lines.push(`  ${name}: 計測${stats.count}件 / ${stats.users.size}名参加 / 平均ストレス${avg}`);
      }
      lines.push('');
    }

    lines.push('※ 本データはウェルネス参考値です。医療診断結果ではありません。');
    lines.push('※ 5名未満の部署は表示されません。');
    lines.push('');
    lines.push('— ミルケア（MiruCare）');

    return lines.join('\n');
  }

  async getLastMeasurementDates(orgId) {
    const measurements = await getByIndex('measurements', 'orgId', orgId);
    const lastDates = {};
    for (const m of measurements) {
      const existing = lastDates[m.userId];
      if (!existing || new Date(m.timestamp) > new Date(existing)) {
        lastDates[m.userId] = m.timestamp;
      }
    }
    return lastDates;
  }

  // === エクスポート履歴（監査証跡） ===

  logExport({ userId, userName, orgId, type, details = '' }) {
    const key = 'mirucare_export_log';
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    logs.unshift({
      id: generateId(),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      orgId,
      type,
      details,
    });
    // 最大200件保持
    if (logs.length > 200) logs.length = 200;
    localStorage.setItem(key, JSON.stringify(logs));
  }

  getExportLogs(orgId) {
    const key = 'mirucare_export_log';
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    return orgId ? logs.filter(l => l.orgId === orgId) : logs;
  }

  // === データバックアップ（IndexedDB全データJSON） ===

  async exportBackup(orgId) {
    const org = await this.getOrg(orgId);
    const users = await getUsersByOrg(orgId);
    const measurements = await getByIndex('measurements', 'orgId', orgId);
    const teams = await getByIndex('teams', 'orgId', orgId);
    const allMemberships = await getAll('teamMemberships');
    // orgに所属するチームのメンバーシップのみ
    const teamIds = new Set(teams.map(t => t.id));
    const memberships = allMemberships.filter(m => teamIds.has(m.teamId));

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      orgId,
      org,
      users,
      teams,
      teamMemberships: memberships,
      measurements,
    };
  }

  async importBackup(data) {
    if (!data || data.version !== 1) throw new Error('無効なバックアップファイルです');

    let imported = { orgs: 0, users: 0, teams: 0, memberships: 0, measurements: 0 };

    if (data.org) {
      await put('organizations', data.org);
      imported.orgs = 1;
    }

    // ユーザーは認証情報がないため読み取り専用（パスワードなし）
    // バックアップにはsafeUserのみ含まれるので、既存ユーザーはスキップ
    for (const u of (data.users || [])) {
      const existing = await get('users', u.id);
      if (!existing) {
        // パスワードなしで保存（再登録が必要）
        await put('users', { ...u, passwordHash: '', salt: '', role: u.role || 'member' });
        imported.users++;
      }
    }

    for (const t of (data.teams || [])) {
      await put('teams', t);
      imported.teams++;
    }

    for (const m of (data.teamMemberships || [])) {
      await put('teamMemberships', m);
      imported.memberships++;
    }

    for (const m of (data.measurements || [])) {
      await put('measurements', m);
      imported.measurements++;
    }

    return imported;
  }

  async deleteAllData() {
    await clearAll();
  }
}
