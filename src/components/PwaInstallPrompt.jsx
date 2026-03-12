import { useState, useEffect, useCallback } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setDeferredPrompt(null);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div style={styles.banner} role="alert">
      <span style={styles.text}>
        ホーム画面に追加してオフラインでも利用できます
      </span>
      <div style={styles.actions}>
        <button onClick={handleInstall} style={styles.installBtn}>
          インストール
        </button>
        <button
          onClick={handleDismiss}
          style={styles.dismissBtn}
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'rgba(26, 58, 107, 0.95)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: '0.875rem',
    zIndex: 9999,
  },
  text: {
    flex: 1,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
  },
  installBtn: {
    padding: '0.4rem 0.75rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  dismissBtn: {
    padding: '0.25rem 0.5rem',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
  },
};
