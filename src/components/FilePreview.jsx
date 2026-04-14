import styles from './FilePreview.module.css';

export default function FilePreview({ file, onRemove }) {
  const isImage = file.type.startsWith('image/');

  return (
    <div className={styles.card}>
      {isImage ? (
        <img src={URL.createObjectURL(file)} alt={file.name} className={styles.thumb} />
      ) : (
        <div className={styles.pdfIcon}>📄</div>
      )}
      <span className={styles.name}>{file.name}</span>
      <button className={styles.remove} onClick={onRemove} title="Quitar">✕</button>
    </div>
  );
}
