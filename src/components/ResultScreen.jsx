import { useState, useEffect } from 'react';
import { API } from '../config/api.js';
import { getAgentUUID, getTenantSlug } from '../lib/agent.js';

export default function ResultScreen({ result, onRestart, tenantSlug: tenantSlugProp }) {
  const { hr, confidence } = result;
  const [submitStatus, setSubmitStatus] = useState('idle'); // idle | submitting | sent | error

  const tenantSlug = tenantSlugProp || getTenantSlug();

  // Auto-submit result if enrolled in a tenant
  useEffect(() => {
    if (!tenantSlug || !API.base || submitStatus !== 'idle') return;
    if (confidence < 0.15 || hr === 0) return; // Don't submit inconclusive results

    const stressIndicator = hr <= 80 ? 'low' : hr <= 100 ? 'moderate' : 'elevated';

    setSubmitStatus('submitting');
    fetch(API.checkResult, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_slug: tenantSlug,
        agent_uuid: getAgentUUID(),
        timestamp: new Date().toISOString(),
        heart_rate_bpm: Math.round(hr),
        stress_indicator: stressIndicator,
        signal_quality: Math.round(confidence * 100) / 100,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error); });
        return res.json();
      })
      .then(() => setSubmitStatus('sent'))
      .catch(() => setSubmitStatus('error'));
  }, [tenantSlug, hr, confidence, submitStatus]);

  const getWellnessInfo = (heartRate, conf) => {
    if (conf < 0.15 || heartRate === 0) {
      return {
        level: 'inconclusive',
        color: '#9ca3af',
        label: 'Inconclusive',
        message: 'We could not get a reliable reading. Try again in better lighting, keep still, and ensure your face is clearly visible.',
        icon: '?',
      };
    }

    if (heartRate < 60) {
      return {
        level: 'low',
        color: '#3b82f6',
        label: 'Below Typical Range',
        message: 'Your resting heart rate appears lower than typical. This can be normal for athletes or very fit individuals.',
        icon: '\u2193',
      };
    }

    if (heartRate <= 100) {
      return {
        level: 'normal',
        color: '#22c55e',
        label: 'Normal Range',
        message: 'Your heart rate appears within the normal resting range. You\'re looking good — keep it up!',
        icon: '\u2713',
      };
    }

    if (heartRate <= 120) {
      return {
        level: 'elevated',
        color: '#f59e0b',
        label: 'Elevated',
        message: 'Your heart rate appears slightly elevated. Consider taking a moment to relax, hydrate, and check in with how you are feeling.',
        icon: '!',
      };
    }

    return {
      level: 'high',
      color: '#ef4444',
      label: 'High',
      message: 'Your heart rate appears significantly elevated. Consider taking a short break, breathing deeply, and stepping away from calls for a few minutes.',
      icon: '!!',
    };
  };

  const wellness = getWellnessInfo(hr, confidence);
  const confidenceLabel = confidence > 0.4 ? 'High' : confidence > 0.2 ? 'Moderate' : 'Low';

  return (
    <div className="result-screen">
      <div className="result-content">
        <h2>Wellness Check Results</h2>

        {/* Heart rate display */}
        <div className="hr-display" style={{ borderColor: wellness.color }}>
          <div className="hr-icon" style={{ backgroundColor: wellness.color }}>
            {wellness.icon}
          </div>
          {hr > 0 ? (
            <>
              <div className="hr-number">{hr}</div>
              <div className="hr-label">BPM</div>
            </>
          ) : (
            <div className="hr-number" style={{ fontSize: '1.5rem' }}>--</div>
          )}
        </div>

        {/* Wellness assessment */}
        <div className="wellness-card" style={{ borderLeftColor: wellness.color }}>
          <h3 style={{ color: wellness.color }}>{wellness.label}</h3>
          <p>{wellness.message}</p>
        </div>

        {/* Submission status for enrolled agents */}
        {tenantSlug && submitStatus === 'sent' && (
          <div className="submit-badge sent">Check-in recorded anonymously</div>
        )}
        {tenantSlug && submitStatus === 'error' && (
          <div className="submit-badge error">Could not save — result stays on your device only</div>
        )}

        {/* Measurement quality */}
        <div className="quality-info">
          <div className="quality-row">
            <span>Reading confidence</span>
            <span className={`quality-badge quality-${confidenceLabel.toLowerCase()}`}>
              {confidenceLabel}
            </span>
          </div>
          <div className="quality-row">
            <span>Measurement duration</span>
            <span>{result.duration}s</span>
          </div>
          <div className="quality-row">
            <span>Samples collected</span>
            <span>{result.samples}</span>
          </div>
        </div>

        {/* Tips for better reading */}
        {confidence < 0.3 && (
          <div className="tips-card">
            <h4>Tips for a better reading</h4>
            <ul>
              <li>Ensure good, even lighting on your face</li>
              <li>Avoid direct sunlight or harsh shadows</li>
              <li>Keep your head as still as possible</li>
              <li>Remove sunglasses or face coverings</li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="result-actions">
          <button className="btn-primary" onClick={onRestart}>
            Check Again
          </button>
        </div>

        <p className="disclaimer">
          This is a wellness insight tool only. It is not a medical device. Do not use these results for medical decisions. If you feel unwell, consult a healthcare professional.
        </p>
      </div>
    </div>
  );
}
