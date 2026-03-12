import { useState, useEffect } from 'react';
import { dataService } from '../../services/index.js';

export default function MembersView({ session, teams, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [newDeptName, setNewDeptName] = useState('');

  useEffect(() => {
    loadMembers();
  }, [session.orgId]);

  async function loadMembers() {
    const users = await dataService.getUsersByOrg(session.orgId);
    // 各ユーザーのチーム情報を取得
    const enriched = [];
    for (const u of users) {
      const memberships = await dataService.getTeamMembers
        ? null : null; // チーム情報はteamMembershipsから
      enriched.push(u);
    }
    setMembers(users);
  }

  const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${session.orgId}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink).catch(() => {});
  };

  const handleAddDept = async () => {
    if (!newDeptName.trim()) return;
    await dataService.createTeam({ name: newDeptName.trim(), orgId: session.orgId });
    setNewDeptName('');
    onRefresh();
  };

  const filteredMembers = filter === 'all'
    ? members
    : members; // フィルタリングは将来拡張

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">メンバー管理</h2>

      {/* 招待リンク */}
      <div className="adm-invite-section">
        <h3 className="adm-section-title">招待リンク</h3>
        <div className="adm-invite-row">
          <input type="text" readOnly value={inviteLink} className="adm-invite-input" />
          <button className="adm-btn-secondary" onClick={copyInviteLink}>リンクをコピー</button>
        </div>
        <p className="adm-privacy-note">※ このリンクを共有してメンバーを招待してください</p>
      </div>

      {/* メンバー一覧 */}
      <h3 className="adm-section-title">メンバー一覧（{members.length}名）</h3>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>表示名</th>
              <th>ロール</th>
              <th>参加日</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(m => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.role === 'admin' ? '管理者' : 'メンバー'}</td>
                <td>{new Date(m.createdAt).toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 部署管理 */}
      <h3 className="adm-section-title">部署管理</h3>
      <div className="adm-dept-manage">
        {teams.map(t => (
          <div key={t.id} className="adm-dept-manage-row">
            <span>{t.name}</span>
          </div>
        ))}
        <div className="adm-dept-add-row">
          <input
            type="text"
            placeholder="新しい部署名"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
          />
          <button className="adm-btn-secondary" onClick={handleAddDept}>追加</button>
        </div>
      </div>

      <p className="adm-privacy-note">
        ※ メンバーの計測データは匿名集計のみ閲覧可能です。個人の計測結果を管理者が閲覧することはできません。
      </p>
    </div>
  );
}
