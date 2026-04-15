import app from './app.js';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Argenteo Viáticos API escuchando en http://localhost:${PORT}`));
