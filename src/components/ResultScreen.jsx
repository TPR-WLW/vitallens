import { useState, useEffect } from 'react';
import { computeConditionScores } from '../lib/emotion-fusion.js';
import { saveEntry } from '../lib/history.js';
import { printReport } from '../lib/report-pdf.js';
import { dataService } from '../services/index.js';
import { getSession } from '../services/auth-local.js';

export default function ResultScreen({ result, onRestart, onBack, onShowHistory, onContact }) {
  const { hr, confidence, hrv, emotion, algorithm } = result;
  const metrics = hrv?.metrics;
  const freqMetrics = hrv?.freqMetrics;
  const stress = hrv?.stress;
  const quality = hrv?.quality;

  const [detailOpen, setDetailOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // 自動保存：実計測結果は自動的に履歴に保存（デモ・サンプルは手動）
  useEffect(() => {
    if (!result.isSample && !result.isDemo) {
      saveEntry(result);
      setSaved(true);

      // DataService保存（ログイン中のみ、fire-and-forget）
      try {
        const session = getSession();
        if (session && session.userId && session.orgId) {
          dataService.saveMeasurement({
            userId: session.userId,
            orgId: session.orgId,
            hr: result.hr,
            confidence: result.confidence,
            hrv: result.hrv?.metrics || null,
            freqMetrics: result.hrv?.freqMetrics || null,
            respiratory: result.hrv?.freqMetrics?.respiratory || null,
            stressScore: result.hrv?.stress?.score || 0,
            qualityGrade: result.hrv?.quality?.grade || 'C',
            algorithm: result.algorithm || null,
            emotionSummary: result.emotion?.summary || null,
          }).catch(() => {});
        }
      } catch (_e) {
        // DataService保存エラーは無視
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSave = () => {
    saveEntry(result);
    setSaved(true);
  };

  // Compute condition scores (fuses HRV + emotion)
  const emotionSummary = emotion?.summary || null;
  const condition = computeConditionScores(
    hrv ? { metrics, stress, freqMetrics } : null,
    emotionSummary
  );

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

  // Condition dimension display label for tension
  const getTensionDisplay = (score) => {
    if (score < 0) return '計測不能';
    if (score >= 70) return '低い';
    if (score >= 45) return 'やや高め';
    return '高い';
  };

  const getVitalityDisplay = (score) => {
    if (score < 0) return '計測不能';
    if (score >= 70) return '十分';
    if (score >= 45) return '普通';
    return 'やや不足';
  };

  const getBalanceDisplay = (score) => {
    if (score < 0) return '計測不能';
    if (score >= 70) return '良好';
    if (score >= 45) return '普通';
    return 'やや乱れ';
  };

  const showCondition = condition.overall.score >= 0;

  return (
    <div className="result-screen" role="main" aria-label="計測結果画面">
      <div className="result-content">
        <h2>コンディションチェック結果</h2>

        {result.isDemo && (
          <div className="demo-banner">
            <span className="demo-result-badge">デモ</span>
            これはデモ用の合成データです。実際にカメラで計測すると、あなた自身の結果が表示されます。
          </div>
        )}

        {result.isSample && (
          <div className="sample-banner">
            <span className="sample-badge">サンプル</span>
            これはサンプルデータです。実際に計測すると、あなた自身の結果が表示されます。
          </div>
        )}

        {/* Overall Condition Card (NEW) */}
        {showCondition && (
          <div className="condition-overall-card" style={{ borderColor: condition.overall.color }}>
            <div className="condition-overall-header">総合コンディション</div>
            <div className="condition-overall-score" style={{ color: condition.overall.color }}>
              {condition.overall.label}
            </div>
            {condition.overall.message && (
              <p className="condition-overall-message">{condition.overall.message}</p>
            )}
            <p className="condition-disclaimer-inline">
              ※ 本結果はウェルネス参考値です
            </p>
          </div>
        )}

        {/* Three Dimension Mini Cards (NEW) */}
        {showCondition && (
          <div className="condition-dimensions">
            <div className="condition-dim-card">
              <span className="condition-dim-label">こころの緊張度</span>
              <span className="condition-dim-value" style={{ color: condition.tension.color }}>
                {getTensionDisplay(condition.tension.score)}
              </span>
              <div className="condition-bar-track">
                <div
                  className="condition-bar-fill"
                  style={{
                    width: `${Math.max(0, condition.tension.score)}%`,
                    backgroundColor: condition.tension.color,
                  }}
                />
              </div>
            </div>
            <div className="condition-dim-card">
              <span className="condition-dim-label">回復・活力</span>
              <span className="condition-dim-value" style={{ color: condition.vitality.color }}>
                {getVitalityDisplay(condition.vitality.score)}
              </span>
              <div className="condition-bar-track">
                <div
                  className="condition-bar-fill"
                  style={{
                    width: `${Math.max(0, condition.vitality.score)}%`,
                    backgroundColor: condition.vitality.color,
                  }}
                />
              </div>
            </div>
            <div className="condition-dim-card">
              <span className="condition-dim-label">バランス度</span>
              <span className="condition-dim-value" style={{ color: condition.balance.color }}>
                {getBalanceDisplay(condition.balance.score)}
              </span>
              <div className="condition-bar-track">
                <div
                  className="condition-bar-fill"
                  style={{
                    width: `${Math.max(0, condition.balance.score)}%`,
                    backgroundColor: condition.balance.color,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stress level card (existing, primary result) */}
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

        {/* Progressive Disclosure Toggle */}
        <button
          className="detail-toggle"
          onClick={() => setDetailOpen(!detailOpen)}
          aria-expanded={detailOpen}
          aria-controls="detail-section"
        >
          {detailOpen ? '▲ 詳細データを閉じる' : '▼ 詳細データを見る'}
        </button>

        {/* Detail Section (expandable) */}
        {detailOpen && (
          <div className="detail-section" id="detail-section">
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
                    <span className="hrv-ref">基準値: 20〜60ms</span>
                  </div>
                  <div className="hrv-metric">
                    <span className="hrv-value">{metrics.sdnn}</span>
                    <span className="hrv-unit">ms</span>
                    <span className="hrv-name">SDNN</span>
                    <span className="hrv-desc">全体変動</span>
                    <span className="hrv-ref">基準値: 20〜55ms</span>
                  </div>
                  <div className="hrv-metric">
                    <span className="hrv-value">{metrics.pnn50}</span>
                    <span className="hrv-unit">%</span>
                    <span className="hrv-name">pNN50</span>
                    <span className="hrv-desc">回復力指標</span>
                    <span className="hrv-ref">基準値: 3〜40%</span>
                  </div>
                  {freqMetrics && (
                    <>
                      <div className="hrv-metric">
                        <span className="hrv-value">{freqMetrics.lfHfRatio}</span>
                        <span className="hrv-unit">ratio</span>
                        <span className="hrv-name">LF/HF</span>
                        <span className="hrv-desc">自律神経バランス</span>
                        <span className="hrv-ref">基準値: 0.5〜2.0</span>
                      </div>
                      <div className="hrv-metric">
                        <span className="hrv-value">{freqMetrics.lfNorm}</span>
                        <span className="hrv-unit">%</span>
                        <span className="hrv-name">LF</span>
                        <span className="hrv-desc">交感神経活動</span>
                        <span className="hrv-ref">低周波成分</span>
                      </div>
                      <div className="hrv-metric">
                        <span className="hrv-value">{freqMetrics.hfNorm}</span>
                        <span className="hrv-unit">%</span>
                        <span className="hrv-name">HF</span>
                        <span className="hrv-desc">副交感神経活動</span>
                        <span className="hrv-ref">高周波成分</span>
                      </div>
                      {freqMetrics.respiratory && freqMetrics.respiratory.confidence >= 0.2 && (
                        <div className="hrv-metric">
                          <span className="hrv-value">{freqMetrics.respiratory.respiratoryRate}</span>
                          <span className="hrv-unit">回/分</span>
                          <span className="hrv-name">推定呼吸数</span>
                          <span className="hrv-desc">呼吸性洞性不整脈より推定</span>
                          <span className="hrv-ref">
                            基準値: 12〜20回/分
                            {freqMetrics.respiratory.confidence >= 0.6
                              ? '（信頼度：高）'
                              : freqMetrics.respiratory.confidence >= 0.4
                                ? '（信頼度：中）'
                                : '（信頼度：低）'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
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

            {/* Facial Analysis Detail (NEW) */}
            {condition.hasEmotion && (
              <div className="facial-analysis-card">
                <h3>
                  表情分析
                  <span className="reference-badge">参考値</span>
                </h3>
                <p className="facial-analysis-desc">
                  表情から推定された状態の傾向です。環境や体調により変動します。
                </p>
                <div className="facial-bar-row">
                  <span className="facial-bar-label">リラックス傾向</span>
                  <div className="facial-bar-track">
                    <div
                      className="facial-bar-fill"
                      style={{ width: `${condition.tension.score}%` }}
                    />
                  </div>
                </div>
                <div className="facial-bar-row">
                  <span className="facial-bar-label">活動的な表情</span>
                  <div className="facial-bar-track">
                    <div
                      className="facial-bar-fill"
                      style={{ width: `${condition.vitality.score}%` }}
                    />
                  </div>
                </div>
                <div className="facial-bar-row">
                  <span className="facial-bar-label">表情の安定度</span>
                  <div className="facial-bar-track">
                    <div
                      className="facial-bar-fill"
                      style={{ width: `${condition.balance.score}%` }}
                    />
                  </div>
                </div>
                <p className="facial-disclaimer">
                  ※ 表情分析はAIによる推定値であり、あなたの感情を断定するものではありません。
                </p>
              </div>
            )}

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
              {algorithm && (
                <div className="quality-row">
                  <span>解析アルゴリズム</span>
                  <span>{algorithm}</span>
                </div>
              )}
              {condition.hasEmotion && emotion?.history && (
                <div className="quality-row">
                  <span>表情フレーム数</span>
                  <span>{emotion.history.length}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wellness assessment */}
        <div className="wellness-card" style={{ borderLeftColor: hrInfo.color }}>
          <h3 style={{ color: hrInfo.color }}>{hrInfo.label}</h3>
          <p>{hrInfo.message}</p>
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

        {/* Low SQI warning (above low-confidence threshold but still marginal) */}
        {!result.isSample && !result.isDemo && confidence >= 0.3 && confidence < 0.5 && (
          <div className="tips-card tips-card-moderate">
            <h4>信号品質について</h4>
            <p>今回の計測は信号品質がやや低めでした。より正確な結果を得るには、明るい環境で再度お試しください。</p>
          </div>
        )}

        {/* Enterprise CTA */}
        <div className={`result-cta-card${result.isDemo ? ' result-cta-demo' : ''}`}>
          {result.isDemo && (
            <p className="result-cta-demo-lead">
              実際のカメラ計測では、あなた自身のバイタルデータが表示されます。
            </p>
          )}
          <p className="result-cta-pitch">
            いま体験された測定は、貴社の全従業員に展開できます。<br />
            カメラだけで、ストレスチェック制度への対応と健康経営の推進を同時に実現します。
          </p>
          <a
            className="btn-primary btn-cta-enterprise"
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              if (onContact) {
                onContact();
              } else if (onBack) {
                onBack();
                setTimeout(() => {
                  const el = document.getElementById('contact');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              } else {
                window.location.hash = '#contact';
              }
            }}
          >
            法人導入について相談する
          </a>
          <p className="result-cta-note">
            無料パイロット（50名・3ヶ月）のご案内も可能です
          </p>
          {result.isDemo && onRestart && (
            <button className="btn-primary btn-try-real" onClick={onRestart}>
              実際にカメラで計測してみる
            </button>
          )}
        </div>

        {/* PDF Export */}
        <button
          className="btn-export-pdf"
          onClick={() => printReport(result)}
        >
          結果レポートをPDFで保存
        </button>

        {/* Save + History actions */}
        {(result.isDemo || result.isSample) && !saved && (
          <button className="btn-save-history" onClick={handleManualSave}>
            この結果を履歴に保存
          </button>
        )}
        {saved && (
          <div className="save-confirmation">
            履歴に保存しました
          </div>
        )}

        {/* Actions */}
        <div className="result-actions">
          <button className="btn-primary" onClick={onRestart}>
            {result.isSample ? '実際に計測してみる' : 'もう一度チェック'}
          </button>
          {onShowHistory && (
            <button className="btn-history-link" onClick={onShowHistory}>
              計測履歴を見る
            </button>
          )}
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
