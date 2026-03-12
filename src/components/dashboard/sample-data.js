/**
 * サンプルデータ生成 — デモ用
 * 3部署、45名、4週間分のリアルなデータを生成してIndexedDBに投入
 */
import { dataService } from '../../services/index.js';

const DEPT_CONFIGS = [
  { name: '営業部', memberCount: 15, stressTrend: [55, 48, 42, 38], hrBase: 74 },
  { name: '開発部', memberCount: 20, stressTrend: [52, 54, 56, 55], hrBase: 70 },
  { name: '総務部', memberCount: 10, stressTrend: [30, 31, 30, 32], hrBase: 68 },
];

const NAMES = [
  '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤',
  '吉田', '山田', '佐々木', '松本', '井上', '木村', '林', '斎藤', '清水', '山口',
  '森', '池田', '橋本', '阿部', '石川', '山崎', '中島', '前田', '小川', '藤田',
  '岡田', '後藤', '長谷川', '石井', '村上', '近藤', '坂本', '遠藤', '青木', '藤井',
  '西村', '福田', '太田', '三浦', '岡本',
];

function randomVariance(base, range) {
  return base + (Math.random() - 0.5) * 2 * range;
}

function getWeekStart(weeksAgo) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 - weeksAgo * 7); // Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * サンプルデータをIndexedDBに投入
 * @returns {{ orgId: string, teamIds: string[], memberCount: number, measurementCount: number }}
 */
export async function loadSampleData() {
  // 既存データをクリア
  await dataService.deleteAllData();

  // 組織作成
  const org = await dataService.createOrg({
    name: 'サンプル株式会社',
    plan: 'professional',
    slug: 'sample-corp',
  });

  const result = { orgId: org.id, teamIds: [], memberCount: 0, measurementCount: 0 };
  let nameIndex = 0;

  for (const deptConfig of DEPT_CONFIGS) {
    // 部署(チーム)作成
    const team = await dataService.createTeam({
      name: deptConfig.name,
      orgId: org.id,
    });
    result.teamIds.push(team.id);

    // メンバー作成
    const members = [];
    for (let i = 0; i < deptConfig.memberCount; i++) {
      const memberName = NAMES[nameIndex % NAMES.length];
      nameIndex++;
      const email = `${memberName.toLowerCase()}${nameIndex}@sample-corp.co.jp`;

      const user = await dataService.createUser({
        email,
        password: 'sample1234',
        name: memberName,
        orgId: org.id,
        role: i === 0 && deptConfig === DEPT_CONFIGS[0] ? 'admin' : 'member',
      });

      await dataService.addTeamMember({ userId: user.id, teamId: team.id });
      members.push(user);
      result.memberCount++;
    }

    // 4週間分の計測データ生成
    for (let week = 3; week >= 0; week--) {
      const weekStart = getWeekStart(week);
      const weekStress = deptConfig.stressTrend[3 - week];

      // 週5日（月〜金）
      for (let day = 0; day < 5; day++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + day);

        // 総務部は一部の日で5名未満にする（データ不足デモ用）
        const participationRate = deptConfig.name === '総務部' && day >= 3
          ? 0.3  // 木金は参加率低い
          : 0.7 + Math.random() * 0.25;

        const participatingMembers = members.filter(
          () => Math.random() < participationRate
        );

        for (const member of participatingMembers) {
          const stressScore = Math.round(
            Math.max(0, Math.min(100, randomVariance(weekStress, 12)))
          );
          const conditionScore = Math.round(100 - stressScore + randomVariance(0, 8));
          const hr = Math.round(randomVariance(deptConfig.hrBase, 8));
          const rmssd = Math.round(randomVariance(35, 10));
          const sdnn = Math.round(randomVariance(40, 10));

          // 計測時刻をランダムに（9時〜17時）
          const measureTime = new Date(date);
          measureTime.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));

          await dataService.saveMeasurement({
            userId: member.id,
            orgId: org.id,
            hr: Math.max(55, Math.min(100, hr)),
            confidence: 0.75 + Math.random() * 0.2,
            hrv: {
              rmssd: Math.max(10, rmssd),
              sdnn: Math.max(15, sdnn),
              pnn50: Math.round(randomVariance(18, 8)),
              lf_hf_ratio: Math.round(randomVariance(1.5, 0.8) * 10) / 10,
            },
            freqMetrics: null,
            respiratory: { rate: Math.round(randomVariance(16, 3)), confidence: 0.7 },
            stressScore,
            qualityGrade: stressScore < 35 ? 'A' : stressScore < 55 ? 'B' : 'C',
            emotionSummary: null,
          });
          result.measurementCount++;
        }
      }
    }
  }

  // サンプルデータフラグをlocalStorageに保存
  localStorage.setItem('mirucare_sample_data', JSON.stringify({
    orgId: org.id,
    loadedAt: new Date().toISOString(),
  }));

  return result;
}

/**
 * サンプルデータかどうかを判定
 */
export function isSampleDataLoaded() {
  return localStorage.getItem('mirucare_sample_data') !== null;
}

/**
 * サンプルデータをクリア
 */
export async function clearSampleData() {
  await dataService.deleteAllData();
  localStorage.removeItem('mirucare_sample_data');
  localStorage.removeItem('mirucare_session');
}
