export default function ResultScreen({ result, onRestart, onBack }) {
  const { hr, confidence, hrv } = result;
  const metrics = hrv?.metrics;
  const stress = hrv?.stress;
  const quality = hrv?.quality;

  const getHRInfo = (heartRate, conf) => {
    if (conf < 0.15 || heartRate === 0) {
      return {
        level: 'inconclusive',
        color: '#9ca3af',
        label: '計測不能',
        message: '信頼性のある計測ができませんでした。照明を改善し、動かないようにして再度お試しください。',
      };
    }
    if (heartRate < 60) {
      return {
        level: 'low',
        color: '#3b82f6',
        label: '低め',
        message: '安静時心拍数がやや低めです。アスリートや体力のある方では正常な範囲です。',
      };
    }
    if (heartRate <= 100) {
      return {
        level: 'normal',
        color: '#22c55e',
        label: '正常範囲',
        message: '安静時心拍数は正常範囲内です。良好な状態です。',
      };
    }
    if (heartRate <= 120) {
      return {
        level: 'elevated',
        color: '#f59e0b',
        label: 'やや高め',
        message: '心拍数がやや高めです。少し休憩を取り、リラックスすることをお勧めします。',
      };
    }
    return {
      level: 'high',
      color: '#ef4444',
      label: '高い',
      message: '心拍数が高めです。深呼吸をして、少し休憩を取ることをお勧めします。',
    };
  };

  const hrInfo = getHRInfo(hr, confidence);
  const confidenceLabel = confidence > 0.4 ? '高' : confidence > 0.2 ? '中' : '低';

  return (
    <div className="result-screen">
      <div className="result-content">
        <h2>コンディションチェック結果</h2>

        {/* Stress level card (primary result) */}
        {stress && stress.level !== 'unknown' && (
          <div className="stress-card" style={{ borderColor: stress.color }}>
            <div className="stress-header">
              <span className="stress-label">ストレスレベル</span>
              <span className="stress-badge" style={{ backgroundColor: stress.color }}>
                {stress.label}
              </span>
            </div>
            <div className="stress-score-bar">
              <div className="stress-track">
                <div
                  className="stress-fill"
                  style={{
                    width: `${stress.score}%`,
                    backgroundColor: stress.color,
                  }}
                />
                <div
                  className="stress-marker"
                  style={{ left: `${stress.score}%` }}
                />
              </div>
              <div className="stress-labels">
                <span>リラックス</span>
                <span>高ストレス</span>
              </div>
            </div>
          </div>
        )}

        {/* Heart rate display */}
        <div className="hr-display" style={{ borderColor: hrInfo.color }}>
          <div className="hr-icon" style={{ backgroundColor: hrInfo.color }}>
            {hr > 0 ? hrInfo.label.charAt(0) : '?'}
          </div>
          {hr > 0 ? (
            <>
              <div className="hr-number">{hr}</div>
              <div className="hr-label">BPM（心拍数）</div>
            </>
          ) : (
            <div className="hr-number" style={{ fontSize: '1.5rem' }}>--</div>
          )}
        </div>

        {/* HRV Metrics */}
        {metrics && (
          <div className="hrv-metrics-card">
            <h3>HRV指標（心拍変動）</h3>
            <div className="hrv-grid">
              <div className="hrv-metric">
                <span className="hrv-value">{metrics.rmssd}</span>
                <span className="hrv-unit">ms</span>
                <span className="hrv-name">RMSSD</span>
                <span className="hrv-desc">自律神経活性</span>
              </div>
              <div className="hrv-metric">
                <span className="hrv-value">{metrics.sdnn}</span>
                <span className="hrv-unit">ms</span>
                <span className="hrv-name">SDNN</span>
                <span className="hrv-desc">全体変動</span>
              </div>
              <div className="hrv-metric">
                <span className="hrv-value">{metrics.pnn50}</span>
                <span className="hrv-unit">%</span>
                <span className="hrv-name">pNN50</span>
                <span className="hrv-desc">回復力指標</span>
              </div>
            </div>
            {quality && (
              <div className="hrv-quality">
                <span className={`quality-badge quality-grade-${quality.grade.toLowerCase()}`}>
                  {quality.grade}
                </span>
                <span>{quality.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Wellness assessment */}
        <div className="wellness-card" style={{ borderLeftColor: hrInfo.color }}>
          <h3 style={{ color: hrInfo.color }}>{hrInfo.label}</h3>
          <p>{hrInfo.message}</p>
        </div>

        {/* Measurement quality */}
        <div className="quality-info">
          <div className="quality-row">
            <span>計測信頼度</span>
            <span className={`quality-badge quality-${confidenceLabel === '高' ? 'high' : confidenceLabel === '中' ? 'moderate' : 'low'}`}>
              {confidenceLabel}
            </span>
          </div>
          <div className="quality-row">
            <span>計測時間</span>
            <span>{Math.round(result.duration / 60)}分</span>
          </div>
          <div className="quality-row">
            <span>サンプル数</span>
            <span>{result.samples}</span>
          </div>
        </div>

        {/* Tips for better reading */}
        {confidence < 0.3 && (
          <div className="tips-card">
            <h4>計測精度を上げるには</h4>
            <ul>
              <li>顔に均一な照明が当たるようにしてください</li>
              <li>直射日光や強い影を避けてください</li>
              <li>頭をできるだけ動かさないでください</li>
              <li>サングラスやマスクを外してください</li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="result-actions">
          <button className="btn-primary" onClick={onRestart}>
            もう一度チェック
          </button>
          {onBack && (
            <a className="back-link back-link-center" href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
              &larr; トップに戻る
            </a>
          )}
        </div>

        <p className="disclaimer">
          ※ 本ツールはウェルネス参考値を提供するものであり、医療機器ではありません。
          診断・治療の目的で使用しないでください。体調に不安がある場合は医療専門家にご相談ください。
        </p>
      </div>
    </div>
  );
}
