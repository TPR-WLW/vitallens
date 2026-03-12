import { useState } from 'react';

// ------------------------------------------------------------------
// Contact email address — change this one constant when domain is ready.
// Current: placeholder until mirucare.jp email routing is configured.
// Target:  info@mirucare.jp (via Cloudflare Email Routing or Google Workspace)
// ------------------------------------------------------------------
const CONTACT_EMAIL = 'info@mirucare.jp';

const INQUIRY_TYPES = [
  { value: '', label: '選択してください' },
  { value: '資料請求', label: '資料請求' },
  { value: '無料パイロットのお申し込み', label: '無料パイロットのお申し込み' },
  { value: 'デモのご依頼', label: 'デモのご依頼' },
  { value: 'その他', label: 'その他' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form) {
  const errors = {};
  if (!form.company.trim()) errors.company = '会社名を入力してください';
  if (!form.name.trim()) errors.name = 'お名前を入力してください';
  if (!form.email.trim()) {
    errors.email = 'メールアドレスを入力してください';
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = '正しいメールアドレスの形式で入力してください';
  }
  return errors;
}

export default function ContactForm() {
  const [form, setForm] = useState({
    company: '',
    department: '',
    name: '',
    email: '',
    phone: '',
    type: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear the error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    const subject = encodeURIComponent(
      `[${form.type || 'お問い合わせ'}] ${form.company} ${form.name}様`
    );

    const lines = [
      `会社名: ${form.company}`,
      form.department ? `部署名: ${form.department}` : null,
      `お名前: ${form.name}`,
      `メールアドレス: ${form.email}`,
      form.phone ? `電話番号: ${form.phone}` : null,
      `お問い合わせ種別: ${form.type || '未選択'}`,
      '',
      `お問い合わせ内容:`,
      form.message,
    ]
      .filter((l) => l !== null)
      .join('\n');

    const body = encodeURIComponent(lines);

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="contact-form" role="status" aria-live="polite">
        <div className="cf-success">
          <h3>送信ありがとうございます</h3>
          <p>
            メーラーが起動しましたら、そのまま送信してください。
            通常1営業日以内にご返信いたします。
          </p>
          <p className="cf-success-note">
            メーラーが起動しなかった場合は、下記アドレスまで直接ご連絡ください。
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="cf-email-link">
            {CONTACT_EMAIL}
          </a>
          <button
            type="button"
            className="btn-secondary cf-reset"
            onClick={() => {
              setSubmitted(false);
              setForm({
                company: '',
                department: '',
                name: '',
                email: '',
                phone: '',
                type: '',
                message: '',
              });
            }}
          >
            もう一度送信する
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="contact-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="お問い合わせフォーム"
    >
      <div className="cf-row">
        <div className="cf-field cf-field-half">
          <label htmlFor="cf-company" className="cf-label">
            会社名<span className="cf-required" aria-hidden="true">*</span>
            <span className="sr-only">（必須）</span>
          </label>
          <input
            id="cf-company"
            type="text"
            className={`cf-input ${errors.company ? 'cf-input-error' : ''}`}
            value={form.company}
            onChange={update('company')}
            required
            aria-required="true"
            aria-invalid={!!errors.company}
            aria-describedby={errors.company ? 'cf-company-error' : undefined}
            placeholder="例: 株式会社ミルケア"
          />
          {errors.company && (
            <p id="cf-company-error" className="cf-error" role="alert">
              {errors.company}
            </p>
          )}
        </div>
        <div className="cf-field cf-field-half">
          <label htmlFor="cf-department" className="cf-label">
            部署名
          </label>
          <input
            id="cf-department"
            type="text"
            className="cf-input"
            value={form.department}
            onChange={update('department')}
            placeholder="例: 人事部"
          />
        </div>
      </div>

      <div className="cf-row">
        <div className="cf-field cf-field-half">
          <label htmlFor="cf-name" className="cf-label">
            お名前<span className="cf-required" aria-hidden="true">*</span>
            <span className="sr-only">（必須）</span>
          </label>
          <input
            id="cf-name"
            type="text"
            className={`cf-input ${errors.name ? 'cf-input-error' : ''}`}
            value={form.name}
            onChange={update('name')}
            required
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'cf-name-error' : undefined}
            placeholder="例: 田中 太郎"
          />
          {errors.name && (
            <p id="cf-name-error" className="cf-error" role="alert">
              {errors.name}
            </p>
          )}
        </div>
        <div className="cf-field cf-field-half">
          <label htmlFor="cf-email" className="cf-label">
            メールアドレス<span className="cf-required" aria-hidden="true">*</span>
            <span className="sr-only">（必須）</span>
          </label>
          <input
            id="cf-email"
            type="email"
            className={`cf-input ${errors.email ? 'cf-input-error' : ''}`}
            value={form.email}
            onChange={update('email')}
            required
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'cf-email-error' : undefined}
            placeholder="例: tanaka@example.co.jp"
          />
          {errors.email && (
            <p id="cf-email-error" className="cf-error" role="alert">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="cf-row">
        <div className="cf-field cf-field-half">
          <label htmlFor="cf-phone" className="cf-label">
            電話番号
          </label>
          <input
            id="cf-phone"
            type="tel"
            className="cf-input"
            value={form.phone}
            onChange={update('phone')}
            placeholder="例: 03-1234-5678"
          />
        </div>
        <div className="cf-field cf-field-half">
          <label htmlFor="cf-type" className="cf-label">
            お問い合わせ種別
          </label>
          <select
            id="cf-type"
            className="cf-input cf-select"
            value={form.type}
            onChange={update('type')}
            aria-label="お問い合わせ種別を選択"
          >
            {INQUIRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cf-field">
        <label htmlFor="cf-message" className="cf-label">
          お問い合わせ内容
        </label>
        <textarea
          id="cf-message"
          className="cf-input cf-textarea"
          value={form.message}
          onChange={update('message')}
          rows={5}
          placeholder="ご質問やご要望をご記入ください"
        />
      </div>

      <button
        type="submit"
        className="btn-hero cf-submit"
        aria-label="お問い合わせ内容を送信する"
      >
        送信する（メーラーが起動します）
      </button>

      <div className="cf-alternatives">
        <p className="cf-fallback">
          フォームが動作しない場合は、直接メールでお問い合わせください:
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </div>
    </form>
  );
}

export { CONTACT_EMAIL };
