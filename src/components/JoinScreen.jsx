import { useState } from 'react';
import { API } from '../config/api.js';
import { getAgentUUID } from '../lib/agent.js';
import '../styles/join.css';

export default function JoinScreen({ tenantSlug, onEnrolled, onBack }) {
  const [inviteCode, setInviteCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | enrolling | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [agentId, setAgentId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setStatus('enrolling');
    setErrorMsg('');

    try {
      const res = await fetch(API.enroll, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          invite_code: inviteCode.trim(),
          agent_uuid: getAgentUUID(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Enrollment failed');
      }

      setAgentId(data.agent_id);
      // Store tenant context for future check-ins
      localStorage.setItem('vl_tenant', tenantSlug);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="join-screen">
        <div className="join-content">
          <div className="join-success-icon">✓</div>
          <h2>You're In!</h2>
          <p>You've joined the VitalLens wellness program. Your check-ins are anonymous — your employer only sees aggregate team trends.</p>
          <button className="btn-primary" onClick={() => onEnrolled(tenantSlug)}>
            Start Your First Check-In
          </button>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '12px' }}>
            Your 30-second wellness check is completely anonymous.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="join-screen">
      <div className="join-content">
        <div className="join-logo">
          <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#4f8cff" strokeWidth="3" />
            <path d="M24 14c-4 0-8 3.5-8 9s4 11 8 15c4-4 8-9 8-15s-4-9-8-9z" fill="#4f8cff" opacity="0.85" />
          </svg>
        </div>
        <h2>Join VitalLens</h2>
        <p className="join-sub">Enter the invite code from your team admin to start anonymous wellness check-ins.</p>

        <form className="join-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="join-input"
            placeholder="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            autoFocus
            disabled={status === 'enrolling'}
          />
          <button type="submit" className="btn-primary" disabled={status === 'enrolling' || !inviteCode.trim()}>
            {status === 'enrolling' ? 'Joining...' : 'Join Program'}
          </button>
          {status === 'error' && <p className="join-error">{errorMsg}</p>}
        </form>

        <div className="join-privacy">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="#6b7280">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
          </svg>
          <span>Your identity is hashed and anonymous. No video leaves your device. Your employer sees only team-level trends.</span>
        </div>

        {onBack && (
          <button className="btn-link" onClick={onBack}>← Back to home</button>
        )}
      </div>
    </div>
  );
}
