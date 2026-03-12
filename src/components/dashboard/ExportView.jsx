import { useState, useEffect } from 'react';
import { dataService } from '../../services/index.js';

export default function ExportView({ session, teams }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [teamId, setTeamId] = useState('');
  const [filePrefix, setFilePrefix] = useState('mirucare-report');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const opts = {
        from: startDate,
        to: endDate + 'T23:59:59.999Z',
      };
      if (teamId) opts.teamId = teamId;
      const csv = await dataService.exportCSV(session.orgId, opts);
      setPreview(csv);
    } catch {
      setPreview('エラーが発生しました');
    }
    setLoading(false);
  };

  useEffect(() => {
    generatePreview();
  }, [startDate, endDate, teamId]);

  const handleDownload = () => {
    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([bom + preview], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = filePrefix.trim() || 'mirucare-report';
    a.download = `${prefix}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">CSVデータ出力</h2>
      <p className="adm-view-desc">部署別ストレスデータをCSV形式でエクスポートします。稟議書や社内報告書への添付にご利用ください。</p>

      <h3 className="adm-section-title">期間選択</h3>
      <div className="adm-date-range">
        <label>
          開始日:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          終了日:
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      <div className="adm-quick-range">
        <button className="adm-btn-ghost" onClick={() => setQuickRange(7)}>直近1週間</button>
        <button className="adm-btn-ghost" onClick={() => setQuickRange(30)}>直近1ヶ月</button>
        <button className="adm-btn-ghost" onClick={() => setQuickRange(365)}>全期間</button>
      </div>

      <h3 className="adm-section-title">部署フィルター</h3>
      <div className="adm-export-field">
        <select
          className="adm-export-select"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">全部署</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="adm-export-privacy">
        <p>個人の計測データは含まれません</p>
        <p>1日の計測者が5名未満の部署データは除外されます</p>
      </div>

      <button className="adm-btn-primary" onClick={handleDownload} disabled={!preview || loading}>
        CSVをダウンロード
      </button>

      <div className="adm-export-field" style={{ marginTop: 12 }}>
        <label className="adm-export-label">ファイル名</label>
        <div className="adm-export-filename">
          <input
            type="text"
            className="adm-export-input"
            value={filePrefix}
            onChange={(e) => setFilePrefix(e.target.value)}
            placeholder="mirucare-report"
          />
          <span className="adm-export-suffix">-{new Date().toISOString().split('T')[0]}.csv</span>
        </div>
      </div>

      {preview && (
        <>
          <h3 className="adm-section-title" style={{ marginTop: 24 }}>プレビュー</h3>
          <pre className="adm-csv-preview">{preview.split('\n').slice(0, 11).join('\n')}</pre>
        </>
      )}
    </div>
  );
}
