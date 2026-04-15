import express from 'express';
import multer  from 'multer';
import { chat } from './claude.js';

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(express.json());

/* In-memory session store: sessionId → message history */
const sessions = new Map();

function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, []);
  return sessions.get(id);
}

app.post('/api/chat', upload.array('files'), async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId) return res.status(400).json({ error: 'sessionId requerido' });

  const history = getSession(sessionId);

  const files = (req.files || []).map(f => ({
    base64:    f.buffer.toString('base64'),
    mediaType: f.mimetype,
  }));

  if (!message && files.length === 0) {
    return res.status(400).json({ error: 'Se requiere un mensaje o al menos un archivo.' });
  }

  try {
    const { reply } = await chat(history, message || null, files);
    res.json({ reply });
  } catch (err) {
    console.error('Error en chat:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

app.delete('/api/chat/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
});

export default app;
