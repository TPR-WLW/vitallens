import { useState } from 'react';
import '../styles/landing.css';

export default function LandingPage({ onTryDemo, onViewDashboard }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      // Track pilot request
      window.__vl_track?.('pilot_request', { email });
      setSubmitted(true);
    }
  };

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
            <span>VitalLens</span>
          </div>
          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <button className="btn-nav" onClick={onTryDemo}>Try Demo</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">For Contact Center Leaders</div>
          <h1>Stop Losing Agents to Burnout</h1>
          <p className="hero-sub">
            VitalLens detects physiological stress before it becomes turnover.
            A 30-second webcam check-in — no wearables, no hardware, no surveillance.
          </p>
          <div className="hero-actions">
            <a href="#pilot" className="btn-hero">Start Free 60-Day Pilot</a>
            <button className="btn-hero-secondary" onClick={onTryDemo}>Try Live Demo</button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">30-50%</span>
              <span className="stat-label">Annual agent turnover</span>
            </div>
            <div className="stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">$10-21K</span>
              <span className="stat-label">Cost per replacement</span>
            </div>
            <div className="stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">30s</span>
              <span className="stat-label">Per wellness check</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="section section-dark" id="problem">
        <div className="section-inner">
          <h2>Voice Analytics Tells You How Agents <em>Sound</em>.<br />
            VitalLens Tells You How They Actually <em>Feel</em>.</h2>
          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon">$</div>
              <h3>Turnover Is Bleeding Your P&L</h3>
              <p>Contact centers lose 30-50% of agents annually. At $10-21K per replacement, a 500-seat center burns $1.5-5M per year on churn alone.</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">!</div>
              <h3>Burnout Is Invisible Until It's Too Late</h3>
              <p>74% of agents report burnout symptoms. By the time it shows in call metrics, the agent is already looking for another job.</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">?</div>
              <h3>Voice Analytics Only Sees Half the Picture</h3>
              <p>Tone-of-voice tools infer stress from how agents sound on calls. But physiological stress accumulates silently between calls — in the moments nobody measures.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" id="how-it-works">
        <div className="section-inner">
          <h2>How VitalLens Works</h2>
          <p className="section-sub">Three steps. Thirty seconds. Zero hardware.</p>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Agent Check-In</h3>
              <p>Between calls, agents voluntarily open a 30-second wellness check. The webcam captures subtle skin color changes invisible to the naked eye.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>On-Device Processing</h3>
              <p>All analysis happens in the browser. No video is recorded, transmitted, or stored. Heart rate and stress indicators are extracted using remote photoplethysmography (rPPG).</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Team Wellness Insights</h3>
              <p>Supervisors see anonymized, aggregate team wellness trends — never individual video or raw data. Proactive alerts suggest wellness breaks before burnout peaks.</p>
            </div>
          </div>
          <div className="steps-cta">
            <button className="btn-secondary" onClick={onTryDemo}>Try the 30-Second Check-In →</button>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="section section-dark" id="dashboard">
        <div className="section-inner">
          <h2>What Supervisors See</h2>
          <p className="section-sub">Anonymized team wellness at a glance — never individual surveillance.</p>
          <div className="dashboard-preview">
            <div className="dash-header">
              <span className="dash-title">Team Wellness Dashboard</span>
              <span className="dash-date">Today, March 12</span>
            </div>
            <div className="dash-grid">
              <div className="dash-metric">
                <div className="dash-metric-value green">87%</div>
                <div className="dash-metric-label">Team Wellness Score</div>
              </div>
              <div className="dash-metric">
                <div className="dash-metric-value">142</div>
                <div className="dash-metric-label">Check-Ins Today</div>
              </div>
              <div className="dash-metric">
                <div className="dash-metric-value amber">3</div>
                <div className="dash-metric-label">Wellness Alerts</div>
              </div>
              <div className="dash-metric">
                <div className="dash-metric-value">68</div>
                <div className="dash-metric-label">Avg Team HR (BPM)</div>
              </div>
            </div>
            <div className="dash-chart">
              <div className="dash-chart-title">Team Stress Trend (7 Days)</div>
              <div className="dash-bars">
                <div className="dash-bar-group">
                  <div className="dash-bar" style={{ height: '45%' }} />
                  <span>Mon</span>
                </div>
                <div className="dash-bar-group">
                  <div className="dash-bar" style={{ height: '52%' }} />
                  <span>Tue</span>
                </div>
                <div className="dash-bar-group">
                  <div className="dash-bar elevated" style={{ height: '78%' }} />
                  <span>Wed</span>
                </div>
                <div className="dash-bar-group">
                  <div className="dash-bar elevated" style={{ height: '65%' }} />
                  <span>Thu</span>
                </div>
                <div className="dash-bar-group">
                  <div className="dash-bar" style={{ height: '40%' }} />
                  <span>Fri</span>
                </div>
                <div className="dash-bar-group">
                  <div className="dash-bar" style={{ height: '35%' }} />
                  <span>Sat</span>
                </div>
                <div className="dash-bar-group">
                  <div className="dash-bar" style={{ height: '30%' }} />
                  <span>Sun</span>
                </div>
              </div>
            </div>
            <div className="dash-alert">
              <span className="dash-alert-icon">●</span>
              <span>Wed-Thu spike correlates with new product launch support queue — consider scheduling extra breaks during high-volume periods.</span>
            </div>
            <button className="btn-secondary" onClick={onViewDashboard} style={{ marginTop: '16px', width: '100%' }}>
              Explore Full Dashboard Demo →
            </button>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="section">
        <div className="section-inner">
          <h2>Why VitalLens, Not More Voice Analytics</h2>
          <div className="diff-grid">
            <div className="diff-card">
              <h3>Measures Physiology, Not Tone</h3>
              <p>Voice analytics infers stress from speech patterns. VitalLens measures actual physiological signals — heart rate and heart rate variability — the gold standard biomarkers of stress.</p>
            </div>
            <div className="diff-card">
              <h3>Catches Stress Between Calls</h3>
              <p>Voice tools only work during calls. Stress builds in the silence between them. VitalLens catches cumulative stress before it shows up in call metrics.</p>
            </div>
            <div className="diff-card">
              <h3>Zero Privacy Compromise</h3>
              <p>No audio recording, no video storage, no AI watching your agents. Processing happens entirely in the browser. Supervisors see trends, never individuals.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section section-dark" id="pricing">
        <div className="section-inner">
          <h2>Simple Pricing, Real ROI</h2>
          <p className="section-sub">If VitalLens prevents just one agent from quitting, it pays for your entire team for a year.</p>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-badge">Start Here</div>
              <h3>Pilot</h3>
              <div className="pricing-price">Free</div>
              <div className="pricing-period">60 days, up to 50 agents</div>
              <ul className="pricing-features">
                <li>Full product access</li>
                <li>Team wellness dashboard</li>
                <li>Basic reporting</li>
                <li>Email support</li>
              </ul>
              <a href="#pilot" className="btn-pricing">Start Free Pilot</a>
            </div>
            <div className="pricing-card featured">
              <div className="pricing-badge">Most Popular</div>
              <h3>Professional</h3>
              <div className="pricing-price">$8<span>/agent/mo</span></div>
              <div className="pricing-period">100-500 agents, annual contract</div>
              <ul className="pricing-features">
                <li>Unlimited agents</li>
                <li>Team wellness dashboard</li>
                <li>Supervisor alerts</li>
                <li>Wellness break automation</li>
                <li>Slack / Teams integration</li>
              </ul>
              <a href="#pilot" className="btn-pricing featured">Start Free Pilot</a>
            </div>
            <div className="pricing-card">
              <div className="pricing-badge">Full Suite</div>
              <h3>Enterprise</h3>
              <div className="pricing-price">$12<span>/agent/mo</span></div>
              <div className="pricing-period">500+ agents, annual contract</div>
              <ul className="pricing-features">
                <li>Everything in Pro</li>
                <li>CCaaS integration</li>
                <li>Custom reporting</li>
                <li>SSO / SAML</li>
                <li>Dedicated support + SLA</li>
              </ul>
              <a href="#pilot" className="btn-pricing">Contact Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Pilot Form */}
      <section className="section" id="pilot">
        <div className="section-inner cta-section">
          <h2>Start Your Free 60-Day Pilot</h2>
          <p className="section-sub">
            No credit card. No hardware to install. Up and running in 15 minutes.
          </p>
          {submitted ? (
            <div className="cta-success">
              <div className="success-icon">✓</div>
              <h3>We'll be in touch within 24 hours.</h3>
              <p>Meanwhile, try the live demo to see VitalLens in action.</p>
              <button className="btn-secondary" onClick={onTryDemo}>Try Live Demo</button>
            </div>
          ) : (
            <form className="cta-form" onSubmit={handleSubmit}>
              <input
                type="email"
                className="cta-input"
                placeholder="Work email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn-hero">Request Pilot Access</button>
            </form>
          )}
          <p className="cta-note">
            Typical pilot: 25-50 agents on one team for 60 days. We help you set up, measure, and present results.
          </p>
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
            <span>VitalLens</span>
          </div>
          <p className="footer-disclaimer">
            VitalLens provides general wellness insights only. It is not a medical device and is not intended for diagnosis, treatment, or prevention of any disease or condition.
          </p>
          <p className="footer-copy">© 2026 VitalLens. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
