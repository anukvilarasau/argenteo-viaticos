import { useState, useCallback } from 'react';
import Chat from './components/Chat';
import styles from './App.module.css';

export default function App() {
  /* Stable session ID for this tab */
  const [sessionId] = useState(() => `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const handleNewSession = useCallback(async () => {
    await fetch(`/api/chat/${sessionId}`, { method: 'DELETE' });
    window.location.reload();
  }, [sessionId]);

  return (
    <div className={styles.root}>
      {/* ── Top bar ── */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>⛏</span>
          <div>
            <div className={styles.brandName}>Argenteo Mining SA</div>
            <div className={styles.brandSub}>Gestión de Viáticos</div>
          </div>
        </div>
        <button className={styles.newBtn} onClick={handleNewSession} title="Nueva sesión">
          + Nueva sesión
        </button>
      </header>

      {/* ── Chat ── */}
      <main className={styles.main}>
        <Chat sessionId={sessionId} />
      </main>
    </div>
  );
}
