import { useState } from 'react';
import { dataService } from '../../services/index.js';
import '../../styles/admin-dashboard.css';

/**
 * 組織セットアップ画面
 * 管理者登録後に表示: 組織名 → 部署追加 → 完了
 */
export default function OrgSetupScreen({ session, onComplete }) {
  const [step, setStep] = useState('org'); // 'org' | 'departments'
  const [orgName, setOrgName] = useState('');
  const [orgSize, setOrgSize] = useState('50-300');
  const [departments, setDepartments] = useState([
    { name: '営業部', size: '' },
    { name: '開発部', size: '' },
    { name: '総務部', size: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError('組織名を入力してください');
      return;
    }
    setStep('departments');
    setError('');
  };

  const addDepartment = () => {
    setDepartments([...departments, { name: '', size: '' }]);
  };

  const removeDepartment = (index) => {
    setDepartments(departments.filter((_, i) => i !== index));
  };

  const updateDepartment = (index, field, value) => {
    const updated = [...departments];
    updated[index] = { ...updated[index], [field]: value };
    setDepartments(updated);
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    try {
      // 組織情報を更新
      const org = await dataService.getOrg(session.orgId);
      if (org) {
        org.name = orgName.trim();
        org.size = orgSize;
        org.updatedAt = new Date().toISOString();
        // putで上書き
        const { put } = await import('../../services/idb-helpers.js');
        await put('organizations', org);
      }

      // 部署を作成
      const validDepts = departments.filter(d => d.name.trim());
      for (const dept of validDepts) {
        await dataService.createTeam({
          name: dept.name.trim(),
          orgId: session.orgId,
        });
      }

      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="adm-login-page">
      <div className="adm-login-card" style={{ maxWidth: 520 }}>
        <div className="adm-login-header">
          <h1>組織セットアップ</h1>
          <p>{step === 'org' ? 'ステップ 1/2: 組織情報' : 'ステップ 2/2: 部署設定'}</p>
        </div>

        {error && <div className="adm-login-error">{error}</div>}

        {step === 'org' ? (
          <form onSubmit={handleOrgSubmit} className="adm-login-form">
            <label className="adm-field">
              <span>組織名</span>
              <input
                type="text"
                placeholder="例: 株式会社サンプル製造"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </label>

            <div className="adm-field">
              <span>従業員規模</span>
              <div className="adm-size-options">
                {['50名未満', '50-300名', '300-1000名', '1000名以上'].map((label, i) => {
                  const values = ['under50', '50-300', '300-1000', 'over1000'];
                  return (
                    <label key={values[i]} className={`adm-size-option ${orgSize === values[i] ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="orgSize"
                        value={values[i]}
                        checked={orgSize === values[i]}
                        onChange={() => setOrgSize(values[i])}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button type="submit" className="adm-btn-primary">
              次へ: 部署を設定する
            </button>
          </form>
        ) : (
          <div className="adm-login-form">
            <p className="adm-setup-note">
              部署を追加してください（後から変更できます）
            </p>

            <div className="adm-dept-list">
              {departments.map((dept, i) => (
                <div key={i} className="adm-dept-row">
                  <input
                    type="text"
                    placeholder="部署名"
                    value={dept.name}
                    onChange={(e) => updateDepartment(i, 'name', e.target.value)}
                    className="adm-dept-name"
                  />
                  <input
                    type="number"
                    placeholder="人数"
                    value={dept.size}
                    onChange={(e) => updateDepartment(i, 'size', e.target.value)}
                    className="adm-dept-size"
                    min="0"
                  />
                  <button
                    className="adm-dept-remove"
                    onClick={() => removeDepartment(i)}
                    type="button"
                    aria-label="削除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button className="adm-btn-ghost" onClick={addDepartment} type="button">
              + 部署を追加
            </button>

            <div className="adm-setup-actions">
              <button
                className="adm-btn-primary"
                onClick={handleComplete}
                disabled={loading}
              >
                {loading ? '設定中...' : '管理画面へ'}
              </button>
              <button className="adm-link-btn" onClick={handleSkip}>
                スキップして管理画面へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
