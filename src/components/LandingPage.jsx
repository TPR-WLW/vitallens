import { useState, useEffect, useRef } from 'react';
import ContactForm, { CONTACT_EMAIL } from './ContactForm.jsx';
import '../styles/landing.css';

const LogoSvg = ({ size = 32 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} fill="none">
    <circle cx="24" cy="24" r="22" stroke="#4f8cff" strokeWidth="3" />
    <path d="M24 14c-4 0-8 3.5-8 9s4 11 8 15c4-4 8-9 8-15s-4-9-8-9z" fill="#4f8cff" opacity="0.85" />
  </svg>
);

export default function LandingPage({ onTryDemo, onShowDashboard, onStartDemo, onShowHistory, ctaText = '無料デモを体験する' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const heroRef = useRef(null);

  // Show sticky CTA bar after hero scrolls out of view
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (e) => {
    setMenuOpen(false);
  };

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="nav-inner">
          <div className="nav-logo">
            <LogoSvg />
            <span>ミルケア</span>
          </div>
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="メニューを開く"
          >
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          </button>
          <div className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
            <a href="#problems" onClick={handleNavClick}>課題</a>
            <a href="#solution" onClick={handleNavClick}>ソリューション</a>
            <a href="#pricing" onClick={handleNavClick}>料金</a>
            <a href="#contact" onClick={handleNavClick}>お問い合わせ</a>
            <button className="btn-nav-secondary" onClick={() => { setMenuOpen(false); onShowDashboard(); }}>管理者デモ</button>
            <button className="btn-nav" onClick={() => { setMenuOpen(false); onTryDemo(); }}>無料デモ</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" ref={heroRef}>
        <div className="hero-inner">
          <h1>2028年、すべての事業場に<br />ストレスチェックが義務化されます。</h1>
          <p className="hero-sub-accent">貴社の準備は、整っていますか。</p>
          <p className="hero-sub">
            ミルケアは、カメラ映像からHRV（心拍変動）と表情分析を同時に解析し、
            多モーダル融合によるコンディションスコアで従業員のストレス状態を非接触で可視化します。
            ウェアラブル不要。顔画像・映像の保存や送信は一切行いません。
          </p>
          <div className="hero-actions">
            <button className="btn-hero" onClick={onTryDemo}>{ctaText}</button>
            <button className="btn-hero-secondary" onClick={onStartDemo}>カメラなしでデモを見る</button>
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
            ミルケアは、rPPG技術によるHRV解析と表情分析（MediaPipe FaceLandmarker）を融合した
            多モーダル分析で、身体と心理の両面からコンディションを可視化します。
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
            <div className="metric-card">
              <div className="metric-name">こころの緊張度</div>
              <div className="metric-desc">心理的ストレス指標（多モーダル融合）</div>
            </div>
            <div className="metric-card">
              <div className="metric-name">回復・活力</div>
              <div className="metric-desc">リカバリー指標（多モーダル融合）</div>
            </div>
            <div className="metric-card">
              <div className="metric-name">バランス度</div>
              <div className="metric-desc">総合バランス指標（多モーダル融合）</div>
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
                カメラが顔表面の微細な色変化からHRVを、表情の動きからコンディションスコアを同時に解析します。
                すべての処理はブラウザ上で完結し、映像や顔データは一切保存・送信されません。
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
          <h2>ミルケアが選ばれる<em>6つの理由</em></h2>
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
            <div className="benefit-card">
              <div className="benefit-number">06</div>
              <h3>多モーダル分析の精度</h3>
              <p>
                HRVと表情分析を融合した3軸コンディションスコアにより、
                質問票や単一信号では捉えられない心身の状態変化を客観的に検出します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="section section-dark" id="dashboard">
        <div className="section-inner">
          <h2>管理者向け<em>ダッシュボード</em></h2>
          <p className="section-sub">
            部署別のストレス傾向、月次推移、参加率をリアルタイムで把握。
            匿名集計データのみを表示し、個人の特定はできない設計です。
            ROI試算機能で、導入効果を数値で確認できます。
          </p>
          <div className="dashboard-preview-features">
            <div className="dash-feature">
              <strong>部署別ストレス分析</strong>
              <p>部署ごとの平均ストレス、参加率、要注意部署を一目で把握</p>
            </div>
            <div className="dash-feature">
              <strong>月次推移レポート</strong>
              <p>ストレス傾向の時系列変化を追跡し、施策の効果を可視化</p>
            </div>
            <div className="dash-feature">
              <strong>ROI試算・レポート出力</strong>
              <p>導入効果をシミュレーションし、PDF形式で稟議書に添付可能</p>
            </div>
          </div>
          <button className="btn-secondary" onClick={onShowDashboard}>ダッシュボードのデモを見る</button>
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
          <button className="btn-hero" onClick={onTryDemo}>{ctaText}</button>
          <p className="cta-demo-alt">
            <button className="btn-text-link" onClick={onStartDemo}>カメラなしでデモを体験する &rarr;</button>
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="section section-dark" id="contact">
        <div className="section-inner contact-section">
          <h2>お問い合わせ</h2>
          <p className="section-sub">
            導入のご相談・資料請求・無料パイロットのお申し込みなど、<br />
            お気軽にお問い合わせください。通常1営業日以内にご返信いたします。
          </p>
          <ContactForm />
        </div>
      </section>

      {/* Company Info */}
      <section className="section" id="company">
        <div className="section-inner company-section">
          <h2>運営情報</h2>
          <div className="company-grid">
            <div className="company-row">
              <span className="company-label">サービス名</span>
              <span className="company-value">ミルケア（MiruCare）</span>
            </div>
            <div className="company-row">
              <span className="company-label">運営</span>
              <span className="company-value">ミルケア運営チーム</span>
            </div>
            <div className="company-row">
              <span className="company-label">設立</span>
              <span className="company-value">2026年</span>
            </div>
            <div className="company-row">
              <span className="company-label">事業内容</span>
              <span className="company-value">カメラによる非接触バイタルモニタリングサービスの企画・開発・運営</span>
            </div>
            <div className="company-row">
              <span className="company-label">連絡先</span>
              <span className="company-value">
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="privacy-overlay" onClick={() => setShowPrivacy(false)}>
          <div className="privacy-modal" onClick={(e) => e.stopPropagation()}>
            <button className="privacy-close" onClick={() => setShowPrivacy(false)}>&times;</button>
            <h2>プライバシーポリシー</h2>

            <h3>1. カメラ映像の取り扱い</h3>
            <p>
              本サービスでは、心拍変動（HRV）の解析にカメラ映像を使用します。
              映像データはすべて利用者のデバイス（ブラウザ）上で処理されます。
              <strong>映像データが外部サーバーに送信・保存・転送されることは一切ありません。</strong>
              計測終了後、映像データはブラウザのメモリから即時に破棄されます。
            </p>

            <h3>2. 計測データの取り扱い</h3>
            <p>
              計測結果（心拍数、HRV指標、ストレスレベル）は、計測完了後に利用者の画面上に表示されます。
              計測履歴機能により、過去の計測結果がブラウザのローカルストレージに保存されます。
              これらのデータは利用者のデバイス内にのみ保存され、<strong>外部サーバーへの送信は一切行いません。</strong>
              履歴データは利用者自身でいつでも削除できます。
            </p>

            <h3>3. Cookieおよびトラッキング</h3>
            <p>本サービスでは、利用者を追跡するCookieやトラッキングツールを使用しません。</p>

            <h3>4. 個人情報の収集</h3>
            <p>
              本サービスの計測機能のご利用にあたり、氏名・メールアドレス等の個人情報の入力は不要です。
              お問い合わせフォームからご連絡いただく場合に限り、お名前・メールアドレス・ご所属先をお伺いすることがあります。
              これらの情報は、お問い合わせへのご回答の目的にのみ使用し、第三者に提供することはありません。
            </p>

            <h3>5. 法令の遵守</h3>
            <p>
              ミルケア運営チーム（以下「当チーム」）は、個人情報の保護に関する法律（個人情報保護法）
              その他の関連法令を遵守し、個人情報の適正な取り扱いに努めます。
            </p>

            <h3>6. ポリシーの変更</h3>
            <p>
              本ポリシーは、サービス内容の変更や法令改正に伴い、事前の通知なく改定する場合があります。
              最新のポリシーは、本ページに掲載します。
            </p>

            <h3>7. お問い合わせ窓口</h3>
            <p>ミルケア運営チーム<br /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>

            <p className="privacy-updated">最終更新: 2026年3月</p>
          </div>
        </div>
      )}

      {/* Sticky Mobile CTA */}
      <div className={`sticky-cta-bar ${showStickyCta ? 'sticky-cta-visible' : ''}`}>
        <button className="btn-hero sticky-cta-btn" onClick={onTryDemo}>{ctaText}</button>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <LogoSvg size={24} />
            <span>ミルケア</span>
          </div>
          <div className="footer-links">
            <a href="#company">運営情報</a>
            <span className="footer-sep">|</span>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }}>プライバシーポリシー</a>
            <span className="footer-sep">|</span>
            <a href="#contact">お問い合わせ</a>
          </div>
          <div className="footer-links footer-guides">
            <span className="footer-guides-label">お役立ち情報</span>
            <a href="/vitallens/guides/stress-check-2028/">ストレスチェック義務化ガイド</a>
            <span className="footer-sep">|</span>
            <a href="/vitallens/guides/stress-check-tools/">ツール比較ガイド</a>
            <span className="footer-sep">|</span>
            <a href="/vitallens/guides/health-management-certification/">健康経営認定ガイド</a>
            <span className="footer-sep">|</span>
            <a href="/vitallens/guides/stress-check-howto/">実施手順ガイド</a>
            <span className="footer-sep">|</span>
            <a href="/vitallens/guides/stress-check-analysis/">集団分析ガイド</a>
            <span className="footer-sep">|</span>
            <a href="/vitallens/guides/rppg-stress-monitoring/">rPPG技術ガイド</a>
            <span className="footer-sep">|</span>
            <a href="/vitallens/guides/rppg-accuracy/">精度検証</a>
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
