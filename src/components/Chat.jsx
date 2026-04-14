import { useState, useRef, useEffect, useCallback } from 'react';
import Message from './Message';
import FilePreview from './FilePreview';
import styles from './Chat.module.css';

const WELCOME = {
  id:   'welcome',
  role: 'assistant',
  text: '¡Hola! Soy el asistente de viáticos de **Argenteo Mining SA**.\n\nSubí una foto o PDF de tu factura y te ayudo a registrarla en la planilla. También podés escribirme directamente si tenés alguna consulta.',
};

export default function Chat({ sessionId }) {
  const [messages,    setMessages]    = useState([WELCOME]);
  const [input,       setInput]       = useState('');
  const [files,       setFiles]       = useState([]);   /* File[] */
  const [loading,     setLoading]     = useState(false);
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);
  const textRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const removeFile = useCallback(idx => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && files.length === 0) return;
    if (loading) return;

    /* Optimistic user bubble */
    const userMsg = { id: Date.now(), role: 'user', text: trimmed, files: [...files] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setFiles([]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      if (trimmed) formData.append('message', trimmed);
      for (const f of userMsg.files) formData.append('files', f);

      const res  = await fetch('/api/chat', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error del servidor');

      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: `⚠️ ${err.message}`, error: true }]);
    } finally {
      setLoading(false);
    }
  }, [input, files, loading, sessionId]);

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleFileChange = e => {
    const picked = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...picked].slice(0, 5)); /* max 5 */
    e.target.value = '';
  };

  const handleDrop = e => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    setFiles(prev => [...prev, ...dropped].slice(0, 5));
  };

  return (
    <div className={styles.root} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
      {/* ── Messages ── */}
      <div className={styles.feed}>
        {messages.map(m => <Message key={m.id} message={m} />)}
        {loading && (
          <div className={styles.typing}>
            <span /><span /><span />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── File previews ── */}
      {files.length > 0 && (
        <div className={styles.previews}>
          {files.map((f, i) => (
            <FilePreview key={i} file={f} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className={styles.inputBar}>
        <button
          className={styles.attachBtn}
          onClick={() => fileRef.current?.click()}
          title="Adjuntar factura (imagen o PDF)"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          hidden
          onChange={handleFileChange}
        />
        <textarea
          ref={textRef}
          className={styles.textarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Escribí un mensaje o arrastrá una factura aquí…"
          rows={1}
        />
        <button
          className={styles.sendBtn}
          onClick={send}
          disabled={loading || (!input.trim() && files.length === 0)}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
