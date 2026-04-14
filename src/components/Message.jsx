import styles from './Message.module.css';

/** Very lightweight markdown renderer — bold, inline code, line breaks */
function renderText(text) {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    /* Process bold (**text**) and inline code (`code`) */
    const parts = [];
    const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
    let last = 0;
    let m;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>);
      if (m[2]) parts.push(<code key={m.index} className={styles.inlineCode}>{m[2]}</code>);
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return (
      <span key={li}>
        {parts}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function Message({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && (
        <div className={styles.avatar}>⛏</div>
      )}

      <div className={`${styles.bubble} ${message.error ? styles.error : ''}`}>
        {/* File thumbnails inside user bubble */}
        {isUser && message.files?.length > 0 && (
          <div className={styles.attachedFiles}>
            {message.files.map((f, i) => (
              <div key={i} className={styles.attachedFile}>
                {f.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(f)} alt={f.name} className={styles.thumb} />
                ) : (
                  <div className={styles.pdfBadge}>📄 {f.name}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {message.text && (
          <p className={styles.text}>{renderText(message.text)}</p>
        )}
      </div>

      {isUser && (
        <div className={styles.avatar}>👤</div>
      )}
    </div>
  );
}
