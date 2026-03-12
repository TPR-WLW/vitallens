import '../styles/landing.css';

export default function LandingPage({ onTryDemo }) {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="nav-inner">
          <div className="nav-logo">
            <svg viewBox="0 0 48 48" width="32" height="32" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#4f8cff" strokeWidth="3" />
              <path d="M24 14c-4 0-8 3.5-8 9s4 11 8 15c4-4 8-9 8-15s-4-9-8-9z" fill="#4f8cff" opacity="0.85" />
            </svg>
            <span>ミルケア</span>
          </div>
          <div className="nav-links">
            <a href="#problems">課題</a>
            <a href="#solution">ソリューション</a>
            <a href="#pricing">料金</a>
            <button className="btn-nav" onClick={onTryDemo}>無料デモ</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <h1>2028年、すべての事業場に<br />ストレスチェックが義務化されます。</h1>
          <p className="hero-sub-accent">貴社の準備は、整っていますか。</p>
          <p className="hero-sub">
            ミルケアは、カメラ映像からHRV（心拍変動）を解析し、
            従業員のストレス状態を非接触で可視化するソリューションです。
            ウェアラブル不要。プライバシー最優先設計。
          </p>
          <div className="hero-actions">
            <button className="btn-hero" onClick={onTryDemo}>無料デモを体験する</button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">95.9%</span>
              <span className="stat-label">対象となる事業場の割合</span>
            </div>
            <div className="stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">500円</span>
              <span className="stat-label">月額/人（税別）</span>
            </div>
            <div className="stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">3分</span>
              <span className="stat-label">1回の測定時間</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="section section-dark" id="problems">
        <div className="section-inner">
          <h2>企業が直面する<em>3つの課題</em></h2>
          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon">1</div>
              <h3>ストレスチェック制度の対象拡大</h3>
              <p>
                2028年の法改正により、従業員50人未満の事業場にもストレスチェックが義務化されます。
                全国の事業場の95.9%が新たに対象となり、体制整備が急務です。
              </p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">2</div>
              <h3>精神疾患の労災認定リスクの増大</h3>
              <p>
                精神障害の労災請求件数は年々増加し、過去最多を更新し続けています。
                企業には安全配慮義務の履行と、客観的なストレス管理体制の構築が求められます。
              </p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">3</div>
              <h3>質問票の限界 ー 本音が見えない</h3>
              <p>
                従来の自己記入式ストレスチェックでは、従業員が本音を回答しないケースが多発。
                主観的な回答に依存する手法では、真のストレス状態を把握できません。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="section" id="solution">
        <div className="section-inner">
          <h2>カメラひとつで、ストレスを<em>「見える化」</em>する</h2>
          <p className="section-sub">
            ミルケアは、リモート光電容積脈波法（rPPG）技術を活用し、
            PCやスマートフォンのカメラから心拍変動（HRV）を非接触で測定します。
            ウェアラブルデバイスや専用機器は一切不要です。
          </p>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-name">SDNN</div>
              <div className="metric-desc">自律神経全体の活動量を示す指標</div>
            </div>
            <div className="metric-card">
              <div className="metric-name">RMSSD</div>
              <div className="metric-desc">副交感神経の活動を反映する指標</div>
            </div>
            <div className="metric-card">
              <div className="metric-name">pNN50</div>
              <div className="metric-desc">心拍間隔の変動性を示す指標</div>
            </div>
            <div className="metric-card">
              <div className="metric-name">ストレススコア</div>
              <div className="metric-desc">総合的なストレス状態の数値化</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section section-dark" id="how-it-works">
        <div className="section-inner">
          <h2>ご利用の流れ</h2>
          <p className="section-sub">3つのステップで、すぐにご利用いただけます。</p>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>カメラの前に座る</h3>
              <p>
                お手持ちのPCまたはスマートフォンのカメラの前に座るだけ。
                専用機器やウェアラブルデバイスの準備は不要です。
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>3分間の測定</h3>
              <p>
                カメラが顔表面の微細な色変化を検出し、心拍変動を解析します。
                すべての処理はブラウザ上で完結し、映像は一切保存されません。
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>結果の確認と活用</h3>
              <p>
                ストレススコアとHRV指標がすぐに表示されます。
                継続的な測定により、ストレス傾向の把握と早期対応が可能になります。
              </p>
            </div>
          </div>
          <div className="steps-cta">
            <button className="btn-secondary" onClick={onTryDemo}>3分間の測定を体験する</button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section" id="benefits">
        <div className="section-inner">
          <h2>ミルケアが選ばれる<em>5つの理由</em></h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-number">01</div>
              <h3>法令対応の確実性</h3>
              <p>
                2028年の義務化に先駆けて導入することで、
                法改正後もスムーズに対応できる体制を構築できます。
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-number">02</div>
              <h3>健康経営優良法人認定の取得支援</h3>
              <p>
                客観的なストレスモニタリングの実施は、
                健康経営優良法人認定の取得要件を満たす有力な根拠となります。
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-number">03</div>
              <h3>導入コストの大幅削減</h3>
              <p>
                専用機器の購入やウェアラブルの配布が不要。
                既存のPCやスマートフォンだけで全社展開が可能です。
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-number">04</div>
              <h3>プライバシーの徹底保護</h3>
              <p>
                映像データはブラウザ上でのみ処理され、外部サーバーへの送信や保存は一切行いません。
                個人の特定につながるデータは生成されません。
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-number">05</div>
              <h3>全社展開の容易さ</h3>
              <p>
                ブラウザベースのため、ソフトウェアのインストール不要。
                URLを共有するだけで、全拠点・全従業員への展開が完了します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section section-dark" id="pricing">
        <div className="section-inner">
          <h2>シンプルな料金体系</h2>
          <div className="pricing-simple">
            <div className="pricing-main">
              <div className="pricing-amount">
                <span className="pricing-yen">月額</span>
                <span className="pricing-number">500</span>
                <span className="pricing-unit">円/人（税別）</span>
              </div>
              <div className="pricing-note">初期費用不要</div>
            </div>
            <ul className="pricing-includes">
              <li>全機能利用可能</li>
              <li>従業員数に応じた柔軟なプラン</li>
              <li>導入サポート付き</li>
              <li>データエクスポート機能</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section" id="cta">
        <div className="section-inner cta-section">
          <h2>まずは3分間、体験してください。</h2>
          <p className="section-sub">
            お手持ちのPCのカメラで、今すぐストレス測定をお試しいただけます。
            アカウント登録不要。データの保存や送信は一切行いません。
          </p>
          <button className="btn-hero" onClick={onTryDemo}>無料デモを体験する</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <svg viewBox="0 0 48 48" width="24" height="24" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#4f8cff" strokeWidth="3" />
              <path d="M24 14c-4 0-8 3.5-8 9s4 11 8 15c4-4 8-9 8-15s-4-9-8-9z" fill="#4f8cff" opacity="0.85" />
            </svg>
            <span>ミルケア</span>
          </div>
          <p className="footer-disclaimer">
            本サービスは一般的なウェルネス指標の参考値を提供するものであり、医療機器ではありません。
            疾病の診断、治療、予防を目的としたものではありません。
          </p>
          <p className="footer-copy">&copy; 2026 ミルケア</p>
        </div>
      </footer>
    </div>
  );
}
