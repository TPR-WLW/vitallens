import { useState } from 'react';

const INQUIRY_TYPES = [
  { value: '', label: '選択してください' },
  { value: '資料請求', label: '資料請求' },
  { value: '無料パイロットのお申し込み', label: '無料パイロットのお申し込み' },
  { value: 'デモのご依頼', label: 'デモのご依頼' },
  { value: 'その他', label: 'その他' },
];

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

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();

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

    window.location.href = `mailto:info@mirucare.jp?subject=${subject}&body=${body}`;
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="cf-row">
        <div className="cf-field cf-field-half">
          <label htmlFor="cf-company" className="cf-label">
            会社名<span className="cf-required">*</span>
          </label>
          <input
            id="cf-company"
            type="text"
            className="cf-input"
            value={form.company}
            onChange={update('company')}
            required
            placeholder="例: 株式会社ミルケア"
          />
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
            お名前<span className="cf-required">*</span>
          </label>
          <input
            id="cf-name"
            type="text"
            className="cf-input"
            value={form.name}
            onChange={update('name')}
            required
            placeholder="例: 田中 太郎"
          />
        </div>
        <div className="cf-field cf-field-half">
          <label htmlFor="cf-email" className="cf-label">
            メールアドレス<span className="cf-required">*</span>
          </label>
          <input
            id="cf-email"
            type="email"
            className="cf-input"
            value={form.email}
            onChange={update('email')}
            required
            placeholder="例: tanaka@example.co.jp"
          />
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
        disabled={!form.company || !form.name || !form.email}
      >
        送信する（メーラーが起動します）
      </button>

      <p className="cf-fallback">
        フォームが動作しない場合は、直接メールでお問い合わせください:
        <a href="mailto:info@mirucare.jp">info@mirucare.jp</a>
      </p>
    </form>
  );
}
