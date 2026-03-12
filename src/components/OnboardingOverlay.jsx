import { useState } from 'react';

const steps = [
  {
    title: '計測方法',
    body: (
      <p>
        カメラで顔の微細な色変化を検出し、心拍数とストレスレベルを非接触で計測します。ウェアラブル機器は不要です。
      </p>
    ),
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M24 42s-14-8.4-14-19.2C10 15.56 14.48 10 20.4 10c3.36 0 6.36 1.68 7.6 4.24C29.24 11.68 32.24 10 35.6 10 41.52 10 46 15.56 46 22.8 46 33.6 32 42 32 42"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M4 24h8l3-6 4 12 3-6h6"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: '準備のコツ',
    body: (
      <ul style={{ textAlign: 'left', paddingLeft: '1.2em', margin: 0, listStyle: 'disc' }}>
        <li>顔に均一な照明を当ててください</li>
        <li>カメラの正面に座り、動かないでください</li>
        <li>サングラスやマスクは外してください</li>
      </ul>
    ),
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M24 4C19.58 4 16 8.48 16 14c0 4.08 1.88 7.6 4.64 9.52L18 28h12l-2.64-4.48C30.12 21.6 32 18.08 32 14c0-5.52-3.58-10-8-10z"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M18 28v4h12v-4" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 32v2a4 4 0 008 0v-2" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="24" y1="4" x2="24" y2="2" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="36" y1="14" x2="38" y2="14" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="14" x2="12" y2="14" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'プライバシー保護',
    body: (
      <p>
        全ての処理はお使いのデバイス上で完結します。映像の録画・送信は一切行いません。安心してご利用ください。
      </p>
    ),
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M24 4L6 12v12c0 11.1 7.68 21.48 18 24 10.32-2.52 18-12.9 18-24V12L24 4z"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M18 24l4 4 8-8"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function OnboardingOverlay({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot${i === step ? ' active' : ''}`}
            />
          ))}
        </div>
        <div className="onboarding-icon">{current.icon}</div>
        <h2 className="onboarding-title">{current.title}</h2>
        <div className="onboarding-body">{current.body}</div>
        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={onComplete}>
            スキップ
          </button>
          <button className="onboarding-next" onClick={handleNext}>
            {isLastStep ? 'はじめる' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  );
}
